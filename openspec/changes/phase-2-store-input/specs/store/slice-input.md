// openspec/changes/phase-2-store-input/specs/store/slice-input.md — Input slice delta spec

# Delta: store/input-slice

## ADDED Requirements

### Requirement: Input State Shape

The system SHALL maintain input state as an `InputState` object containing:
- `arcLength`: clamped and rate-limited arc length in mm
- `workAngle`: clamped work angle in degrees
- `dragAngle`: clamped drag angle in degrees
- `positionX`: clamped X position in mm
- `positionZ`: clamped Z position in mm
- `travelSpeed`: computed travel speed in mm/s

`InputState` extends `RawInputState` (which has `raw*` fields). The input slice SHALL store only the clamped derived values, not raw values. Raw input is tracked by `InputController` only.

#### Scenario: Initial input state

- GIVEN a new weld session
- WHEN the store is initialized
- THEN `input.arcLength` SHALL be `3.2` mm (L_optimal for E6013)
- AND `input.workAngle` SHALL be `90` degrees
- AND `input.dragAngle` SHALL be `70` degrees
- AND `input.positionX` SHALL be `0`
- AND `input.positionZ` SHALL be `0`
- AND `input.travelSpeed` SHALL be `0`

---

### Requirement: Input Clamping

Input slice SHALL enforce physical bounds derived from `ELECTRODE_PROFILES`:

| Field | Min | Max |
|-------|-----|-----|
| arcLength | 0 | `ELECTRODE_PROFILES[type].L_max` |
| workAngle | 60 | 120 |
| dragAngle | 40 | 90 |
| positionX | -50 | 50 |
| positionZ | -200 | 200 |

All values outside bounds SHALL be clamped, not rejected.

#### Scenario: Arc length clamped to maximum

- GIVEN `input.arcLength` is `6.0` mm
- WHEN a frame result tries to set `arcLength` to `8.0` mm
- THEN it SHALL be clamped to `6.0` mm (L_max)

#### Scenario: Work angle clamped to minimum

- GIVEN `input.workAngle` is `60` degrees (minimum)
- WHEN a frame result tries to set it to `45` degrees
- THEN it SHALL be clamped to `60` degrees

---

### Requirement: Travel Speed Computation

`travelSpeed` SHALL be computed as the magnitude of the position delta per frame, divided by frame time. It SHALL be non-negative.

#### Scenario: Travel speed computed from position delta

- GIVEN `input.positionX` was `0` and is now `2.5` mm after one frame
- AND frame time is `0.016` seconds (60fps)
- WHEN `travelSpeed` is computed
- THEN it SHALL equal approximately `156` mm/s

---

### Requirement: commitFrame Updates Input State

`commitFrame(frame: FrameResult)` SHALL update input state from `frame.input` which contains the clamped `InputState`.

#### Scenario: Input state updated from FrameResult

- GIVEN a `FrameResult` with `input: { arcLength: 3.0, workAngle: 85, dragAngle: 65, positionX: 5, positionZ: 10, travelSpeed: 100 }`
- WHEN `commitFrame(frameResult)` is called
- THEN `input.arcLength` SHALL be `3.0`
- AND `input.workAngle` SHALL be `85`
- AND `input.dragAngle` SHALL be `65`
- AND `input.positionX` SHALL be `5`
- AND `input.positionZ` SHALL be `10`
- AND `input.travelSpeed` SHALL be `100`

---

### Requirement: Zero Allocations in Hot Path

All input slice operations SHALL be zero-allocation. No temporary objects SHALL be created in `commitFrame` or any getter.

---

## Rollback

Delete `src/app/store/slices/inputSlice.ts`. This change is purely additive.

## Acceptance Criteria

- [x] `inputSlice` exports named slice matching `InputState` shape
- [x] `commitFrame(frame: FrameResult): void` — updates input from FrameResult
- [x] All fields clamped to physical bounds
- [x] `travelSpeed` computed as position delta magnitude / frame time
- [x] Zero `any` types; all types from `src/app/store/types.ts`
- [x] Zero allocations in hot path
- [x] File header comment per D-03