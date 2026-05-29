// src/app/constants.test.ts
import { describe, it, expect } from 'vitest';
import { ELECTRODE_PROFILES, DRIFT_CONFIG, INPUT_RATES, FRAME_BUDGET, AUDIO_MAPPINGS } from './constants';

describe('ELECTRODE_PROFILES', () => {
  it('E6013 has all required fields', () => {
    const p = ELECTRODE_PROFILES.E6013;
    expect(p.V0).toBe(20);
    expect(p.k).toBe(2.5);
    expect(p.I_optimal).toBe(100);
    expect(p.I_min).toBe(70);
    expect(p.I_max).toBe(130);
    expect(p.L_optimal).toBe(3.2);
    expect(p.L_max).toBe(6.0);
    expect(p.v_optimal).toBe(2.5);
    expect(p.W_base).toBe(8);
    expect(p.H_base).toBe(2.5);
    expect(p.P_base).toBe(2.0);
    expect(p.theta_work_opt).toBe(90);
    expect(p.theta_drag_opt).toBe(70);
    expect(p.K_melt).toBe(0.003);
    expect(p.initialLength).toBe(350);
  });

  it('v_optimal equals 150mm/min in mm/s', () => {
    expect(ELECTRODE_PROFILES.E6013.v_optimal).toBe(2.5); // 150/60
  });
});

describe('DRIFT_CONFIG', () => {
  it('school has all drift parameters', () => {
    const d = DRIFT_CONFIG.school;
    expect(d.freq).toBe(0.2);
    expect(d.arcLength).toBe(0.2);
    expect(d.workAngle).toBe(1.5);
    expect(d.dragAngle).toBe(1.2);
  });

  it('professional has all drift parameters', () => {
    const d = DRIFT_CONFIG.professional;
    expect(d.freq).toBe(0.35);
    expect(d.arcLength).toBe(0.5);
    expect(d.workAngle).toBe(3.5);
    expect(d.dragAngle).toBe(3.0);
  });

  it('expert has all drift parameters', () => {
    const d = DRIFT_CONFIG.expert;
    expect(d.freq).toBe(0.5);
    expect(d.arcLength).toBe(1.0);
    expect(d.workAngle).toBe(6.0);
    expect(d.dragAngle).toBe(5.5);
  });

  it('drift amplitudes increase with difficulty', () => {
    expect(DRIFT_CONFIG.school.arcLength).toBeLessThan(DRIFT_CONFIG.professional.arcLength);
    expect(DRIFT_CONFIG.professional.arcLength).toBeLessThan(DRIFT_CONFIG.expert.arcLength);
  });
});

describe('INPUT_RATES', () => {
  it('has all required input rates', () => {
    expect(INPUT_RATES.ARC_RATE).toBe(0.5);
    expect(INPUT_RATES.ANGLE_RATE).toBe(1.0);
    expect(INPUT_RATES.MOUSE_SENSITIVITY).toBe(0.15);
  });
});

describe('FRAME_BUDGET', () => {
  it('has all frame budget values', () => {
    expect(FRAME_BUDGET.BEAD_RENDERER).toBe(2);
    expect(FRAME_BUDGET.PHYSICS_ENGINE).toBe(0.5);
    expect(FRAME_BUDGET.SPATTER_SYSTEM).toBe(1);
    expect(FRAME_BUDGET.HUD_REACT).toBe(1);
    expect(FRAME_BUDGET.POST_PROCESSING).toBe(2);
    expect(FRAME_BUDGET.TOTAL_TARGET).toBe(8);
  });
});

describe('AUDIO_MAPPINGS', () => {
  it('has all audio mapping values', () => {
    expect(AUDIO_MAPPINGS.FILTER_FREQ_MIN).toBe(400);
    expect(AUDIO_MAPPINGS.FILTER_FREQ_MAX).toBe(3000);
    expect(AUDIO_MAPPINGS.FILTER_Q_MIN).toBe(0.5);
    expect(AUDIO_MAPPINGS.FILTER_Q_MAX).toBe(8.0);
    expect(AUDIO_MAPPINGS.GAIN_MIN).toBe(0.1);
    expect(AUDIO_MAPPINGS.GAIN_MAX).toBe(0.85);
  });

  it('FILTER_FREQ_MIN is less than FILTER_FREQ_MAX', () => {
    expect(AUDIO_MAPPINGS.FILTER_FREQ_MIN).toBeLessThan(AUDIO_MAPPINGS.FILTER_FREQ_MAX);
  });
});
