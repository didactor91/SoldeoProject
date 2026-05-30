# Delta for Scene

## ADDED Requirements

### Requirement: Scene is R3F Canvas root

The system SHALL render a React Three Fiber `Canvas` as the scene root. All sub-renderers MUST be composed as children of this canvas.

#### Scenario: Canvas renders

- GIVEN `Scene` is mounted
- WHEN the component renders
- THEN a `<Canvas>` element is present in the DOM

#### Scenario: All sub-renderers composed

- GIVEN `Scene` is mounted
- WHEN the component source is inspected
- THEN `<BeadRenderer>`, `<ElectrodeModel>`, `<ArcEffect>`, `<SpatterSystem>`, and `<Workpiece>` are all rendered inside the Canvas

### Requirement: Scene wraps useFrame with frame budget assertion

The system SHALL wrap `useFrame` with `performance.now()` timing assertions in DEV mode. The total frame budget target is 12ms (F-01).

#### Scenario: Frame budget assertion in DEV

- GIVEN `Scene` is running in DEV mode
- WHEN a frame renders
- THEN `performance.now()` measures elapsed time
- AND if elapsed > 12ms, a console warning is logged

#### Scenario: No assertion in production

- GIVEN `Scene` is running in production mode
- WHEN a frame renders
- THEN no `performance.now()` assertions fire

### Requirement: Sub-renderers receive correct frame budget allocations

The system SHALL allocate frame time budgets to sub-renderers. BEAD_RENDERER MUST be capped at 2ms, SPATTER_SYSTEM at 1ms per the FRAME_BUDGET constants.

#### Scenario: BeadRenderer budget2ms

- GIVEN `Scene` contains `<BeadRenderer>`
- WHEN `BeadRenderer` renders in DEV mode
- THEN a warning fires if render exceeds 2ms

#### Scenario: SpatterSystem budget 1ms

- GIVEN `Scene` contains `<SpatterSystem>`
- WHEN `SpatterSystem` renders in DEV mode
- THEN a warning fires if render exceeds 1ms

### Requirement: Scene reads arc state for sub-component coordination

The system SHALL read `arc.isActive` and `arc.stability` from the store to coordinate sub-renderer visibility and behavior.

#### Scenario: Arc state drives sub-renderer visibility

- GIVEN `arc.isActive = false`
- WHEN `Scene` renders
- THEN `<ArcEffect>` is not visible
- AND `<SpatterSystem>` does not fire bursts

## Rollback Plan

1. Delete `src/rendering/Scene.tsx` — purely additive
2. No side effects on engine or store
