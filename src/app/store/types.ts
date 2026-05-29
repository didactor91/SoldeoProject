// src/app/store/types.ts — Core state types for SMAW simulator
// Pure TypeScript — zero allocations, no framework imports

/**
 * Weld defect types per RFC-002 §5.3 Defect Conditions table.
 */
export type DefectType =
  | 'none'
  | 'undercut'
  | 'overlap'
  | 'porosity'
  | 'spatter'
  | 'incomplete_fusion'
  | 'burn_through';

/**
 * Raw user input before clamping/rate limiting.
 */
export interface RawInputState {
  rawArcLength: number;
  rawWorkAngle: number;
  rawDragAngle: number;
  rawPositionX: number;
  rawPositionZ: number;
}

/**
 * Clamped and rate-limited input state.
 * Per RFC-002 §4.
 */
export interface InputState extends RawInputState {
  arcLength: number;
  workAngle: number;
  dragAngle: number;
  positionX: number;
  positionZ: number;
  travelSpeed: number;
}

/**
 * Arc electrical and stability state.
 */
export interface ArcState {
  isActive: boolean;
  arcLength: number;
  voltage: number;
  amperage: number;
  stability: number;
}

/**
 * Electrode consumption and thermal state.
 */
export interface ElectrodeState {
  type: string;
  initialLength: number;
  currentLength: number;
  remainingMass: number;
  temperature: number;
  isStuck: boolean;
}

/**
 * Drift difficulty levels per RFC-002 §6.2.
 */
export type DifficultyLevel = 'school' | 'professional' | 'expert';

/**
 * Partial arc state returned by evaluate().
 * Allows incremental updates.
 */
export type PartialArcState = Partial<ArcState>;

/**
 * Electrode type identifiers per AWS A5.1 specification.
 */
export type ElectrodeType = 'E6013' | 'E7018';

/**
 * Weld session phase.
 */
export type SessionPhase = 'setup' | 'welding' | 'heatmap';

/**
 * A single weld point in the weld bead.
 */
export interface WeldPoint {
  position: [number, number, number];
  width: number;
  height: number;
  penetration: number;
  coolingProgress: number;
  instantQuality: number;
  defect: DefectType;
}

/**
 * Session state — tracks overall weld session progress.
 */
export interface SessionState {
  phase: SessionPhase;
  difficulty: DifficultyLevel;
  elapsedTime: number;
  weldPoints: WeldPoint[];
  averageQuality: number;
  worstDefect: DefectType;
}

/**
 * Frame result returned by PhysicsEngine.tick() each frame.
 * Contains all computed values for one simulation step.
 */
export interface FrameResult {
  electrode: Partial<ElectrodeState>;
  arc: Partial<ArcState>;
  input: InputState;
  newWeldPoint: WeldPoint | null;
  spatterBurst: boolean;
}

/**
 * WelderStore — the full application state store.
 * Coordinates all engine subsystems and UI actions.
 */
export interface WelderStore {
  electrode: ElectrodeState;
  arc: ArcState;
  input: InputState;
  session: SessionState;
  setAmperage: (amperage: number) => void;
  setDifficulty: (difficulty: DifficultyLevel) => void;
  strikeArc: () => void;
  extinguishArc: () => void;
  unstickElectrode: () => void;
  commitFrame: (frame: FrameResult) => void;
  endWeldSession: () => void;
  resetSession: () => void;
}