// openspec/changes/phase-2-store-input/specs/input/mouse-tracker.md — MouseTracker spec

# Delta: input/mouse-tracker

## ADDED Requirements

### Requirement: MouseTracker Responsibility

`MouseTracker` SHALL accumulate raw pointer delta under Pointer Lock API and expose `getDelta(): { dx: number; dy: number }` for the current frame, then reset internal accumulator.

#### Scenario: Pointer lock requested

- GIVEN a user click on the canvas
- WHEN `mouseTracker.requestLock()` is called
- THEN Pointer Lock API SHALL be requested on the element
- AND `isLocked` SHALL reflect lock state after callback

#### Scenario: Delta accumulated during lock

- GIVEN pointer lock is active
- WHEN user moves mouse 100px right and 50px down
- THEN `getDelta()` SHALL return `{ dx: 100, dy: 50 }`
- AND internal accumulator SHALL be reset to `{ dx: 0, dy: 0 }`

#### Scenario: Delta zero when not locked

- GIVEN pointer lock is not active
- WHEN `getDelta()` is called
- THEN it SHALL return `{ dx: 0, dy: 0 }`
- AND no error SHALL be thrown

---

### Requirement: Raw Arc-Length Delta

Mouse X movement SHALL be converted to raw arc-length delta using `INPUT_RATES.MOUSE_SENSITIVITY`. Mouse Y movement is ignored for arc length.

#### Scenario: Arc-length delta from mouse X

- GIVEN pointer lock is active and `INPUT_RATES.MOUSE_SENSITIVITY` is `0.15`
- WHEN user moves mouse 10 pixels right
- THEN raw arc-length delta SHALL be `10 * 0.15 = 1.5` mm

---

### Requirement: Pointer Lock Fallback

If Pointer Lock API is unavailable (insecure context), `MouseTracker` SHALL fall back to `mousemove` events and track delta relative to last known position.

#### Scenario: Fallback when pointer lock unavailable

- GIVEN Pointer Lock API is not available
- WHEN `requestLock()` is called
- THEN the tracker SHALL attach `mousemove` listener instead
- AND track delta from last position

#### Scenario: Insecure context fallback

- GIVEN the page is served over HTTP (not HTTPS)
- WHEN MouseTracker is instantiated
- THEN it SHALL detect insecure context
- AND use `mousemove` fallback without attempting pointer lock

---

### Requirement: Zero Allocations

`getDelta()` SHALL return a pre-allocated object. No `new` expressions in the hot path.

#### Scenario: Repeated getDelta calls

- GIVEN `getDelta()` is called 1000 times
- WHEN each call is inspected
- THEN zero allocations SHALL be present

---

### Requirement: Cleanup on Detach

`MouseTracker` SHALL provide a `dispose()` method that removes all event listeners and releases pointer lock if active.

#### Scenario: Dispose releases lock and listeners

- GIVEN pointer lock is active
- WHEN `dispose()` is called
- THEN Pointer Lock SHALL be exited
- AND all event listeners SHALL be removed
- AND subsequent `getDelta()` calls SHALL return zero

---

## Rollback

Delete `src/input/MouseTracker.ts`. This change is purely additive.

## Acceptance Criteria

- [x] `MouseTracker` class with `requestLock()`, `getDelta()`, `dispose()`
- [x] Pointer Lock API used when available
- [x] `mousemove` fallback in insecure contexts
- [x] `getDelta()` returns pre-allocated object, zero allocations
- [x] Raw arc-length delta = `dx * INPUT_RATES.MOUSE_SENSITIVITY`
- [x] File header comment per D-03