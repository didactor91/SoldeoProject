# RFC-002 — SMAW Welding Simulator
**Status:** APPROVED FOR DEVELOPMENT  
**Version:** 1.0  
**Supersedes:** RFC-001-REV2  
**Authors:** Architecture Review  
**Date:** 2026-05-29

---

## 1. Executive Summary

This document specifies the complete technical architecture for a browser-based SMAW (Shielded Metal Arc Welding) training simulator. The simulator targets welding students, vocational trainers, and professionals seeking to practice electrode manipulation without consuming physical consumables or requiring supervised lab access.

The system models the physical relationship between operator inputs (arc length, travel speed, work angle, drag angle, amperage) and weld quality outcomes using a heuristic physics engine running at 60Hz, rendered via React Three Fiber (R3F) with custom GLSL shaders and procedural Web Audio API synthesis.

---

## 2. Motivation and Problem Statement

### 2.1 Identified Gaps in RFC-001-REV2

RFC-001-REV2 establishes a solid architectural foundation. The following gaps and improvements are incorporated in this revision:

| Area | RFC-001-REV2 Gap | RFC-002 Resolution |
|---|---|---|
| Input system | Mouse + keyboard defined conceptually, no debounce/interpolation spec | Explicit InputController spec with interpolation curves |
| Drift system | Mentioned as configurable, not specified | Perlin noise model with per-parameter drift rates defined |
| Defect model | Listed qualitatively (porosity, undercut) | Mapped to heuristic ranges with visual geometry rules |
| State management | `useWelderStore` referenced but not specified | Full Zustand store schema with slice separation |
| Audio synthesis | Pink noise graph defined | Extended with oscillator layer for arc crackle |
| Electrode types | E6013 / E7018 typed | Optimal parameter tables per electrode fully defined |
| Coordinate system | Implicit | Explicit right-handed 3D coordinate system defined |
| Electrode sticking | `isStuck` flag in types | Recovery mechanic and visual/audio feedback defined |
| Performance budget | Not specified | Frame budget table and GC strategy defined |

### 2.2 RFC-001-REV2 Validated Decisions (Retained)

The following decisions from RFC-001-REV2 are validated and retained without modification:

- `BufferGeometry` pre-allocation strategy with `MAX_STAMPS = 3000`
- `VERTICES_PER_STAMP = 8` for cross-section resolution
- Stamp-based deposition pipeline (ring append per frame)
- Thermal cooling via per-vertex color decay in `useFrame`
- Web Audio API subtractive synthesis (pink noise → BiquadFilter → Gain)
- Post-weld analytical heatmap as a 2D quality review layer
- Three-level drift difficulty: School / Professional / Expert
- Shadow-based Z-depth perception aid

---

## 3. Scope

### 3.1 MVP Scope (Phase 1 — This RFC)

- [ ] Flat horizontal workpiece surface
- [ ] Single electrode: E6013 (rutile), configurable amperage
- [ ] Real-time electrode consumption with visible length reduction
- [ ] Procedural bead generation with dynamic geometry
- [ ] 5-parameter quality scoring: distance, speed, work angle, drag angle, amperage
- [ ] Real-time HUD with parameter gauges and quality indicator
- [ ] Drift system (3 difficulty levels)
- [ ] Procedural arc audio (Web Audio API)
- [ ] Arc glow shader (Bloom post-processing)
- [ ] Spatter particle system
- [ ] Electrode sticking mechanic
- [ ] Post-weld heatmap analysis view
- [ ] Orbital camera with constrained viewport

### 3.2 Out of Scope for MVP

- Vertical / overhead welding positions
- Multi-pass welding
- E7018 basic electrode
- Thermal workpiece distortion
- Mobile/gyroscope input
- Multiplayer or instructor mode
- Save/replay system

---

## 4. System Architecture

### 4.1 High-Level Layers

