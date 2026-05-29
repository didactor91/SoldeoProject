// openspec/changes/phase-2-store-input/specs/store/index.md — Store assembly delta spec

# Delta: store/index

## ADDED Requirements

### Requirement: Store Assembly

The system SHALL assemble a Zustand store from 4 named slices (`electrodeSlice`, `arcSlice`, `inputSlice`, `sessionSlice`) using Zustand's `create()` with explicit types. The store SHALL be exported as a named export `useWelderStore`.

#### Scenario: Store combines all slices

- GIVEN all 4 slices are defined
- WHEN `create<WelderStore>()((...))` is called
- THEN the resulting store state SHALL contain `electrode`, `arc`, `input`, `session`
- AND all actions from `WelderStore` interface SHALL be callable

#### Scenario: getState() returns fully populated store

- GIVEN the app has mounted
- WHEN `useWelderStore.getState()` is called
- THEN all state fields SHALL be present and typed correctly
- AND all actions SHALL be callable

---

### Requirement: No Default Exports

The store index file SHALL NOT use default exports. All exports SHALL be named.

#### Scenario: Named exports only

- GIVEN the store module
- WHEN examining exports
- THEN there SHALL be no `export default`
- AND all slices SHALL be named exports

---

### Requirement: TypeScript Strict Mode Compliance

The store SHALL use `create<WelderStore>()((...))` pattern with no `any` types. All state and action types SHALL be inferred from the slice composition.

#### Scenario: Type inference from slices

- GIVEN TypeScript strict mode
- WHEN the store is compiled
- THEN no `any` type errors SHALL occur
- AND all state fields SHALL be typed

---

### Requirement: Integration with InputController

The store SHALL be readable by `InputController.tick()` via `useWelderStore.getState()`. No hooks inside the hot path.

#### Scenario: InputController reads store state

- GIVEN `InputController` is initialized
- WHEN `InputController.tick(delta)` is called
- THEN it SHALL call `useWelderStore.getState()` to read current state
- AND it SHALL NOT subscribe via hook

---

### Requirement: PhysicsEngine.tick() Contract

The store SHALL provide `commitFrame(frame: FrameResult)` which updates all sub-states from the physics engine's output.

#### Scenario: commitFrame delegates to slices

- GIVEN a `FrameResult` from physics engine
- WHEN `useWelderStore.getState().commitFrame(frame)` is called
- THEN `electrode` SHALL be updated from `frame.electrode`
- AND `arc` SHALL be updated from `frame.arc`
- AND `input` SHALL be updated from `frame.input`
- AND `session` SHALL have `newWeldPoint` appended if non-null

---

### Requirement: Zero Allocations in Store Access

`useWelderStore.getState()` called every frame SHALL NOT allocate memory. All state reads SHALL return existing objects.

---

## Rollback

Delete `src/app/store/index.ts`. This change is purely additive.

## Acceptance Criteria

- [x] `useWelderStore` is the single named export
- [x] Store combines `electrodeSlice`, `arcSlice`, `inputSlice`, `sessionSlice`
- [x] No default exports
- [x] `create<WelderStore>()((...))` pattern used with explicit typing
- [x] Zero `any` types
- [x] File header comment per D-03