// src/engine/drift/perlin.test.ts
import { describe, it, expect } from 'vitest';
import { perlin, perlin2D } from './perlin';

describe('perlin', () => {
  it('returns deterministic value for same seed and input', () => {
    const v1 = perlin(1.5, 42);
    const v2 = perlin(1.5, 42);
    expect(v1).toBe(v2);
  });

  it('returns different values for different seeds', () => {
    const v1 = perlin(1.5, 0);
    const v2 = perlin(1.5, 1);
    const v3 = perlin(1.5, 42);
    // At least one should differ (extremely unlikely to be equal)
    const allEqual = v1 === v2 && v2 === v3;
    expect(allEqual).toBe(false);
  });

  it('returns different values for different inputs', () => {
    const v1 = perlin(0, 0);
    const v2 = perlin(1, 0);
    const v3 = perlin(2, 0);
    const allEqual = v1 === v2 && v2 === v3;
    expect(allEqual).toBe(false);
  });

  it('returns value roughly in [-1, 1] range', () => {
    for (let i = 0; i < 100; i++) {
      const v = perlin(i * 0.1, 0);
      expect(v).toBeGreaterThanOrEqual(-1.5);
      expect(v).toBeLessThanOrEqual(1.5);
    }
  });

  it('default seed (0) works', () => {
    const v = perlin(1.0);
    expect(typeof v).toBe('number');
    expect(Number.isFinite(v)).toBe(true);
  });

  it('handles negative inputs', () => {
    const v1 = perlin(-1.0, 0);
    const v2 = perlin(-10.0, 0);
    expect(Number.isFinite(v1)).toBe(true);
    expect(Number.isFinite(v2)).toBe(true);
  });

  it('handles large inputs', () => {
    const v = perlin(1000.0, 0);
    expect(Number.isFinite(v)).toBe(true);
  });
});

describe('perlin2D', () => {
  it('returns deterministic value for same inputs and seed', () => {
    const v1 = perlin2D(1.5, 2.5, 42);
    const v2 = perlin2D(1.5, 2.5, 42);
    expect(v1).toBe(v2);
  });

  it('returns different values for different coordinates', () => {
    const v1 = perlin2D(0, 0, 0);
    const v2 = perlin2D(0.5, 0.5, 0);
    expect(v1).not.toBe(v2);
  });

  it('returns value roughly in [-1, 1] range', () => {
    for (let x = 0; x < 10; x++) {
      for (let y = 0; y < 10; y++) {
        const v = perlin2D(x * 0.1, y * 0.1, 0);
        expect(v).toBeGreaterThanOrEqual(-1.5);
        expect(v).toBeLessThanOrEqual(1.5);
      }
    }
  });
});