```
┌─────────────────────────────────────────────────────────┐
│                     Browser Runtime                      │
├──────────────────┬──────────────────┬───────────────────┤
│   INPUT LAYER    │   ENGINE LAYER   │   OUTPUT LAYER    │
│                  │                  │                    │
│ MouseController  │ PhysicsEngine    │ R3F Scene          │
│ KeyboardCtrl     │ ArcEngine        │ BeadRenderer       │
│ DriftSystem      │ WeldEngine       │ ArcShader          │
│                  │ ElectrodeEngine  │ SpatterSystem      │
│                  │ ScoringEngine    │ HUD (DOM overlay)  │
│                  │                  │ AudioEngine        │
├──────────────────┴──────────────────┴───────────────────┤
│                   Zustand State Store                    │
│        (single source of truth, sliced per domain)      │
└─────────────────────────────────────────────────────────┘
```

### 4.2 Data Flow (Per Frame, 60Hz)

```
[User Input] 
    │
    ▼
[InputController] → interpolates raw input → [WelderInputState]
    │
    ▼
[DriftSystem] → applies Perlin drift → [WelderInputState + drift]
    │
    ▼
[PhysicsEngine.tick(delta, state)]
    │  ├─ ArcEngine    → computes voltage, stability, arcLength validity
    │  ├─ WeldEngine   → computes bead geometry, defect flags
    │  ├─ ElectrodeEngine → depletes length/mass, checks isStuck
    │  └─ ScoringEngine  → computes instantaneous Q
    │
    ▼
[Zustand store.commit(frameResult)]
    │
    ├─▶ [R3F useFrame] → BeadRenderer appends stamp, updates thermal colors
    ├─▶ [ArcShader]    → updates arc glow uniforms
    ├─▶ [SpatterSystem]→ emits particles if spatter conditions met
    ├─▶ [AudioEngine]  → maps arcLength/amperage to filter/gain
    └─▶ [HUD]          → React re-renders gauges (throttled to 10Hz)
```

### 4.3 Directory Structure

```
src/
├── app/
│   ├── App.tsx                  # Root component, view router
│   ├── store/
│   │   ├── index.ts             # Zustand store assembly
│   │   ├── slices/
│   │   │   ├── electrodeSlice.ts
│   │   │   ├── arcSlice.ts
│   │   │   ├── weldSlice.ts
│   │   │   ├── inputSlice.ts
│   │   │   └── sessionSlice.ts
│   │   └── types.ts             # All exported store types
│   └── constants.ts             # Physical constants, electrode tables
│
├── engine/
│   ├── PhysicsEngine.ts         # Orchestrator: calls sub-engines per tick
│   ├── arc/
│   │   ├── ArcEngine.ts         # Voltage, stability, arc validity
│   │   └── arc.formulas.ts      # Pure functions: E = V0 + k*L, etc.
│   ├── weld/
│   │   ├── WeldEngine.ts        # Bead geometry, defect detection
│   │   ├── bead.geometry.ts     # Width/height/penetration calculations
│   │   └── defect.detector.ts   # Maps parameter ranges to defect flags
│   ├── electrode/
│   │   ├── ElectrodeEngine.ts   # Consumption rate, sticking detection
│   │   └── electrode.profiles.ts# E6013 / E7018 physical parameters
│   ├── scoring/
│   │   ├── ScoringEngine.ts     # Instantaneous Q computation
│   │   └── gaussian.utils.ts    # Gaussian scoring factor helpers
│   └── drift/
│       ├── DriftSystem.ts       # Perlin noise-based parameter drift
│       └── perlin.ts            # Deterministic Perlin noise implementation
│
├── rendering/
│   ├── Scene.tsx                # R3F Canvas, lighting, camera rig
│   ├── Workpiece.tsx            # Static horizontal plate mesh
│   ├── bead/
│   │   ├── BeadRenderer.tsx     # BufferGeometry stamp pipeline
│   │   └── bead.buffers.ts      # Buffer allocation and stamp writers
│   ├── electrode/
│   │   ├── ElectrodeModel.tsx   # Animated electrode mesh + holder
│   │   └── ArcEffect.tsx        # Point light + glow sprite at arc tip
│   ├── particles/
│   │   └── SpatterSystem.tsx    # GPU particle emitter (instancedMesh)
│   ├── shaders/
│   │   ├── arc.vert.glsl
│   │   ├── arc.frag.glsl
│   │   ├── slag.vert.glsl
│   │   └── slag.frag.glsl
│   └── postprocessing/
│       └── BloomConfig.ts       # EffectComposer + UnrealBloomPass config
│
├── input/
│   ├── InputController.ts       # Unified input → WelderInputState
│   ├── MouseTracker.ts          # Pointer lock, delta accumulation
│   └── KeyboardTracker.ts       # Key state map, smooth interpolation
│
├── audio/
│   ├── AudioEngine.ts           # AudioContext lifecycle + node graph
│   ├── ArcAudioNode.ts          # Pink noise + crackle synthesis
│   └── audio.mappings.ts        # Parameter → filter/gain curves
│
└── ui/
    ├── HUD.tsx                  # Main overlay container
    ├── components/
    │   ├── AmpGauge.tsx
    │   ├── ArcLengthIndicator.tsx
    │   ├── QualityMeter.tsx
    │   ├── AngleDisplay.tsx
    │   ├── ElectrodeBar.tsx     # Remaining electrode length
    │   └── DefectAlert.tsx      # Real-time defect warnings
    └── screens/
        ├── WeldingScreen.tsx
        ├── HeatmapScreen.tsx    # Post-weld analysis view
        └── SetupScreen.tsx      # Amperage + difficulty selection
```

