// src/app/store/slices/electrodeSlice.ts — Electrode state slice: consumption, temperature, stick condition

import type { ElectrodeState } from '../types';
import { ELECTRODE_PROFILES } from '../../constants';

/**
 * Compute initial mass from rod length.
 * Density of mild steel ~7.85 g/cm³, cross-section area derived from diameter.
 * Using 3.2mm diameter rod: A = π*(1.6mm)² = π*2.56mm² ≈ 8.04mm² = 0.0804cm²
 * Volume = 350mm * 0.0804cm² = 28.14cm³
 * Mass = 28.14cm³ * 7.85g/cm³ ≈ 221g (rounded to 1dp)
 *
 * We approximate remainingMass using density*length relationship.
 * For simplicity, we store mass in grams proportional to currentLength.
 * 350mm → ~220g, ratio applied per unit mm.
 */
const DENSITY_MILD_STEEL_G_PER_CM3 = 7.85;
const ROD_DIAMETER_MM = 3.2;
const CROSS_SECTION_CM2 = Math.PI * Math.pow(ROD_DIAMETER_MM / 2, 2) / 100; // mm²→cm²
const GRAMS_PER_MM = (DENSITY_MILD_STEEL_G_PER_CM3 * CROSS_SECTION_CM2) / 10; // per mm → g/mm

function computeRemainingMass(currentLength: number): number {
  return Math.round(currentLength * GRAMS_PER_MM * 10) / 10;
}

function getInitialState(): ElectrodeState {
  const profile = ELECTRODE_PROFILES['E6013'];
  return {
    type: 'E6013',
    initialLength: profile.initialLength,
    currentLength: profile.initialLength,
    remainingMass: computeRemainingMass(profile.initialLength),
    temperature: 0,
    isStuck: false,
  };
}

export interface ElectrodeSlice {
  electrode: ElectrodeState;
  setAmperage: (amperage: number) => void;
  unstickElectrode: () => void;
  commitElectrode: (partial: Partial<ElectrodeState>) => void;
}

export function createElectrodeSlice(): ElectrodeSlice {
  return {
    electrode: getInitialState(),

    setAmperage(amperage: number): void {
      const profile =
        ELECTRODE_PROFILES[this.electrode.type as keyof typeof ELECTRODE_PROFILES] ?? ELECTRODE_PROFILES['E6013'];
      const clampedAmperage = Math.max(profile.I_min, Math.min(profile.I_max, amperage));
      // Temperature: deviation from I_optimal drives heating
      const dev = Math.abs(clampedAmperage - profile.I_optimal) / (profile.I_max - profile.I_min);
      const tempDelta = dev * 0.1; // mild thermal accumulation
      this.electrode.temperature = Math.max(0, Math.min(1, this.electrode.temperature + tempDelta));
    },

    unstickElectrode(): void {
      if (!this.electrode.isStuck) return;
      this.electrode.isStuck = false;
      this.electrode.temperature = Math.max(this.electrode.temperature - 0.3, 0);
    },

    commitElectrode(partial: Partial<ElectrodeState>): void {
      this.electrode = { ...this.electrode, ...partial };
    },
  };
}

// Named export per D-04
export const electrodeSlice = createElectrodeSlice();
