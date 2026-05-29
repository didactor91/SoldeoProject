# SDD-001 — Software Design Document
# SMAW Welding Simulator — MVP

**Status:** APPROVED  
**Version:** 1.0  
**RFC Reference:** RFC-002  
**Date:** 2026-05-29

---

## 1. Purpose

This SDD provides implementation-level design decisions that bridge RFC-002 (architecture/physics specification) and actual code. It is the authoritative reference for AI agents and developers implementing any module of the SMAW simulator.

Each section maps to a directory in `src/` and defines: inputs, outputs, interfaces, implementation constraints, and acceptance criteria.

---

## 2. Module Designs

---

### 2.1 Store — `src/app/store/`

#### 2.1.1 Design

The Zustand store is the single source of truth. No component or engine holds local simulation state. The store is partitioned into slices, each with its own state shape and actions.

**Critical constraint:** Physics engine reads from and writes to the store **only via a single `commitFrame(result: FrameResult)` action** to guarantee atomic updates and prevent partial state reads mid-frame.

#### 2.1.2 Type Definitions

```typescript
// src/app/store/types.ts

export type ElectrodeType = 'E6013' | 'E7018';
export type DifficultyLevel = 'school' | 'professional' | 'expert';
export type DefectType = 'undercut' | 'overlap' | 'porosity' | 'spatter' | 'incomplete_fusion' | 'burn_through' | 'none';
export type SessionPhase = 'setup' | 'welding' | 'heatmap';

export interface ElectrodeState {
  type: ElectrodeType;
  initialLength: number;       // mm — full rod length (350mm for 3.2mm E6013)
  currentLength: number;       // mm — depletes during welding
  remainingMass: number;       // 0.0 to 1.0 ratio
  temperature: number;         // °C simulated
  isStuck: boolean;
}

export interface ArcState {
  isActive: boolean;
  arcLength: number;           // mm — tip to workpiece distance
  voltage: number;             // V — computed
  amperage: number;            // A — machine configuration
  stability: number;           // 0.0–1.0
}

export interface InputState {
  // Raw (before drift injection)
  rawArcLength: number;
  rawWorkAngle: number;
  rawDragAngle: number;
  rawPositionX: number;
  rawPositionZ: number;
  // Applied (after drift)
  arcLength: number;
  workAngle: number;
  dragAngle: number;
  positionX: number;
  positionZ: number;
  // Velocity (mm/s or °/s)
  travelSpeed: number;
}

export interface WeldPoint {
  position: [number, number, number];
  width: number;
  height: number;
  penetration: number;
  coolingProgress: number;     // 0.0 (incandescent) → 1.0 (cooled slag)
  instantQuality: number;      // Q factor [0.0–1.0]
  defect: DefectType;
}

export interface SessionState {
  phase: SessionPhase;
  difficulty: DifficultyLevel;
  elapsedTime: number;         // seconds
  weldPoints: WeldPoint[];
  averageQuality: number;
  worstDefect: DefectType;
}

export interface FrameResult {
  electrode: Partial<ElectrodeState>;
  arc: Partial<ArcState>;
  input: Partial<InputState>;
  newWeldPoint: WeldPoint | null;
  spatterBurst: boolean;
}
```

#### 2.1.3 Store Shape

```typescript
// Each slice exposes its state + actions as a flat object
interface WelderStore {
  electrode: ElectrodeState;
  arc: ArcState;
  input: InputState;
  session: SessionState;

  // Actions
  setAmperage: (amps: number) => void;
  setDifficulty: (level: DifficultyLevel) => void;
  strikeArc: () => void;
  extinguishArc: () => void;
  unstickElectrode: () => void;
  commitFrame: (result: FrameResult) => void;
  endWeldSession: () => void;
  resetSession: () => void;
}
```

---

### 2.2 Physics Engine — `src/engine/`

#### 2.2.1 PhysicsEngine

The orchestrator. Called once per `useFrame` in `Scene.tsx`.

