// src/engine/scoring/gaussian.utils.test.ts
import { describe, it, expect } from 'vitest';
import { gaussian, gaussianProduct } from './gaussian.utils';

describe('gaussian', () => {
  it('returns 1.0 when x equals mu', () => {
    expect(gaussian(100, 100, 15)).toBeCloseTo(1.0);
  });

  it('returns 1.0 when sigma is 0 and x equals mu', () => {
    expect(gaussian(100, 100, 0)).toBe(1.0);
  });

  it('returns 0.0 when sigma is 0 and x does not equal mu', () => {
    expect(gaussian(105, 100, 0)).toBe(0.0);
    expect(gaussian(95, 100, 0)).toBe(0.0);
  });

  it('returns value less than 1 when x differs from mu', () => {
    const g = gaussian(85, 100, 15); // 1 standard deviation
    expect(g).toBeLessThan(1.0);
    expect(g).toBeGreaterThan(0.0);
  });

  it('returns smaller value for larger deviation', () => {
    const g1 = gaussian(100, 100, 15); // 0 std dev
    const g2 = gaussian(115, 100, 15); // 1 std dev
    const g3 = gaussian(130, 100, 15); // 2 std dev
    expect(g1).toBeGreaterThan(g2);
    expect(g2).toBeGreaterThan(g3);
  });

  it('is symmetric around mu', () => {
    const g1 = gaussian(95, 100, 15);
    const g2 = gaussian(105, 100, 15);
    expect(g1).toBeCloseTo(g2);
  });

  it('returns value in (0, 1] for positive sigma', () => {
    for (let x = 0; x < 200; x += 10) {
      const g = gaussian(x, 100, 15);
      expect(g).toBeGreaterThan(0);
      expect(g).toBeLessThanOrEqual(1);
    }
  });

  it('handles negative sigma by treating as positive', () => {
    const g = gaussian(100, 100, -15);
    expect(g).toBeCloseTo(1.0);
  });
});

describe('gaussianProduct', () => {
  it('returns 1.0 for empty array', () => {
    expect(gaussianProduct()).toBe(1.0);
  });

  it('returns the single factor for single-element array', () => {
    expect(gaussianProduct(0.5)).toBe(0.5);
  });

  it('multiplies multiple factors correctly', () => {
    expect(gaussianProduct(1.0, 1.0, 1.0)).toBe(1.0);
    expect(gaussianProduct(0.5, 0.5)).toBeCloseTo(0.25);
    expect(gaussianProduct(0.8, 0.9, 0.7)).toBeCloseTo(0.504);
  });

  it('returns value in (0, 1] when all factors are valid gaussians', () => {
    const result = gaussianProduct(0.9, 0.8, 0.7, 0.95);
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThanOrEqual(1);
  });
});
