# SMAW Simulator — Agent Development Rules
**Version:** 1.0  
**Applies to:** All AI agents and human developers implementing this project  
**Reference documents:** RFC-002, SDD-001

---

## RULE SET A — Foundational Constraints (Never Override)

### A-01: RFC-002 and SDD-001 are authoritative
Every implementation decision that is already resolved in RFC-002 or SDD-001 must follow those documents exactly. An agent must not invent alternative solutions to already-specified problems. If a spec is ambiguous, the agent must surface the ambiguity and halt rather than guess.

### A-02: One file = one responsibility
Each file in `src/` has a single, named purpose. No file may contain logic belonging to another module's domain. Example: `ArcEngine.ts` must not write to the store. `BeadRenderer.tsx` must not contain physics formulas.

### A-03: Zero allocations in the 60Hz hot path
The following functions run every frame and must never call `new`, create arrays, or produce garbage:
- `PhysicsEngine.tick()`
- `DriftSystem.apply()`
- `ArcEngine.evaluate()`
- `WeldEngine.computeStamp()`
- `ElectrodeEngine.deplete()`
- `ScoringEngine.score()`
- `writeStamp()` in `bead.buffers.ts`
- `applyCooling()` in `BeadRenderer.tsx`

Pre-allocate all reusable objects at module or component mount time.

### A-04: Engine modules are framework-agnostic pure TypeScript
No file under `src/engine/` may import from React, Three.js, R3F, or Zustand. Engine functions receive their inputs as parameters and return plain objects. This makes them unit-testable in isolation.

### A-05: Store reads in useFrame use getState(), not hooks
Inside `useFrame` callbacks, always call `useWelderStore.getState()` to read store values. Never call `useWelderStore(selector)` (hook form) inside `useFrame` — this would subscribe the render loop to React re-renders and cause performance collapse.

### A-06: All type definitions live in store/types.ts
No module may define its own duplicate types for domain entities (ElectrodeState, ArcState, WeldPoint, etc.). Import from `src/app/store/types.ts`.

### A-07: No magic numbers in implementation files
All physical constants, tuning parameters, and configuration values must be defined in `src/app/constants.ts` with named exports. Implementation files import named constants. Example: never write `0.003` in `ElectrodeEngine.ts`; write `ELECTRODE_PROFILES.E6013.K_melt`.

### A-08: TypeScript strict mode, zero `any`
The project uses `"strict": true` in `tsconfig.json`. No agent may introduce `any` types. If a type boundary is unclear, use `unknown` and narrow it.

---

## RULE SET B — Module Implementation Order

Agents must implement modules in dependency order. Never implement a module before its dependencies are complete and tested.

```
Phase 0 — Foundation (no dependencies)
  └─ src/app/constants.ts
  └─ src/app/store/types.ts
  └─ src/engine/drift/perlin.ts
  └─ src/engine/scoring/gaussian.utils.ts

Phase 1 — Core Engine (depends on Phase 0)
  └─ src/engine/arc/arc.formulas.ts
  └─ src/engine/arc/ArcEngine.ts
  └─ src/engine/weld/bead.geometry.ts
  └─ src/engine/weld/defect.detector.ts
  └─ src/engine/weld/WeldEngine.ts
  └─ src/engine/electrode/electrode.profiles.ts
  └─ src/engine/electrode/ElectrodeEngine.ts
  └─ src/engine/scoring/ScoringEngine.ts
  └─ src/engine/drift/DriftSystem.ts
  └─ src/engine/PhysicsEngine.ts

Phase 2 — State (depends on Phase 0)
  └─ src/app/store/slices/*.ts
  └─ src/app/store/index.ts

Phase 3 — Input (depends on Phase 2)
  └─ src/input/MouseTracker.ts
  └─ src/input/KeyboardTracker.ts
  └─ src/input/InputController.ts

Phase 4 — Rendering (depends on Phase 1, 2, 3)
  └─ src/rendering/bead/bead.buffers.ts
  └─ src/rendering/bead/BeadRenderer.tsx
  └─ src/rendering/electrode/ElectrodeModel.tsx
  └─ src/rendering/electrode/ArcEffect.tsx
  └─ src/rendering/particles/SpatterSystem.tsx
  └─ src/rendering/Workpiece.tsx
  └─ src/rendering/Scene.tsx

Phase 5 — Audio (depends on Phase 2)
  └─ src/audio/audio.mappings.ts
  └─ src/audio/ArcAudioNode.ts
  └─ src/audio/AudioEngine.ts

Phase 6 — UI (depends on Phase 2, 4)
  └─ src/ui/components/*.tsx
  └─ src/ui/screens/*.tsx
  └─ src/ui/HUD.tsx

Phase 7 — App Bootstrap (depends on all)
  └─ src/app/App.tsx
```

