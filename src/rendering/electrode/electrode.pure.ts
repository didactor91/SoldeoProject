// src/rendering/electrode/electrode.pure.ts — Pure functions extracted from ElectrodeModel
// These functions contain zero allocations and no framework imports

/**
 * Calculates the length scale factor for the electrode mesh.
 * Based on currentLength vs initialLength ratio.
 * 350mm full → scale 1.0; 0mm depleted → scale ~0
 *
 * @param currentLength Current electrode length in mm
 * @param initialLength Initial electrode length in mm (default 350)
 * @returns Scale factor [0, 1]
 */
export function calculateLengthScale(currentLength: number, initialLength: number = 350): number {
  if (initialLength <= 0) return 0;
  return currentLength / initialLength;
}

/**
 * Calculates emissive intensity based on electrode temperature.
 * Temperature range [0, 1] maps to emissive intensity [0, maxIntensity].
 *
 * @param temperature Electrode temperature [0, 1]
 * @param maxIntensity Maximum emissive intensity (default 0.8)
 * @returns Emissive intensity value
 */
export function calculateTemperatureEmissive(temperature: number, maxIntensity: number = 0.8): number {
  return Math.max(0, Math.min(1, temperature)) * maxIntensity;
}

/**
 * Determines if the electrode material should show the stuck warning glow.
 * isStuck=true triggers red emissive warning.
 *
 * @param isStuck Whether the electrode is stuck to the workpiece
 * @returns true if stuck warning should be shown
 */
export function isStuckWarning(isStuck: boolean): boolean {
  return isStuck;
}

/**
 * Returns the material color values for a given electrode type.
 * E6013: lighter silvery rutile appearance
 * E7018: darker matte low-hydrogen appearance
 *
 * @param electrodeType Either 'E6013' or 'E7018'
 * @returns RGB color object with r, g, b values (0-1 range)
 */
export function getElectrodeMaterialColor(
  electrodeType: string
): { r: number; g: number; b: number } {
  if (electrodeType === 'E7018') {
    // Darker matte gray
    return { r: 0.25, g: 0.25, b: 0.25 };
  }
  // E6013 default - lighter silvery
  return { r: 0.75, g: 0.75, b: 0.75 };
}

/**
 * Returns the material properties for a given electrode type.
 *
 * @param electrodeType Either 'E6013' or 'E7018'
 * @returns Object with roughness and metalness values
 */
export function getElectrodeMaterialProps(
  electrodeType: string
): { roughness: number; metalness: number } {
  if (electrodeType === 'E7018') {
    return { roughness: 0.7, metalness: 0.6 };
  }
  // E6013 default
  return { roughness: 0.4, metalness: 0.5 };
}
