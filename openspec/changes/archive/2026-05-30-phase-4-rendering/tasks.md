# Tasks: Phase 4 — Rendering

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~1,050 (PR #1: ~400, PR #2: ~650) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR #1 → PR #2 (stacked to main or feature-branch-chain) |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Bead buffer system + BeadRenderer | PR #1 | Base: `feature/phase-4` or `main`; bead.buffers.ts + BeadRenderer.tsx + tests |
| 2 | Electrode + Arc + Spatter + Workpiece + Scene | PR #2 | Base: PR #1 branch; 5 files + tests |

## Phase 1: Infrastructure — Bead Buffers

- [x] 1.1 Create `src/rendering/bead/bead.buffers.ts` with `MAX_STAMPS = 2000`, `createBeadGeometry()`, `writeStamp()` — zero allocations (A-03)
- [x] 1.2 Add module-scope pre-allocated refs for `writeStamp()` to reuse (plain objects, zero-allocation alternative to Vector3)
- [x] 1.3 Add `lastSpatterBurst: boolean` to `ArcState` in `src/app/store/types.ts` (deferred to Phase 4 store modifications)
- [x] 1.4 Write `src/rendering/bead/bead.buffers.test.ts` — mock BufferGeometry, assert correct index mutation, zero allocations verified

## Phase 2: Core Implementation — Bead Renderer + Electrode + Arc

- [x] 2.1 Create `src/rendering/bead/BeadRenderer.tsx` (default export) — reads `weldPoints` via `getState()`, extruded ribbon mesh, `coolingProgress` → vertex color, 2ms budget assertion (F-01), memory leak warning at `MAX_STAMPS * 0.9` (F-02)
- [x] 2.2 Create `src/rendering/electrode/ElectrodeModel.tsx` (default export) — `CylinderGeometry`, `currentLength` → scale, `temperature` → emissive, `isStuck` → red glow, per-type material (E6013/E7018)
- [x] 2.3 Create `src/rendering/electrode/ArcEffect.tsx` (default export) — PointLight + emissive sphere, `stability < 0.5` flicker, `voltage` → intensity, `stability` → color temperature
- [x] 2.5 Write `src/rendering/electrode/ElectrodeModel.test.tsx` — RTL + R3F, full/half/depleted length, E6013/E7018 materials, isStuck glow

## Phase 3: Integration — Particles + Workpiece + Scene

- [x] 3.1 Create `src/rendering/particles/SpatterSystem.tsx` (default export) — reads+clears `lastSpatterBurst` atomically, ballistic particles with gravity, `amperage` → particle count, 1ms budget (F-01)
- [x] 3.2 Create `src/rendering/Workpiece.tsx` (default export) — `BoxGeometry` steel plate, PBR material (metalness >0.8), grid overlay
- [x] 3.3 Create `src/rendering/Scene.tsx` (default export) — R3F `<Canvas>` root, composes all sub-renderers, 12ms total frame budget assertion (F-01), arc state coordination
- [x] 3.4 Write `src/rendering/particles/SpatterSystem.test.tsx` — RTL + R3F, burst triggered/not-triggered, atomic clear, particle cleanup
- [x] 3.5 Write `src/rendering/electrode/ArcEffect.test.tsx` — RTL + R3F, active/inactive visibility, flicker at low stability, voltage intensity
- [x] 3.6 Write `src/rendering/Workpiece.test.tsx` — RTL + R3F, steel PBR properties, grid overlay visible
- [x] 3.7 Write `src/rendering/Scene.test.tsx` — RTL + R3F, Canvas present, all sub-renderers composed

## Phase 4: Store Modifications

- [x] 4.1 Add `lastSpatterBurst: boolean` transient flag to `arcSlice` — set by `commitFrame()` when `spatterBurst === true`, cleared by `SpatterSystem` in same tick
- [x] 4.2 Verify `src/app/store/types.ts` has `lastSpatterBurst: boolean` in `ArcState`

## Phase 5: Verification

- [x] 5.1 Run `vitest` for all 7 `.test.ts` / `.test.tsx` files — 80%+ coverage per file
- [x] 5.2 Module Completion Checklist (AGENT-RULES C-03) passes for every file
- [x] 5.3 All `useFrame` callbacks use `getState()`, not hook form (A-05)
- [x] 5.4 Zero `new` allocations in `writeStamp()` and `applyCooling()` (A-03)

## Open Questions (from design)

- [ ] Spatter particle lifetime: 800ms with gravity `9.81 m/s²` — confirm?
- [ ] Electrode 3D scale: `1 unit = 100mm` — confirm?
- [ ] Grid line spacing: 25mm — confirm?
