// src/engine/weld/defect.detector.test.ts — Defect detection logic tests
import { describe, it, expect } from 'vitest';
import { detectDefect } from './defect.detector';
import { ELECTRODE_PROFILES } from '../../app/constants';
import type { InputState, ArcState } from '../../app/store/types';

const profile = ELECTRODE_PROFILES.E6013;

function makeInput(overrides: Partial<InputState> = {}): InputState {
  return {
    rawArcLength: profile.L_optimal,
    rawWorkAngle: 90,
    rawDragAngle: 70,
    rawPositionX: 0,
    rawPositionZ: 0,
    arcLength: profile.L_optimal,
    workAngle: 90,
    dragAngle: 70,
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

describe('detectDefect', () => {
  describe('returns "none" at optimal parameters', () => {
    it('optimal arc length, speed, and amperage', () => {
      const input = makeInput();
      const arc = makeArc();
      expect(detectDefect(input, arc)).toBe('none');
    });
  });

  describe('undercut', () => {
    it('triggers when I > I_opt*1.3 AND speed > v_opt*1.2', () => {
      const input = makeInput({ travelSpeed: profile.v_optimal * 1.3 });
      const arc = makeArc({ amperage: profile.I_optimal * 1.4 });
      expect(detectDefect(input, arc)).toBe('undercut');
    });

    it('does NOT trigger when only amperage is high', () => {
      const input = makeInput({ travelSpeed: profile.v_optimal });
      const arc = makeArc({ amperage: profile.I_optimal * 1.4 });
      expect(detectDefect(input, arc)).toBe('none');
    });

    it('does NOT trigger when only speed is high', () => {
      const input = makeInput({ travelSpeed: profile.v_optimal * 1.3 });
      const arc = makeArc({ amperage: profile.I_optimal });
      expect(detectDefect(input, arc)).toBe('none');
    });
  });

  describe('overlap', () => {
    it('triggers when I < I_opt*0.7', () => {
      const input = makeInput();
      const arc = makeArc({ amperage: profile.I_optimal * 0.6 });
      expect(detectDefect(input, arc)).toBe('overlap');
    });

    it('triggers when speed < v_opt*0.5', () => {
      const input = makeInput({ travelSpeed: profile.v_optimal * 0.4 });
      const arc = makeArc();
      expect(detectDefect(input, arc)).toBe('overlap');
    });

    it('does NOT trigger when I slightly below optimal but not below 0.7', () => {
      const input = makeInput();
      const arc = makeArc({ amperage: profile.I_optimal * 0.75 });
      expect(detectDefect(input, arc)).toBe('none');
    });
  });

  describe('porosity', () => {
    it('triggers when L_arc > L_opt*1.8', () => {
      const input = makeInput({ arcLength: profile.L_optimal * 2 });
      const arc = makeArc();
      expect(detectDefect(input, arc)).toBe('porosity');
    });

    it('does NOT trigger when arc length is at but not above threshold', () => {
      const input = makeInput({ arcLength: profile.L_optimal * 1.8 });
      const arc = makeArc();
      expect(detectDefect(input, arc)).toBe('none');
    });
  });

  describe('spatter', () => {
    it('triggers when L_arc < L_opt*0.5', () => {
      const input = makeInput({ arcLength: profile.L_optimal * 0.4 });
      const arc = makeArc();
      expect(detectDefect(input, arc)).toBe('spatter');
    });

    it('triggers when I > I_opt*1.4', () => {
      const input = makeInput();
      const arc = makeArc({ amperage: profile.I_optimal * 1.5 });
      expect(detectDefect(input, arc)).toBe('spatter');
    });

    it('does NOT trigger at optimal parameters', () => {
      const input = makeInput();
      const arc = makeArc();
      expect(detectDefect(input, arc)).toBe('none');
    });
  });

  describe('incomplete_fusion', () => {
    it('triggers when speed > v_opt*1.8', () => {
      const input = makeInput({ travelSpeed: profile.v_optimal * 2 });
      const arc = makeArc();
      expect(detectDefect(input, arc)).toBe('incomplete_fusion');
    });

    it('does NOT trigger just above optimal speed', () => {
      const input = makeInput({ travelSpeed: profile.v_optimal * 1.7 });
      const arc = makeArc();
      expect(detectDefect(input, arc)).toBe('none');
    });
  });

  describe('burn_through', () => {
    it('triggers when I > I_opt*1.6 AND speed < v_opt*0.4', () => {
      const input = makeInput({ travelSpeed: profile.v_optimal * 0.3 });
      const arc = makeArc({ amperage: profile.I_optimal * 1.7 });
      expect(detectDefect(input, arc)).toBe('burn_through');
    });

    it('does NOT trigger when only amperage is high', () => {
      // I = 1.35× I_opt: above undercut threshold (1.3×) but below spatter threshold (1.4×).
      // At v_opt travel speed, undercut is NOT triggered (needs >1.2× v_opt).
      // No other defect applies at optimum arc length and amperage 1.35×.
      const input = makeInput({ travelSpeed: profile.v_optimal });
      const arc = makeArc({ amperage: profile.I_optimal * 1.35 });
      expect(detectDefect(input, arc)).toBe('none');
    });

    it('does NOT trigger when only speed is low', () => {
      // Speed must be >= v_opt*0.5 to avoid overlap. Use v_opt*0.6 which gives
      // 1.5 mm/s for E6013 — this is within the "safe" band [v_opt*0.5, v_opt*1.2]
      // so no defect should trigger at optimal amperage and arc length.
      const input = makeInput({ travelSpeed: profile.v_optimal * 0.6 });
      const arc = makeArc({ amperage: profile.I_optimal });
      expect(detectDefect(input, arc)).toBe('none');
    });
  });
});
