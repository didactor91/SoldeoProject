// src/engine/electrode/electrode.profiles.ts — Electrode-specific parameters for consumption and temperature models
// Pure TypeScript — zero allocations, no framework imports, per AGENT-RULES-001-SMAW.md

import { ELECTRODE_PROFILES } from '../../app/constants';
import type { ElectrodeType } from '../../app/store/types';

/**
 * Electrode consumption and temperature model parameters per RFC-002 §5.4.
 * These complement the electrical/bead parameters in ELECTRODE_PROFILES.
 */
export const ELECTRODE_CONSUMPTION_PARAMS = {
  E6013: {
    /** Thermal resistance heating factor — per RFC-002 §5.4 */
    K_temp: 0.0002,
    /** Electrode rod resistance (Ω) — for temperature model */
    R_electrode: 0.002,
    /** Heat absorption coefficient — per RFC-002 §5.4 */
    K_heat: 0.00001,
    /** Cooling rate coefficient (fraction per second) — per RFC-002 §5.4 */
    K_cool: 0.05,
    /** Ambient room temperature (°C) */
    T_ambient: 20,
    /** Minimum amperage to recover from stuck electrode (A) */
    I_min_for_clearing: 85,
  },
  E7018: {
    /** Thermal resistance heating factor — slightly lower sensitivity than E6013 */
    K_temp: 0.00015,
    /** Electrode rod resistance (Ω) */
    R_electrode: 0.0018,
    /** Heat absorption coefficient — slightly higher than E6013 */
    K_heat: 0.000012,
    /** Cooling rate coefficient — slower cooling (more heat retention) */
    K_cool: 0.04,
    /** Ambient room temperature (°C) */
    T_ambient: 20,
    /** E7018 requires more amperage to unstick (stricter arc control) */
    I_min_for_clearing: 95,
  },
} as const;

/**
 * Returns the full electrode profile (electrical + consumption + temperature).
 * Combines ELECTRODE_PROFILES constants with ELECTRODE_CONSUMPTION_PARAMS.
 *
 * @param type — electrode type (E6013 | E7018)
 * @returns merged profile object with all electrical and temperature model parameters
 */
export function getElectrodeProfile(type: ElectrodeType): typeof ELECTRODE_PROFILES[typeof type] & typeof ELECTRODE_CONSUMPTION_PARAMS[typeof type] {
  return {
    ...ELECTRODE_PROFILES[type],
    ...ELECTRODE_CONSUMPTION_PARAMS[type],
  } as typeof ELECTRODE_PROFILES[typeof type] & typeof ELECTRODE_CONSUMPTION_PARAMS[typeof type];
}