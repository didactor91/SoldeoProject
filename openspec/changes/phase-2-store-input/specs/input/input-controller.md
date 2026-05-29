// openspec/changes/phase-2-store-input/specs/input/input-controller.md — InputController spec

# Delta: input/input-controller

## ADDED Requirements

### Requirement: InputController Responsibility

`InputController` SHALL orchestrate `MouseTracker` and `KeyboardTracker`, apply `INPUT_RATES`, clamp values, and expose `getState(): InputState` for `useFrame` consumption. It runs inside `useFrame`, not React hooks.

#### Scenario: InputController tick signature

- GIVEN `InputController` is instantiated
- WHEN `inputController.tick(delta)` is called
- THEN `delta` is frame time in seconds
- AND no return value (state committed to store internally)

---

### Requirement: RawInputState to InputState Transformation

`InputController` SHALL transform raw input to clamped `InputState`:
1. Read `MouseTracker.getDelta().dx` → add to `rawPositionX`
2. Read `KeyboardTracker.isPressed()` for Q/E → accumulate `rawArcLength` via `INPUT_RATES.ARC_RATE * delta`
3. Read `KeyboardTracker.isPressed()` for W/S/A/D → accumulate angles via `INPUT_RATES.ANGLE_RATE * delta`
4. Compute `travelSpeed` from position delta magnitude / delta
5. Clamp all values to physical bounds

#### Scenario: Mouse movement updates position

- GIVEN `MouseTracker.getDelta()` returns `{ dx: 20, dy: 0 }`
- AND `INPUT_RATES.MOUSE_SENSITIVITY` is `0.15`
- WHEN `tick(0.016)` is called
- THEN `rawPositionX` SHALL increase by `20 * 0.15 = 3.0` mm
- AND after clamping, `positionX` SHALL reflect the change

#### Scenario: Q key increases arc length

- GIVEN `KeyboardTracker.isPressed("KeyQ")` returns `true`
- AND `INPUT_RATES.ARC_RATE` is `0.5` mm/s
- WHEN `tick(0.016)` is called
- THEN `rawArcLength` SHALL increase by `0.5 * 0.016 = 0.008` mm
- AND clamped arc length SHALL reflect the increase

#### Scenario: E key decreases arc length

- GIVEN `KeyboardTracker.isPressed("KeyE")` returns `true`
- WHEN `tick(0.016)` is called
- THEN `rawArcLength` SHALL decrease (arc rate applied with negative sign)

---

### Requirement: Clamping to Physical Bounds

All output values SHALL be clamped before committing to store:

| Field | Min | Max |
|-------|-----|-----|
| arcLength | 0 | `ELECTRODE_PROFILES[type].L_max` |
| workAngle | 60 | 120 |
| dragAngle | 40 | 90 |
| positionX | -50 | 50 |
| positionZ | -200 | 200 |
| travelSpeed | 0 | 20 |

#### Scenario: Arc length clamped to zero

- GIVEN `rawArcLength` would compute to `-0.5` mm
- WHEN `tick()` clamps values
- THEN `arcLength` SHALL be clamped to `0`

#### Scenario: Position clamped at boundary

- GIVEN `rawPositionX` computes to `100` mm (exceeds 50 mm max)
- WHEN `tick()` clamps values
- THEN `positionX` SHALL be clamped to `50`

---

### Requirement: Travel Speed Computation

`travelSpeed` SHALL be computed as the Euclidean magnitude of position delta per frame: `sqrt((dx)^2 + (dz)^2) / delta`.

#### Scenario: Travel speed computed correctly

- GIVEN `delta = 0.016` seconds
- AND `positionX` delta is `2.4` mm and `positionZ` delta is `1.8` mm
- WHEN `travelSpeed` is computed
- THEN it SHALL equal `sqrt(2.4² + 1.8²) / 0.016 ≈ 187.5` mm/s

---

### Requirement: Store Update via getState().commitFrame()

`InputController.tick()` SHALL read store with `useWelderStore.getState()`, compute next state, and call `commitFrame(frameResult)` with the computed `InputState`. It SHALL NOT subscribe via hook (rule A-05).

#### Scenario: Frame result committed to store

- GIVEN computed `InputState` values after tick
- WHEN `tick(0.016)` completes
- THEN `commitFrame()` was called with `frameResult.input` containing clamped values
- AND store `input` slice reflects the new values

---

### Requirement: Zero Allocations Hot Path (A-03)

`InputController.tick()` SHALL pre-allocate all reused objects at module level:
- A single reusable `InputState` object
- A single reusable `FrameResult` object
- A single reusable `Vector2` (if needed)

No `new` expressions, array literals, or object literals in the tick path.

#### Scenario: Hot path allocation check

- GIVEN `InputController.tick` is called 1000 times
- WHEN each call is inspected
- THEN zero `new` expressions SHALL be present
- AND zero object literals `{}` SHALL be created

---

### Requirement: Module-Level Reuse Objects

The module SHALL declare at module scope:
```typescript
const REUSABLE_INPUT: InputState = { arcLength: 0, workAngle: 0, dragAngle: 0, positionX: 0, positionZ: 0, travelSpeed: 0, rawArcLength: 0, rawWorkAngle: 0, rawDragAngle: 0, rawPositionX: 0, rawPositionZ: 0 };
const REUSABLE_FRAME: FrameResult = { electrode: {}, arc: { arcLength: 0, voltage: 0, stability: 0, isActive: false }, input: REUSABLE_INPUT, newWeldPoint: null, spatterBurst: false };
```

#### Scenario: Reuse objects present

- GIVEN the InputController module
- WHEN inspected
- THEN `REUSABLE_INPUT` and `REUSABLE_FRAME` SHALL exist at module scope
- AND tick() SHALL reuse these objects by mutating and resetting

---

### Requirement: Disposal

`InputController` SHALL provide a `dispose()` method that calls `dispose()` on both `MouseTracker` and `KeyboardTracker`.

#### Scenario: Dispose cascades

- GIVEN `inputController.dispose()` is called
- WHEN inspected
- THEN `mouseTracker.dispose()` was called
- AND `keyboardTracker.dispose()` was called

---

## Rollback

Delete `src/input/MouseTracker.ts`, `src/input/KeyboardTracker.ts`, `src/input/InputController.ts`. This change is purely additive.

## Acceptance Criteria

- [x] `InputController` class with `tick(delta)`, `dispose()`
- [x] Combines `MouseTracker` + `KeyboardTracker`
- [x] Applies `INPUT_RATES.ARC_RATE` and `INPUT_RATES.ANGLE_RATE` per frame
- [x] Clamps to physical bounds
- [x] Computes `travelSpeed` from position delta magnitude
- [x] Zero allocations in `tick()` — verified by code inspection
- [x] Uses `getState()` not hook inside `tick()` (A-05)
- [x] Pre-allocated reuse objects at module level
- [x] File header comment per D-03