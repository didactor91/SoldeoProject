// src/engine/scoring/ScoringEngine.test.ts — Phase 1, Task 2.3
// Strict TDD: write test FIRST
import { describe, it, expect } from 'vitest';
import { ScoringEngine } from './ScoringEngine';
import { ELECTRODE_PROFILES } from '../../app/constants';
import type { InputState, ArcState, ArcResult } from '../../app/store/types';

const profile = ELECTRODE_PROFILES.E6013;

// travelSpeed units: InputState.travelSpeed is in mm/s (per types.ts and bead.geometry.ts usage)
// v_optimal in constants.ts is already in mm/s
const V_OPT_mm_per_s = profile.v_optimal;

function makeInput(overrides: Partial<InputState> = {}): InputState {
  return {
    rawArcLength: profile.L_optimal,
    rawWorkAngle: profile.theta_work_opt,
    rawDragAngle: profile.theta_drag_opt,
    rawPositionX: 0,
    rawPositionZ: 0,
    arcLength: profile.L_optimal,
    workAngle: profile.theta_work_opt ?? 90,
    dragAngle: profile.theta_drag_opt ?? 45,
    positionX: 0,
    positionZ: 0,
    travelSpeed: V_OPT_mm_per_s, // default: optimal in mm/s
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

function makeArcResult(overrides: Partial<ArcResult> = {}): ArcResult {
  return {
    arcLength: profile.L_optimal,
    voltage: 28,
    stability: 1.0,
    isActive: true,
    ...overrides,
  };
}

describe('ScoringEngine', () => {
  const engine = new ScoringEngine();

  describe('score() — Q at optimal parameters', () => {
    it('Q = 1.0 when all parameters exactly at optimal', () => {
      const input = makeInput();
      const arcResult = makeArcResult({ arcLength: profile.L_optimal });
      const arc = makeArc();
      const result = engine.score(input, arcResult, arc);
      expect(result.Q).toBeCloseTo(1.0, 5);
    });
  });

  describe('score() — Q < 1 at non-optimal parameters', () => {
    it('Q < 1.0 when arc length deviates from optimal', () => {
      const input = makeInput({ arcLength: profile.L_optimal * 2 });
      const arcResult = makeArcResult({ arcLength: profile.L_optimal * 2 });
      const arc = makeArc();
      const result = engine.score(input, arcResult, arc);
      expect(result.Q).toBeLessThan(1.0);
      expect(result.Q).toBeGreaterThan(0);
    });

    it('Q < 1.0 when travel speed deviates from optimal', () => {
      const input = makeInput({ travelSpeed: V_OPT_mm_per_s * 2 }); // double = 5 mm/s
      const arcResult = makeArcResult({ arcLength: profile.L_optimal });
      const arc = makeArc();
      const result = engine.score(input, arcResult, arc);
      expect(result.Q).toBeLessThan(1.0);
    });
  });

  describe('score() — Q < 0.5 condition', () => {
    it('Q < 0.5 when arc length is 2× optimal', () => {
      const input = makeInput({ arcLength: profile.L_optimal * 2 });
      const arcResult = makeArcResult({ arcLength: profile.L_optimal * 2 });
      const arc = makeArc({ amperage: profile.I_optimal });
      const result = engine.score(input, arcResult, arc);
      expect(result.Q).toBeLessThan(0.5);
    });

    it('Q < 0.5 when travel speed is 2× optimal', () => {
      const input = makeInput({ travelSpeed: V_OPT_mm_per_s * 2 });
      const arcResult = makeArcResult({ arcLength: profile.L_optimal });
      const arc = makeArc();
      const result = engine.score(input, arcResult, arc);
      expect(result.Q).toBeLessThan(0.5);
    });
  });

  describe('score() — Q always in [0, 1]', () => {
    it('Q is always >= 0', () => {
      const extremeCases = [
        { arcLength: 0.1, travelSpeed: 0.1, amperage: 70 },
        { arcLength: profile.L_max, travelSpeed: 5, amperage: 130 },
        { arcLength: 5, travelSpeed: 0.1, amperage: 120 },
      ];
      for (const tc of extremeCases) {
        const input = makeInput({ arcLength: tc.arcLength, travelSpeed: tc.travelSpeed });
        const arcResult = makeArcResult({ arcLength: tc.arcLength });
        const arc = makeArc({ amperage: tc.amperage });
        const result = engine.score(input, arcResult, arc);
        expect(result.Q).toBeGreaterThanOrEqual(0);
      }
    });

    it('Q is always <= 1', () => {
      const input = makeInput();
      const arcResult = makeArcResult({ arcLength: profile.L_optimal });
      const arc = makeArc();
      const result = engine.score(input, arcResult, arc);
      expect(result.Q).toBeLessThanOrEqual(1.0);
    });
  });

  describe('score() — isSpatter', () => {
    it('isSpatter = true when arc length < L_opt*0.5', () => {
      const input = makeInput({ arcLength: profile.L_optimal * 0.3 });
      const arcResult = makeArcResult({ arcLength: profile.L_optimal * 0.3 });
      const arc = makeArc();
      const result = engine.score(input, arcResult, arc);
      expect(result.isSpatter).toBe(true);
    });

    it('isSpatter = true when amperage > I_opt*1.4', () => {
      const input = makeInput();
      const arcResult = makeArcResult({ arcLength: profile.L_optimal });
      const arc = makeArc({ amperage: profile.I_optimal * 1.5 });
      const result = engine.score(input, arcResult, arc);
      expect(result.isSpatter).toBe(true);
    });

    it('isSpatter = false at optimal parameters', () => {
      const input = makeInput();
      const arcResult = makeArcResult({ arcLength: profile.L_optimal });
      const arc = makeArc();
      const result = engine.score(input, arcResult, arc);
      expect(result.isSpatter).toBe(false);
    });
  });

  describe('score() — dominantDefect', () => {
    it('dominantDefect is spatter when arc is too short', () => {
      // L = 0.96mm (< L_opt*0.5 = 1.6mm) triggers spatter per detectDefect priority
      // ensure travelSpeed is in normal range so it doesn't trigger incomplete_fusion
      const input = makeInput({
        arcLength: profile.L_optimal * 0.3, // 0.96mm < 1.6mm
        travelSpeed: V_OPT_mm_per_s, // normal speed, not triggering any defect
      });
      const arcResult = makeArcResult({ arcLength: profile.L_optimal * 0.3 });
      const arc = makeArc();
      const result = engine.score(input, arcResult, arc);
      expect(result.dominantDefect).toBe('spatter');
    });

    it('dominantDefect is porosity when arc is too long', () => {
      // L = 6.4mm (> L_opt*1.8 = 5.76mm) triggers porosity per detectDefect
      // ensure travelSpeed is normal so it doesn't trigger incomplete_fusion
      const input = makeInput({
        arcLength: profile.L_optimal * 2, // 6.4mm > 5.76mm
        travelSpeed: V_OPT_mm_per_s, // normal speed ~2.5mm/s < v_opt*1.8
      });
      const arcResult = makeArcResult({ arcLength: profile.L_optimal * 2 });
      const arc = makeArc();
      const result = engine.score(input, arcResult, arc);
      expect(result.dominantDefect).toBe('porosity');
    });
  });

  describe('score() — return shape', () => {
    it('returns { Q, dominantDefect, isSpatter }', () => {
      const input = makeInput();
      const arcResult = makeArcResult({ arcLength: profile.L_optimal });
      const arc = makeArc();
      const result = engine.score(input, arcResult, arc);
      expect(result).toHaveProperty('Q');
      expect(result).toHaveProperty('dominantDefect');
      expect(result).toHaveProperty('isSpatter');
    });
  });
});
