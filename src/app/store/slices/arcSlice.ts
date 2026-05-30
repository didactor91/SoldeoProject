// src/app/store/slices/arcSlice.ts — Arc state slice: strike, extinguish, voltage computation

import type { ArcState, ArcResult } from '../types';
import { ELECTRODE_PROFILES } from '../../constants';

function getInitialArcState(): ArcState {
  return {
    isActive: false,
    arcLength: 0,
    voltage: 0,
    amperage: 0,
    stability: 0,
    lastSpatterBurst: false,
  };
}

export interface ArcSlice {
  arc: ArcState;
  strikeArc: (electrodeState: { isStuck: boolean; currentLength: number; type: string }) => void;
  extinguishArc: () => void;
  updateArc: (partial: Partial<ArcState>) => void;
  commitArc: (result: ArcResult) => void;
}

export function createArcSlice(): ArcSlice {
  return {
    arc: getInitialArcState(),

    strikeArc(electrodeState): void {
      if (electrodeState.currentLength <= 0) return;
      if (electrodeState.isStuck) return;

      const profile =
        ELECTRODE_PROFILES[electrodeState.type as keyof typeof ELECTRODE_PROFILES] ?? ELECTRODE_PROFILES['E6013'];

      this.arc.isActive = true;
      this.arc.arcLength = profile.L_optimal;
      this.arc.amperage = profile.I_optimal;
      this.arc.stability = 0.5;
    },

    extinguishArc(): void {
      this.arc.isActive = false;
      this.arc.arcLength = 0;
      this.arc.voltage = 0;
      this.arc.stability = 0;
    },

    updateArc(partial: Partial<ArcState>): void {
      this.arc = { ...this.arc, ...partial };
    },

    commitArc(result: ArcResult): void {
      this.arc.isActive = result.isActive;
      this.arc.arcLength = Math.max(0, result.arcLength);
      this.arc.voltage = result.voltage;
      this.arc.stability = result.stability;
    },
  };
}

export const arcSlice = createArcSlice();
