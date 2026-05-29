// openspec/changes/phase-2-store-input/specs/store/slice-electrode.md — Electrode slice delta spec

# Delta: store/electrode-slice

## ADDED Requirements

### Requirement: Electrode State Shape

The system SHALL maintain electrode state as an `ElectrodeState` object containing:
- `type`: electrode identifier (`E6013` | `E7018`)
- `initialLength`: original rod length in mm
- `currentLength`: remaining length in mm
- `remainingMass`: mass left in grams
- `temperature`: thermal state 0–1
- `isStuck`: boolean indicating electrode stick condition

No other fields are permitted in the electrode slice state.

#### Scenario: Initial electrode state on session start

- GIVEN a new weld session
- WHEN the store is initialized
- THEN `electrode.type` SHALL be `"E6013"`
- AND `electrode.initialLength` SHALL be `350` mm
- AND `electrode.currentLength` SHALL equal `electrode.initialLength`
- AND `electrode.remainingMass` SHALL be computed from `initialLength`
- AND `electrode.temperature` SHALL be `0`
- AND `electrode.isStuck` SHALL be `false`

#### Scenario: Electrode depletion over time

- GIVEN an active welding session with arc strike
- WHEN `ElectrodeEngine.deplete()` runs
- THEN `electrode.currentLength` SHALL decrease proportionally to amperage and time
- AND `electrode.remainingMass` SHALL decrease proportionally

#### Scenario: Electrode stick condition

- GIVEN arc is struck and arc length reaches zero
- WHEN arc remains at zero length for longer than the stick threshold
- THEN `electrode.isStuck` SHALL be `true`
- AND `setAmperage` SHALL be disabled until `unstickElectrode()` is called

---

### Requirement: setAmperage Action

The system SHALL provide a `setAmperage(amperage: number): void` action that:
- Accepts amperage in Amperes (70–130A range)
- Validates against `ELECTRODE_PROFILES[type].I_min` and `I_max`
- Clamps out-of-range values to valid bounds
- Updates `electrode.temperature` based on amperage deviation from `I_optimal`

#### Scenario: Valid amperage setpoint

- GIVEN electrode type is `"E6013"`
- WHEN `setAmperage(100)` is called
- THEN amperage SHALL be stored as `100`
- AND `electrode.temperature` SHALL reflect 100A thermal load

#### Scenario: Amperage clamped below minimum

- GIVEN electrode type is `"E6013"` (I_min = 70A)
- WHEN `setAmperage(50)` is called
- THEN amperage SHALL be clamped to `70`
- AND no error SHALL be thrown

#### Scenario: Amperage clamped above maximum

- GIVEN electrode type is `"E6013"` (I_max = 130A)
- WHEN `setAmperage(150)` is called
- THEN amperage SHALL be clamped to `130`
- AND no error SHALL be thrown

---

### Requirement: unstickElectrode Action

The system SHALL provide an `unstickElectrode(): void` action that:
- Sets `electrode.isStuck` to `false`
- Resets `electrode.temperature` to a safe value
- MUST only be callable when `electrode.isStuck` is `true`

#### Scenario: Successful unstick

- GIVEN `electrode.isStuck` is `true`
- WHEN `unstickElectrode()` is called
- THEN `electrode.isStuck` SHALL be `false`
- AND `electrode.temperature` SHALL be reset

#### Scenario: unstick called when not stuck (no-op)

- GIVEN `electrode.isStuck` is `false`
- WHEN `unstickElectrode()` is called
- THEN state SHALL remain unchanged

---

### Requirement: PhysicsEngine.tick() Integration

The electrode slice SHALL be read-only during physics ticks. `PhysicsEngine.tick(welderStore)` SHALL receive the full `WelderStore` object and read `electrode`, `arc`, and `input` state directly via `getState()`.

#### Scenario: PhysicsEngine reads electrode state

- GIVEN a `WelderStore` instance
- WHEN `PhysicsEngine.tick(welderStore)` is called
- THEN the engine SHALL read `electrode.currentLength`
- AND `electrode.type`
- AND `electrode.temperature`
- AND `electrode.isStuck`

---

### Requirement: No Allocations in Hot Path

The electrode slice actions (`setAmperage`, `unstickElectrode`) SHALL NOT allocate memory. All reused objects SHALL be pre-allocated at module level.

#### Scenario: Repeated setAmperage calls

- GIVEN `setAmperage` is called 1000 times in a tight loop
- WHEN each call is inspected
- THEN zero `new` expressions SHALL be present
- AND zero array literals SHALL be created

---

## Rollback

Delete `src/app/store/slices/electrodeSlice.ts`. This change is purely additive.

## Acceptance Criteria

- [x] `electrodeSlice` exports named slice matching `ElectrodeState` shape
- [x] `setAmperage(amperage: number): void` — clamps to I_min/I_max
- [x] `unstickElectrode(): void` — only operates when `isStuck === true`
- [x] Zero `any` types; all types from `src/app/store/types.ts`
- [x] Zero allocations in action functions
- [x] File header comment per D-03