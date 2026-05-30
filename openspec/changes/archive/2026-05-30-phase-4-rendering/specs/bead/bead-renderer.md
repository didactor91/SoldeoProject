# Delta for BeadRenderer

## ADDED Requirements

### Requirement: BeadRenderer reads weldPoints via getState()

The system SHALL read `session.weldPoints` using `useWelderStore.getState()` inside `useFrame`. The hook form MUST NOT be used inside the render path (A-05).

#### Scenario: getState used in useFrame

- GIVEN `BeadRenderer` is mounted
- WHEN `useFrame` fires each frame
- THEN `useWelderStore.getState().session.weldPoints` is called
- AND the result drives bead geometry

#### Scenario: Hook form not used in useFrame

- GIVEN `BeadRenderer` is mounted
- WHEN the source is inspected
- THEN no `useWelderStore(selector)` call exists inside `useFrame`

### Requirement: Bead ribbon rendered as extruded mesh

The system SHALL render the weld bead as an extruded ribbon/tube geometry. Each `WeldPoint` drives a stamp in the bead, and the geometry is updated by mutating the pre-allocated `BufferGeometry`.

#### Scenario: Bead renders with correct point count

- GIVEN `session.weldPoints` has 50 entries
- WHEN `BeadRenderer` renders
- THEN the bead mesh displays 50 connected stamps forming a ribbon

#### Scenario: Empty weldPoints renders nothing

- GIVEN `session.weldPoints` is empty
- WHEN `BeadRenderer` renders
- THEN no bead geometry is visible

### Requirement: coolingProgress drives bead color

The system SHALL map `coolingProgress` (0.0–1.0) to bead color. Hot stamps (coolingProgress near 0) appear bright; cool stamps (coolingProgress near 1) appear dark.

#### Scenario: Hot stamp color

- GIVEN a `WeldPoint` with `coolingProgress = 0.0`
- WHEN the bead renders that stamp
- THEN the color is bright (high luminance)

#### Scenario: Cool stamp color

- GIVEN a `WeldPoint` with `coolingProgress = 1.0`
- WHEN the bead renders that stamp
- THEN the color is dark (low luminance)

### Requirement: applyCooling runs with zero allocations

The system SHALL execute `applyCooling()` without allocating memory. All color computations MUST use pre-allocated refs (A-03).

#### Scenario: applyCooling called every frame

- GIVEN `useFrame` runs at 60Hz
- WHEN `applyCooling` is called each frame
- THEN zero garbage is produced

### Requirement: Frame budget 2ms max

The system SHALL complete bead rendering within 2ms per frame (F-01, FRAME_BUDGET.BEAD_RENDERER).

#### Scenario: Frame budget assertion in DEV

- GIVEN `BeadRenderer` is running in DEV mode
- WHEN a frame renders with 100 weld points
- THEN `performance.now()` assertions fire if render exceeds 2ms

### Requirement: Memory leak warning at MAX_STAMPS * 0.9

The system SHALL log a DEV warning when `totalSegmentsRef.current >= MAX_STAMPS * 0.9` (F-02).

#### Scenario: Warning at 90% capacity

- GIVEN `totalSegmentsRef.current` equals `MAX_STAMPS * 0.9`
- WHEN the next frame renders
- THEN a console warning is logged in DEV builds

#### Scenario: No warning below threshold

- GIVEN `totalSegmentsRef.current` is below `MAX_STAMPS * 0.9`
- WHEN the next frame renders
- THEN no warning is logged

## Rollback Plan

1. Delete `src/rendering/bead/BeadRenderer.tsx` — purely additive
2. No side effects on engine or store
