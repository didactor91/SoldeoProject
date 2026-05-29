// src/engine/weld/bead.geometry.ts — Bead cross-section geometry calculations
// Pure TypeScript — zero allocations, no framework imports, explicit return types

import { gaussian } from '../scoring/gaussian.utils';
import type { ElectrodeProfile } from '../arc/arc.formulas';

/** Bead stamp geometry output */
export interface BeadStampGeometry {
  width: number;
  height: number;
  penetration: number;
}

/**
 * Clamps a value within [min, max].
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Bead width per RFC-002 §5.3.
 * beadWidth = W_base · (I/I_optimal)^0.6 · gaussian(speed, v_opt, 2) · (1/L_ratio)^0.3
 *
 * @param I        amperage in A
 * @param speed    travel speed in mm/s
 * @param L_arc    current arc length in mm
 * @param profile  electrode profile
 * @returns width in mm, clamped to [1, 15]
 */
export function computeBeadWidth(
  I: number,
  speed: number,
  L_arc: number,
  profile: ElectrodeProfile,
): number {
  const L_ratio = L_arc / profile.L_optimal;
  const speedGaussian = gaussian(speed, profile.v_optimal, 2);

  const width =
    profile.W_base *
    Math.pow(I / profile.I_optimal, 0.6) *
    speedGaussian *
    Math.pow(1 / L_ratio, 0.3);

  return clamp(width, 1, 15);
}

/**
 * Bead height per RFC-002 §5.3.
 * beadHeight = H_base · (I/I_optimal)^0.4 · (1/speedRatio)^0.5
 *
 * @param I        amperage in A
 * @param speed    travel speed in mm/s
 * @param profile  electrode profile
 * @returns height in mm, clamped to [0.3, 8]
 */
export function computeBeadHeight(I: number, speed: number, profile: ElectrodeProfile): number {
  const speedRatio = speed / profile.v_optimal;

  const height = profile.H_base * Math.pow(I / profile.I_optimal, 0.4) * Math.pow(1 / speedRatio, 0.5);

  return clamp(height, 0.3, 8);
}

/**
 * Bead penetration per RFC-002 §5.3.
 * penetration = P_base · (I/I_optimal)^0.8 · gaussian(L_arc, L_opt, 1.2)
 *
 * @param I        amperage in A
 * @param L_arc    arc length in mm
 * @param profile  electrode profile
 * @returns penetration in mm, clamped to [0, 5]
 */
export function computePenetration(I: number, L_arc: number, profile: ElectrodeProfile): number {
  const penetration =
    profile.P_base * Math.pow(I / profile.I_optimal, 0.8) * gaussian(L_arc, profile.L_optimal, 1.2);

  return clamp(penetration, 0, 5);
}