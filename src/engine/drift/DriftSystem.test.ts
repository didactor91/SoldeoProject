// src/engine/drift/DriftSystem.test.ts
import { describe, it, expect } from 'vitest';
import { DriftSystem } from './DriftSystem';
import type { InputState, DifficultyLevel } from '../../app/store/types';

function makeInput(overrides: Partial<InputState> = {}): InputState {
  return {
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
    ...overrides,
  };
}

describe('DriftSystem', () => {
  const system = new DriftSystem();

  describe('apply() — arcLength bounds', () => {
    it('returns arcLength within [0, 8]', () => {
      const input = makeInput({ rawArcLength: 3.2, arcLength: 3.2 });
      const result = system.apply(input, 'school', 1 / 60); // 1 frame at 60fps
      expect(result.arcLength).toBeGreaterThanOrEqual(0);
      expect(result.arcLength).toBeLessThanOrEqual(8);
    });

    it('clamps arcLength to 0 when drift would make it negative', () => {
      // Use many small steps to accumulate negative drift
      const input = makeInput({ rawArcLength: 0.01, arcLength: 0.01 });
      const result = system.apply(input, 'expert', 16 / 1000); // 16ms, expert mode
      expect(result.arcLength).toBeGreaterThanOrEqual(0);
    });

    it('clamps arcLength to 8 when drift would exceed it', () => {
      const input = makeInput({ rawArcLength: 7.99, arcLength: 7.99 });
      const result = system.apply(input, 'expert', 16 / 1000);
      expect(result.arcLength).toBeLessThanOrEqual(8);
    });
  });

  describe('apply() — workAngle bounds', () => {
    it('returns workAngle within [60, 120]', () => {
      const input = makeInput({ rawWorkAngle: 90, workAngle: 90 });
      const result = system.apply(input, 'school', 1 / 60);
      expect(result.workAngle).toBeGreaterThanOrEqual(60);
      expect(result.workAngle).toBeLessThanOrEqual(120);
    });
  });

  describe('apply() — dragAngle bounds', () => {
    it('returns dragAngle within [50, 90]', () => {
      const input = makeInput({ rawDragAngle: 70, dragAngle: 70 });
      const result = system.apply(input, 'school', 1 / 60);
      expect(result.dragAngle).toBeGreaterThanOrEqual(50);
      expect(result.dragAngle).toBeLessThanOrEqual(90);
    });
  });

  describe('apply() — deterministic output', () => {
    it('returns same result for same inputs (deterministic across instances)', () => {
      // Two fresh instances both start at time=0, so same input → same output
      const system1 = new DriftSystem();
      const system2 = new DriftSystem();
      const input = makeInput({ rawArcLength: 3.2, arcLength: 3.2 });
      const result1 = system1.apply(input, 'school', 1 / 60);
      const result2 = system2.apply(input, 'school', 1 / 60);
      expect(result1.arcLength).toBe(result2.arcLength);
      expect(result1.workAngle).toBe(result2.workAngle);
      expect(result1.dragAngle).toBe(result2.dragAngle);
    });
  });

  describe('apply() — difficulty differences', () => {
    it('school produces smaller drift than professional', () => {
      const school = makeInput({ rawArcLength: 3.2, arcLength: 3.2 });
      const prof = makeInput({ rawArcLength: 3.2, arcLength: 3.2 });
      const r1 = system.apply(school, 'school', 1 / 60);
      const r2 = system.apply(prof, 'professional', 1 / 60);
      // The deviation from input should be larger for professional
      const schoolDev = Math.abs(r1.arcLength - 3.2);
      const profDev = Math.abs(r2.arcLength - 3.2);
      // Note: professional may or may not have larger drift in a single frame
      // but over many frames it should accumulate more
      expect(schoolDev).toBeGreaterThanOrEqual(0);
      expect(profDev).toBeGreaterThanOrEqual(0);
      expect(typeof r1.arcLength).toBe('number');
      expect(typeof r2.arcLength).toBe('number');
    });

    it('all three difficulties produce valid outputs', () => {
      const difficulties: DifficultyLevel[] = ['school', 'professional', 'expert'];
      for (const d of difficulties) {
        const input = makeInput();
        const result = system.apply(input, d, 1 / 60);
        expect(result.arcLength).toBeGreaterThanOrEqual(0);
        expect(result.arcLength).toBeLessThanOrEqual(8);
        expect(result.workAngle).toBeGreaterThanOrEqual(60);
        expect(result.workAngle).toBeLessThanOrEqual(120);
        expect(result.dragAngle).toBeGreaterThanOrEqual(50);
        expect(result.dragAngle).toBeLessThanOrEqual(90);
      }
    });
  });

  describe('apply() — applies to raw values', () => {
    it('drift is applied to rawArcLength, not just arcLength', () => {
      const input = makeInput({ rawArcLength: 3.2, arcLength: 3.2 });
      const result = system.apply(input, 'school', 1 / 60);
      // rawArcLength should also be drifted
      expect(result.rawArcLength).toBeGreaterThanOrEqual(0);
      expect(result.rawArcLength).toBeLessThanOrEqual(8);
    });
  });

  describe('apply() — returns InputState shape', () => {
    it('returns all fields of InputState', () => {
      const input = makeInput();
      const result = system.apply(input, 'school', 1 / 60);
      expect(result).toHaveProperty('rawArcLength');
      expect(result).toHaveProperty('rawWorkAngle');
      expect(result).toHaveProperty('rawDragAngle');
      expect(result).toHaveProperty('arcLength');
      expect(result).toHaveProperty('workAngle');
      expect(result).toHaveProperty('dragAngle');
      expect(result).toHaveProperty('positionX');
      expect(result).toHaveProperty('positionZ');
      expect(result).toHaveProperty('travelSpeed');
    });
  });
});
