// src/rendering/bead/bead.pure.test.ts — Tests for bead pure utility functions
import { describe, it, expect } from 'vitest';
import {
  computeStampColorRGB,
  applyCoolingToArray,
  isSessionReset,
  isAtLeakWarningThreshold,
  isFrameBudgetExceeded,
} from './bead.pure';

describe('bead.pure', () => {
  describe('computeStampColorRGB', () => {
    it('returns hot color when coolingProgress is 0', () => {
      const color = computeStampColorRGB(0);
      expect(color.r).toBeCloseTo(1.0);
      expect(color.g).toBeCloseTo(0.6);
      expect(color.b).toBeCloseTo(0.1);
    });

    it('returns cool color when coolingProgress is 1', () => {
      const color = computeStampColorRGB(1);
      expect(color.r).toBeCloseTo(0.15);
      expect(color.g).toBeCloseTo(0.15);
      expect(color.b).toBeCloseTo(0.15);
    });

    it('returns mid color when coolingProgress is 0.5', () => {
      const color = computeStampColorRGB(0.5);
      expect(color.r).toBeCloseTo(0.575);
      expect(color.g).toBeCloseTo(0.375);
      expect(color.b).toBeCloseTo(0.125);
    });

    it('clamps negative coolingProgress to 0', () => {
      const color = computeStampColorRGB(-0.5);
      expect(color.r).toBeCloseTo(1.0);
    });

    it('clamps coolingProgress > 1 to 1', () => {
      const color = computeStampColorRGB(2);
      expect(color.r).toBeCloseTo(0.15);
    });
  });

  describe('applyCoolingToArray', () => {
    it('applies color to correct vertex range in Float32Array', () => {
      const colorArray = new Float32Array(30); // 10 vertices * 3 channels
      applyCoolingToArray(colorArray, 0, 0, 6);
      // First6 vertices (18 values) should be set
      expect(colorArray[0]).toBeCloseTo(1.0); // r
      expect(colorArray[1]).toBeCloseTo(0.6); // g
      expect(colorArray[2]).toBeCloseTo(0.1); // b
      // Vertex 6 onwards should still be 0
      expect(colorArray[18]).toBe(0);
    });

    it('applies to specific start vertex', () => {
      const colorArray = new Float32Array(30);
      applyCoolingToArray(colorArray, 1, 6, 6);
      expect(colorArray[18]).toBeCloseTo(0.15); // r at vertex6
      expect(colorArray[19]).toBeCloseTo(0.15); // g at vertex 6
    });
  });

  describe('isSessionReset', () => {
    it('returns true when current count is less than 50% of previous', () => {
      expect(isSessionReset(49, 100)).toBe(true);
    });

    it('returns false when current count is at50% or more', () => {
      expect(isSessionReset(51, 100)).toBe(false);
      expect(isSessionReset(100, 100)).toBe(false);
    });
  });

  describe('isAtLeakWarningThreshold', () => {
    it('returns true when at 90% of max', () => {
      expect(isAtLeakWarningThreshold(2700, 3000)).toBe(true);
    });

    it('returns false when below 90%', () => {
      expect(isAtLeakWarningThreshold(2699, 3000)).toBe(false);
    });
  });

  describe('isFrameBudgetExceeded', () => {
    it('returns true when elapsed exceeds budget', () => {
      expect(isFrameBudgetExceeded(10, 8)).toBe(true);
    });

    it('returns false when within budget', () => {
      expect(isFrameBudgetExceeded(5, 8)).toBe(false);
    });
  });
});