```typescript
// src/engine/PhysicsEngine.ts

export class PhysicsEngine {
  private arcEngine: ArcEngine;
  private weldEngine: WeldEngine;
  private electrodeEngine: ElectrodeEngine;
  private scoringEngine: ScoringEngine;
  private driftSystem: DriftSystem;

  tick(delta: number, store: WelderStore): FrameResult {
    if (!store.arc.isActive) return NULL_FRAME_RESULT;

    const driftedInput = this.driftSystem.apply(store.input, store.session.difficulty, delta);
    const arcResult = this.arcEngine.evaluate(driftedInput, store.arc, store.electrode);
    const electrodeResult = this.electrodeEngine.deplete(store.electrode, store.arc, delta);
    const beadGeometry = this.weldEngine.computeStamp(driftedInput, arcResult, store.arc);
    const quality = this.scoringEngine.score(driftedInput, arcResult, store.arc);

    return {
      electrode: electrodeResult,
      arc: arcResult,
      input: driftedInput,
      newWeldPoint: {
        position: [driftedInput.positionX, 0, driftedInput.positionZ],
        ...beadGeometry,
        coolingProgress: 0,
        instantQuality: quality.Q,
        defect: quality.dominantDefect,
      },
      spatterBurst: quality.isSpatter,
    };
  }
}
```

**Rules:**
- All sub-engines are pure: same inputs → same outputs
- No sub-engine imports from `store` directly; receives values as parameters
- No `new` allocations in `tick()` hot path — reuse result objects

#### 2.2.2 ArcEngine

```typescript
// src/engine/arc/ArcEngine.ts

export class ArcEngine {
  evaluate(input: InputState, arc: ArcState, electrode: ElectrodeState): Partial<ArcState> {
    const L = input.arcLength;
    const profile = ELECTRODE_PROFILES[electrode.type];

    const voltage = profile.V0 + profile.k * L;
    const stabilityDistance = gaussian(L, profile.L_optimal, 1.5);
    const stabilityAmperage = gaussian(arc.amperage, profile.I_optimal, 15);
    const stability = stabilityDistance * stabilityAmperage;

    const isActive = L > 0 && L <= profile.L_max && electrode.currentLength > 0;

    return { voltage, stability, isActive, arcLength: L };
  }
}
```

#### 2.2.3 WeldEngine

```typescript
// src/engine/weld/WeldEngine.ts
// Returns bead cross-section for the current stamp

export class WeldEngine {
  computeStamp(input: InputState, arcResult: Partial<ArcState>, arc: ArcState): BeadStampGeometry {
    const profile = ELECTRODE_PROFILES['E6013'];
    const I = arc.amperage;
    const speed = input.travelSpeed;
    const L = arcResult.arcLength!;

    const speedRatio = speed / profile.v_optimal;
    const L_ratio = L / profile.L_optimal;

    const width = profile.W_base
      * Math.pow(I / profile.I_optimal, 0.6)
      * gaussian(speed, profile.v_optimal, 2)
      * Math.pow(1 / L_ratio, 0.3);

    const height = profile.H_base
      * Math.pow(I / profile.I_optimal, 0.4)
      * Math.pow(1 / speedRatio, 0.5);

    const penetration = profile.P_base
      * Math.pow(I / profile.I_optimal, 0.8)
      * gaussian(L, profile.L_optimal, 1.2);

    return { width: clamp(width, 1, 15), height: clamp(height, 0.3, 8), penetration: clamp(penetration, 0, 5) };
  }
}
```

#### 2.2.4 DriftSystem

```typescript
// src/engine/drift/DriftSystem.ts

export class DriftSystem {
  private time = 0;

  apply(input: InputState, difficulty: DifficultyLevel, delta: number): InputState {
    this.time += delta;
    const cfg = DRIFT_CONFIG[difficulty];

    const dL = perlin(this.time * cfg.freq) * cfg.arcLength * delta;
    const dW = perlin(this.time * cfg.freq + 100) * cfg.workAngle * delta;
    const dD = perlin(this.time * cfg.freq + 200) * cfg.dragAngle * delta;

    return {
      ...input,
      arcLength:  clamp(input.rawArcLength + dL, 0, 8),
      workAngle:  clamp(input.rawWorkAngle + dW, 60, 120),
      dragAngle:  clamp(input.rawDragAngle + dD, 50, 90),
    };
  }
}
```

---

### 2.3 BeadRenderer — `src/rendering/bead/`

#### 2.3.1 Buffer Strategy

Pre-allocate once at mount. Never allocate in `useFrame`.

