# Delta for Workpiece

## ADDED Requirements

### Requirement: Workpiece renders static base plate geometry

The system SHALL render a flat rectangular plate representing the workpiece/base metal. The geometry MUST be a `BoxGeometry` with dimensions appropriate for a welding practice plate.

#### Scenario: Base plate renders

- GIVEN `Workpiece` is mounted in the scene
- WHEN the scene renders
- THEN a flat rectangular plate mesh is visible

#### Scenario: Plate dimensions appropriate for SMAW practice

- GIVEN `Workpiece` is mounted
- WHEN the plate geometry is inspected
- THEN dimensions are sufficient for a typical weld bead length (e.g., 300mm × 100mm × 6mm)

### Requirement: Workpiece uses steel PBR material

The system SHALL apply a PBR (physically-based rendering) material with steel-like properties. The material MUST have appropriate metalness, roughness, and color.

#### Scenario: Steel appearance

- GIVEN `Workpiece` is rendered
- WHEN the material is inspected
- THEN metalness is high (> 0.8)
- AND roughness is moderate (0.3–0.6)
- AND base color is steel-gray

### Requirement: Grid lines for weld seam reference

The system SHALL render a grid overlay on the workpiece surface to guide weld seam placement. The grid MUST be visible but not interfere with welding visibility.

#### Scenario: Grid visible on workpiece

- GIVEN `Workpiece` is rendered
- WHEN the scene is viewed from above
- THEN a grid pattern is visible on the plate surface

#### Scenario: Grid does not occlude weld bead

- GIVEN `Workpiece` is rendered alongside `BeadRenderer`
- WHEN the bead renders over the grid
- THEN the grid remains visible beneath the bead without z-fighting

## Rollback Plan

1. Delete `src/rendering/Workpiece.tsx` — purely additive
2. No side effects on engine or store
