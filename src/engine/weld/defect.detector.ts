// src/engine/weld/defect.detector.ts — Maps welding parameters to defect conditions
// Pure TypeScript — zero allocations, no framework imports, explicit return types
// Per RFC-002 §5.3 Defect Conditions table

import { ELECTRODE_PROFILES } from '../../app/constants';
import type { DefectType, InputState, ArcState } from '../../app/store/types';

/** Type alias for electrode profile — derived from Phase 0 constants */
export type ElectrodeProfile = typeof ELECTRODE_PROFILES.E6013;

/**
 * Detects weld defect type based on current parameters.
 * Per RFC-002 §5.3 defect conditions table.
 *
 * Priority order (first match wins):
 * 1. burn_through (most severe)
 * 2. undercut
 * 3. incomplete_fusion
 * 4. overlap
 * 5. porosity
 * 6. spatter
 * 7. none
 *
 * @param input  current input state (arcLength, travelSpeed)
 * @param arc    current arc state (amperage)
 * @param profile electrode profile (uses I_optimal, L_optimal, v_optimal)
 * @returns DefectType
 */
export function detectDefect(
  input: InputState,
  arc: ArcState,
  profile: ElectrodeProfile = ELECTRODE_PROFILES.E6013,
): DefectType {
  const I = arc.amperage;
  const speed = input.travelSpeed;
  const L = input.arcLength;

  const I_opt = profile.I_optimal;
  const v_opt = profile.v_optimal; // mm/s (already in correct unit)
  const L_opt = profile.L_optimal;

  // burn_through: I > I_opt*1.6 AND speed < v_opt*0.4
  if (I > I_opt * 1.6 && speed < v_opt * 0.4) {
    return 'burn_through';
  }

  // undercut: I > I_opt*1.3 AND speed > v_opt*1.2
  if (I > I_opt * 1.3 && speed > v_opt * 1.2) {
    return 'undercut';
  }

  // incomplete_fusion: speed > v_opt*1.8
  if (speed > v_opt * 1.8) {
    return 'incomplete_fusion';
  }

  // overlap: I < I_opt*0.7 OR speed < v_opt*0.5
  if (I < I_opt * 0.7 || speed < v_opt * 0.5) {
    return 'overlap';
  }

  // porosity: L_arc > L_opt*1.8
  if (L > L_opt * 1.8) {
    return 'porosity';
  }

  // spatter: L_arc < L_opt*0.5 OR I > I_opt*1.4
  if (L < L_opt * 0.5 || I > I_opt * 1.4) {
    return 'spatter';
  }

  return 'none';
}
