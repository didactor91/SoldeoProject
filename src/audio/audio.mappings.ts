// src/audio/audio.mappings.ts — Pure function parameter mappings for audio synthesis
// No allocations — all functions are hot-path safe (called from AudioEngine.update in useFrame)

import { ELECTRODE_PROFILES } from '../app/constants';

// Re-export AUDIO_MAPPINGS for consumers who need the full constant set
export { AUDIO_MAPPINGS } from '../app/constants';

/**
 * Maps arc length (mm) to audio filter frequency (Hz).
 * Short arc (L → 0) = bright buzz (3000Hz), long arc (L → L_max) = low hum (400Hz).
 *
 * Formula: freq = FILTER_FREQ_MAX - (L_arc / L_max) × (FILTER_FREQ_MAX - FILTER_FREQ_MIN)
 *
 * @param arcLengthMm Arc length in mm (0 to L_max)
 * @param electrodeType E6013 or E7018 — uses that profile's L_max
 * @returns Filter frequency in Hz (clamped to [FILTER_FREQ_MIN, FILTER_FREQ_MAX])
 */
export function mapArcLengthToFrequency(
  arcLengthMm: number,
  electrodeType: string
): number {
  const profile = ELECTRODE_PROFILES[electrodeType as keyof typeof ELECTRODE_PROFILES] ?? ELECTRODE_PROFILES.E6013;
  const L_max = profile.L_max;

  // Normalize arc length to [0, 1] range (0 = optimal/short, 1 = max/long)
  const normalized = Math.max(0, Math.min(1, arcLengthMm / L_max));

  // 3000Hz at arc=0, 400Hz at arc=L_max (inverted — shorter arc = higher freq)
  const FILTER_FREQ_MAX = 3000;
  const FILTER_FREQ_MIN = 400;
  return FILTER_FREQ_MAX - normalized * (FILTER_FREQ_MAX - FILTER_FREQ_MIN);
}

/**
 * Maps arc stability (0.0–1.0) to BiquadFilter Q value.
 * Unstable arc (stability → 0) = narrow filter (Q=0.5) = focused crackle
 * Stable arc (stability → 1) = wide filter (Q=8.0) = smooth hum
 *
 * @param stability Arc stability (0.0 to 1.0)
 * @returns Filter Q value (clamped to [FILTER_Q_MIN, FILTER_Q_MAX])
 */
export function mapStabilityToQ(stability: number): number {
  const FILTER_Q_MIN = 0.5;
  const FILTER_Q_MAX = 8.0;
  // Linear map: stability 0 → Q 0.5, stability 1 → Q 8.0
  const normalized = Math.max(0, Math.min(1, stability));
  return FILTER_Q_MIN + normalized * (FILTER_Q_MAX - FILTER_Q_MIN);
}

/**
 * Maps amperage (A) to master gain.
 * Minimum amperage = quiet (0.1), maximum amperage = loud (0.85).
 *
 * @param amperage Current in Amperes (I_min to I_max)
 * @param electrodeType E6013 or E7018 — uses that profile's I_min/I_max
 * @returns Gain value (clamped to [GAIN_MIN, GAIN_MAX])
 */
export function mapAmperageToGain(
  amperage: number,
  electrodeType: string
): number {
  const profile = ELECTRODE_PROFILES[electrodeType as keyof typeof ELECTRODE_PROFILES] ?? ELECTRODE_PROFILES.E6013;
  const I_min = profile.I_min;
  const I_max = profile.I_max;

  const GAIN_MIN = 0.1;
  const GAIN_MAX = 0.85;

  // Normalize amperage to [0, 1] range
  const normalized = Math.max(0, Math.min(1, (amperage - I_min) / (I_max - I_min)));
  return GAIN_MIN + normalized * (GAIN_MAX - GAIN_MIN);
}

/**
 * Clamps a value to a target range with explicit bounds.
 * Used throughout audio mappings to prevent out-of-range values.
 *
 * @param value Input value
 * @param min Minimum bound
 * @param max Maximum bound
 * @returns Clamped value
 */
export function clampAudioValue(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}