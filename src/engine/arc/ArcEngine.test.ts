// src/engine/arc/ArcEngine.test.ts
import { describe, it, expect } from 'vitest';
import { ArcEngine } from './ArcEngine';
import { ELECTRODE_PROFILES } from '../../app/constants';
import type { InputState, ArcState, ElectrodeState } from '../../app/store/types';

const profile = ELECTRODE_PROFILES.E6013;

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

function makeArc(overrides: Partial<ArcState> = {}): ArcState {
  return {
    isActive: true,
    arcLength: 3.2,
    voltage: 28,
    amperage: 100,
    stability: 1.0,
    lastSpatterBurst: false,
    ...overrides,
  };
}

function makeElectrode(overrides: Partial<ElectrodeState> = {}): ElectrodeState {
  return {
    type: 'E6013',
    initialLength: 350,
    currentLength: 350,
    remainingMass: 1.0,
    temperature: 20,
    isStuck: false,
    ...overrides,
  };
}

describe('ArcEngine', () => {
  const engine = new ArcEngine();

  describe('evaluate() — isActive conditions', () => {
    it('returns isActive: false when arcLength > L_max', () => {
      const input = makeInput({ arcLength: profile.L_max + 1 });
      const arc = makeArc();
      const electrode = makeElectrode();
      const result = engine.evaluate(input, arc, electrode);
      expect(result.isActive).toBe(false);
    });

    it('returns isActive: false when arcLength = 0', () => {
      const input = makeInput({ arcLength: 0 });
      const arc = makeArc();
      const electrode = makeElectrode();
      const result = engine.evaluate(input, arc, electrode);
      expect(result.isActive).toBe(false);
    });

    it('returns isActive: false when electrode.currentLength <= 0', () => {
      const input = makeInput();
      const arc = makeArc();
      const electrode = makeElectrode({ currentLength: 0 });
      const result = engine.evaluate(input, arc, electrode);
      expect(result.isActive).toBe(false);
    });

    it('returns isActive: true when arcLength is within [0, L_max] and electrode has length', () => {
      const input = makeInput({ arcLength: profile.L_optimal });
      const arc = makeArc();
      const electrode = makeElectrode();
      const result = engine.evaluate(input, arc, electrode);
      expect(result.isActive).toBe(true);
    });

    it('returns isActive: true at exact L_max boundary', () => {
      const input = makeInput({ arcLength: profile.L_max });
      const arc = makeArc();
      const electrode = makeElectrode();
      const result = engine.evaluate(input, arc, electrode);
      expect(result.isActive).toBe(true);
    });
  });

  describe('evaluate() — voltage', () => {
    it('voltage equals V0 when arcLength = 0', () => {
      const input = makeInput({ arcLength: 0 });
      const arc = makeArc();
      const electrode = makeElectrode();
      const result = engine.evaluate(input, arc, electrode);
      expect(result.voltage).toBe(profile.V0); // 20V
    });

    it('voltage increases linearly with arcLength', () => {
      const input1 = makeInput({ arcLength: 1 });
      const input2 = makeInput({ arcLength: 2 });
      const arc = makeArc();
      const electrode = makeElectrode();
      const r1 = engine.evaluate(input1, arc, electrode);
      const r2 = engine.evaluate(input2, arc, electrode);
      expect(r2.voltage! - r1.voltage!).toBeCloseTo(profile.k); // k = 2.5 V/mm
    });
  });

  describe('evaluate() — stability', () => {
    it('stability peaks at 1.0 when all parameters at optimal', () => {
      const input = makeInput({ arcLength: profile.L_optimal });
      const arc = makeArc({ amperage: profile.I_optimal });
      const electrode = makeElectrode();
      const result = engine.evaluate(input, arc, electrode);
      expect(result.stability).toBeCloseTo(1.0);
    });

    it('stability is less than 1.0 when arcLength deviates from optimal', () => {
      const input = makeInput({ arcLength: profile.L_optimal * 2 });
      const arc = makeArc({ amperage: profile.I_optimal });
      const electrode = makeElectrode();
      const result = engine.evaluate(input, arc, electrode);
      expect(result.stability).toBeLessThan(1.0);
      expect(result.stability).toBeGreaterThan(0);
    });

    it('stability is less than 1.0 when amperage deviates from optimal', () => {
      const input = makeInput({ arcLength: profile.L_optimal });
      const arc = makeArc({ amperage: profile.I_min });
      const electrode = makeElectrode();
      const result = engine.evaluate(input, arc, electrode);
      expect(result.stability).toBeLessThan(1.0);
      expect(result.stability).toBeGreaterThan(0);
    });

    it('stability is always between 0 and 1', () => {
      const testCases = [
        { arcLength: 0, amperage: 70 },
        { arcLength: profile.L_max, amperage: profile.I_max },
        { arcLength: 1, amperage: 90 },
        { arcLength: 5, amperage: 120 },
      ];
      for (const tc of testCases) {
        const input = makeInput({ arcLength: tc.arcLength });
        const arc = makeArc({ amperage: tc.amperage });
        const electrode = makeElectrode();
        const result = engine.evaluate(input, arc, electrode);
        expect(result.stability!).toBeGreaterThanOrEqual(0);
        expect(result.stability!).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('evaluate() — returns correct shape', () => {
    it('returns Partial<ArcState> with expected keys', () => {
      const input = makeInput();
      const arc = makeArc();
      const electrode = makeElectrode();
      const result = engine.evaluate(input, arc, electrode);
      expect(result).toHaveProperty('voltage');
      expect(result).toHaveProperty('stability');
      expect(result).toHaveProperty('isActive');
      expect(result).toHaveProperty('arcLength');
    });
  });
});