---

## 5. Physics Engine Specification

### 5.1 Coordinate System

Right-handed 3D coordinate system. World units = millimeters (mm).

```
Y (up)
│
│    Z (depth, toward camera)
│   ╱
│  ╱
│ ╱
└────── X (travel direction, welding direction)

Workpiece surface: Y = 0 plane
Electrode tip: always Y > 0 (above or touching surface)
```

### 5.2 Arc Engine Formulas

**Dynamic Arc Voltage:**
```
E = V₀ + (k · L_arc)
```
Where:
- `V₀` = 20V (minimum ionisation voltage, E6013)
- `k` = 2.5 V/mm (voltage gradient per mm of arc length)
- `L_arc` = current arc length in mm

**Arc Stability (0.0 → 1.0):**
```
S_arc = gaussian(L_arc, μ=L_optimal, σ=1.5)
     × gaussian(I, μ=I_optimal, σ=15)
```
Where `gaussian(x, μ, σ) = exp(-0.5 · ((x-μ)/σ)²)`

**Arc Extinction Conditions:**
- `L_arc > L_max` (arc length exceeds electrode diameter × 1.5)
- `L_arc <= 0` (electrode contacts workpiece → isStuck risk)
- Electrode length depleted to zero

**Electrode Sticking (isStuck):**
- Triggered when: `L_arc <= 0` AND `I < I_min_for_clearing`
- Recovery: user must press `R` key (simulates electrode removal/restriking)
- Probability increases as amperage drops below minimum threshold

### 5.3 Weld Bead Geometry

Per-stamp bead cross-section dimensions (in mm):

```
beadWidth = W_base · (I/I_optimal)^0.6 · gaussian(speed, μ=v_opt, σ=2) · (1/L_ratio)^0.3
beadHeight = H_base · (I/I_optimal)^0.4 · (1/speedRatio)^0.5
penetration = P_base · (I/I_optimal)^0.8 · gaussian(L_arc, μ=L_opt, σ=1.2)
```

Where `L_ratio = L_arc / L_optimal`, `speedRatio = speed / v_optimal`

**Defect Conditions (mapped to geometry deformation):**

| Defect | Trigger Condition | Geometry Effect |
|---|---|---|
| Undercut | `I > I_opt×1.3` AND `speed > v_opt×1.2` | Negative groove added at bead edges |
| Overlap | `I < I_opt×0.7` OR `speed < v_opt×0.5` | Bead height ×2, width ×0.6 |
| Porosity | `L_arc > L_opt×1.8` | Random void depressions in bead surface |
| Spatter | `L_arc < L_opt×0.5` OR `I > I_opt×1.4` | Particle emission rate ×5 |
| Incomplete fusion | `speed > v_opt×1.8` | Bead width ×0.4, discontinuous stamp |
| Burn-through | `I > I_opt×1.6` AND `speed < v_opt×0.4` | Bead replaced with hole geometry |

### 5.4 Electrode Consumption Model

```
consumptionRate = K_melt · I · (1 + K_temp · electrode.temperature)
electrode.currentLength -= consumptionRate · delta
electrode.remainingMass = electrode.currentLength / L_initial × M_initial
```

