// src/rendering/electrode/electrode.pure.test.ts — Tests for electrode pure utility functions
import { describe, it, expect } from 'vitest';
import {
  calculateLengthScale,
  calculateTemperatureEmissive,
  isStuckWarning,
  getElectrodeMaterialColor,
  getElectrodeMaterialProps,
} from './electrode.pure';

describe('electrode.pure', () => {
  describe('calculateLengthScale', () => {
    it('returns 1.0 for full length electrode', () => {
      expect(calculateLengthScale(350, 350)).toBeCloseTo(1.0);
    });

    it('returns 0.0 for depleted electrode', () => {
      expect(calculateLengthScale(0, 350)).toBeCloseTo(0);
    });

    it('returns 0.5 for half-depleted electrode', () => {
      expect(calculateLengthScale(175, 350)).toBeCloseTo(0.5);
    });

    it('returns 0 for invalid initialLength', () => {
      expect(calculateLengthScale(100, 0)).toBe(0);
    });
  });

  describe('calculateTemperatureEmissive', () => {
    it('returns 0 for cold electrode', () => {
      expect(calculateTemperatureEmissive(0)).toBe(0);
    });

    it('returns max for hot electrode', () => {
      expect(calculateTemperatureEmissive(1)).toBeCloseTo(0.8);
    });

    it('returns mid value for warm electrode', () => {
      expect(calculateTemperatureEmissive(0.5)).toBeCloseTo(0.4);
    });

    it('clamps negative temperature', () => {
      expect(calculateTemperatureEmissive(-0.5)).toBe(0);
    });

    it('clamps temperature > 1', () => {
      expect(calculateTemperatureEmissive(2)).toBeCloseTo(0.8);
    });
  });

  describe('isStuckWarning', () => {
    it('returns true when isStuck is true', () => {
      expect(isStuckWarning(true)).toBe(true);
    });

    it('returns false when isStuck is false', () => {
      expect(isStuckWarning(false)).toBe(false);
    });
  });

  describe('getElectrodeMaterialColor', () => {
    it('returns dark color for E7018', () => {
      const color = getElectrodeMaterialColor('E7018');
      expect(color.r).toBeCloseTo(0.25);
      expect(color.g).toBeCloseTo(0.25);
      expect(color.b).toBeCloseTo(0.25);
    });

    it('returns light color for E6013', () => {
      const color = getElectrodeMaterialColor('E6013');
      expect(color.r).toBeCloseTo(0.75);
      expect(color.g).toBeCloseTo(0.75);
      expect(color.b).toBeCloseTo(0.75);
    });

    it('defaults to E6013 for unknown type', () => {
      const color = getElectrodeMaterialColor('E9999');
      expect(color.r).toBeCloseTo(0.75);
    });
  });

  describe('getElectrodeMaterialProps', () => {
    it('returns correct props for E7018', () => {
      const props = getElectrodeMaterialProps('E7018');
      expect(props.roughness).toBeCloseTo(0.7);
      expect(props.metalness).toBeCloseTo(0.6);
    });

    it('returns correct props for E6013', () => {
      const props = getElectrodeMaterialProps('E6013');
      expect(props.roughness).toBeCloseTo(0.4);
      expect(props.metalness).toBeCloseTo(0.5);
    });

    it('defaults to E6013 for unknown type', () => {
      const props = getElectrodeMaterialProps('E9999');
      expect(props.roughness).toBeCloseTo(0.4);
    });
  });
});
