// src/input/KeyboardTracker.test.ts — KeyboardTracker unit tests
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { KeyboardTracker } from './KeyboardTracker';

// Mock INPUT_RATES
vi.mock('../app/constants', () => ({
  INPUT_RATES: { ANGLE_RATE: 1.0, ARC_RATE: 0.5, MOUSE_SENSITIVITY: 0.15 },
}));

describe('KeyboardTracker', () => {
  let tracker: KeyboardTracker;

  beforeEach(() => {
    tracker = new KeyboardTracker();
  });

  afterEach(() => {
    tracker.dispose();
  });

  describe('isPressed', () => {
    it('returns false for unknown key initially', () => {
      expect(tracker.isPressed('KeyW')).toBe(false);
      expect(tracker.isPressed('KeyQ')).toBe(false);
      expect(tracker.isPressed('KeyZ')).toBe(false);
    });
  });

  describe('keydown/keyup state', () => {
    it('sets true on keydown', () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
      expect(tracker.isPressed('KeyW')).toBe(true);
    });

    it('sets false on keyup', () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
      window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW' }));
      expect(tracker.isPressed('KeyW')).toBe(false);
    });

    it('tracks multiple keys independently', () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyA' }));
      expect(tracker.isPressed('KeyW')).toBe(true);
      expect(tracker.isPressed('KeyA')).toBe(true);
      expect(tracker.isPressed('KeyD')).toBe(false);
    });
  });

  describe('update() calculates deltas', () => {
    const DELTA = 0.016; // ~60fps frame time

    it('Q key produces positive arc delta', () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyQ' }));
      tracker.update(DELTA);
      const expected = 0.5 * DELTA;
      expect(tracker.getArcDelta()).toBeCloseTo(expected, 5);
    });

    it('E key produces negative arc delta', () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE' }));
      tracker.update(DELTA);
      const expected = -0.5 * DELTA;
      expect(tracker.getArcDelta()).toBeCloseTo(expected, 5);
    });

    it('W key produces positive workAngle delta', () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
      tracker.update(DELTA);
      expect(tracker.getWorkAngleDelta()).toBeCloseTo(1.0 * DELTA, 5);
    });

    it('S key produces negative workAngle delta', () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyS' }));
      tracker.update(DELTA);
      expect(tracker.getWorkAngleDelta()).toBeCloseTo(-1.0 * DELTA, 5);
    });

    it('A key produces negative dragAngle delta', () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyA' }));
      tracker.update(DELTA);
      expect(tracker.getDragAngleDelta()).toBeCloseTo(-1.0 * DELTA, 5);
    });

    it('D key produces positive dragAngle delta', () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyD' }));
      tracker.update(DELTA);
      expect(tracker.getDragAngleDelta()).toBeCloseTo(1.0 * DELTA, 5);
    });

    it('simultaneous W+A produces both workAngle and dragAngle deltas', () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyA' }));
      tracker.update(DELTA);
      expect(tracker.getWorkAngleDelta()).toBeCloseTo(1.0 * DELTA, 5);
      expect(tracker.getDragAngleDelta()).toBeCloseTo(-1.0 * DELTA, 5);
    });

    it('neutral when no keys pressed', () => {
      tracker.update(DELTA);
      expect(tracker.getArcDelta()).toBe(0);
      expect(tracker.getWorkAngleDelta()).toBe(0);
      expect(tracker.getDragAngleDelta()).toBe(0);
    });
  });

  describe('reset()', () => {
    it('clears all pressed keys', () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyQ' }));
      tracker.reset();
      expect(tracker.isPressed('KeyW')).toBe(false);
      expect(tracker.isPressed('KeyQ')).toBe(false);
    });
  });

  describe('dispose', () => {
    it('removes listeners so subsequent key presses do not update state', () => {
      tracker.dispose();
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
      expect(tracker.isPressed('KeyW')).toBe(false);
    });
  });

  describe('getState()', () => {
    it('returns a ReadonlyMap with the current key state', () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
      const state = tracker.getState();
      expect(state.get('KeyW')).toBe(true);
      expect(state.get('KeyQ')).toBe(false);
    });

    it('returns the same map reference on repeated calls (zero allocation)', () => {
      const state1 = tracker.getState();
      const state2 = tracker.getState();
      expect(state1).toBe(state2);
    });
  });
});