Where:
- `K_melt` = 0.003 mm/(A·s) — empirical melt-off rate for E6013 3.2mm
- `K_temp` = 0.0002 — thermal resistance heating factor
- `delta` = frame time in seconds

**Electrode temperature model:**
```
electrode.temperature += I² × R_electrode × delta × K_heat
electrode.temperature -= (electrode.temperature - T_ambient) × K_cool × delta
```

### 5.5 Instantaneous Quality Score

```
Q = S_distance · S_speed · S_workAngle · S_dragAngle · S_amperage
```

Each factor:
```
S_distance  = gaussian(L_arc,    μ=L_opt,        σ=1.2)
S_speed     = gaussian(speed,    μ=v_opt,         σ=1.5)
S_workAngle = gaussian(workAng,  μ=θ_work_opt,    σ=8°)
S_dragAngle = gaussian(dragAng,  μ=θ_drag_opt,    σ=7°)
S_amperage  = gaussian(I,        μ=I_opt,         σ=12A)
```

### 5.6 Electrode Profiles

**E6013 (Rutile) — MVP electrode:**

| Parameter | Value |
|---|---|
| `I_optimal` | 100A (3.2mm rod) |
| `I_min` | 70A |
| `I_max` | 130A |
| `L_optimal` (arc length) | 3.2mm (= rod diameter) |
| `L_max` (max arc) | 6.0mm |
| `v_optimal` (travel speed) | 150 mm/min |
| `θ_work_opt` (work angle) | 90° (perpendicular to surface) |
| `θ_drag_opt` (drag angle) | 70° (20° drag from vertical) |
| `V₀` | 20V |
| `k` | 2.5 V/mm |
| Behaviour | Forgiving, stable arc, good for beginners |

**E7018 (Low-hydrogen Basic) — Phase 2:**

| Parameter | Value |
|---|---|
| `I_optimal` | 115A (3.2mm rod) |
| Behaviour | Less forgiving, requires closer arc, oven-dry storage warning |

---

## 6. Drift System Specification

Drift is applied after the user's raw input is processed, before the physics engine tick.

### 6.1 Drift Model

```typescript
// Perlin noise sampled at different frequencies per parameter
drift.arcLength += perlin(time × 0.4) × driftAmplitude.arcLength × delta
drift.workAngle += perlin(time × 0.25 + 100) × driftAmplitude.workAngle × delta
drift.dragAngle += perlin(time × 0.3 + 200) × driftAmplitude.dragAngle × delta
```

Drift accumulates but is clamped per parameter. The user must actively counter-press to re-centre.

### 6.2 Difficulty Levels

| Level | arcLength drift (mm/s) | workAngle drift (°/s) | dragAngle drift (°/s) | Noise freq |
|---|---|---|---|---|
| School | 0.2 | 1.5 | 1.2 | 0.2 |
| Professional | 0.5 | 3.5 | 3.0 | 0.35 |
| Expert | 1.0 | 6.0 | 5.5 | 0.5 |

---

## 7. Input Control Specification

### 7.1 Control Map

| Input | Action | Rate |
|---|---|---|
| Mouse X | Electrode travel along X axis | Direct (pointer lock) |
| Mouse Y | Electrode lateral position (Y axis) | Direct (pointer lock) |
| `Q` | Decrease arc length (lower electrode) | −0.5 mm/frame hold |
| `E` | Increase arc length (raise electrode) | +0.5 mm/frame hold |
| `W` | Increase drag angle (tilt back) | +1°/frame hold |
| `S` | Decrease drag angle (tilt forward) | −1°/frame hold |
| `A` | Rotate work angle left | −1°/frame hold |
| `D` | Rotate work angle right | +1°/frame hold |
| `R` | Restrike arc / unstick electrode | Instant |
| `Space` | Strike arc (begin welding session) | Toggle |
| `Escape` | Pause / exit to setup | Instant |

### 7.2 Input Interpolation

Raw keyboard hold inputs are smoothed via exponential interpolation to avoid steppy transitions:

```
smoothedRate = lerp(smoothedRate, targetRate, smoothingFactor × delta × 60)
```

`smoothingFactor = 0.12` for arc length, `0.08` for angles (angles feel heavier).

### 7.3 Shadow-based Z Depth Cue

