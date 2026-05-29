// src/engine/scoring/gaussian.utils.ts — Phase 0 foundation: gaussian(), gaussianProduct()
// Pure TypeScript — zero allocations, explicit return types, no any

/**
 * Gaussian exponential factor — returns exp(-0.5 * ((x - μ) / σ)²).
 * Peaks at 1.0 when x = μ. Used for stability scoring where we need
 * normalized factors in [0, 1] rather than probability densities.
 *
 * @param x     value to evaluate
 * @param mu    mean (center) of distribution
 * @param sigma standard deviation (spread)
 * @returns exponential factor — range (0, 1], peak is 1 at x = mu
 */
export function gaussian(x: number, mu: number, sigma: number): number {
  if (sigma === 0) {
    return x === mu ? 1 : 0;
  }
  const d = x - mu;
  const s = sigma;
  return Math.exp(-0.5 * (d * d) / (s * s));
}

/**
 * Multiplies multiple independent gaussian factors into a combined score.
 * Equivalent to: gaussian1 * gaussian2 * ... * gaussianN
 * Returns value in (0, 1].
 *
 * @param factors — individual gaussian factor values (each already computed)
 * @returns product of all factors — range (0, 1]
 */
export function gaussianProduct(...factors: number[]): number {
  let result = 1.0;
  for (let i = 0; i < factors.length; i++) {
    result *= factors[i];
  }
  return result;
}
