// src/app/constants.ts — All physical constants, electrode profiles, drift configuration, and input rates

/**
 * Electrode profiles for SMAW simulation.
 * All values from RFC-002 §5.6 and SDD-001 §5.
 *
 * E6013 (Rutile): Forgiving, stable arc — ideal for beginners.
 * E7018 (Low-hydrogen Basic): Less forgiving — requires closer arc control.
 */
export const ELECTRODE_PROFILES = {
  E6013: {
    // Electrical
    V0: 20,            // V — minimum ionisation voltage
    k: 2.5,            // V/mm — voltage gradient per mm arc length

    // Amperage range
    I_optimal: 100,    // A — 3.2mm rod optimal current
    I_min: 70,         // A — minimum operating current
    I_max: 130,        // A — maximum operating current

    // Arc geometry
    L_optimal: 3.2,    // mm — optimal arc length (= rod diameter)
    L_max: 6.0,        // mm — maximum arc length (1.5× diameter)

    // Travel speed
    v_optimal: 2.5,    // mm/s (= 150mm/min)

    // Bead cross-section at optimal parameters
    W_base: 8,         // mm — base bead width
    H_base: 2.5,       // mm — base bead height
    P_base: 2.0,       // mm — base penetration depth

    // Angle parameters (degrees)
    theta_work_opt: 90,  // ° — work angle: perpendicular to surface
    theta_drag_opt: 70,  // ° — drag angle: 20° from vertical

    // Electrode consumption
    K_melt: 0.003,     // mm/(A·s) — empirical melt-off rate for E6013 3.2mm

    // Electrode dimensions
    initialLength: 350, // mm — full rod length (standard 3.2mm E6013)
  },
} as const;

/**
 * Drift difficulty configuration per RFC-002 §6.2.
 * Each level defines noise frequency and per-parameter drift amplitudes.
 *
 * arcLength:  mm/s — how fast arc length drifts
 * workAngle:  °/s  — how fast work angle drifts
 * dragAngle:  °/s  — how fast drag angle drifts
 * freq:       Hz   — Perlin noise sampling frequency
 */
export const DRIFT_CONFIG = {
  school: {
    freq: 0.20,
    arcLength: 0.2,
    workAngle: 1.5,
    dragAngle: 1.2,
  },
  professional: {
    freq: 0.35,
    arcLength: 0.5,
    workAngle: 3.5,
    dragAngle: 3.0,
  },
  expert: {
    freq: 0.50,
    arcLength: 1.0,
    workAngle: 6.0,
    dragAngle: 5.5,
  },
} as const;

/**
 * Input rate constants per RFC-002 §7.2.
 * Define how fast each parameter changes per frame when keys are held.
 */
export const INPUT_RATES = {
  ARC_RATE: 0.5,        // mm/s — Q/E key arc length change rate
  ANGLE_RATE: 1.0,      // °/s  — W/S/A/D key angle change rate
  MOUSE_SENSITIVITY: 0.15, // mm per pixel — mouse movement scaling
} as const;

/**
 * Frame budget targets per RFC-002 §10.
 * Used for performance monitoring in development builds.
 */
export const FRAME_BUDGET = {
  BEAD_RENDERER: 2,   // ms
  PHYSICS_ENGINE: 0.5, // ms
  SPATTER_SYSTEM: 1,   // ms
  HUD_REACT: 1,        // ms
  POST_PROCESSING: 2,  // ms
  TOTAL_TARGET: 8,     // ms — leaves 8ms headroom to 16.6ms (60fps)
} as const;

/**
 * Audio engine parameter mappings per RFC-002 §8.2.
 */
export const AUDIO_MAPPINGS = {
  FILTER_FREQ_MIN: 400,  // Hz — arc length at L_max
  FILTER_FREQ_MAX: 3000, // Hz — arc length at 0
  FILTER_Q_MIN: 0.5,     // — stability at 0
  FILTER_Q_MAX: 8.0,     // — stability at 1
  GAIN_MIN: 0.1,         // — at I_min
  GAIN_MAX: 0.85,        // — at I_max
} as const;