---

## RULE SET C — Per-Module Agent Instructions

When an agent is assigned a module, it must follow this protocol:

### C-01: Read before writing
Before generating any code for a module, the agent must re-read:
1. The relevant section in SDD-001
2. The relevant section in RFC-002 (for physics/formulas)
3. All type definitions in `src/app/store/types.ts` that the module uses
4. All constants in `src/app/constants.ts` that the module uses

### C-02: Implement to interface, not to assumption
If a module calls another module that is not yet implemented, the agent must:
1. Define the interface/type for the dependency
2. Implement to that interface
3. NOT implement the dependency itself (unless assigned)

### C-03: Self-test before declaring done
After generating a module, the agent must mentally execute the following checklist. If any item fails, the agent must fix the code before reporting completion:

```markdown
## Module Completion Checklist

- [ ] All types imported from `src/app/store/types.ts` (not redefined locally)
- [ ] All constants imported from `src/app/constants.ts` (no inline magic numbers)
- [ ] No framework imports in `src/engine/**` files
- [ ] No allocations in functions marked as hot-path (A-03)
- [ ] TypeScript strict: no `any`, all params typed, return types explicit
- [ ] File has single responsibility (A-02)
- [ ] Exported functions/classes match the interface defined in SDD-001
- [ ] Edge cases handled: division by zero, NaN, out-of-range inputs
```

### C-04: Report open questions, don't resolve them silently
If implementing a module surfaces an ambiguity not resolved in RFC-002 or SDD-001, the agent must:
1. Add it to the Open Questions table in RFC-002 (OQ-05, OQ-06, etc.)
2. Use a safe default for now and mark it with `// TODO: OQ-XX — awaiting resolution`
3. NOT silently pick an arbitrary value

---

## RULE SET D — Code Style Conventions

### D-01: Language
- All code: TypeScript (`.ts` / `.tsx`)
- All comments and identifiers: English
- GLSL shader files: `.glsl` extension with inline comments in English

### D-02: Naming Conventions

| Entity | Convention | Example |
|---|---|---|
| Classes | PascalCase | `ArcEngine`, `DriftSystem` |
| Interfaces/Types | PascalCase | `ElectrodeState`, `WeldPoint` |
| Functions | camelCase | `computeStamp`, `applyDrift` |
| Constants (module-level) | SCREAMING_SNAKE | `MAX_STAMPS`, `ARC_RATE` |
| React components | PascalCase | `BeadRenderer`, `ArcEffect` |
| Store slices | camelCase + Slice | `electrodeSlice`, `arcSlice` |
| GLSL uniforms | `u_` prefix | `u_stability`, `u_arcLength` |
| GLSL varyings | `v` prefix | `vUv`, `vPosition` |

### D-03: File Header Comment
Every file must begin with a single-line comment stating its module path and primary responsibility:

```typescript
// src/engine/arc/ArcEngine.ts — Computes arc voltage, stability, and extinction conditions
```

### D-04: Export style
- Prefer named exports over default exports for all engine classes and utility functions
- React components use default exports (R3F convention)

### D-05: Immutability in engine outputs
Engine methods return new plain objects. They do not mutate their input parameters. Example:

```typescript
// CORRECT
return { ...arc, voltage: newVoltage, stability: newStability };

// INCORRECT — mutates input
arc.voltage = newVoltage;
return arc;
```

---

## RULE SET E — Testing Requirements

### E-01: Engine modules require unit tests
Every file under `src/engine/` must have a corresponding test file:
```
src/engine/arc/ArcEngine.ts → src/engine/arc/ArcEngine.test.ts
```

### E-02: Mandatory test cases per engine module

**ArcEngine:**
- `evaluate()` returns `isActive: false` when `arcLength > L_max`
- `evaluate()` returns `isActive: false` when `electrode.currentLength <= 0`
- `voltage` equals `V0` when `arcLength = 0`
- `stability` peaks at 1.0 when all parameters at optimal

**WeldEngine:**
- `computeStamp()` returns values within physical bounds (width 1–15mm, height 0.3–8mm)
- Width decreases at high travel speed
- Penetration decreases as arc length increases beyond optimal

**ElectrodeEngine:**
- `currentLength` decreases each tick
- `isStuck` triggers when `arcLength <= 0` persists
- Electrode fully depleted after calculated time at I_optimal

**ScoringEngine:**
- `Q = 1.0` when all parameters exactly at optimal
- `Q < 0.5` when arc length is 2× optimal
- `Q` is always in range `[0.0, 1.0]`

**DriftSystem:**
- Output `arcLength` always within `[0, 8]`
- Output `workAngle` always within `[60, 120]`
- Drift values differ between `school` and `expert` difficulty

### E-03: Test framework
Use Vitest (configured with Vite). No external testing dependencies beyond Vitest and `@testing-library/react` for component tests.

---

## RULE SET F — Performance Monitoring

### F-01: Frame budget assertion (development only)
In development builds, `Scene.tsx` must wrap the `useFrame` callback with timing assertions:

```typescript
if (import.meta.env.DEV) {
  const start = performance.now();
  // ... frame logic
  const elapsed = performance.now() - start;
  if (elapsed > 12) {
    console.warn(`[SMAW] Frame budget exceeded: ${elapsed.toFixed(2)}ms`);
  }
}
```

### F-02: Memory leak detection
In development, the `BeadRenderer` must log a warning when `totalSegmentsRef.current >= MAX_STAMPS * 0.9` to signal that the weld session should end.

---

## RULE SET G — Git Commit Conventions

### G-01: Commit message format
```
<type>(<module>): <description>

Types: feat | fix | refactor | test | docs | perf | chore
Module: engine/arc | engine/weld | rendering/bead | audio | ui/hud | store | input

Examples:
feat(engine/arc): implement ArcEngine.evaluate() with stability gaussian
perf(rendering/bead): pre-allocate stamp buffers to eliminate GC pressure
fix(input): clamp arc length within [0, L_max] in InputController
test(engine/scoring): add unit tests for Q=1.0 at optimal parameters
```

### G-02: Branch naming
```
feature/<module-name>       → feat(engine/weld): ...
fix/<issue-description>     → fix(rendering): ...
phase/<number>              → chore: complete Phase 2 state layer
```

### G-03: No cross-phase merges
Code from Phase N+1 must not be merged to main until all Phase N modules pass their acceptance criteria from SDD-001 §6.

---

## RULE SET H — Agent Task Format

When assigning a task to an AI agent, use this template to ensure deterministic output:

```markdown
## Agent Task: <module name>

**Phase:** <0–7>
**Files to create:**
- `src/path/to/File.ts`

**Reference sections:**
- SDD-001 §<section number> — <section title>
- RFC-002 §<section number> — <section title>

**Types to import:**
- `<TypeName>` from `src/app/store/types.ts`

**Constants to use:**
- `<CONSTANT_NAME>` from `src/app/constants.ts`

**Depends on (must exist before starting):**
- `<ModuleName>` from `src/path/to/Dependency.ts`

**Acceptance criteria:**
- [ ] <criterion from SDD-001 §6>
- [ ] Module Completion Checklist (Rule C-03) passes

**Must NOT do:**
- <list specific out-of-scope actions>
```

---

## RULE SET I — Prohibited Patterns

The following patterns are explicitly prohibited. Any agent generating these must self-correct before submitting:

| Prohibited | Reason | Alternative |
|---|---|---|
| `new THREE.Vector3()` inside `useFrame` | GC allocation | Pre-allocate and `.set()` |
| `useState` for simulation values | React re-render overhead | Zustand store only |
| `useStore(selector)` inside `useFrame` | React subscription in hot path | `getState()` |
| Inline formula constants (e.g. `* 0.003`) | Magic numbers | Import from `constants.ts` |
| `any` type | Type safety | Use `unknown` + narrowing |
| Direct store mutation outside of actions | Zustand integrity | Always use defined actions |
| Engine file importing from React/Three | Framework coupling | Pass values as parameters |
| `console.log` in production paths | Performance noise | `DEV`-guarded only |
| DOM manipulation in engine files | Layer violation | Engine is pure TS only |
| `setTimeout`/`setInterval` for timing | Inconsistent with render loop | Use `delta` in `useFrame` |
