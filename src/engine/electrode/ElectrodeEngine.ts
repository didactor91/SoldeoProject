// src/engine/electrode/ElectrodeEngine.ts — Electrode consumption, temperature, and sticking
// Pure TypeScript — zero allocations, no framework imports, per AGENT-RULES-001-SMAW.md

import { ELECTRODE_CONSUMPTION_PARAMS } from './electrode.profiles';
import { ELECTRODE_PROFILES } from '../../app/constants';
import type { ElectrodeState, ArcState, Partial } from '../../app/store/types';

/**
 * Electrode length when new (mm) — standard 3.2mm diameter SMAW electrode.
 * 350mm is the conventional starting length before striking.
 */
const INITIAL_LENGTH = 350;

/**
 * ElectrodeEngine — models electrode consumption, temperature, and sticking mechanic.
 * Per RFC-002 §5.4.
 *
 * Pure TypeScript: no framework imports. Zero allocations in deplete().
 */
export class ElectrodeEngine {
  /**
   * Updates electrode state for one simulation frame.
   *
   * @param electrode  — current electrode state
   * @param arc        — current arc state (isActive, arcLength, amperage)
   * @param delta       — frame time in seconds
   * @returns Partial<ElectrodeState> with updated fields
   */
  deplete(electrode: ElectrodeState, arc: ArcState, delta: number): Partial<ElectrodeState> {
    const profile = ELECTRODE_PROFILES[electrode.type as keyof typeof ELECTRODE_PROFILES];
    const params = ELECTRODE_CONSUMPTION_PARAMS[electrode.type as keyof typeof ELECTRODE_CONSUMPTION_PARAMS];

    if (!arc.isActive || electrode.currentLength <= 0) {
      // Cool down toward ambient when arc is off or electrode depleted
      const tempDelta = (electrode.temperature - params.T_ambient) * params.K_cool * delta;
      const newTemp = Math.max(params.T_ambient, electrode.temperature - tempDelta);
      return {
        currentLength: Math.max(0, electrode.currentLength),
        temperature: newTemp,
        remainingMass: electrode.currentLength / electrode.initialLength,
      };
    }

    // Consumption: rate = K_melt * I * (1 + K_temp * temperature)
    // K_melt is in mm/(A·s), so multiplying by amperage and delta gives mm consumed
    const consumptionRate = profile.K_melt * arc.amperage * (1 + params.K_temp * electrode.temperature);
    const newLength = Math.max(0, electrode.currentLength - consumptionRate * delta);

    // Temperature: heat input from I² * R_electrode, cooling toward ambient
    // heatInput = I² * R_electrode * K_heat (W per second)
    // net heat gain = heatInput - (T - T_ambient) * K_cool
    const heatInput = arc.amperage * arc.amperage * params.R_electrode * params.K_heat;
    const coolRate = (electrode.temperature - params.T_ambient) * params.K_cool;
    const newTemp = electrode.temperature + (heatInput - coolRate) * delta;

    // Sticking: triggered when arcLength <= 0 AND amperage < I_min_for_clearing
    // At zero arc length with insufficient amperage, the electrode can't self-clear
    const isStuck = arc.arcLength <= 0 && arc.amperage < params.I_min_for_clearing;

    return {
      currentLength: newLength,
      temperature: newTemp,
      remainingMass: newLength / electrode.initialLength,
      isStuck,
    };
  }
}