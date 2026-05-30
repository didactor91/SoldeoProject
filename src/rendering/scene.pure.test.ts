// src/rendering/scene.pure.test.ts — Tests for scene pure utility functions
import { describe, it, expect } from 'vitest';
import { checkFrameBudget, getFrameCount, incrementFrameCount } from './scene.pure';

describe('scene.pure', () => {
  describe('checkFrameBudget', () => {
    it('returns true when elapsed exceeds budget', () => {
      expect(checkFrameBudget(15, 8)).toBe(true);
    });

    it('returns false when elapsed is within budget', () => {
      expect(checkFrameBudget(5, 8)).toBe(false);
    });

    it('returns false when elapsed equals budget', () => {
      expect(checkFrameBudget(8, 8)).toBe(false);
    });
  });

  describe('getFrameCount', () => {
    it('returns the current value from ref', () => {
      expect(getFrameCount({ current: 42 })).toBe(42);
    });

    it('returns 0 for fresh ref', () => {
      expect(getFrameCount({ current: 0 })).toBe(0);
    });
  });

  describe('incrementFrameCount', () => {
    it('increments and returns next count', () => {
      expect(incrementFrameCount(0)).toBe(1);
      expect(incrementFrameCount(99)).toBe(100);
    });

    it('works for large frame counts', () => {
      expect(incrementFrameCount(9999)).toBe(10000);
    });
  });
});