A soft drop shadow is rendered beneath the electrode tip onto the workpiece surface. Its size and blur scale inversely with arc length, providing an analogue depth cue:

```
shadowScale = remap(L_arc, 0, L_max, 0.8, 3.5)
shadowOpacity = remap(L_arc, 0, L_max, 0.7, 0.1)
```

---

## 8. Audio Engine Specification

### 8.1 Node Graph

```
[OscillatorNode 120Hz square]──┐
                                ├──[WaveShaperNode]──┐
[Pink Noise Buffer Source]──────┘   (distortion)     │
                                                      │
                                              [BiquadFilterNode]
                                              type: bandpass
                                              freq: mapped(L_arc)
                                              Q: mapped(stability)
                                                      │
                                              [DynamicsCompressor]
                                                      │
                                              [GainNode]
                                              gain: mapped(I)
                                                      │
                                              [AudioDestination]
```

### 8.2 Parameter Mappings

```
filter.frequency = remap(L_arc, 0, L_max, 3000, 400)   // Hz
filter.Q         = remap(stability, 0, 1, 0.5, 8.0)
masterGain.gain  = remap(I, I_min, I_max, 0.1, 0.85)
```

**Arc extinction:** GainNode ramps to 0 over 80ms when arc goes inactive.

**Electrode stick:** Play a short 50ms metallic click (OscillatorNode 800Hz, fast attack/decay envelope).

---

## 9. Post-Weld Heatmap

On weld session end, the simulator transitions to an analysis view:

1. Camera animates to orthographic top-down view (bird's eye)
2. Vertex colors of the bead are replaced with quality-mapped colors:
   - `Q > 0.80` → `#22c55e` (bright green — excellent)
   - `0.60 < Q ≤ 0.80` → `#eab308` (yellow — acceptable)
   - `0.40 < Q ≤ 0.60` → `#f97316` (orange — marginal)
   - `Q ≤ 0.40` → `#ef4444` (red — defective)
3. Defect labels are overlaid in world-space at detected defect zones
4. Summary panel shows: average Q, worst defect type, consistency score (σ of Q over time)

---

## 10. Performance Budget

Target: stable 60fps on integrated GPU (Intel Iris / Apple M-series).

| System | Budget | Strategy |
|---|---|---|
| BeadRenderer | 2ms | Pre-allocated buffers, no GC per frame |
| PhysicsEngine | 0.5ms | Pure functions, no allocations in hot path |
| SpatterSystem | 1ms | `InstancedMesh`, max 200 active particles |
| AudioEngine | 0ms (AudioThread) | All processing on AudioWorklet thread |
| HUD React | <1ms | Throttled updates at 10Hz, `memo` on all components |
| Post-processing | 2ms | Single `UnrealBloomPass` pass, resolution 0.5× |
| **Total frame budget** | **~8ms** | **Leaves 8ms headroom to 16.6ms target** |

---

## 11. Technology Stack

| Layer | Technology | Version | Justification |
|---|---|---|---|
| Framework | React | 18 | Component model for HUD, R3F ecosystem |
| 3D Runtime | React Three Fiber | 8.x | Declarative R3F with full Three.js access |
| Three.js | Three.js | r160+ | BufferGeometry control, post-processing |
| Post-processing | @react-three/postprocessing | 2.x | UnrealBloom, EffectComposer |
| State | Zustand | 4.x | Minimal, no-boilerplate, useFrame compatible |
| Build | Vite | 5.x | Fast HMR, GLSL import support |
| Language | TypeScript | 5.x | Strict mode, no `any` |
| Audio | Web Audio API | Native | No dependencies, zero-latency synthesis |
| Noise | Custom Perlin | — | Deterministic, seedable, no external dep |

---

## 12. Open Questions

| ID | Question | Owner | Resolution deadline |
|---|---|---|---|
| OQ-01 | Pointer Lock API: require fullscreen or allow windowed? | UX | Before input implementation |
| OQ-02 | Should amperage be adjustable during welding or only at setup? | Design | Before HUD implementation |
| OQ-03 | Heatmap: separate Three.js scene or same scene with camera transition? | Rendering | Before heatmap implementation |
| OQ-04 | Should drift affect amperage, or only geometric parameters? | Physics | Before drift implementation |
