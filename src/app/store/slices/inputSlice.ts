// src/app/store/slices/inputSlice.ts — Input state slice: clamped values, travel speed computation

import type { InputState, RawInputState } from '../types';
import { ELECTRODE_PROFILES } from '../../constants';

// Physical clamping bounds
const WORK_ANGLE_MIN = 60;
const WORK_ANGLE_MAX = 120;
const DRAG_ANGLE_MIN = 40;
const DRAG_ANGLE_MAX = 90;
const POSITION_X_MIN = -50;
const POSITION_X_MAX = 50;
const POSITION_Z_MIN = -200;
const POSITION_Z_MAX = 200;

function getInitialInputState(): InputState {
  return {
    rawArcLength: 0,
    rawWorkAngle: 0,
    rawDragAngle: 0,
    rawPositionX: 0,
    rawPositionZ: 0,
    arcLength: 3.2, // L_optimal for E6013
    workAngle: 90,
    dragAngle: 70,
    positionX: 0,
    positionZ: 0,
    travelSpeed: 0,
  };
}

export interface InputSlice {
  input: InputState;
  updateRawInput: (raw: Partial<RawInputState>) => void;
  applyClamping: (electrodeType: string) => void;
  computeTravelSpeed: (prevX: number, prevZ: number, delta: number) => void;
  commitInput: (state: InputState) => void;
}

export function createInputSlice(): InputSlice {
  return {
    input: getInitialInputState(),

    updateRawInput(raw: Partial<RawInputState>): void {
      if (raw.rawArcLength !== undefined) this.input.rawArcLength = raw.rawArcLength;
      if (raw.rawWorkAngle !== undefined) this.input.rawWorkAngle = raw.rawWorkAngle;
      if (raw.rawDragAngle !== undefined) this.input.rawDragAngle = raw.rawDragAngle;
      if (raw.rawPositionX !== undefined) this.input.rawPositionX = raw.rawPositionX;
      if (raw.rawPositionZ !== undefined) this.input.rawPositionZ = raw.rawPositionZ;
    },

    applyClamping(electrodeType: string): void {
      const profile =
        ELECTRODE_PROFILES[electrodeType as keyof typeof ELECTRODE_PROFILES] ?? ELECTRODE_PROFILES['E6013'];
      const L_max = profile.L_max;

      this.input.arcLength = Math.max(0, Math.min(L_max, this.input.rawArcLength));
      this.input.workAngle = Math.max(WORK_ANGLE_MIN, Math.min(WORK_ANGLE_MAX, this.input.rawWorkAngle));
      this.input.dragAngle = Math.max(DRAG_ANGLE_MIN, Math.min(DRAG_ANGLE_MAX, this.input.rawDragAngle));
      this.input.positionX = Math.max(POSITION_X_MIN, Math.min(POSITION_X_MAX, this.input.rawPositionX));
      this.input.positionZ = Math.max(POSITION_Z_MIN, Math.min(POSITION_Z_MAX, this.input.rawPositionZ));
    },

    computeTravelSpeed(prevX: number, prevZ: number, delta: number): void {
      if (delta <= 0) {
        this.input.travelSpeed = 0;
        return;
      }
      const dx = this.input.positionX - prevX;
      const dz = this.input.positionZ - prevZ;
      const distance = Math.sqrt(dx * dx + dz * dz);
      this.input.travelSpeed = Math.max(0, distance / delta);
    },

    commitInput(state: InputState): void {
      this.input = { ...state };
    },
  };
}

// Named export for store composition
export const inputSlice = createInputSlice();
