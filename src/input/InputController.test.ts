// src/input/InputController.test.ts — InputController unit tests
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { FrameResult } from '../app/store/types';

// Track calls via a shared object so we get the actual invocations
const callLog: FrameResult[] = [];
const commitFrameMock = vi.fn((frame: FrameResult) => { callLog.push(frame); });

// Static mock state — mutated in beforeEach
const mockElectrode = { type: 'E6013' as const };
const mockStoreState = {
  electrode: mockElectrode,
  arc: { isActive: false },
  input: {
    rawArcLength: 0, rawWorkAngle: 0, rawDragAngle: 0, rawPositionX: 0, rawPositionZ: 0,
    arcLength: 3.2, workAngle: 90, dragAngle: 70, positionX: 0, positionZ: 0, travelSpeed: 0,
  },
  session: { phase: 'welding' as const },
};

// Mock BEFORE importing the module under test
vi.mock('../app/store', () => ({
  useWelderStore: {
    getState: vi.fn(() => ({ ...mockStoreState, commitFrame: commitFrameMock })),
  },
  getWelderStore: {
    getState: vi.fn(() => ({ ...mockStoreState, commitFrame: commitFrameMock })),
  },
  default: {
    getState: vi.fn(() => ({ ...mockStoreState, commitFrame: commitFrameMock })),
  },
}));

vi.mock('../app/constants', () => ({
  INPUT_RATES: { ANGLE_RATE: 1.0, ARC_RATE: 0.5, MOUSE_SENSITIVITY: 0.15 },
  ELECTRODE_PROFILES: {
    E6013: { L_max: 6.0 },
    E7018: { L_max: 6.5 },
  }} as const));

const mockMouseGetMovement = vi.fn();
const mockMouseDispose = vi.fn();
vi.mock('./MouseTracker', () => ({
  MouseTracker: vi.fn(() => ({
    getMovement: mockMouseGetMovement,
    requestLock: vi.fn(),
    releaseLock: vi.fn(),
    isLocked: vi.fn(() => true),
    dispose: mockMouseDispose,
  })),
}));

const mockKbUpdate = vi.fn();
const mockKbGetArcDelta = vi.fn();
const mockKbGetWorkAngleDelta = vi.fn();
const mockKbGetDragAngleDelta = vi.fn();
const mockKbDispose = vi.fn();
vi.mock('./KeyboardTracker', () => ({
  KeyboardTracker: vi.fn(() => ({
    update: mockKbUpdate,
    getArcDelta: mockKbGetArcDelta,
    getWorkAngleDelta: mockKbGetWorkAngleDelta,
    getDragAngleDelta: mockKbGetDragAngleDelta,
    dispose: mockKbDispose,
  })),
}));

import { InputController } from './InputController';

describe('InputController', () => {
  let canvas: HTMLElement;
  let controller: InputController;

  beforeEach(() => {
    canvas = document.createElement('div');
    controller = new InputController(canvas);
    // Clear call log (but keep the same commitFrameMock reference)
    callLog.length = 0;
    commitFrameMock.mockClear();
    // Default return values — mocks must return primitives to avoid shared state
    mockMouseGetMovement.mockReturnValue(null); // no mouse movement by default
    mockKbUpdate.mockReturnValue(undefined);
    mockKbGetArcDelta.mockReturnValue(0);
    mockKbGetWorkAngleDelta.mockReturnValue(0);
    mockKbGetDragAngleDelta.mockReturnValue(0);
  });

  afterEach(() => {
    controller.detach();
  });

  describe('tick() commits clamped InputState', () => {
    it('calls commitFrame once per tick', () => {
      controller.tick(0.016);
      expect(commitFrameMock).toHaveBeenCalledTimes(1);
    });

    it('commitFrame argument contains all required InputState fields', () => {
      controller.tick(0.016);
      expect(callLog.length).toBe(1);
      const frame = callLog[0];
      expect(frame).toHaveProperty('input');
      expect(frame.input).toHaveProperty('arcLength');
      expect(frame.input).toHaveProperty('workAngle');
      expect(frame.input).toHaveProperty('dragAngle');
      expect(frame.input).toHaveProperty('positionX');
      expect(frame.input).toHaveProperty('positionZ');
      expect(frame.input).toHaveProperty('travelSpeed');
    });

    it('arc length accumulates from keyboard Q key', () => {
      mockKbGetArcDelta.mockReturnValue(0.5 * 0.016); // ARC_RATE * delta
      controller.tick(0.016);
      controller.tick(0.016);
      // 2 ticks * (0.5 mm/s * 0.016s) = 0.016 mm total rawArcLength
      expect(callLog[1].input.rawArcLength).toBeCloseTo(2 * 0.5 * 0.016, 5);
    });

    it('arc length clamped to [0, L_max] when raw would go negative', () => {
      mockKbGetArcDelta.mockReturnValue(-0.5 * 0.016); // E key
      controller.tick(0.016);
      // raw is clamped → arcLength ≥ 0
      expect(callLog[0].input.arcLength).toBeGreaterThanOrEqual(0);
    });

    it('arc length clamped to L_max when raw would exceed max', () => {
      mockKbGetArcDelta.mockReturnValue(100); // way beyond L_max
      controller.tick(0.016);
      expect(callLog[0].input.arcLength).toBeLessThanOrEqual(6.0);
    });

    it('workAngle clamped to [60, 120]', () => {
      mockKbGetWorkAngleDelta.mockReturnValue(100); // beyond bounds
      controller.tick(0.016);
      expect(callLog[0].input.workAngle).toBeGreaterThanOrEqual(60);
      expect(callLog[0].input.workAngle).toBeLessThanOrEqual(120);
    });

    it('dragAngle clamped to [40, 90]', () => {
      mockKbGetDragAngleDelta.mockReturnValue(-100); // below bounds
      controller.tick(0.016);
      expect(callLog[0].input.dragAngle).toBeGreaterThanOrEqual(40);
      expect(callLog[0].input.dragAngle).toBeLessThanOrEqual(90);
    });

    it('positionX clamped to [-50, 50] via large mouse movement', () => {
      mockMouseGetMovement.mockReturnValue({ dx: 1000, dy: 0 }); // 1000px → 150mm, clamped to 50mm
      controller.tick(0.016);
      expect(callLog[0].input.positionX).toBeLessThanOrEqual(50);
    });

    it('travelSpeed > 0 when mouse moves', () => {
      mockMouseGetMovement.mockReturnValue({ dx: 100, dy: 0 }); // 100px * 0.15 = 15mm
      controller.tick(0.016);
      expect(callLog[0].input.travelSpeed).toBeGreaterThan(0);
    });

    it('multiple ticks accumulate arc delta correctly', () => {
      mockKbGetArcDelta.mockReturnValue(0.5 * 0.016);
      controller.tick(0.016);
      controller.tick(0.016);
      controller.tick(0.016);
      // 3 ticks × (0.5 × 0.016) = 0.024 mm
      expect(callLog[2].input.rawArcLength).toBeCloseTo(3 * 0.5 * 0.016, 4);
    });
  });
});
