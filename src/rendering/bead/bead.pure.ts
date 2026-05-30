// src/rendering/bead/bead.pure.ts — Pure functions extracted from BeadRenderer
// These functions contain zero allocations and no framework imports
// All THREE types are confined to the component layer

/**
 * Hot-to-cool color lerp targets
 * Hot (coolingProgress=0): bright orange-white
 * Cool (coolingProgress=1): dark gray
 */
const HOT_COLOR = { r: 1.0, g: 0.6, b: 0.1 };
const COOL_COLOR = { r: 0.15, g: 0.15, b: 0.15 };

/**
 * Computes RGB color for a stamp based on cooling progress.
 * Pure function — no framework imports.
 *
 * @param coolingProgress 0.0 (hot) → 1.0 (cool)
 * @returns RGB color object with r, g, b values
 */
export function computeStampColorRGB(coolingProgress: number): { r: number; g: number; b: number } {
  const t = Math.max(0, Math.min(1, coolingProgress));
  return {
    r: HOT_COLOR.r + (COOL_COLOR.r - HOT_COLOR.r) * t,
    g: HOT_COLOR.g + (COOL_COLOR.g - HOT_COLOR.g) * t,
    b: HOT_COLOR.b + (COOL_COLOR.b - HOT_COLOR.b) * t,
  };
}

/**
 * Applies cooling color to a pre-allocated color array.
 * Zero allocation — direct TypedArray mutation.
 *
 * @param colorArray  Pre-allocated Float32Array for vertex colors (RGB triplets)
 * @param coolingProgress  0.0 (hot) → 1.0 (cool)
 * @param startVertex  First vertex index to color
 * @param vertexCount  Number of vertices to color (6 per stamp)
 */
export function applyCoolingToArray(
  colorArray: Float32Array,
  coolingProgress: number,
  startVertex: number,
  vertexCount: number,
): void {
  const { r, g, b } = computeStampColorRGB(coolingProgress);

  for (let i = 0; i < vertexCount; i++) {
    const vi = (startVertex + i) * 3;
    colorArray[vi] = r;
    colorArray[vi + 1] = g;
    colorArray[vi + 2] = b;
  }
}

/**
 * Detects if session was reset by checking if point count dropped significantly.
 * Returns true if current count is less than 50% of previous count.
 */
export function isSessionReset(currentPointCount: number, previousPointCount: number): boolean {
  return currentPointCount < previousPointCount * 0.5;
}

/**
 * Checks if point count is at or above the memory leak warning threshold (90%).
 */
export function isAtLeakWarningThreshold(pointCount: number, maxStamps: number): boolean {
  return pointCount >= maxStamps * 0.9;
}

/**
 * Checks if frame time exceeded the budget.
 * Returns true if elapsed > budget.
 */
export function isFrameBudgetExceeded(elapsedMs: number, budgetMs: number): boolean {
  return elapsedMs > budgetMs;
}
