// src/engine/weld/WeldEngine.test.ts
import { describe, it, expect } from 'vitest';
import { WeldEngine } from './WeldEngine';
import { ELECTRODE_PROFILES } from '../../app/constants';
import type { InputState, ArcState } from '../../app/store/types';

const profile = ELECTRODE_PROFILES.E6013;

function makeInput(overrides: Partial<InputState> = {}): InputState {
  return {
    rawArcLength: profile.L_optimal,
    rawWorkAngle: profile.theta_work_opt,
    rawDragAngle: profile.theta_drag_opt,
    rawPositionX: 0,
    rawPositionZ: 0,
    arcLength: profile.L_optimal,
    workAngle: profile.theta_work_opt,
    dragAngle: profile.theta_drag_opt,
    positionX: 0,
    positionZ: 0,
    travelSpeed: profile.v_optimal,
    ...overrides,
  };
}

function makeArc(overrides: Partial<ArcState> = {}): ArcState {
  return {
    isActive: true,
    arcLength: profile.L_optimal,
    voltage: 28,
    amperage: profile.I_optimal,
    stability: 1.0,
    ...overrides,
  };
}

describe('WeldEngine', () => {
  const engine = new WeldEngine();

  describe('computeStamp() — geometry', () => {
    it('returns bead geometry within physical bounds at optimal parameters', () => {
      const input = makeInput();
      const arcResult = { arcLength: profile.L_optimal };
      const arc = makeArc();
      const result = engine.computeStamp(input, arcResult, arc);
      expect(result.width).toBeGreaterThanOrEqual(1);
      expect(result.width).toBeLessThanOrEqual(15);
      expect(result.height).toBeGreaterThanOrEqual(0.3);
      expect(result.height).toBeLessThanOrEqual(8);
      expect(result.penetration).toBeGreaterThanOrEqual(0);
      expect(result.penetration).toBeLessThanOrEqual(5);
    });

    it('width decreases at high travel speed', () => {
      const input1 = makeInput({ travelSpeed: profile.v_optimal });
      const input2 = makeInput({ travelSpeed: (profile.v_optimal) * 2 });
      const arcResult = { arcLength: profile.L_optimal };
      const arc = makeArc();
      const r1 = engine.computeStamp(input1, arcResult, arc);
      const r2 = engine.computeStamp(input2, arcResult, arc);
      expect(r2.width).toBeLessThan(r1.width);
    });

    it('penetration decreases as arc length increases beyond optimal', () => {
      const input1 = makeInput({ arcLength: profile.L_optimal });
      const input2 = makeInput({ arcLength: profile.L_optimal * 2 });
      const arc = makeArc();
      const r1 = engine.computeStamp(input1, { arcLength: profile.L_optimal }, arc);
      const r2 = engine.computeStamp(input2, { arcLength: profile.L_optimal * 2 }, arc);
      expect(r2.penetration).toBeLessThan(r1.penetration);
    });
  });

  describe('computeStamp() — defect', () => {
    it('returns "none" defect at optimal parameters', () => {
      const input = makeInput();
      const arcResult = { arcLength: profile.L_optimal };
      const arc = makeArc();
      const result = engine.computeStamp(input, arcResult, arc);
      expect(result.defect).toBe('none');
    });

    it('returns "undercut" when amperage too high and speed too fast', () => {
      const input = makeInput({ travelSpeed: (profile.v_optimal) * 1.3 });
      const arc = makeArc({ amperage: profile.I_optimal * 1.4 });
      const result = engine.computeStamp(input, { arcLength: profile.L_optimal }, arc);
      expect(result.defect).toBe('undercut');
    });

    it('returns "spatter" when arc is too short', () => {
      const input = makeInput({ arcLength: profile.L_optimal * 0.3 });
      const arc = makeArc();
      const result = engine.computeStamp(input, { arcLength: profile.L_optimal * 0.3 }, arc);
      expect(result.defect).toBe('spatter');
    });
  });

  describe('computeStamp() — return shape', () => {
    it('returns BeadStampGeometry + defect', () => {
      const input = makeInput();
      const arcResult = { arcLength: profile.L_optimal };
      const arc = makeArc();
      const result = engine.computeStamp(input, arcResult, arc);
      expect(result).toHaveProperty('width');
      expect(result).toHaveProperty('height');
      expect(result).toHaveProperty('penetration');
      expect(result).toHaveProperty('defect');
    });
  });
});
