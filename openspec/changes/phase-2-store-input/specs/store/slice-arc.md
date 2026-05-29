// openspec/changes/phase-2-store-input/specs/store/slice-arc.md — Arc slice delta spec

# Delta: store/arc-slice

## ADDED Requirements

### Requirement: Arc State Shape

The system SHALL maintain arc state as an `ArcState` object containing:
- `isActive`: boolean indicating if arc is struck
- `arcLength`: current arc length in mm
- `voltage`: computed voltage in Volts
- `amperage`: current amperage in Amperes
- `stability`: normalized stability 0–1

No other fields are permitted. `isActive === false` SHALL represent an extinguished arc with all other fields at defaults.

#### Scenario: Initial arc state (extinguished)

- GIVEN a new weld session
- WHEN the store is initialized
- THEN `arc.isActive` SHALL be `false`
- AND `arc.arcLength` SHALL be `0`
- AND `arc.voltage` SHALL be `0`
- AND `arc.amperage` SHALL be `0`
- AND `arc.stability` SHALL be `0`

#### Scenario: Arc state while active

- GIVEN `arc.isActive` is `true`
- WHEN physics engine runs
- THEN `arc.arcLength` SHALL reflect current electrode-work distance
- AND `arc.voltage` SHALL equal `V0 + k * arcLength` per ArcEngine formula
- AND `arc.stability` SHALL reflect Gaussian response to parameter deviation

---

### Requirement: strikeArc Action

The system SHALL provide a `strikeArc(): void` action that:
- Sets `arc.isActive` to `true`
- Sets `arc.arcLength` to `L_optimal` for current electrode type
- Sets `arc.amperage` to current amperage setting
- Sets `arc.stability` to a default value of `0.5`
- MUST fail gracefully if electrode is depleted (`electrode.currentLength <= 0`)

#### Scenario: Successful arc strike

- GIVEN `electrode.isStuck` is `false` and electrode is not depleted
- WHEN `strikeArc()` is called
- THEN `arc.isActive` SHALL be `true`
- AND `arc.arcLength` SHALL be set to `ELECTRODE_PROFILES[type].L_optimal`

#### Scenario: Arc strike blocked when electrode depleted

- GIVEN `electrode.currentLength` is `0`
- WHEN `strikeArc()` is called
- THEN `arc.isActive` SHALL remain `false`
- AND no state mutation SHALL occur

#### Scenario: Arc strike blocked when electrode stuck

- GIVEN `electrode.isStuck` is `true`
- WHEN `strikeArc()` is called
- THEN `arc.isActive` SHALL remain `false`

---

### Requirement: extinguishArc Action

The system SHALL provide an `extinguishArc(): void` action that:
- Sets `arc.isActive` to `false`
- Resets `arc.arcLength` to `0`
- Resets `arc.voltage` to `0`
- Resets `arc.stability` to `0`
- Preserves `arc.amperage` for next strike

#### Scenario: Successful arc extinction

- GIVEN `arc.isActive` is `true`
- WHEN `extinguishArc()` is called
- THEN `arc.isActive` SHALL be `false`
- AND `arc.arcLength` SHALL be `0`
- AND `arc.voltage` SHALL be `0`
- AND `arc.stability` SHALL be `0`
- AND `arc.amperage` SHALL be preserved

---

### Requirement: Arc Voltage Computation

`ArcEngine.evaluate()` computes voltage as `V0 + k * arcLength` per RFC-002 §3.1. The arc slice voltage field SHALL be populated by `commitFrame(FrameResult)` from the engine output.

#### Scenario: Voltage computed from ArcEngine

- GIVEN `arc.isActive` is `true` and arc length is 3.2mm
- WHEN `commitFrame({ arc: { arcLength: 3.2, voltage: 30, stability: 0.8, isActive: true } })` is called
- THEN `arc.voltage` SHALL be `30`
- AND `arc.arcLength` SHALL be `3.2`
- AND `arc.stability` SHALL be `0.8`

---

### Requirement: PhysicsEngine.tick() Integration

The arc slice SHALL be writable only through store actions. `PhysicsEngine.tick()` SHALL NOT call store actions directly; instead it receives state, computes, and returns `FrameResult` which is committed via `commitFrame()`.

#### Scenario: FrameResult committed to store

- GIVEN a `FrameResult` from physics engine
- WHEN `commitFrame(frameResult)` is called
- THEN `arc` fields SHALL be updated from `frameResult.arc`
- AND `electrode` fields SHALL be updated from `frameResult.electrode`
- AND `input` fields SHALL be updated from `frameResult.input`

---

### Requirement: Zero Allocations

Arc slice actions (`strikeArc`, `extinguishArc`, `commitFrame`) SHALL NOT allocate memory.

---

## Rollback

Delete `src/app/store/slices/arcSlice.ts`. This change is purely additive.

## Acceptance Criteria

- [x] `arcSlice` exports named slice matching `ArcState` shape
- [x] `strikeArc(): void` — transitions `isActive` true→false with guards
- [x] `extinguishArc(): void` — resets arc to extinguished state
- [x] `commitFrame(frame: FrameResult): void` — updates arc from engine output
- [x] Guard: strike blocked when electrode depleted or stuck
- [x] Zero `any` types; all types from `src/app/store/types.ts`
- [x] Zero allocations in action functions
- [x] File header comment per D-03