```typescript
// src/rendering/bead/bead.buffers.ts

export const MAX_STAMPS = 3000;
export const VERTS_PER_STAMP = 8;
export const TOTAL_VERTS = MAX_STAMPS * VERTS_PER_STAMP;

export function allocateBeadBuffers() {
  return {
    positions: new Float32Array(TOTAL_VERTS * 3),
    colors:    new Float32Array(TOTAL_VERTS * 3),
    normals:   new Float32Array(TOTAL_VERTS * 3),
  };
}
```

#### 2.3.2 Stamp Writer

Each stamp is a ring of 8 vertices forming an elliptical cross-section:

```typescript
export function writeStamp(
  positions: Float32Array,
  colors: Float32Array,
  stampIndex: number,
  center: THREE.Vector3,
  width: number,
  height: number,
  quality: number,
): void {
  const stride = stampIndex * VERTS_PER_STAMP * 3;
  for (let i = 0; i < VERTS_PER_STAMP; i++) {
    const angle = (i / VERTS_PER_STAMP) * Math.PI * 2;
    const vx = center.x + Math.cos(angle) * width * 0.5;
    const vy = center.y + Math.max(0, Math.sin(angle)) * height; // above surface only
    const vz = center.z;
    const idx = stride + i * 3;
    positions[idx]     = vx;
    positions[idx + 1] = vy;
    positions[idx + 2] = vz;
    // Fresh stamp: incandescent (hot orange-white)
    colors[idx]     = 1.0;
    colors[idx + 1] = 0.5 + quality * 0.3;
    colors[idx + 2] = 0.1;
  }
}
```

#### 2.3.3 Thermal Cooling (per-frame)

```typescript
// Applied to ALL existing vertices every frame — runs in useFrame
function applyCooling(colors: Float32Array, activeVerts: number, delta: number) {
  for (let i = 0; i < activeVerts * 3; i += 3) {
    colors[i]     = Math.max(0.20, colors[i]     - delta * 0.15);  // red channel
    colors[i + 1] = Math.max(0.15, colors[i + 1] - delta * 0.30);  // green channel
    colors[i + 2] = Math.max(0.10, colors[i + 2] - delta * 0.40);  // blue channel
  }
}
```

Final cooled color target: `(0.20, 0.15, 0.10)` — dark slag grey-brown.

---

### 2.4 Arc Effect — `src/rendering/electrode/ArcEffect.tsx`

#### 2.4.1 Components

1. **PointLight** at electrode tip — intensity mapped to `arc.amperage`
2. **Sprite** with `arc.frag.glsl` — radial glow, UV-based falloff
3. **UnrealBloomPass** in EffectComposer — threshold 0.7, strength 1.8, radius 0.4

#### 2.4.2 Arc Fragment Shader (core)

```glsl
// src/rendering/shaders/arc.frag.glsl
uniform float u_stability;
uniform float u_arcLength;
uniform float u_time;

varying vec2 vUv;

void main() {
  float d = length(vUv - vec2(0.5));
  float glow = exp(-d * 12.0) * u_stability;
  
  // Flicker: stability drives high-frequency noise
  float flicker = 1.0 - (1.0 - u_stability) * 0.4 * sin(u_time * 80.0);
  
  // Color: short arc = blue-white, long arc = yellow-orange
  vec3 shortColor = vec3(0.8, 0.9, 1.0);
  vec3 longColor  = vec3(1.0, 0.6, 0.1);
  float t = clamp(u_arcLength / 6.0, 0.0, 1.0);
  vec3 arcColor = mix(shortColor, longColor, t);
  
  gl_FragColor = vec4(arcColor * glow * flicker, glow);
}
```

---

### 2.5 Spatter System — `src/rendering/particles/SpatterSystem.tsx`

#### 2.5.1 Design

- `InstancedMesh` with 200 pre-instantiated sphere geometries (r=0.3mm)
- Each particle has: position, velocity, age, active flag
- Particles are emitted from arc tip position at random angles
- Gravity applied per frame; particles de-activate when `positionY < 0`
- Color: bright orange → dark grey as age increases

```typescript
interface SpatterParticle {
  active: boolean;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  age: number;        // seconds
  maxAge: number;     // 0.3–0.8s random
}
```

**Emission condition:** Called from `Scene.tsx` when `frameResult.spatterBurst === true`.

---

### 2.6 Audio Engine — `src/audio/AudioEngine.ts`

#### 2.6.1 Lifecycle

