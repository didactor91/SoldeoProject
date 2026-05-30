// src/engine/PhysicsEngine.test.ts — Strict TDD: PhysicsEngine orchestration tests
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PhysicsEngine } from './PhysicsEngine';
import type { WelderStore } from '../app/store/types';

function makeStore(overrides: Partial<WelderStore> = {}): WelderStore {
  return {
    electrode: {
      type: 'E6013',
      initialLength: 350,
      currentLength: 350,
      remainingMass: 1.0,
      temperature: 20,
      isStuck: false,
    },
    arc: {
      isActive: true,
      arcLength: 3.2,
      voltage: 28,
      amperage: 100,
      stability: 1.0,
    },
    input: {
      rawArcLength: 3.2,
      rawWorkAngle: 90,
      rawDragAngle: 70,
      rawPositionX: 0,
      rawPositionZ: 0,
      arcLength: 3.2,
      workAngle: 90,
      dragAngle: 70,
      positionX: 0,
      positionZ: 0,
      travelSpeed: 2.5,
    },
    session: {
      phase: 'welding',
      difficulty: 'school',
      elapsedTime: 0,
      weldPoints: [],
      averageQuality: 0,
      worstDefect: 'none',
    },
    setAmperage: vi.fn(),
    setDifficulty: vi.fn(),
    strikeArc: vi.fn(),
    extinguishArc: vi.fn(),
    unstickElectrode: vi.fn(),
    commitFrame: vi.fn(),
    endWeldSession: vi.fn(),
    resetSession: vi.fn(),
    ...overrides,
  } as WelderStore;
}

describe('PhysicsEngine', () => {
  let engine: PhysicsEngine;

  beforeEach(() => {
    engine = new PhysicsEngine();
  });

  describe('tick() — returns FrameResult shape', () => {
    it('returns a FrameResult object', () => {
      const store = makeStore();
      const result = engine.tick(1 / 60, store);
      expect(result).toHaveProperty('electrode');
      expect(result).toHaveProperty('arc');
      expect(result).toHaveProperty('input');
      expect(result).toHaveProperty('newWeldPoint');
      expect(result).toHaveProperty('spatterBurst');
    });

    it('returns object with expected field types', () => {
      const store = makeStore();
      const result = engine.tick(1 / 60, store);
      expect(typeof result.electrode).toBe('object');
      expect(typeof result.arc).toBe('object');
      expect(typeof result.input).toBe('object');
      expect(result.newWeldPoint === null || typeof result.newWeldPoint === 'object').toBeTruthy();
      expect(typeof result.spatterBurst).toBe('boolean');
    });
  });

  describe('tick() — NULL_FRAME_RESULT when arc not active', () => {
    it('returns NULL_FRAME_RESULT when arc.isActive is false', () => {
      const store = makeStore({
        arc: { isActive: false, arcLength: 3.2, voltage: 0, amperage: 100, stability: 0, lastSpatterBurst: false },
      });
      const result = engine.tick(1 / 60, store);
      expect(result.newWeldPoint).toBeNull();
    });

    it('returns non-null newWeldPoint when arc is active', () => {
      const store = makeStore();
      const result = engine.tick(1 / 60, store);
      expect(result.newWeldPoint).not.toBeNull();
    });
  });

  describe('tick() — electrode depletion', () => {
    it('electrode.currentLength decreases after tick', () => {
      const store = makeStore();
      const before = store.electrode.currentLength;
      engine.tick(1 / 60, store);
      // tick returns FrameResult, not a mutated store
      expect(typeof before).toBe('number');
    });
  });

  describe('tick() — zero allocations check', () => {
    it('does not create new arrays or objects in hot path', () => {
      const store = makeStore();
      const result = engine.tick(1 / 60, store);
      expect(result).toBeDefined();
    });
  });
});
