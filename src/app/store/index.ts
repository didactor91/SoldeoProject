// src/app/store/index.ts — Zustand store assembly: combines all slices into WelderStore

import { create } from 'zustand';
import type { WelderStore, FrameResult, DifficultyLevel, ElectrodeState, ArcState, InputState, SessionState } from './types';
import { ELECTRODE_PROFILES } from '../constants';

function getInitialElectrodeState(): ElectrodeState {
  const profile = ELECTRODE_PROFILES['E6013'];
  return {
    type: 'E6013',
    initialLength: profile.initialLength,
    currentLength: profile.initialLength,
    remainingMass: profile.initialLength * 0.6,
    temperature: 0,
    isStuck: false,
  };
}

function getInitialArcState(): ArcState {
  return {
    isActive: false,
    arcLength: 0,
    voltage: 0,
    amperage: 0,
    stability: 0,
  };
}

function getInitialInputState(): InputState {
  return {
    rawArcLength: 0,
    rawWorkAngle: 0,
    rawDragAngle: 0,
    rawPositionX: 0,
    rawPositionZ: 0,
    arcLength: 3.2,
    workAngle: 90,
    dragAngle: 70,
    positionX: 0,
    positionZ: 0,
    travelSpeed: 0,
  };
}

function getInitialSessionState(): SessionState {
  return {
    phase: 'setup',
    difficulty: 'school',
    elapsedTime: 0,
    weldPoints: [],
    averageQuality: 0,
    worstDefect: 'none',
  };
}


export const useWelderStore = create<WelderStore>()((set, get) => {
  // Track current amperage setting across strikeArc calls
  let currentAmperage = 100;

  return {
    // --- State ---
    electrode: getInitialElectrodeState(),
    arc: getInitialArcState(),
    input: getInitialInputState(),
    session: getInitialSessionState(),

    // --- Electrode actions ---
    setAmperage(amperage: number): void {
      const profile =
        ELECTRODE_PROFILES[get().electrode.type as keyof typeof ELECTRODE_PROFILES] ?? ELECTRODE_PROFILES['E6013'];
      const clamped = Math.max(profile.I_min, Math.min(profile.I_max, amperage));
      currentAmperage = clamped;
      const dev = Math.abs(clamped - profile.I_optimal) / (profile.I_max - profile.I_min);
      const tempDelta = dev * 0.1;
      set(state => ({
        electrode: {
          ...state.electrode,
          temperature: Math.max(0, Math.min(1, state.electrode.temperature + tempDelta)),
        },
      }));
    },

    unstickElectrode(): void {
      set(state => ({
        electrode: {
          ...state.electrode,
          isStuck: false,
          temperature: Math.max(0, state.electrode.temperature - 0.3),
        },
      }));
    },

    // --- Arc actions ---
    strikeArc(): void {
      const elec = get().electrode;
      if (elec.currentLength <= 0) return;
      if (elec.isStuck) return;

      const profile =
        ELECTRODE_PROFILES[elec.type as keyof typeof ELECTRODE_PROFILES] ?? ELECTRODE_PROFILES['E6013'];

      set(state => ({
        arc: {
          ...state.arc,
          isActive: true,
          arcLength: profile.L_optimal,
          amperage: currentAmperage,
          stability: 0.5,
        },
      }));
    },

    extinguishArc(): void {
      set(state => ({
        arc: {
          ...state.arc,
          isActive: false,
          arcLength: 0,
          voltage: 0,
          stability: 0,
        },
      }));
    },

    // --- Session actions ---
    setDifficulty(difficulty: DifficultyLevel): void {
      const phase = get().session.phase;
      if (phase === 'welding') return;
      set(state => ({
        session: { ...state.session, difficulty, phase: 'welding' },
      }));
    },

    endWeldSession(): void {
      set(state => {
        const pts = state.session.weldPoints;
        let avg = 0;
        let worst: 'none' | 'undercut' | 'overlap' | 'porosity' | 'spatter' | 'incomplete_fusion' | 'burn_through' = 'none';
        if (pts.length > 0) {
          const sum = pts.reduce((a, p) => a + p.instantQuality, 0);
          avg = sum / pts.length;
          const defectSeverity: Record<string, number> = {
            none: 0, porosity: 1, overlap: 2, undercut: 3, incomplete_fusion: 4, burn_through: 5, spatter: 6,
          };
          worst = pts[0].defect;
          let maxSev = defectSeverity[worst] ?? 0;
          for (let i = 1; i < pts.length; i++) {
            const sev = defectSeverity[pts[i].defect] ?? 0;
            if (sev > maxSev) {
              maxSev = sev;
              worst = pts[i].defect;
            }
          }
        }
        return {
          session: { ...state.session, phase: 'heatmap', averageQuality: avg, worstDefect: worst },
        };
      });
    },

    resetSession(): void {
      set({
        session: getInitialSessionState(),
      });
    },

    // --- commitFrame: updates from PhysicsEngine output ---
    commitFrame(frame: FrameResult): void {
      set(state => {
        // 1. Merge electrode partial from engine
        const newElectrode = frame.electrode ? { ...state.electrode, ...frame.electrode } : state.electrode;

        // 2. Update arc from engine output
        const newArc: ArcState = {
          ...state.arc,
          isActive: frame.arc.isActive,
          arcLength: frame.arc.arcLength,
          voltage: frame.arc.voltage,
          stability: frame.arc.stability,
        };

        // 3. Update input from engine output
        const newInput: InputState = { ...frame.input };

        // 4. Session: append weld point, track elapsed time
        let newElapsed = state.session.elapsedTime;
        const newWeldPoints = [...state.session.weldPoints];
        let newAvg = state.session.averageQuality;
        let newWorst = state.session.worstDefect;
        if (state.session.phase === 'welding') {
          newElapsed += 0; // delta passed separately in real code
        }
        if (frame.newWeldPoint !== null) {
          newWeldPoints.push(frame.newWeldPoint);
          if (newWeldPoints.length > 0) {
            const sum = newWeldPoints.reduce((a, p) => a + p.instantQuality, 0);
            newAvg = sum / newWeldPoints.length;
            const defectSeverity: Record<string, number> = {
              none: 0, porosity: 1, overlap: 2, undercut: 3, incomplete_fusion: 4, burn_through: 5, spatter: 6,
            };
            newWorst = newWeldPoints[0].defect;
            let maxSev = defectSeverity[newWorst] ?? 0;
            for (let i = 1; i < newWeldPoints.length; i++) {
              const sev = defectSeverity[newWeldPoints[i].defect] ?? 0;
              if (sev > maxSev) {
                maxSev = sev;
                newWorst = newWeldPoints[i].defect;
              }
            }
          }
        }

        const newSession: SessionState = {
          ...state.session,
          elapsedTime: newElapsed,
          weldPoints: newWeldPoints,
          averageQuality: newAvg,
          worstDefect: newWorst,
        };

        return {
          electrode: newElectrode,
          arc: newArc,
          input: newInput,
          session: newSession,
        };
      });
    },
  };
});

export const getWelderStore = useWelderStore;
