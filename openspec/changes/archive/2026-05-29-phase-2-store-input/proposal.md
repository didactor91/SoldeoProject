# Proposal: Phase 2 — Store Slices + Input Layer

## Intent

Phase 0 foundation exists (`constants.ts`, `types.ts`, Perlin noise, Gaussian utils) but no state management or input system. This change implements **Phase 2 (Zustand store slices)** and **Phase 3 (Input layer)** in one coherent change — they are sequential dependencies (Phase 3 reads from Phase 2 store). The result is a working reactive state layer with real-time input tracking, ready for Phase 4 rendering.

## Scope

### In Scope
- `src/app/store/slices/electrodeSlice.ts` — electrode state + `setAmperage`, `unstickElectrode`
- `src/app/store/slices/arcSlice.ts` — arc state + `strike()`, `extinguish()`
- `src/app/store/slices/inputSlice.ts` — input state + clamped derived state
- `src/app/store/slices/sessionSlice.ts` — session state + `endWeldSession`, `resetSession`
- `src/app/store/index.ts` — Zustand store combining all slices
- `src/input/MouseTracker.ts` — pointer-lock mouse tracking, raw arc-length delta
- `src/input/KeyboardTracker.ts` — WASD/QE key state map with smooth interpolation
- `src/input/InputController.ts` — orchestrates trackers, applies `INPUT_RATES`, `getState()` in `useFrame`

### Out of Scope
- Phase 1 engine implementations (ArcEngine, WeldEngine, ElectrodeEngine, ScoringEngine, DriftSystem — depend on Phase 2 but not included here)
- Phase 4–7 rendering/audio/UI
- Unit tests (per AGENT-RULES-001-SMAW §E, tests follow engine modules)

## Capabilities

### New Capabilities
- `store/zustand-slices`: Zustand store with 4 domain slices (electrode, arc, input, session) — the reactive state backbone
- `input/mouse-tracking`: Pointer-lock mouse delta accumulation for arc-length and position
- `input/keyboard-tracking`: WASD/QE smooth key interpolation per RFC-002 §7.2
- `input/controller`: Unified input orchestrator combining mouse + keyboard, rate-limited and clamped

### Modified Capabilities
- None — this is a greenfield implementation. Existing capabilities (Phase 0) are not modified.

## Approach

**Phase 2 — Zustand slices:** Follow `WelderStore` interface from `types.ts` exactly. Each slice:
- Imports types from `src/app/store/types.ts` (no local duplicates — rule A-06)
- Imports constants from `src/app/constants.ts` (no magic numbers — rule A-07)
- Uses Zustand `create()` with named slices, no default exports for slices
- Exported as `create<WelderStore>()((...))` with explicit `set`/`get` — no `any` (rule A-08)

**Phase 3 — Input layer:** `InputController` runs every frame inside `useFrame`. Store reads use `getState()` (not hooks — rule A-05). All allocations pre-allocated with module-level reused objects (rule A-03). `MouseTracker` uses Pointer Lock API. `KeyboardTracker` uses `keydown`/`keyup` listeners with a `Map<string,boolean>`.

**Constraint compliance:** File header on every file (D-03), SCREAMING_SNAKE for module constants, camelCase for functions, no framework imports in engine-only files.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/app/store/slices/electrodeSlice.ts` | New | Electrode state slice |
| `src/app/store/slices/arcSlice.ts` | New | Arc state slice |
| `src/app/store/slices/inputSlice.ts` | New | Input state slice |
| `src/app/store/slices/sessionSlice.ts` | New | Session state slice |
| `src/app/store/index.ts` | New | Zustand store assembly |
| `src/input/MouseTracker.ts` | New | Mouse input tracker |
| `src/input/KeyboardTracker.ts` | New | Keyboard input tracker |
| `src/input/InputController.ts` | New | Input orchestrator |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Pointer Lock API not available (insecure context) | Low | Detect availability, fallback gracefully with mouse-move events |
| Allocation in `InputController` hot path | Low | Pre-allocate `Vector2` reuse objects at module level |
| Zustand `getState()` staleness (A-05 compliance) | Medium | Audit all `useFrame` call sites before Phase 4 integration |
| Keyboard event listener memory leaks | Low | `Window.removeEventListener` on `willUnmount` in owning component |

## Rollback Plan

Delete the `src/app/store/slices/`, `src/app/store/index.ts`, and `src/input/` directories entirely. This change is purely additive — no existing files are modified. Revert is a single `git rm -r` of the new directories.

## Dependencies

- Phase 0 completed (constants.ts, types.ts, Perlin, Gaussian utils)
- RFC-002 §7 (input rates, control map, interpolation)
- SDD-001 §4 (store architecture diagram)
- Open questions from RFC-002 §12: OQ-01 (pointer lock fullscreen) should be resolved before Phase 3 implementation

## Success Criteria

- [ ] `useWelderStore.getState()` returns a fully populated `WelderStore` on first mount
- [ ] `strikeArc()` transitions `arc.isActive` from `false` → `true`
- [ ] `InputController.tick()` produces no allocations (verified by code inspection)
- [ ] `KeyboardTracker` correctly applies `INPUT_RATES.ANGLE_RATE` and `INPUT_RATES.ARC_RATE` per frame
- [ ] `MouseTracker` accumulates deltas under pointer lock without subscription
- [ ] All file header comments present per D-03
- [ ] Zero `any` types in new files
- [ ] All constants from `constants.ts` — no magic numbers inline
