// src/rendering/electrode/arc.pure.ts — Pure functions extracted from ArcEffect
// These functions contain zero allocations and no framework imports

/**
 * Voltage range constants for arc intensity normalization
 */
const VOLTAGE_MIN = 20;
const VOLTAGE_MAX = 40;
const VOLTAGE_RANGE = VOLTAGE_MAX - VOLTAGE_MIN; // 20

/**
 * Intensity range constants
 */
const INTENSITY_MIN = 0.5;
const INTENSITY_MAX = 2.0; // 0.5 + 1.5

/**
 * Calculates arc light position offset based on arc length.
 * arcLength is in mm, scene unit = 100mm, so divide by 100.
 * Electrode tip is at y=0.5.
 *
 * @param arcLengthMm Arc length in mm
 * @param electrodeTipY Y position of electrode tip (default 0.5)
 * @returns Y position for the arc light
 */
export function calculateArcLightY(arcLengthMm: number, electrodeTipY: number = 0.5): number {
  const positionOffset = arcLengthMm / 100;
  return electrodeTipY + positionOffset;
}

/**
 * Calculates base light intensity from voltage.
 * Normalizes voltage range [20, 40]V to intensity range [0.5, 2.0].
 *
 * @param voltage Arc voltage (20-40V typical)
 * @returns Base light intensity
 */
export function calculateBaseIntensity(voltage: number): number {
  const normalizedVoltage = (voltage - VOLTAGE_MIN) / VOLTAGE_RANGE; // 0 at 20V, 1 at 40V
  return INTENSITY_MIN + normalizedVoltage * (INTENSITY_MAX - INTENSITY_MIN);
}

/**
 * RGB color for stable arc (stability >= 0.5)
 * High stability = blue-white (hot, consistent)
 */
interface RGB { r: number; g: number; b: number }

/**
 * Calculates arc color based on stability.
 * High stability (≥0.5): blue-white (lerp from orange to blue-white)
 * Low stability (<0.5): orange-red
 *
 * @param stability Arc stability (0-1)
 * @returns RGB color object
 */
export function calculateArcColor(stability: number): RGB {
  if (stability >= 0.5) {
    // Blue-white for stable arc: lerp from orange (0.3, 0.1, 0) to blue-white (0.8, 0.9, 1)
    return {
      r: 0.3 + stability * 0.5,
      g: 0.1 + stability * 0.8,
      b: stability * 1.0,
    };
  } else {
    // Orange-red for unstable arc: orange (1, 0.4+stability*0.2, 0.05)
    return {
      r: 1,
      g: 0.4 + stability * 0.2,
      b: 0.05,
    };
  }
}

/**
 * Calculates flicker intensity for unstable arcs.
 * Only applies when stability < 0.5
 *
 * @param stability Arc stability (0-1)
 * @param randomValue Random value [0, 1) — use Math.random() in calling code
 * @returns Flicker multiplier (0.7-1.0 range) or 1.0 if stable
 */
export function calculateFlickerIntensity(stability: number, randomValue: number): number {
  if (stability >= 0.5) {
    return 1.0;
  }
  return 0.7 + randomValue * 0.3;
}

/**
 * Calculates final arc intensity including flicker.
 *
 * @param baseIntensity Base intensity from voltage
 * @param stability Arc stability (0-1)
 * @param randomValue Random value [0, 1) for flicker — use Math.random() in calling code
 * @returns Final intensity (with flicker applied if unstable)
 */
export function calculateFinalIntensity(
  baseIntensity: number,
  stability: number,
  randomValue: number
): number {
  const flicker = calculateFlickerIntensity(stability, randomValue);
  return baseIntensity * flicker;
}

/**
 * Calculates emissive intensity for the arc sphere.
 * Follows the final intensity with a fixed multiplier.
 *
 * @param finalIntensity The final light intensity
 * @param emissiveMultiplier Multiplier for emissive vs light (default 0.8)
 * @returns Emissive intensity
 */
export function calculateEmissiveIntensity(
  finalIntensity: number,
  emissiveMultiplier: number = 0.8
): number {
  return finalIntensity * emissiveMultiplier;
}
