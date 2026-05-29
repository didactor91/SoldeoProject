// src/engine/weld/bead.geometry.test.ts
import { describe, it, expect } from 'vitest';
import { computeBeadWidth, computeBeadHeight, computePenetration } from './bead.geometry';
import { ELECTRODE_PROFILES } from '../../app/constants';

const profile = ELECTRODE_PROFILES.E6013;

describe('computeBeadWidth', () => {
  it('returns W_base when I=I_optimal and speed=v_optimal', () => {
    const w = computeBeadWidth(profile.I_optimal, profile.v_optimal, profile.L_optimal, profile);
    expect(w).toBeCloseTo(8.0, 0);
  });

  it('returns value between 1 and 15 mm', () => {
    const testCases = [
      { I: 70, speed: 1 },
      { I: 100, speed: 2.5 },
      { I: 130, speed: 4 },
      { I: 90, speed: 0.5 },
    ];
    for (const tc of testCases) {
      const w = computeBeadWidth(tc.I, tc.speed, profile.L_optimal, profile);
      expect(w).toBeGreaterThanOrEqual(1);
      expect(w).toBeLessThanOrEqual(15);
    }
  });

  it('width decreases at high travel speed', () => {
    const w1 = computeBeadWidth(profile.I_optimal, profile.v_optimal, profile.L_optimal, profile);
    const w2 = computeBeadWidth(profile.I_optimal, profile.v_optimal * 2, profile.L_optimal, profile);
    expect(w2).toBeLessThan(w1);
  });

  it('width decreases as arc length increases beyond optimal', () => {
    const w1 = computeBeadWidth(profile.I_optimal, profile.v_optimal, profile.L_optimal, profile);
    const w2 = computeBeadWidth(profile.I_optimal, profile.v_optimal, profile.L_optimal * 2, profile);
    expect(w2).toBeLessThan(w1);
  });

  it('width increases with amperage', () => {
    const w1 = computeBeadWidth(profile.I_optimal, profile.v_optimal, profile.L_optimal, profile);
    const w2 = computeBeadWidth(profile.I_max, profile.v_optimal, profile.L_optimal, profile);
    expect(w2).toBeGreaterThan(w1);
  });
});

describe('computeBeadHeight', () => {
  it('returns H_base when I=I_optimal and speed=v_optimal', () => {
    const h = computeBeadHeight(profile.I_optimal, profile.v_optimal, profile);
    expect(h).toBeCloseTo(2.5, 0);
  });

  it('returns value between 0.3 and 8 mm', () => {
    const testCases = [
      { I: 70, speed: 0.5 },
      { I: 100, speed: 2.5 },
      { I: 130, speed: 5 },
    ];
    for (const tc of testCases) {
      const h = computeBeadHeight(tc.I, tc.speed, profile);
      expect(h).toBeGreaterThanOrEqual(0.3);
      expect(h).toBeLessThanOrEqual(8);
    }
  });

  it('height decreases as travel speed increases', () => {
    const h1 = computeBeadHeight(profile.I_optimal, profile.v_optimal, profile);
    const h2 = computeBeadHeight(profile.I_optimal, profile.v_optimal * 1.5, profile);
    expect(h2).toBeLessThan(h1);
  });

  it('height increases with amperage', () => {
    const h1 = computeBeadHeight(profile.I_optimal, profile.v_optimal, profile);
    const h2 = computeBeadHeight(profile.I_max, profile.v_optimal, profile);
    expect(h2).toBeGreaterThan(h1);
  });
});

describe('computePenetration', () => {
  it('returns P_base when I=I_optimal and L_arc=L_optimal', () => {
    const p = computePenetration(profile.I_optimal, profile.L_optimal, profile);
    expect(p).toBeCloseTo(2.0, 0);
  });

  it('returns value between 0 and 5 mm', () => {
    const testCases = [
      { I: 70, L: 1 },
      { I: 100, L: 3.2 },
      { I: 130, L: 5 },
    ];
    for (const tc of testCases) {
      const p = computePenetration(tc.I, tc.L, profile);
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(5);
    }
  });

  it('penetration decreases as arc length increases beyond optimal', () => {
    const p1 = computePenetration(profile.I_optimal, profile.L_optimal, profile);
    const p2 = computePenetration(profile.I_optimal, profile.L_optimal * 2, profile);
    expect(p2).toBeLessThan(p1);
  });

  it('penetration increases with amperage', () => {
    const p1 = computePenetration(profile.I_optimal, profile.L_optimal, profile);
    const p2 = computePenetration(profile.I_max, profile.L_optimal, profile);
    expect(p2).toBeGreaterThan(p1);
  });

  it('penetration peaks at optimal arc length for given amperage', () => {
    const p_optimal = computePenetration(profile.I_optimal, profile.L_optimal, profile);
    const p_long = computePenetration(profile.I_optimal, profile.L_optimal * 1.5, profile);
    const p_short = computePenetration(profile.I_optimal, profile.L_optimal * 0.5, profile);
    expect(p_optimal).toBeGreaterThan(p_long);
    expect(p_optimal).toBeGreaterThan(p_short);
  });
});