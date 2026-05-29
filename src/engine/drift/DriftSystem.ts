// src/engine/drift/DriftSystem.ts — Perlin noise-based parameter drift system

import { perlin } from './perlin';
import { DRIFT_CONFIG } from '../../app/constants';
import type { InputState, DifficultyLevel } from '../../app/store/types';

/**
 * DriftSystem — applies realistic parameter drift using Perlin noise.
 * Per RFC-002 §6.1.
 *
 * Pure TypeScript: no framework imports. Zero allocations in apply().
 */
export class DriftSystem {
  private time = 0;

  /**
   * Applies drift to input parameters.
   * Drift accumulates over time but is clamped per parameter.
   *
   * @param input     — raw input state
   * @param difficulty — drift difficulty level
   * @param delta      — frame time in seconds
   * @returns InputState with drifted values
   */
  apply(input: InputState, difficulty: DifficultyLevel, delta: number): InputState {
    const cfg = DRIFT_CONFIG[difficulty];
    this.time += delta;

    // Perlin noise sampled at different frequencies per RFC-002 §6.1
    const dL = perlin(this.time * cfg.freq, 0) * cfg.arcLength * delta;
    const dW = perlin(this.time * cfg.freq + 100, 0) * cfg.workAngle * delta;
    const dD = perlin(this.time * cfg.freq + 200, 0) * cfg.dragAngle * delta;

    // Apply to raw values then clamp
    const rawArcLength = Math.max(0, Math.min(8, input.rawArcLength + dL));
    const rawWorkAngle = Math.max(60, Math.min(120, input.rawWorkAngle + dW));
    const rawDragAngle = Math.max(50, Math.min(90, input.rawDragAngle + dD));

    return {
      ...input,
      rawArcLength,
      rawWorkAngle,
      rawDragAngle,
      arcLength: rawArcLength,
      workAngle: rawWorkAngle,
      dragAngle: rawDragAngle,
    };
  }
}
