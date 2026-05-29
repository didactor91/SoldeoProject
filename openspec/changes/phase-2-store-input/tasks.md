# Tasks: Phase 2 Store Slices + Phase 3 Input Controller

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~600–800 (16 files: 8 impl + 8 test) |
| 400-line budget risk | Medium |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | interactive |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Phase 2 — all 4 store slices + index | PR 1 | Phase 2 store must precede Phase 3 input |
| 2 | Phase 3 — MouseTracker + KeyboardTracker | PR 1 (cont.) | Parallel work within unit 2 |
| 3 | Phase 3 — InputController | PR 1 (cont.) | Depends on unit 1 + unit 2 |

---

## Phase 1: Store Slices (Phase 2)

- [x] 1.1 Create `src/app/store/slices/electrodeSlice.ts` — exports named `electrodeSlice` with `ElectrodeState`, `setAmperage()`, `unstickElectrode()`; imports from `types.ts`, `constants.ts`; zero allocations; file header per D-03
- [x] 1.2 Create `src/app/store/slices/electrodeSlice.test.ts` — Vitest unit tests: initial state, clamped amperage, unstick when stuck/not stuck
- [x] 1.3 Create `src/app/store/slices/arcSlice.ts` — exports named `arcSlice` with `ArcState`, `strikeArc()`, `extinguishArc()`; guard guards against depleted/stuck electrode; file header per D-03
- [x] 1.4 Create `src/app/store/slices/arcSlice.test.ts` — Vitest unit tests: initial extinguished state, successful strike, blocked strike (depleted/stuck), extinction, amperage preserved
- [x] 1.5 Create `src/app/store/slices/inputSlice.ts` — exports named `inputSlice` with `InputState`, `commitFrame()`; travelSpeed = position delta magnitude / delta; file header per D-03
- [x] 1.6 Create `src/app/store/slices/inputSlice.test.ts` — Vitest unit tests: initial defaults, commitFrame updates all fields, travelSpeed computation, weldPoints append via session
- [x] 1.7 Create `src/app/store/slices/sessionSlice.ts` — exports named `sessionSlice` with `SessionState`, `setDifficulty()`, `endWeldSession()`, `resetSession()`, `commitFrame()`; elapsedTime increments only in welding phase; file header per D-03
- [x] 1.8 Create `src/app/store/slices/sessionSlice.test.ts` — Vitest unit tests: initial state, difficulty change (setup→welding/blocked-in-weld), endWeldSession, resetSession, commitFrame weldPoint append, elapsedTime gated
- [x] 1.9 Create `src/app/store/index.ts` — exports named `useWelderStore = create<WelderStore>()((...))` combining all 4 slices; `commitFrame()` delegates to all slices; no default exports; file header per D-03
- [x] 1.10 Create `src/app/store/index.test.ts` — Vitest integration test: `getState()` returns fully populated store, all actions callable, commitFrame delegates to all slices

---

## Phase 2: Input Layer (Phase 3)

- [x] 2.1 Create `src/input/MouseTracker.ts` — class with `requestLock()`, `getDelta()`, `dispose()`; Pointer Lock API primary; `mousemove` fallback on insecure context; `getDelta()` returns pre-allocated `{ dx, dy }` module object; file header per D-03
- [x] 2.2 Create `src/input/MouseTracker.test.ts` — Vitest unit tests: pointer lock request, delta accumulation under lock, fallback mode detection, dispose cleanup, zero allocations in getDelta
- [x] 2.3 Create `src/input/KeyboardTracker.ts` — class with `isPressed(k)`, `getState()`, `dispose()`; tracks `KeyW/A/S/D/Q/E`; internal `Map<string,boolean>`; `keydown`/`keyup` on `window`; `getState()` returns `ReadonlyMap` wrapping internal map; file header per D-03
- [x] 2.4 Create `src/input/KeyboardTracker.test.ts` — Vitest unit tests: keydown sets true, keyup sets false, unknown key returns false, `dispose()` removes listeners, zero allocations
- [x] 2.5 Create `src/input/InputController.ts` — class with `tick(delta)`, `dispose()`; module-level `REUSABLE_INPUT` and `REUSABLE_FRAME`; `tick()` reads `getState()`, applies INPUT_RATES, clamps, calls `commitFrame()`; zero `new` in tick; file header per D-03
- [x] 2.6 Create `src/input/InputController.test.ts` — Vitest unit tests: tick commits clamped values, arc length clamped to [0, L_max], angle bounds enforced, travelSpeed computed as sqrt(dx²+dz²)/delta, getState not hook called inside tick

---

## Implementation Order

Phase 1 must complete before Phase 2 — `InputController` depends on `useWelderStore.getState()`. Within phase, tasks are ordered by dependency: slices → index → input trackers → input controller. All tasks are independently testable once the types.ts and constants.ts (Phase 0) foundation is present.
