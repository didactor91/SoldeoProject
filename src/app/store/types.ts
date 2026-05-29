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
 * Partial arc state returned by evaluate().
 * Allows incremental updates.
 */
export type Partial<T> = Partial<ArcState>;