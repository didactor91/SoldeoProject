// openspec/changes/phase-2-store-input/specs/input/keyboard-tracker.md — KeyboardTracker spec

# Delta: input/keyboard-tracker

## ADDED Requirements

### Requirement: KeyboardTracker Responsibility

`KeyboardTracker` SHALL maintain a `Map<string, boolean>` of pressed keys and expose `getState(): ReadonlyMap<string, boolean>` and `isPressed(key: string): boolean`.

#### Scenario: Key down tracked

- GIVEN no keys pressed
- WHEN `keydown` event fires for "KeyW"
- THEN `isPressed("KeyW")` SHALL return `true`

#### Scenario: Key up tracked

- GIVEN `KeyW` is pressed
- WHEN `keyup` event fires for "KeyW"
- THEN `isPressed("KeyW")` SHALL return `false`

#### Scenario: Unknown key returns false

- GIVEN no interaction
- WHEN `isPressed("KeyQ")` is called
- THEN it SHALL return `false`

---

### Requirement: WASD + QE Key Support

`KeyboardTracker` SHALL track these keys: `KeyW`, `KeyA`, `KeyS`, `KeyD`, `KeyQ`, `KeyE`. Only these keys are relevant for the SMAW simulator per RFC-002 §7.

#### Scenario: All tracked keys registered

- GIVEN KeyboardTracker is instantiated
- WHEN all 6 keys are pressed in order
- THEN each SHALL be tracked independently
- AND `isPressed` SHALL reflect each key's state

---

### Requirement: INPUT_RATES Applied Per Frame

In `InputController.tick()`, the tracker SHALL be queried each frame and `INPUT_RATES.ANGLE_RATE` and `INPUT_RATES.ARC_RATE` applied to accumulate input deltas.

#### Scenario: ANGLE_RATE applied for W key

- GIVEN `INPUT_RATES.ANGLE_RATE` is `1.0` °/s
- AND frame time is `0.016` seconds
- WHEN `InputController.tick()` processes W key press
- THEN angle delta SHALL be `1.0 * 0.016 = 0.016` degrees

#### Scenario: ARC_RATE applied for Q key

- GIVEN `INPUT_RATES.ARC_RATE` is `0.5` mm/s
- AND frame time is `0.016` seconds
- WHEN `InputController.tick()` processes Q key press
- THEN arc delta SHALL be `0.5 * 0.016 = 0.008` mm

---

### Requirement: Window Event Listeners

`KeyboardTracker` SHALL attach `keydown` and `keyup` listeners to `window`. It SHALL provide a `dispose()` method to remove them.

#### Scenario: Listeners attached on construct

- GIVEN KeyboardTracker is instantiated
- WHEN inspected
- THEN `window.addEventListener` was called for `keydown` and `keyup`

#### Scenario: Dispose removes listeners

- GIVEN KeyboardTracker has listeners attached
- WHEN `dispose()` is called
- THEN `window.removeEventListener` was called for both events
- AND subsequent key presses SHALL NOT update state

---

### Requirement: Zero Allocations

All `KeyboardTracker` methods SHALL be zero-allocation. The `Map` is reused; `getState()` returns `ReadonlyMap` wrapping the internal map.

---

## Rollback

Delete `src/input/KeyboardTracker.ts`. This change is purely additive.

## Acceptance Criteria

- [x] `KeyboardTracker` class with `getState()`, `isPressed(key)`, `dispose()`
- [x] Tracks `KeyW`, `KeyA`, `KeyS`, `KeyD`, `KeyQ`, `KeyE`
- [x] `keydown`/`keyup` listeners on `window`
- [x] `dispose()` removes all listeners
- [x] Zero allocations in all methods
- [x] File header comment per D-03