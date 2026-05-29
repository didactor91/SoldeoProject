// src/engine/electrode/ElectrodeEngine.test.ts — ElectrodeEngine unit tests
import { describe, it, expect } from 'vitest';
import { ElectrodeEngine } from './ElectrodeEngine';
import { ELECTRODE_PROFILES } from '../../app/constants';
import type { ElectrodeState, ArcState } from '../../app/store/types';

const profile = ELECTRODE_PROFILES.E6013;

function makeElectrode(overrides: Partial<ElectrodeState> = {}): ElectrodeState {
  return {
    type: 'E6013',
    initialLength: profile.initialLength,
    currentLength: profile.initialLength,
    remainingMass: 1.0,
    temperature: 20,
    isStuck: false,
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

describe('ElectrodeEngine', () => {
  const engine = new ElectrodeEngine();

  describe('deplete() — currentLength decreases', () => {
    it('currentLength decreases each tick when arc is active', () => {
      const electrode = makeElectrode({ currentLength: 350 });
      const arc = makeArc();
      const before = electrode.currentLength;
      const result = engine.deplete(electrode, arc, 1.0); // 1 second
      expect(result.currentLength!).toBeLessThan(before);
    });

    it('currentLength decreases proportionally to amperage', () => {
      const lowAmp = makeElectrode({ currentLength: 350 });
      const highAmp = makeElectrode({ currentLength: 350 });
      const arcLow = makeArc({ amperage: profile.I_min });
      const arcHigh = makeArc({ amperage: profile.I_max });

      const r1 = engine.deplete(lowAmp, arcLow, 1.0);
      const r2 = engine.deplete(highAmp, arcHigh, 1.0);

      // Higher amperage = faster depletion
      expect(r2.currentLength!).toBeLessThan(r1.currentLength!);
    });

    it('electrode fully depleted after ~180 seconds at 100A', () => {
      // K_melt = 0.0194 mm/(A·s), I = 100A
      // consumption rate = 0.0194 * 100 = 1.94 mm/s
      // 350mm / 1.94mm/s ≈ 180 seconds
      const electrode = makeElectrode({ initialLength: 350, currentLength: 350 });
      const arc = makeArc({ amperage: 100 });

      // After 100s at 100A: consumed = 0.0194 * 100 * 100 = 194mm
      const result100 = engine.deplete(electrode, arc, 100);
      expect(result100.currentLength!).toBeLessThan(350);
      expect(result100.currentLength!).toBeGreaterThan(140); // ~156mm remaining
    });
  });

  describe('deplete() — remainingMass', () => {
    it('remainingMass decreases as currentLength decreases', () => {
      // Start with currentLength at 50% of initialLength (175/350)
      const electrode = makeElectrode({ initialLength: 350, currentLength: 175 });
      const arc = makeArc();
      const before = electrode.remainingMass; // = 0.5
      const result = engine.deplete(electrode, arc, 1.0);
      expect(result.remainingMass!).toBeLessThan(before);
    });

    it('remainingMass = currentLength / initialLength', () => {
      const electrode = makeElectrode({ initialLength: 350, currentLength: 350 });
      const arc = makeArc();
      const result = engine.deplete(electrode, arc, 1.0);
      // remainingMass should approximately equal currentLength/initialLength
      expect(result.remainingMass!).toBeLessThan(1.0);
      expect(result.remainingMass!).toBeGreaterThan(0.99);
    });
  });

  describe('deplete() — temperature', () => {
    it('temperature increases when arc is active', () => {
      const electrode = makeElectrode({ temperature: 20 });
      const arc = makeArc({ amperage: profile.I_optimal });
      const result = engine.deplete(electrode, arc, 1.0);
      expect(result.temperature!).toBeGreaterThan(20);
    });

    it('temperature decreases toward ambient when arc is off', () => {
      const electrode = makeElectrode({ temperature: 100 });
      const arc = makeArc({ isActive: false });
      const result = engine.deplete(electrode, arc, 1.0);
      expect(result.temperature!).toBeLessThan(100);
      expect(result.temperature!).toBeGreaterThan(20);
    });
  });

  describe('deplete() — isStuck', () => {
    it('isStuck is false at optimal arc length', () => {
      const electrode = makeElectrode();
      const arc = makeArc({ isActive: true, arcLength: profile.L_optimal });
      const result = engine.deplete(electrode, arc, 1.0);
      expect(result.isStuck).toBe(false);
    });

    it('isStuck triggers when arcLength <= 0 AND amperage < I_min_for_clearing', () => {
      const electrode = makeElectrode();
      const arc = makeArc({ isActive: true, arcLength: 0, amperage: 80 });
      const result = engine.deplete(electrode, arc, 1.0);
      expect(result.isStuck).toBe(true);
    });

    it('isStuck does NOT trigger when arcLength <= 0 but amperage is sufficient', () => {
      const electrode = makeElectrode();
      const arc = makeArc({ isActive: true, arcLength: 0, amperage: profile.I_optimal });
      const result = engine.deplete(electrode, arc, 1.0);
      expect(result.isStuck).toBe(false);
    });

    it('isStuck does NOT trigger when arc is long but not zero', () => {
      const electrode = makeElectrode();
      const arc = makeArc({ isActive: true, arcLength: 0.1 });
      const result = engine.deplete(electrode, arc, 1.0);
      expect(result.isStuck).toBe(false);
    });
  });

  describe('deplete() — electrode depleted', () => {
    it('currentLength stops at 0 when fully depleted', () => {
      const electrode = makeElectrode({ currentLength: 0.1 });
      const arc = makeArc();
      const result = engine.deplete(electrode, arc, 1.0);
      expect(result.currentLength!).toBeGreaterThanOrEqual(0);
    });
  });
});