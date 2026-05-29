// src/engine/scoring/ScoringEngine.ts — Phase 1, Task 2.3: Instantaneous weld quality score computation
// Per RFC-002 §5.5 Instantaneous Quality Score
// Pure TypeScript — no framework imports, zero allocations in score()

import { gaussian } from './gaussian.utils';
import { detectDefect } from '../weld/defect.detector';
import { ELECTRODE_PROFILES } from '../../app/constants';
import type { InputState, ArcState, ArcResult, DefectType } from '../../app/store/types';

/**
 * Scoring result — instantaneous weld quality score per frame.
 */
export interface ScoreResult {
  /** Combined quality factor [0, 1] — 1.0 is perfect */
  Q: number;
  /** Primary defect detected at current parameters */
  dominantDefect: DefectType;
  /** True when arc is too short or amperage too high (spatter condition) */
  isSpatter: boolean;
}

/**
 * ScoringEngine — computes instantaneous weld quality score.
 * Per RFC-002 §5.5.
 *
 * Q = S_distance · S_speed · S_workAngle · S_dragAngle · S_amperage
 *
 * Sigma values chosen per RFC-002 §5.5:
 * - S_distance: σ = 1.2 mm (arc length sensitivity)
 * - S_speed:    σ = 1.5 mm/s (travel speed tolerance)
 * - S_workAngle: σ = 8° (work angle tolerance)
 * - S_dragAngle: σ = 7° (drag angle tolerance)
 * - S_amperage: σ = 12 A (amperage tolerance)
 */
export class ScoringEngine {
  /**
   * Computes weld quality score for current frame.
   * Zero allocations — no object creation in hot path.
   *
   * @param input     — current input state (arcLength, travelSpeed, workAngle, dragAngle)
   * @param arcResult — arc result from ArcEngine (arcLength, voltage, stability, isActive)
   * @param arc       — full arc state (amperage)
   * @returns ScoreResult with Q, dominantDefect, isSpatter
   */
  score(
    input: InputState,
    arcResult: ArcResult,
    arc: ArcState,
  ): ScoreResult {
    const profile = ELECTRODE_PROFILES.E6013;

    // Individual gaussian factors — per RFC-002 §5.5
    // Note: v_optimal is in mm/s per constants.ts
    const S_distance = gaussian(arcResult.arcLength, profile.L_optimal, 1.2);
    const S_speed = gaussian(input.travelSpeed, profile.v_optimal, 1.5);
    const S_workAngle = gaussian(input.workAngle, profile.theta_work_opt, 8);
    const S_dragAngle = gaussian(input.dragAngle, profile.theta_drag_opt, 7);
    const S_amperage = gaussian(arc.amperage, profile.I_optimal, 12);

    // Combined quality factor — product of all gaussian factors
    const Q = S_distance * S_speed * S_workAngle * S_dragAngle * S_amperage;

    // isSpatter: L_arc < L_opt*0.5 OR I > I_opt*1.4
    const isSpatter =
      arcResult.arcLength < profile.L_optimal * 0.5 ||
      arc.amperage > profile.I_optimal * 1.4;

    // Detect primary defect from parameters
    const dominantDefect = detectDefect(input, arc, profile);

    return { Q, dominantDefect, isSpatter };
  }
}
