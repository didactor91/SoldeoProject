// src/engine/arc/arc.formulas.ts — Pure voltage, stability, and arc validity formulas
// Pure TypeScript — zero allocations, no framework imports, explicit return types

import { gaussian } from '../scoring/gaussian.utils';
import { ELECTRODE_PROFILES } from '../../app/constants';

/** Type alias for electrode profile — derived from Phase 0 constants */
export type ElectrodeProfile = typeof ELECTRODE_PROFILES[keyof typeof ELECTRODE_PROFILES];

/**
 * Dynamic arc voltage per RFC-002 §5.2.
 * E = V0 + k · L_arc
 *
 * @param arcLength mm — tip to workpiece distance
 * @param profile  electrode electrical profile
 * @returns voltage in Volts
 */
export function computeVoltage(arcLength: number, profile: ElectrodeProfile): number {
  return profile.V0 + profile.k * arcLength;
}

/**
 * Arc stability factor per RFC-002 §5.2.
 * S_arc = gaussian(L_arc, μ=L_optimal, σ=1.5) × gaussian(I, μ=I_optimal, σ=15)
 *
 * Returns value in (0, 1]. Peaks at 1.0 when both arc length and amperage are optimal.
 *
 * @param arcLength  mm — tip to workpiece distance
 * @param amperage   A — machine amperage setting
 * @param profile    electrode electrical profile
 */
export function computeStability(
  arcLength: number,
  amperage: number,
  profile: ElectrodeProfile
): number {
  const stabilityDistance = gaussian(arcLength, profile.L_optimal, 1.5);
  const stabilityAmperage = gaussian(amperage, profile.I_optimal, 15);
  return stabilityDistance * stabilityAmperage;
}

/**
 * Arc active condition per RFC-002 §5.2.
 * Arc is active when: L_arc > 0 AND L_arc <= L_max AND electrode has remaining length.
 *
 * @param arcLength       mm — tip to workpiece distance
 * @param profile         electrode electrical profile
 * @param currentLength    mm — remaining electrode length
 * @returns true if arc can sustain
 */
export function isArcActive(
  arcLength: number,
  profile: ElectrodeProfile,
  currentLength: number
): boolean {
  return arcLength > 0 && arcLength <= profile.L_max && currentLength > 0;
}
