// src/engine/weld/WeldEngine.ts — Computes bead cross-section stamp and detects defects
// Pure TypeScript — zero allocations, no framework imports, explicit return types

import { computeBeadWidth, computeBeadHeight, computePenetration } from './bead.geometry';
import { detectDefect } from './defect.detector';
import { ELECTRODE_PROFILES } from '../../app/constants';
import type { InputState, ArcState, ArcResult, DefectType } from '../../app/store/types';

/** Alias for electrode profile */
type ElectrodeProfile = typeof ELECTRODE_PROFILES.E6013;

/** Bead stamp output combining geometry and defect */
export interface WeldStampResult {
  width: number;
  height: number;
  penetration: number;
  defect: DefectType;
}

/**
 * WeldEngine — computes bead cross-section geometry and defect conditions.
 *
 * Orchestrates bead.geometry and defect.detector using arc state.
 * Pure TypeScript: no framework imports. Zero allocations in computeStamp().
 */
export class WeldEngine {
  /**
   * Computes bead stamp geometry and detects defect for current frame.
   *
   * @param input      current input state (travelSpeed, arcLength from drift)
   * @param arcResult  arc result from ArcEngine (arcLength, voltage, stability, isActive)
   * @param arc        full arc state (amperage for defect detection)
   * @returns WeldStampResult with geometry dimensions and defect type
   */
  computeStamp(
    input: InputState,
    arcResult: ArcResult,
    arc: ArcState,
  ): WeldStampResult {
    const profile: ElectrodeProfile = ELECTRODE_PROFILES.E6013;

    const width = computeBeadWidth(arc.amperage, input.travelSpeed, arcResult.arcLength, profile);
    const height = computeBeadHeight(arc.amperage, input.travelSpeed, profile);
    const penetration = computePenetration(arc.amperage, arcResult.arcLength, profile);
    const defect = detectDefect(input, arc, profile);

    return { width, height, penetration, defect };
  }
}