```typescript
class AudioEngine {
  private ctx: AudioContext | null = null;

  // Call on first user gesture (arc strike)
  init(): void {
    this.ctx = new AudioContext();
    this.buildGraph();
  }

  // Called every animation frame with current state
  update(arcLength: number, stability: number, amperage: number, isActive: boolean): void { ... }

  // Immediate silence on arc extinction (80ms ramp)
  suspend(): void { ... }
}
```

#### 2.6.2 AudioContext must be initialised on user gesture

The `strikeArc()` store action triggers `audioEngine.init()` on first call only. This satisfies browser autoplay policy.

---

### 2.7 HUD — `src/ui/HUD.tsx`

#### 2.7.1 Update Strategy

HUD components subscribe to Zustand store **directly** but updates are throttled:

```typescript
// Custom hook: returns value updated max 10 times per second
function useThrottledSelector<T>(selector: (s: WelderStore) => T, ms = 100): T {
  const value = useStore(selector);
  const [throttled, setThrottled] = useState(value);
  // ...debounce logic
  return throttled;
}
```

This prevents React re-renders from competing with the 60Hz render loop.

#### 2.7.2 HUD Layout Regions

```
┌────────────────────────────────────────────┐
│ [AmpGauge]      [QualityMeter]  [Session]  │  ← top bar
│                                            │
│                                            │
│            [3D Canvas]                     │
│                                            │
│                                            │
│ [ElectrodeBar] [ArcLength] [WorkAngle]     │  ← bottom bar
│                            [DragAngle]     │
│ [DefectAlert — center bottom overlay]      │
└────────────────────────────────────────────┘
```

All HUD elements are `position: absolute` over the canvas. Dark translucent backgrounds with monospace engineering aesthetic.

---

## 3. Input Pipeline Detail

### 3.1 Pointer Lock

```typescript
// src/input/MouseTracker.ts
canvas.addEventListener('click', () => canvas.requestPointerLock());

document.addEventListener('pointerlockchange', () => {
  isLocked = document.pointerLockElement === canvas;
});

document.addEventListener('mousemove', (e) => {
  if (!isLocked) return;
  rawDeltaX += e.movementX * MOUSE_SENSITIVITY;
  rawDeltaZ += e.movementY * MOUSE_SENSITIVITY;
});
```

`MOUSE_SENSITIVITY = 0.15` (mm per pixel of movement).

### 3.2 Key State

```typescript
// src/input/KeyboardTracker.ts
const keys: Record<string, boolean> = {};

window.addEventListener('keydown', e => { keys[e.code] = true; });
window.addEventListener('keyup',   e => { keys[e.code] = false; });

// Queried each frame in InputController
export const isHeld = (code: string) => keys[code] === true;
```

### 3.3 InputController — Per-Frame Update

```typescript
// src/input/InputController.ts
update(delta: number): Partial<InputState> {
  const dArc = (isHeld('KeyQ') ? -1 : isHeld('KeyE') ? 1 : 0) * ARC_RATE * delta;
  const dWork = (isHeld('KeyA') ? -1 : isHeld('KeyD') ? 1 : 0) * ANGLE_RATE * delta;
  const dDrag = (isHeld('KeyS') ? -1 : isHeld('KeyW') ? 1 : 0) * ANGLE_RATE * delta;

  const nextArc  = clamp(state.rawArcLength + dArc, 0, 8);
  const nextWork = clamp(state.rawWorkAngle + dWork, 60, 120);
  const nextDrag = clamp(state.rawDragAngle + dDrag, 50, 90);

  // Smooth travel speed from mouse delta
  const rawSpeed = Math.hypot(mouseDeltaX, mouseDeltaZ) / delta;
  const speed = lerp(state.travelSpeed, rawSpeed, 0.15);

  return { rawArcLength: nextArc, rawWorkAngle: nextWork, rawDragAngle: nextDrag, travelSpeed: speed, ... };
}
```

---

## 4. Scene Bootstrap — `src/rendering/Scene.tsx`

