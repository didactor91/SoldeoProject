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
 * Product of multiple Gaussian factors.
 * Used for multi-dimensional stability scoring where each dimension is independent.
 *
 * @param factors array of { x, mu, sigma } tuples
 * @returns product of all gaussian(x, mu, sigma) values — range [0, 1]
 */
export function gaussianProduct(
  ...factors: Array<{ x: number; mu: number; sigma: number }>
): number {
  let result = 1;
  for (const { x, mu, sigma } of factors) {
    result *= gaussian(x, mu, sigma);
  }
  return result;
}
