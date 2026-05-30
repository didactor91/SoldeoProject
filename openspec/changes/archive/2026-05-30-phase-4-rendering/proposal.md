# Proposal: Phase 4 — Rendering

## Intent

Phase 4 renders the SMAW weld simulation in real-time 3D using React Three Fiber. It consumes the physics/state output from Phases 1–3 and produces the visual representation: weld bead ribbon, electrode model, arc glow, spatter particles, and workpiece scene. This is where the simulator becomes *visible*.

## Scope

### In Scope
- `src/rendering/bead/bead.buffers.ts` — pre-allocated `BufferGeometry` stamp buffers, zero allocations per A-03
- `src/rendering/bead/BeadRenderer.tsx` — extruded bead ribbon from `session.weldPoints`, `applyCooling()` hot-path zero-alloc
- `src/rendering/electrode/ElectrodeModel.tsx` — 3D electrode mesh depletes from `electrode.currentLength`
- `src/rendering/electrode/ArcEffect.tsx` — point light + emissive glow, visibility driven by `arc.isActive`
- `src/rendering/particles/SpatterSystem.tsx` — particle burst on `spatterBurst` events
- `src/rendering/Workpiece.tsx` — base plate / work surface geometry
- `src/rendering/Scene.tsx` — R3F `Canvas` root, composes all sub-renderers, `useFrame` loop with frame-budget assertions (F-01)

### Out of Scope
- Post-processing (bloom, SSAO) — Phase 7 App Bootstrap
- UI/HUD overlay — Phase 6 UI
- Audio — Phase 5 Audio
- Bead geometry computation (belongs to `WeldEngine` in Phase 1)

## Capabilities

### New Capabilities
- `bead-render`: Renders weld bead as extruded ribbon mesh from `WeldPoint[]` sequence
- `electrode-render`: Renders consumable electrode rod with length depletion
- `arc-render`: Renders arc as point-light + emissive sphere, driven by `arc.isActive`
- `spatter-particle`: Renders spatter particle bursts triggered by physics events
- `workpiece-render`: Renders static base plate / work surface
- `scene-compose`: Assembles all renderers under one R3F Canvas with frame-budget monitoring

### Modified Capabilities
- None — Phase 4 introduces all new rendering capabilities, no existing spec behavior changes

## Approach

**Architecture**: R3F functional components using `useFrame` for the render loop. All store reads via `getState()` (A-05). Zero allocations in hot paths (A-03).

**spatterBurst integration**: The `FrameResult.spatterBurst` flag is consumed and cleared by `commitFrame`. Rendering cannot subscribe to it directly. Solution: the `SpatterSystem` reads `arc.spatterBurst` from `getState()` inside `useFrame` and clears it immediately — renderer-owned flag pattern (one-frame persistence). Concretely: add `lastSpatterBurst: boolean` to `arcSlice` state that `commitFrame` sets when `spatterBurst` is true; `SpatterSystem` reads and resets it in the same `useFrame` tick.

**Bead buffer pre-allocation**: `bead.buffers.ts` pre-allocates a fixed-size `BufferGeometry` stamp pool at module load. `writeStamp()` mutates buffer attributes in-place using pre-allocated `Vector3` / `Float32Array` refs — no `new` per frame (A-03).

**Frame budget**: `Scene.tsx` wraps `useFrame` with `performance.now()` assertions per F-01. Budgets: BEAD_RENDERER=2ms, SPATTER_SYSTEM=1ms.

**Memory leak guard**: `BeadRenderer` logs `DEV`-guarded warning when `totalSegmentsRef.current >= MAX_STAMPS * 0.9` per F-02.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/rendering/` | New | Entire rendering layer — 7 new files |
| `src/app/store/slices/slice-arc.ts` | Modified | Add `lastSpatterBurst: boolean` transient flag |
| `src/app/store/slices/slice-electrode.ts` | Modified | Surface `electrode.currentLength` for renderer |
| `src/app/store/slices/slice-session.ts` | Modified | Surface `session.weldPoints` for renderer |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `spatterBurst` consumption race — renderer misses transient flag | Med | Use `lastSpatterBurst` state pattern: `commitFrame` sets it, `SpatterSystem` reads+clears in same `useFrame` tick |
| Frame budget exceeded (F-01) | Low | DEV-only `performance.now()` assertions in `Scene.tsx`; BEAD_RENDERER=2ms, SPATTER_SYSTEM=1ms budgets |
| Bead buffer overflow (F-02) | Low | Warning at `totalSegmentsRef >= MAX_STAMPS * 0.9`; session should end before hitting limit |
| Three.js import in hot path | Med | Only `useFrame` callbacks import R3F/Three; all engine logic stays in pure TS |

## Rollback Plan

1. Delete `src/rendering/` directory entirely — purely additive
2. Revert `slice-arc.ts`, `slice-electrode.ts`, `slice-session.ts` to prior state — remove transient flags
3. No migration needed; Phase 4 produces zero side-effects on other phases

## Dependencies

- Phase 1 (`src/engine/` — `WeldEngine`, `ElectrodeEngine`, `ArcEngine`)
- Phase 2 (`src/app/store/` — store slices, `commitFrame`)
- Phase 3 (`src/input/` — none directly, but required for full sim loop)
- `@react-three/fiber@8.x`, `@react-three/drei`, `three` installed in project
- `FRAME_BUDGET` and `ELECTRODE_PROFILES` from `src/app/constants.ts`

## Success Criteria

- [ ] All 7 files created under `src/rendering/`
- [ ] `bead.buffers.ts` has zero `new` calls in `writeStamp()`
- [ ] All `useFrame` callbacks use `getState()`, never hook form
- [ ] `SpatterSystem` reads and clears `lastSpatterBurst` atomically
- [ ] DEV frame-budget assertions log warning if BEAD_RENDERER > 2ms or SPATTER_SYSTEM > 1ms
- [ ] Memory leak warning fires at `MAX_STAMPS * 0.9` in DEV builds
- [ ] `Scene.tsx` composes all sub-renderers under single R3F `Canvas`
- [ ] Module completion checklist (AGENT-RULES C-03) passes for each file