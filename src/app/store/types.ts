// src/app/store/types.ts — All domain type definitions for the Zustand store

// ---------------------------------------------------------------------------
// Primitive type aliases
// ---------------------------------------------------------------------------

export type ElectrodeType = 'E6013' | 'E7018';
export type DifficultyLevel = 'school' | 'professional' | 'expert';
export type DefectType =
  | 'undercut'
  | 'overlap'
  | 'porosity'
  | 'spatter'
  | 'incomplete_fusion'
  | 'burn_through'
  | 'none';
export type SessionPhase = 'setup' | 'welding' | 'heatmap';

// ---------------------------------------------------------------------------
// Domain state interfaces
// ---------------------------------------------------------------------------

/**
 * Electrode state — tracks consumable rod and sticking mechanic.
 * Per SDD-001 §2.1.2.
 */
export interface ElectrodeState {
  type: ElectrodeType;
  initialLength: number;   // mm — full rod length (350mm for 3.2mm E6013)
  currentLength: number;   // mm — depletes during welding
  remainingMass: number;  // 0.0 to 1.0 ratio of initial mass
  temperature: number;     // °C — simulated electrode temperature
  isStuck: boolean;        // true when electrode contacts workpiece and amperage too low
}

/**
 * Arc state — electrical and stability parameters.
 * Per SDD-001 §2.1.2.
 */
export interface ArcState {
  isActive: boolean;
  arcLength: number;       // mm — tip to workpiece distance
  voltage: number;        // V — computed: V0 + k * arcLength
  amperage: number;        // A — machine configuration (setup time)
  stability: number;       // 0.0–1.0 — gaussian product of arc length and amperage
}

/**
 * Input state — raw user input and drift-corrected applied values.
 * Per SDD-001 §2.1.2 and RFC-002 §7.
 */
export interface InputState {
  // Raw values — before drift injection
  rawArcLength: number;
  rawWorkAngle: number;
  rawDragAngle: number;
  rawPositionX: number;
  rawPositionZ: number;

  // Applied values — after drift system
  arcLength: number;
  workAngle: number;
  dragAngle: number;
  positionX: number;
  positionZ: number;

  // Computed
  travelSpeed: number;     // mm/s — derived from mouse delta per frame
}

/**
 * A single weld stamp deposited on the workpiece.
 * Per SDD-001 §2.1.2.
 */
export interface WeldPoint {
  position: [number, number, number]; // [x, y, z] world coords
  width: number;         // mm — bead cross-section width
  height: number;        // mm — bead cross-section height
  penetration: number;   // mm — depth into workpiece
  coolingProgress: number; // 0.0 (incandescent) → 1.0 (cooled slag)
  instantQuality: number; // Q factor [0.0–1.0]
  defect: DefectType;
}

/**
 * Weld session state — tracks the entire welding session.
 * Per SDD-001 §2.1.2.
 */
export interface SessionState {
  phase: SessionPhase;
  difficulty: DifficultyLevel;
  elapsedTime: number;    // seconds since arc strike
  weldPoints: WeldPoint[];
  averageQuality: number; // rolling mean Q
  worstDefect: DefectType;
}

// ---------------------------------------------------------------------------
// Frame result — atomic physics engine output
// ---------------------------------------------------------------------------

/**
 * FrameResult is the atomic output of PhysicsEngine.tick().
 * Passed to store.commitFrame() for atomic store update.
 * Per SDD-001 §2.1.2 and §2.2.1.
 */
export interface FrameResult {
  electrode: Partial<ElectrodeState>;
  arc: Partial<ArcState>;
  input: Partial<InputState>;
  newWeldPoint: WeldPoint | null;
  spatterBurst: boolean;
}

// ---------------------------------------------------------------------------
// Store interface (shape only — actions defined in slices)
// ---------------------------------------------------------------------------

export interface WelderStore {
  // State slices
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