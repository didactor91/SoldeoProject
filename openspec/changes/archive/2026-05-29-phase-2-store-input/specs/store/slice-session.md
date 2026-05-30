// openspec/changes/phase-2-store-input/specs/store/slice-session.md — Session slice delta spec

# Delta: store/session-slice

## ADDED Requirements

### Requirement: Session State Shape

The system SHALL maintain session state as a `SessionState` object containing:
- `phase`: current phase (`setup` | `welding` | `heatmap`)
- `difficulty`: difficulty level (`school` | `professional` | `expert`)
- `elapsedTime`: total welding time in seconds
- `weldPoints`: array of `WeldPoint` records
- `averageQuality`: weighted average quality score 0–1
- `worstDefect`: most severe defect type observed

#### Scenario: Initial session state

- GIVEN a new weld session
- WHEN the store is initialized
- THEN `session.phase` SHALL be `"setup"`
- AND `session.difficulty` SHALL be `"school"`
- AND `session.elapsedTime` SHALL be `0`
- AND `session.weldPoints` SHALL be an empty array
- AND `session.averageQuality` SHALL be `0`
- AND `session.worstDefect` SHALL be `"none"`

---

### Requirement: setDifficulty Action

The system SHALL provide a `setDifficulty(difficulty: DifficultyLevel): void` action that:
- Accepts `school | professional | expert`
- Transitions session phase from `"setup"` to `"welding"`
- MUST NOT change difficulty mid-weld after phase is `"welding"`

#### Scenario: Difficulty set during setup

- GIVEN `session.phase` is `"setup"`
- WHEN `setDifficulty("expert")` is called
- THEN `session.difficulty` SHALL be `"expert"`
- AND `session.phase` SHALL transition to `"welding"`

#### Scenario: Difficulty change blocked during welding

- GIVEN `session.phase` is `"welding"`
- WHEN `setDifficulty("professional")` is called
- THEN `session.difficulty` SHALL remain unchanged
- AND `session.phase` SHALL remain `"welding"`

---

### Requirement: endWeldSession Action

The system SHALL provide an `endWeldSession(): void` action that:
- Transitions `session.phase` from `"welding"` to `"heatmap"`
- Stops physics engine ticking (via external flag)
- Freezes `weldPoints` array (no more appends)
- Computes final `averageQuality` from all weld points

#### Scenario: Session ends normally

- GIVEN `session.phase` is `"welding"` and weld points exist
- WHEN `endWeldSession()` is called
- THEN `session.phase` SHALL be `"heatmap"`
- AND `session.averageQuality` SHALL be computed
- AND `session.worstDefect` SHALL reflect the most severe defect

#### Scenario: Session ends with no weld points

- GIVEN `session.phase` is `"welding"` but `weldPoints` is empty
- WHEN `endWeldSession()` is called
- THEN `session.phase` SHALL be `"heatmap"`
- AND `session.averageQuality` SHALL be `0`
- AND `session.worstDefect` SHALL be `"none"`

---

### Requirement: resetSession Action

The system SHALL provide a `resetSession(): void` action that:
- Resets ALL session fields to initial state
- Clears `weldPoints` array
- Resets `phase` to `"setup"`
- Resets `difficulty` to `"school"`
- Resets `elapsedTime` to `0`
- Resets `averageQuality` to `0`
- Resets `worstDefect` to `"none"`

#### Scenario: Full session reset

- GIVEN a completed session with weld points
- WHEN `resetSession()` is called
- THEN all fields SHALL match initial state
- AND `weldPoints` SHALL be empty

---

### Requirement: commitFrame Appends Weld Points

`commitFrame(frame: FrameResult)` SHALL append `frame.newWeldPoint` to `session.weldPoints` if `newWeldPoint` is non-null. `averageQuality` and `worstDefect` SHALL be incrementally updated.

#### Scenario: Weld point appended

- GIVEN a `FrameResult` with `newWeldPoint` populated
- WHEN `commitFrame(frame)` is called
- THEN `session.weldPoints.length` SHALL increase by 1
- AND the last element SHALL equal `newWeldPoint`
- AND `session.averageQuality` SHALL be incrementally updated

---

### Requirement: Elapsed Time Tracking

`elapsedTime` SHALL be incremented by the `delta` parameter each frame during `"welding"` phase. It SHALL NOT increment during `"setup"` or `"heatmap"` phases.

#### Scenario: Elapsed time increments during welding

- GIVEN `session.phase` is `"welding"`
- WHEN `commitFrame(frameResult)` is called with `delta = 0.016`
- THEN `session.elapsedTime` SHALL increase by `0.016` seconds

#### Scenario: Elapsed time frozen in heatmap

- GIVEN `session.phase` is `"heatmap"`
- WHEN `commitFrame(frameResult)` is called
- THEN `session.elapsedTime` SHALL remain unchanged

---

### Requirement: Zero Allocations

Session slice actions SHALL NOT allocate memory. `weldPoints` growth SHALL use pre-allocated buffer management.

---

## Rollback

Delete `src/app/store/slices/sessionSlice.ts`. This change is purely additive.

## Acceptance Criteria

- [x] `sessionSlice` exports named slice matching `SessionState` shape
- [x] `setDifficulty(difficulty: DifficultyLevel): void` — guarded by phase
- [x] `endWeldSession(): void` — transitions to heatmap, computes final score
- [x] `resetSession(): void` — full reset to initial state
- [x] `commitFrame` appends weld points and updates running stats
- [x] `elapsedTime` increments only during welding phase
- [x] Zero `any` types; all types from `src/app/store/types.ts`
- [x] Zero allocations in hot path
- [x] File header comment per D-03