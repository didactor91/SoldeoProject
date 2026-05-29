// openspec/changes/phase-2-store-input/design.md — Phase 2 state slices + Phase 3 input controller

# Design: Phase 2 Store Slices + Input Controller

## Technical Approach

Implement Zustand flat-slice store (Phase 2) and zero-allocation InputController (Phase 3). Each slice is a named object exported from `src/app/store/slices/`. `InputController` runs inside `useFrame` reading `getState()`, writing via `commitFrame()`. Phase 3 depends on Phase 2 — store must exist before input controller.

## Architecture Decisions

### Decision 1 — Slice File Structure

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Single store/index.ts | Simpler import, harder to maintain as state grows | Rejected |
| `slices/*.ts` flat pattern (AGENT-RULES D-02) | Clean per-slice ownership, isolated changes | **Adopted** |

Each slice: `src/app/store/slices/<name>Slice.ts` — state object + action functions returning new state. `src/app/store/index.ts` combines via Zustand `create<WelderStore>()((...))`. Named exports only (per `index.md` spec). No default export for slices.

### Decision 2 — InputController Zero-Allocation Hot Path

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Create new InputState/FrameResult each tick | GC pressure at 60Hz, simple code | Rejected |
| Pre-allocated module-level reuse objects | Must manually reset fields each tick, but zero allocations | **Adopted** |

```typescript
// src/input/InputController.ts — module level (A-03)
const REUSABLE_INPUT: InputState = { arcLength: 0, workAngle: 0, dragAngle: 0,
  positionX: 0, positionZ: 0, travelSpeed: 0,
  rawArcLength: 0, rawWorkAngle: 0, rawDragAngle: 0, rawPositionX: 0, rawPositionZ: 0 };
const REUSABLE_FRAME: FrameResult = {
  electrode: {}, arc: { arcLength: 0, voltage: 0, stability: 0, isActive: false },
  input: REUSABLE_INPUT, newWeldPoint: null, spatterBurst: false };
```

`tick(delta)` mutates REUSABLE_INPUT fields, writes to store via `commitFrame(REUSABLE_FRAME)`. No `new`, no `{}`.

### Decision 3 — MouseTracker Pointer Lock

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Pointer Lock API mandatory | Breaks on HTTP/insecure context | Rejected |
| Detect support + mousemove fallback | Graceful degradation | **Adopted** |

Feature-detect via `document.pointerLockElement !== undefined`. If unavailable, attach `mousemove` listener tracking delta from last known position. If available, use `movementX/Y` from `pointerlockchange` events. `getDelta()` returns pre-allocated `{ dx: 0, dy: 0 }` at module level.

### Decision 4 — KeyboardTracker Key State

Track `KeyW/A/S/D` (angles) and `KeyQ/E` (arc length) via `Map<string,boolean>`. On `keydown` set `true`, on `keyup` set `false`. On `blur` clear all to prevent stuck keys. `isPressed(key)` queries the map. `getState()` returns `ReadonlyMap` wrapping the internal map — zero allocation.

### Decision 5 — Store Actions That Need a Store Read

Actions like `strikeArc()` need to check `electrode.isStuck` and `electrode.currentLength`. Use `getState()` inside the action closure (Zustand pattern). No hook inside hot path.

### Decision 6 — Input Clamping

All clamping uses `ELECTRODE_PROFILES[type].L_max` for arc length max. Angle bounds from spec (workAngle 60–120°, dragAngle 40–90°). Position bounds from spec (X ±50mm, Z ±200mm). Use `Math.min/max` — no helper function needed (avoids allocation).

## Data Flow

### Arc Strike Flow
```
User presses strike button
  → store.getState().strikeArc() action
    → reads electrode.isStuck, electrode.currentLength → guard check
    → sets arc.isActive=true, arc.arcLength=L_optimal, arc.amperage=current
    → store updated reactively
  → useFrame next tick: PhysicsEngine.tick() sees arc.isActive=true
    → DriftSystem → ArcEngine → ElectrodeEngine → WeldEngine → ScoringEngine
    → returns FrameResult
  → store.commitFrame(FrameResult) → arc slice updated, weld point appended
```

### Frame Tick Flow (useFrame)
```
useFrame((_, delta) => {
  const store = useWelderStore.getState();  // A-05: no hook
  const frame = physicsEngine.tick(delta, store);
  store.commitFrame(frame);                 // writes to all slices
  inputController.tick(delta);              // reads input, writes via commitFrame
});
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/app/store/slices/electrodeSlice.ts` | Create | ElectrodeState + setAmperage, unstickElectrode |
| `src/app/store/slices/arcSlice.ts` | Create | ArcState + strikeArc, extinguishArc |
| `src/app/store/slices/inputSlice.ts` | Create | InputState + commitFrame (pass-through) |
| `src/app/store/slices/sessionSlice.ts` | Create | SessionState + setDifficulty, endWeldSession, resetSession, commitFrame |
| `src/app/store/index.ts` | Create | Zustand store combining all 4 slices, named export useWelderStore |
| `src/input/MouseTracker.ts` | Create | Pointer lock + mousemove fallback, getDelta(), dispose() |
| `src/input/KeyboardTracker.ts` | Create | KeyMap state, isPressed(), dispose() |
| `src/input/InputController.ts` | Create | Orchestrates trackers, rate limiting, clamping, tick(), dispose() |

## Interfaces / Contracts

All types imported from `src/app/store/types.ts` (A-06). All constants from `src/app/constants.ts` (A-07). No `any` (A-08).

```
store/slices/electrodeSlice.ts  → exports: electrodeSlice (named)
store/slices/arcSlice.ts        → exports: arcSlice (named)
store/slices/inputSlice.ts      → exports: inputSlice (named)
store/slices/sessionSlice.ts   → exports: sessionSlice (named)
store/index.ts                 → exports: useWelderStore (named, default free)

input/MouseTracker.ts          → class MouseTracker { requestLock(), getDelta(), dispose() }
input/KeyboardTracker.ts       → class KeyboardTracker { isPressed(k), getState(), dispose() }
input/InputController.ts       → class InputController { tick(delta), dispose() }
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | Slice reducers, pure functions | Vitest — test each action in isolation |
| Unit | MouseTracker pointer events | Mock PointerLockEvent, verify delta accumulation |
| Unit | KeyboardTracker key map | Simulate keydown/keyup, verify isPressed state |
| Integration | InputController.tick() | Mock trackers, verify commitFrame called with clamped values |
| Integration | Store assembly | Verify getState() returns fully populated state |

Per AGENT-RULES E-01: tests for engine modules, not for store/input (these are wiring layers).

## Migration / Rollout

No migration needed — purely additive. `src/input/` and `src/app/store/slices/` are new directories. No existing files modified. Rollback = `git rm -r src/app/store/slices/ src/app/store/index.ts src/input/`.

## Open Questions

- [ ] OQ-01: `commitFrame` is a shared action called by both `InputController.tick` and the external `useFrame` caller. Should input controller call it directly or should `useFrame` caller orchestrate? **Recommendation**: InputController calls it directly (per spec), keep useFrame orchestration simple.
- [ ] `weldPoints` array growth strategy not specified in session slice spec — pre-allocated buffer vs. dynamic array? **Decision**: Use plain array with `push` (acceptable for typical session length < 10000 points). If profiling shows pressure, buffer can be introduced later.
