// src/engine/arc/ArcEngine.ts — Computes arc voltage, stability, and extinction conditions
// Pure TypeScript — no framework imports, zero allocations in evaluate()

import { computeVoltage, computeStability, isArcActive } from './arc.formulas';
import { ELECTRODE_PROFILES } from '../../app/constants';
import type { InputState, ArcState, ElectrodeState } from '../../app/store/types';

/**
 * ArcEngine — evaluates arc electrical state per RFC-002 §5.2.
 *
 * Pure TypeScript: no framework imports. Receives all inputs as parameters.
 * Zero allocations in evaluate().
 */
export class ArcEngine {
  /**
   * Evaluates arc voltage, stability, and active condition.
   *
   * @param input     — current input state (includes arcLength from user input + drift)
   * @param arc       — current arc state
   * @param electrode — current electrode state
   * @returns Partial<ArcState> with voltage, stability, isActive, arcLength
   */
  evaluate(
    input: InputState,
    arc: ArcState,
    electrode: ElectrodeState,
  ): Partial<ArcState> {
    const profile = ELECTRODE_PROFILES[electrode.type as keyof typeof ELECTRODE_PROFILES];
    const L = input.arcLength;

    const voltage = computeVoltage(L, profile);
    const stability = computeStability(L, arc.amperage, profile);
    const active = isArcActive(L, profile, electrode.currentLength);

    return {
      voltage,
      stability,
      isActive: active,
      arcLength: L,
    };
  }
}