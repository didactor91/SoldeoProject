// src/rendering/workpiece.pure.ts — Pure functions extracted from Workpiece
// These functions contain zero allocations and no framework imports

/**
 * Plate dimensions in scene units (1 unit = 100mm)
 *300mm × 100mm × 6mm steel plate
 */
export const PLATE_WIDTH = 3.0;   // 300mm
export const PLATE_DEPTH = 1.0;   // 100mm
export const PLATE_THICKNESS = 0.06; // 6mm

/**
 * Grid line spacing in scene units (25mm = 0.25 unit)
 */
export const GRID_SPACING = 0.25; // 25mm

/**
 * Grid line thickness for visibility
 */
export const GRID_LINE_THICKNESS = 0.003;

/**
 * Calculates the number of horizontal grid lines needed.
 * Grid lines every 25mm from -150mm to +150mm = 13 lines (12 intervals + 2 edges)
 *
 * @param plateWidthMM Plate width in mm (default 300)
 * @param spacingMM Grid spacing in mm (default 25)
 * @returns Number of grid lines
 */
export function calculateHorizontalGridCount(plateWidthMM: number = 300, spacingMM: number = 25): number {
  return Math.floor(plateWidthMM / spacingMM) + 1;
}

/**
 * Calculates the number of vertical grid lines needed.
 * Grid lines every 25mm from -50mm to +50mm = 5 lines
 *
 * @param plateDepthMM Plate depth in mm (default 100)
 * @param spacingMM Grid spacing in mm (default 25)
 * @returns Number of grid lines
 */
export function calculateVerticalGridCount(plateDepthMM: number = 100, spacingMM: number = 25): number {
  return Math.floor(plateDepthMM / spacingMM) + 1;
}

/**
 * Calculates horizontal grid line X position.
 *
 * @param index Grid line index (0-based)
 * @param plateWidthSceneUnits Plate width in scene units (default 3.0)
 * @param spacingSceneUnits Grid spacing in scene units (default 0.25)
 * @returns X position for the grid line
 */
export function calculateHorizontalGridX(
  index: number,
  plateWidthSceneUnits: number = 3.0,
  spacingSceneUnits: number = 0.25
): number {
  return -plateWidthSceneUnits / 2 + index * spacingSceneUnits;
}

/**
 * Calculates vertical grid line Z position.
 *
 * @param index Grid line index (0-based)
 * @param plateDepthSceneUnits Plate depth in scene units (default 1.0)
 * @param spacingSceneUnits Grid spacing in scene units (default 0.25)
 * @returns Z position for the grid line
 */
export function calculateVerticalGridZ(
  index: number,
  plateDepthSceneUnits: number = 1.0,
  spacingSceneUnits: number = 0.25
): number {
  return -plateDepthSceneUnits / 2 + index * spacingSceneUnits;
}

/**
 * Calculates the Y position for grid lines (slightly above plate surface).
 *
 * @param plateThicknessSceneUnits Plate thickness in scene units (default 0.06)
 * @param offset Offset above plate surface (default 0.002)
 * @returns Y position for grid lines
 */
export function calculateGridY(
  plateThicknessSceneUnits: number = 0.06,
  offset: number = 0.002
): number {
  return -plateThicknessSceneUnits / 2 + offset;
}

/**
 * Calculates the grid line dimensions for horizontal lines.
 *
 * @param plateDepthSceneUnits Plate depth in scene units (default 1.0)
 * @param thickness Grid line thickness (default 0.003)
 * @returns Object with width, height, depth for the grid line mesh
 */
export function getHorizontalGridLineDims(
  plateDepthSceneUnits: number = 1.0,
  thickness: number = 0.003
): { width: number; height: number; depth: number } {
  return {
    width: thickness,
    height: 0.001,
    depth: plateDepthSceneUnits,
  };
}

/**
 * Calculates the grid line dimensions for vertical lines.
 *
 * @param plateWidthSceneUnits Plate width in scene units (default 3.0)
 * @param thickness Grid line thickness (default 0.003)
 * @returns Object with width, height, depth for the grid line mesh
 */
export function getVerticalGridLineDims(
  plateWidthSceneUnits: number = 3.0,
  thickness: number = 0.003
): { width: number; height: number; depth: number } {
  return {
    width: plateWidthSceneUnits,
    height: 0.001,
    depth: thickness,
  };
}
