// src/rendering/Workpiece.tsx — Renders static base plate with grid overlay
// Default export (R3F convention)
// D-03: File header comment | D-04: Default export for R3F component

import {
  PLATE_WIDTH,
  PLATE_DEPTH,
  PLATE_THICKNESS,
  GRID_SPACING,
  GRID_LINE_THICKNESS,
  calculateHorizontalGridCount,
  calculateVerticalGridCount,
  calculateHorizontalGridX,
  calculateVerticalGridZ,
  calculateGridY,
  getHorizontalGridLineDims,
  getVerticalGridLineDims,
} from './workpiece.pure';

/**
 * Workpiece — renders the static welding workpiece/base plate.
 *
 * Geometry: BoxGeometry representing a steel plate (300mm × 100mm × 6mm).
 * Scale: 1 unit = 100mm, so plate is 3.0 × 1.0 × 0.06 units.
 *
 * Material: PBR steel with high metalness (>0.8) and moderate roughness (0.3-0.6).
 * Grid overlay: 25mm spacing grid lines for weld seam reference.
 * Grid is semi-transparent and does not interfere with bead rendering.
 *
 * Static component — no useFrame, no store subscriptions.
 */
function Workpiece() {
  const gridY = calculateGridY(PLATE_THICKNESS, 0.002);
  const horizontalCount = calculateHorizontalGridCount(300, 25);
  const verticalCount = calculateVerticalGridCount(100, 25);
  const hLineDims = getHorizontalGridLineDims(PLATE_DEPTH, GRID_LINE_THICKNESS);
  const vLineDims = getVerticalGridLineDims(PLATE_WIDTH, GRID_LINE_THICKNESS);

  return (
    <group>
      {/* Steel base plate */}
      <mesh position={[0, -PLATE_THICKNESS / 2, 0]} receiveShadow castShadow>
        <boxGeometry args={[PLATE_WIDTH, PLATE_THICKNESS, PLATE_DEPTH]} />
        <meshStandardMaterial
          color="#606060"
          roughness={0.45}
          metalness={0.85}
        />
      </mesh>

      {/* Grid overlay — thin lines for weld seam reference */}
      {/* Horizontal lines along X axis (25mm spacing = 0.25 unit) */}
      {Array.from({ length: horizontalCount }, (_, i) => (
        <mesh
          key={`h-${i}`}
          position={[calculateHorizontalGridX(i, PLATE_WIDTH, GRID_SPACING), gridY, 0]}
          receiveShadow
        >
          <boxGeometry args={[hLineDims.width, hLineDims.height, hLineDims.depth]} />
          <meshStandardMaterial
            color="#404040"
            roughness={0.8}
            metalness={0.3}
            transparent
            opacity={0.6}
          />
        </mesh>
      ))}

      {/* Vertical lines along Z axis (25mm spacing = 0.25 unit) */}
      {Array.from({ length: verticalCount }, (_, i) => (
        <mesh
          key={`v-${i}`}
          position={[0, gridY, calculateVerticalGridZ(i, PLATE_DEPTH, GRID_SPACING)]}
          receiveShadow
        >
          <boxGeometry args={[vLineDims.width, vLineDims.height, vLineDims.depth]} />
          <meshStandardMaterial
            color="#404040"
            roughness={0.8}
            metalness={0.3}
            transparent
            opacity={0.6}
          />
        </mesh>
      ))}
    </group>
  );
}

export default Workpiece;