// src/rendering/electrode/arc.pure.test.ts — Tests for arc pure utility functions
import { describe, it, expect } from 'vitest';
import {
  calculateArcLightY,
  calculateBaseIntensity,
  calculateArcColor,
  calculateFlickerIntensity,
  calculateFinalIntensity,
  calculateEmissiveIntensity,
} from './arc.pure';

describe('arc.pure', () => {
  describe('calculateArcLightY', () => {
    it('returns electrode tip Y plus arc length offset', () => {
      expect(calculateArcLightY(0, 0.5)).toBe(0.5);
      expect(calculateArcLightY(100, 0.5)).toBe(1.5);
      expect(calculateArcLightY(50, 0.5)).toBe(1.0);
    });
  });

  describe('calculateBaseIntensity', () => {
    it('returns minimum intensity at 20V', () => {
      expect(calculateBaseIntensity(20)).toBeCloseTo(0.5);
    });

    it('returns maximum intensity at 40V', () => {
      expect(calculateBaseIntensity(40)).toBeCloseTo(2.0);
    });

    it('returns mid intensity at 30V', () => {
      expect(calculateBaseIntensity(30)).toBeCloseTo(1.25);
    });
  });

  describe('calculateArcColor', () => {
    it('returns blue-white for high stability (>= 0.5)', () => {
      const color = calculateArcColor(1.0);
      expect(color.r).toBeCloseTo(0.8);
      expect(color.g).toBeCloseTo(0.9);
      expect(color.b).toBeCloseTo(1.0);
    });

    it('returns orange-red for low stability (< 0.5)', () => {
      const color = calculateArcColor(0);
      expect(color.r).toBeCloseTo(1.0);
      expect(color.g).toBeCloseTo(0.4);
      expect(color.b).toBeCloseTo(0.05);
    });

    it('returns blue-white at exactly 0.5 stability', () => {
      const color = calculateArcColor(0.5);
      expect(color.r).toBeCloseTo(0.55);
      expect(color.g).toBeCloseTo(0.5);
      expect(color.b).toBeCloseTo(0.5);
    });
  });

  describe('calculateFlickerIntensity', () => {
    it('returns 1.0 for stable arc (stability >= 0.5)', () => {
      expect(calculateFlickerIntensity(0.5, 0)).toBe(1.0);
      expect(calculateFlickerIntensity(1.0, 0)).toBe(1.0);
    });

    it('returns random value in0.7-1.0 range for unstable arc', () => {
      const result = calculateFlickerIntensity(0.4, 0);
      expect(result).toBeCloseTo(0.7);
      expect(result).toBeGreaterThanOrEqual(0.7);
      expect(result).toBeLessThanOrEqual(1.0);
    });

    it('returns 1.0 at stability0.5 boundary', () => {
      expect(calculateFlickerIntensity(0.5, 0.5)).toBe(1.0);
    });
  });

  describe('calculateFinalIntensity', () => {
    it('multiplies base intensity by flicker', () => {
      const result = calculateFinalIntensity(1.0, 0.4, 0);
      expect(result).toBeCloseTo(0.7);
    });

    it('returns base intensity for stable arc', () => {
      const result = calculateFinalIntensity(1.5, 0.8, 0.5);
      expect(result).toBe(1.5);
    });
  });

  describe('calculateEmissiveIntensity', () => {
    it('applies default multiplier 0.8', () => {
      expect(calculateEmissiveIntensity(1.0)).toBeCloseTo(0.8);
    });

    it('applies custom multiplier', () => {
      expect(calculateEmissiveIntensity(1.0, 0.5)).toBeCloseTo(0.5);
    });
  });
});
