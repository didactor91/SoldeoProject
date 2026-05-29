// src/engine/electrode/electrode.profiles.test.ts
import { describe, it, expect } from 'vitest';
import { getElectrodeProfile, ELECTRODE_CONSUMPTION_PARAMS } from './electrode.profiles';
import { ELECTRODE_PROFILES } from '../../app/constants';

describe('getElectrodeProfile', () => {
  it('returns E6013 profile when type is E6013', () => {
    const p = getElectrodeProfile('E6013');
    expect(p.I_optimal).toBe(ELECTRODE_PROFILES.E6013.I_optimal);
    expect(p.I_min).toBe(ELECTRODE_PROFILES.E6013.I_min);
    expect(p.I_max).toBe(ELECTRODE_PROFILES.E6013.I_max);
    expect(p.L_optimal).toBe(ELECTRODE_PROFILES.E6013.L_optimal);
    expect(p.K_melt).toBe(ELECTRODE_PROFILES.E6013.K_melt);
  });

  it('returns E7018 profile when type is E7018', () => {
    const p = getElectrodeProfile('E7018');
    expect(p.I_optimal).toBe(110); // E7018 optimal is 110A
    expect(p.I_min).toBe(60);
    expect(p.I_max).toBe(160);
  });

  it('E7018 has different I_optimal than E6013', () => {
    const e6013 = getElectrodeProfile('E6013');
    const e7018 = getElectrodeProfile('E7018');
    expect(e7018.I_optimal).not.toBe(e6013.I_optimal);
    expect(e7018.I_optimal).toBe(110);
  });
});

describe('ELECTRODE_CONSUMPTION_PARAMS', () => {
  it('E6013 has K_temp > 0', () => {
    expect(ELECTRODE_CONSUMPTION_PARAMS.E6013.K_temp).toBeGreaterThan(0);
  });

  it('E6013 has R_electrode > 0', () => {
    expect(ELECTRODE_CONSUMPTION_PARAMS.E6013.R_electrode).toBeGreaterThan(0);
  });

  it('E6013 has K_heat > 0', () => {
    expect(ELECTRODE_CONSUMPTION_PARAMS.E6013.K_heat).toBeGreaterThan(0);
  });

  it('E6013 has K_cool > 0', () => {
    expect(ELECTRODE_CONSUMPTION_PARAMS.E6013.K_cool).toBeGreaterThan(0);
  });

  it('E6013 has T_ambient = 20°C', () => {
    expect(ELECTRODE_CONSUMPTION_PARAMS.E6013.T_ambient).toBe(20);
  });

  it('E6013 has I_min_for_clearing between I_min and I_optimal', () => {
    const p = ELECTRODE_CONSUMPTION_PARAMS.E6013;
    expect(p.I_min_for_clearing).toBeGreaterThanOrEqual(ELECTRODE_PROFILES.E6013.I_min);
    expect(p.I_min_for_clearing).toBeLessThanOrEqual(ELECTRODE_PROFILES.E6013.I_optimal);
  });

  it('E7018 has all required temperature model params', () => {
    const p = ELECTRODE_CONSUMPTION_PARAMS.E7018;
    expect(p.K_temp).toBeGreaterThan(0);
    expect(p.R_electrode).toBeGreaterThan(0);
    expect(p.K_heat).toBeGreaterThan(0);
    expect(p.K_cool).toBeGreaterThan(0);
    expect(p.T_ambient).toBe(20);
  });

  it('E7018 has higher I_min_for_clearing than E6013 (stricter arc requirement)', () => {
    const e6013 = ELECTRODE_CONSUMPTION_PARAMS.E6013;
    const e7018 = ELECTRODE_CONSUMPTION_PARAMS.E7018;
    // E7018 requires closer arc control, so needs more amperage to unstick
    expect(e7018.I_min_for_clearing).toBeGreaterThan(e6013.I_min_for_clearing);
  });
});