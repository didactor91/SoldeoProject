// src/engine/scoring/gaussian.utils.ts — Gaussian scoring factor helpers

/**
 * Gaussian (normal) distribution probability density function.
 * Used across the physics engine for stability, quality scoring, and bead geometry.
 *
 * Formula: gaussian(x, μ, σ) = exp(-0.5 · ((x-μ)/σ)²)
 *
 * Usage in simulation:
 * - ArcEngine: stability factor from arc length and amperage (RFC-002 §5.2)
 * - ScoringEngine: per-parameter quality factors (RFC-002 §5.5)
 * - WeldEngine: bead width/penetration gaussian modifiers (SDD-001 §2.2.3)
 *
 * Pure functions: same inputs → same outputs. Zero allocations.
 */

/**
 * Gaussian probability density at x, centered at mu with standard deviation sigma.
 * Returns value in (0, 1].
 *
 * @param x     — observation value
 * @param mu    — mean (optimal value)
 * @param sigma — standard deviation (tolerance bandwidth)
 */
export function gaussian(x: number, mu: number, sigma: number): number {
  if (sigma === 0) {
    return x === mu ? 1.0 : 0.0;
  }
  const d = (x - mu) / sigma;
  return Math.exp(-0.5 * d * d);
}

/**
 * Multiplies multiple independent gaussian factors into a combined score.
 * Equivalent to: gaussian1 * gaussian2 * ... * gaussianN
 * Returns value in (0, 1].
 *
 * Used by ScoringEngine.score() to combine S_distance, S_speed,
 * S_workAngle, S_dragAngle, S_amperage into single Q factor.
 */
export function gaussianProduct(...factors: number[]): number {
  let result = 1.0;
  for (let i = 0; i < factors.length; i++) {
    result *= factors[i];
  }
  return result;
}