```tsx
export function Scene() {
  const commitFrame = useWelderStore(s => s.commitFrame);
  const physics = useRef(new PhysicsEngine());
  const audio = useRef(new AudioEngine());
  const input = useRef(new InputController());

  useFrame((_, delta) => {
    const store = useWelderStore.getState(); // Non-reactive read in hot path
    const inputUpdate = input.current.update(delta);
    
    // Commit input first
    commitFrame({ input: inputUpdate, electrode: {}, arc: {}, newWeldPoint: null, spatterBurst: false });
    
    // Run physics
    const result = physics.current.tick(delta, useWelderStore.getState());
    commitFrame(result);

    // Update audio
    const { arc } = useWelderStore.getState();
    audio.current.update(arc.arcLength, arc.stability, arc.amperage, arc.isActive);
  });

  return (
    <>
      <Workpiece />
      <ElectrodeModel />
      <ArcEffect />
      <DynamicWeldBead />
      <SpatterSystem />
      <ambientLight intensity={0.3} />
      <directionalLight position={[10, 20, 10]} castShadow />
      <OrbitControls enablePan={false} maxPolarAngle={Math.PI / 2.2} />
      <EffectComposer>
        <Bloom threshold={0.7} strength={1.8} radius={0.4} />
      </EffectComposer>
    </>
  );
}
```

**Critical:** `useWelderStore.getState()` is used in `useFrame` (not `useStore` hook) to avoid subscribing the frame loop to React re-renders.

---

## 5. Constants File

```typescript
// src/app/constants.ts

export const ELECTRODE_PROFILES = {
  E6013: {
    V0: 20,           // V
    k: 2.5,           // V/mm
    I_optimal: 100,   // A
    I_min: 70,
    I_max: 130,
    L_optimal: 3.2,   // mm
    L_max: 6.0,       // mm
    v_optimal: 2.5,   // mm/s (= 150mm/min)
    W_base: 8,        // mm bead width at optimal
    H_base: 2.5,      // mm bead height at optimal
    P_base: 2.0,      // mm penetration at optimal
    theta_work_opt: 90,  // degrees
    theta_drag_opt: 70,  // degrees
    K_melt: 0.003,    // mm/(A·s)
    initialLength: 350, // mm full rod
  }
} as const;

export const DRIFT_CONFIG = {
  school:       { freq: 0.20, arcLength: 0.2, workAngle: 1.5, dragAngle: 1.2 },
  professional: { freq: 0.35, arcLength: 0.5, workAngle: 3.5, dragAngle: 3.0 },
  expert:       { freq: 0.50, arcLength: 1.0, workAngle: 6.0, dragAngle: 5.5 },
} as const;

export const INPUT_RATES = {
  ARC_RATE: 0.5,   // mm/s per key hold
  ANGLE_RATE: 1.0, // °/s per key hold
  MOUSE_SENSITIVITY: 0.15, // mm per pixel
} as const;
```

---

## 6. Acceptance Criteria (MVP)

### Engine
- [ ] `PhysicsEngine.tick()` allocates zero objects in hot path (verified via Chrome DevTools Memory)
- [ ] Bead geometry updates without visible stutter at 60fps on Intel UHD 620
- [ ] Electrode length reaches 0 after ≈ 180 seconds at 100A (K_melt verified)
- [ ] Arc extinguishes correctly when `L_arc > 6mm`
- [ ] Electrode sticking triggers when `L_arc ≤ 0` for more than 2 consecutive frames

### Rendering
- [ ] Stamp count reaches 3000 without crash or geometry corruption
- [ ] Thermal cooling visually transitions from orange to grey-brown within 8 seconds
- [ ] Bloom post-process renders arc glow without bleeding onto HUD DOM elements
- [ ] Spatter particles land on workpiece surface (Y=0) and deactivate correctly

### Input
- [ ] Pointer lock engages on canvas click
- [ ] Q/E adjust arc length within clamped [0, 8mm] range
- [ ] W/S/A/D adjust angles within clamped ranges
- [ ] Input interpolation produces smooth value changes (no step artifacts)

### Audio
- [ ] Audio starts within one frame of arc strike (no perceptible delay)
- [ ] Filter frequency decreases audibly as arc length increases
- [ ] Audio stops within 80ms of arc extinction

### HUD
- [ ] All gauges update at ≥ 8Hz
- [ ] DefectAlert shows within 1 second of defect condition onset
- [ ] ElectrodeBar depletes proportionally to electrode.currentLength

### Post-Weld
- [ ] Heatmap view renders within 500ms of session end
- [ ] Color coding matches quality thresholds (Q > 0.8 = green, Q < 0.4 = red)
- [ ] Defect labels appear at correct world-space positions
