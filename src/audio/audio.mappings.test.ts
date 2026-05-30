// src/audio/audio.mappings.test.ts — TDD tests for audio.mappings
// RED first: write tests that define expected behavior

import { describe, it, expect } from 'vitest';
import {
  mapArcLengthToFrequency,
  mapStabilityToQ,
  mapAmperageToGain,
  clampAudioValue,
} from './audio.mappings';

describe('audio.mappings', () => {
  describe('mapArcLengthToFrequency', () => {
    it('returns 3000Hz at arcLength=0 (E6013)', () => {
      const freq = mapArcLengthToFrequency(0, 'E6013');
      expect(freq).toBeCloseTo(3000, 0);
    });

    it('returns 400Hz at arcLength=L_max (E6013)', () => {
      // E6013 L_max = 6.0mm
      const freq = mapArcLengthToFrequency(6.0, 'E6013');
      expect(freq).toBeCloseTo(400, 0);
    });

    it('returns midpoint (~1700Hz) at arcLength=L_optimal/2', () => {
      // E6013 L_optimal = 3.2mm, L_max = 6.0mm
      // At 3.0mm: normalized = 3/6 = 0.5, freq = 3000 - 0.5 * 2600 = 1700
      const freq = mapArcLengthToFrequency(3.0, 'E6013');
      expect(freq).toBeCloseTo(1700, 0);
    });

    it('handles arc length above L_max (clamps to 400Hz minimum)', () => {
      const freq = mapArcLengthToFrequency(10, 'E6013');
      expect(freq).toBe(400); // clamped to minimum
    });

    it('handles negative arc length (clamps to 3000Hz maximum)', () => {
      const freq = mapArcLengthToFrequency(-2, 'E6013');
      expect(freq).toBe(3000); // clamped to maximum
    });

    it('uses E7018 L_max (6.5mm) when electrode type is E7018', () => {
      // At 6.5mm (L_max for E7018), should return 400Hz
      const freq = mapArcLengthToFrequency(6.5, 'E7018');
      expect(freq).toBeCloseTo(400, 0);
      // At 0mm, should return 3000Hz
      const freqAtZero = mapArcLengthToFrequency(0, 'E7018');
      expect(freqAtZero).toBeCloseTo(3000, 0);
    });
  });

  describe('mapStabilityToQ', () => {
    it('returns 0.5 at stability=0 (unstable arc)', () => {
      const q = mapStabilityToQ(0);
      expect(q).toBeCloseTo(0.5, 2);
    });

    it('returns 8.0 at stability=1 (stable arc)', () => {
      const q = mapStabilityToQ(1);
      expect(q).toBeCloseTo(8.0, 2);
    });

    it('returns midpoint (4.25) at stability=0.5', () => {
      const q = mapStabilityToQ(0.5);
      expect(q).toBeCloseTo(4.25, 2);
    });

    it('clamps negative stability to 0.5', () => {
      const q = mapStabilityToQ(-0.5);
      expect(q).toBeCloseTo(0.5, 2);
    });

    it('clamps stability above 1 to 8.0', () => {
      const q = mapStabilityToQ(1.5);
      expect(q).toBeCloseTo(8.0, 2);
    });
  });

  describe('mapAmperageToGain', () => {
    it('returns 0.1 at I_min for E6013 (70A)', () => {
      const gain = mapAmperageToGain(70, 'E6013');
      expect(gain).toBeCloseTo(0.1, 2);
    });

    it('returns 0.85 at I_max for E6013 (130A)', () => {
      const gain = mapAmperageToGain(130, 'E6013');
      expect(gain).toBeCloseTo(0.85, 2);
    });

    it('returns midpoint (~0.475) at I_optimal for E6013 (100A)', () => {
      // 100A is midpoint between 70A and 130A → normalized = 0.5 → gain = 0.1 + 0.5 * 0.75 = 0.475
      const gain = mapAmperageToGain(100, 'E6013');
      expect(gain).toBeCloseTo(0.475, 2);
    });

    it('clamps amperage below I_min to GAIN_MIN', () => {
      const gain = mapAmperageToGain(50, 'E6013');
      expect(gain).toBeCloseTo(0.1, 2);
    });

    it('clamps amperage above I_max to GAIN_MAX', () => {
      const gain = mapAmperageToGain(150, 'E6013');
      expect(gain).toBeCloseTo(0.85, 2);
    });

    it('uses E7018 I_min/I_max when electrode type is E7018', () => {
      // E7018: I_min=80, I_max=130, I_optimal=115
      const gainAtMin = mapAmperageToGain(80, 'E7018');
      expect(gainAtMin).toBeCloseTo(0.1, 2);
      const gainAtMax = mapAmperageToGain(130, 'E7018');
      expect(gainAtMax).toBeCloseTo(0.85, 2);
    });
  });

  describe('clampAudioValue', () => {
    it('returns value when within range', () => {
      expect(clampAudioValue(5, 0, 10)).toBe(5);
    });

    it('returns min when value is below', () => {
      expect(clampAudioValue(-5, 0, 10)).toBe(0);
    });

    it('returns max when value is above', () => {
      expect(clampAudioValue(15, 0, 10)).toBe(10);
    });

    it('handles exact boundary values', () => {
      expect(clampAudioValue(0, 0, 10)).toBe(0);
      expect(clampAudioValue(10, 0, 10)).toBe(10);
    });
  });
});