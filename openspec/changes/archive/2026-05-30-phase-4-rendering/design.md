# Design: Phase 4 — Rendering

## Technical Approach

Phase 4 implements the visual layer using React Three Fiber. All store reads in `useFrame` use `getState()` (A-05). Zero allocations in hot paths (A-03). Frame budget enforced via `performance.now()` assertions in DEV (F-01).

## Architecture Decisions

### Decision 1: Bead Buffer Pre-Allocation

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Dynamic `BufferGeometry` rebuild per frame | GC pressure, 0ms but unstable | ❌ |
| Pre-allocated `Float32Array` pool, mutate in-place | 0 allocations, requires fixed `MAX_STAMPS` | ✅ |

**Rationale**: Rule A-03 mandates zero allocations in hot paths. `MAX_STAMPS = 2000` (exported constant) provides 33 seconds at 60fps before session should end. Warning at `MAX_STAMPS * 0.9` (F-02).

**Buffer structure**: Single `BufferGeometry` created at mount with attributes sized for `MAX_STAMPS` vertices. `writeStamp(buffer, point, index)` mutates `position`, `normal`, `uv` in-place using pre-allocated module-scope `Vector3` refs.

### Decision 2: Store Integration Pattern

| Option | Tradeoff | Decision |
|--------|----------|----------|
| `useWelderStore(selector)` inside `useFrame` | React subscription, re-render cascade | ❌ |
| `useWelderStore.getState()` inside `useFrame` | Direct read, no subscription, rule A-05 compliant | ✅ |

**Rationale**: A-05 explicitly prohibits hook subscription in `useFrame`. `getState()` reads current state without subscribing to updates.

### Decision 3: Spatter One-Frame Persistence

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Renderer subscribes to `FrameResult.spatterBurst` directly | Burst flag consumed before renderer reads | ❌ |
| `arcSlice.lastSpatterBurst: boolean` transient flag | `commitFrame` sets, `SpatterSystem` reads+clears in same tick | ✅ |

**Rationale**: `spatterBurst` is a transient commit-frame flag. The renderer cannot subscribe to it without race conditions. The transient flag pattern (one-frame persistence) ensures atomic consume.

**Store modification**: `arcSlice` gains `lastSpatterBurst: boolean`. `commitFrame()` sets it when `spatterBurst === true`. `SpatterSystem` reads+resets in same `useFrame` tick.

### Decision 4: Electrode Material Selection

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Single `MeshStandardMaterial` with color uniform | Simpler, but emissive intensity needs separate control | ❌ |
| Per-type `MeshStandardMaterial` with `emissive` driven by `temperature` | Distinct electrode colors + thermal glow in one material | ✅ |

**Rationale**: E6013 (rutile/silvery) and E7018 (low-H/matte) require visual distinction. `temperature` maps to emissive intensity for the stuck/warning glow. `isStuck` adds red emissive.

### Decision 5: Arc Light Flicker

| Option | Tradeoff | Decision |
|--------|----------|----------|
| `Math.random()` flicker in `useFrame` | Simple, but non-deterministic | ✅ (acceptable) |
| Noise function for deterministic flicker | More complex, not required | ❌ |

**Rationale**: Arc flicker is inherently random. Simple `Math.random()` with `arc.stability < 0.5` threshold is sufficient. Stability drives both color temperature (blue=stable, orange=unstable) and flicker intensity.

### Decision 6: Component Export Style

| Type | Convention |
|------|------------|
| React components (R3F) | **Default exports** (R3F ecosystem standard) |
| Utility files (`bead.buffers.ts`) | **Named exports** (D-04) |

## Data Flow

```
PhysicsEngine.tick()
      ↓
commitFrame(FrameResult)
      ↓
Zustand Store (electrode, arc, session, input slices)
      ↓
┌─────┴─────┬──────────────┬─────────────┐
↓           ↓              ↓             ↓
BeadRenderer  ElectrodeModel  ArcEffect  SpatterSystem
(weldPoints)  (electrode)    (arc)       (lastSpatterBurst)
      ↓
BufferGeometry (pre-allocated, mutated in-place)
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/rendering/bead/bead.buffers.ts` | Create | `MAX_STAMPS`, `createBeadGeometry()`, `writeStamp()` — zero-alloc stamp writer |
| `src/rendering/bead/BeadRenderer.tsx` | Create | Extruded bead ribbon, `coolingProgress` → vertex color, 2ms budget |
| `src/rendering/electrode/ElectrodeModel.tsx` | Create | Cylinder mesh, `currentLength` → scale, `temperature` → emissive, `isStuck` → red glow |
| `src/rendering/electrode/ArcEffect.tsx` | Create | PointLight + emissive sphere, flicker on `stability < 0.5`, voltage → color |
| `src/rendering/particles/SpatterSystem.tsx` | Create | Particle burst on `lastSpatterBurst`, ballistic trajectory, auto-cleanup |
| `src/rendering/Workpiece.tsx` | Create | Steel PBR plate + grid overlay |
| `src/rendering/Scene.tsx` | Create | R3F `<Canvas>` root, sub-renderer composition, frame budget assertion |
| `src/app/store/index.ts` | Modify | Add `lastSpatterBurst` transient flag to arc state |
| `src/app/store/types.ts` | Modify | Add `lastSpatterBurst: boolean` to `ArcState` |

## Frame Budget Breakdown

| Component | Budget | Enforcement |
|-----------|--------|-------------|
| `Scene.tsx` (total) | 12ms | `performance.now()` assertion in DEV |
| `BeadRenderer` | 2ms | Per-component timing in DEV |
| `SpatterSystem` | 1ms | Per-component timing in DEV |
| `ElectrodeModel` | <1ms | Implicit (trivial geometry) |
| `ArcEffect` | <1ms | Implicit (point light + sphere) |

## R3F Component Hierarchy

```tsx
// Scene.tsx — R3F Canvas root
<Canvas>
  <BeadRenderer />         // weld bead ribbon
  <ElectrodeModel />       // consumable electrode rod
  <ArcEffect />            // arc glow + point light
  <SpatterSystem />        // spatter particle bursts
  <Workpiece />            // base plate + grid
</Canvas>
```

## Interfaces / Contracts

```typescript
// bead.buffers.ts
export const MAX_STAMPS = 2000;
export function createBeadGeometry(): BufferGeometry;
export function writeStamp(
  buffer: BufferGeometry,
  point: WeldPoint,
  index: number
): void;

// SpatterSystem reads from ArcState
interface ArcState {
  isActive: boolean;
  arcLength: number;
  voltage: number;
  stability: number;
  lastSpatterBurst: boolean;  // transient flag
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `writeStamp()` mutates correct indices | Vitest, mock `BufferGeometry` |
| Unit | `createBeadGeometry()` attribute sizes | Assert `position.count === MAX_STAMPS` |
| Integration | `BeadRenderer` renders correct point count | React Testing Library + R3F render |
| Integration | `SpatterSystem` clears `lastSpatterBurst` atomically | Store action + component assertion |

## Migration / Rollback

**No migration required** — purely additive. Rollback: delete `src/rendering/` directory and revert store modifications.

## Open Questions

- [ ] **Spatter particle lifetime**: No spec defines exact duration. Suggest 800ms with gravity `9.81 m/s²`. Confirm?
- [ ] **Electrode 3D scale**: 350mm visual length needs scene scale factor. Suggest `1 unit = 100mm`. Confirm?
- [ ] **Grid line spacing**: Not specified in workpiece spec. Suggest 25mm spacing. Confirm?
