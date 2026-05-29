// src/app/store/slices/sessionSlice.ts — Session state slice: phase, difficulty, quality tracking

import type { SessionState, WeldPoint, DifficultyLevel, SessionPhase } from '../types';

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

export interface SessionSlice {
  session: SessionState;
  setPhase: (phase: SessionPhase) => void;
  setDifficulty: (difficulty: DifficultyLevel) => void;
  addWeldPoint: (point: WeldPoint) => void;
  updateQuality: () => void;
  endWeldSession: () => void;
  resetSession: () => void;
  commitFrame: (delta: number, newWeldPoint: WeldPoint | null) => void;
}

export function createSessionSlice(): SessionSlice {
  return {
    session: getInitialSessionState(),

    setPhase(phase: SessionPhase): void {
      this.session.phase = phase;
    },

    setDifficulty(difficulty: DifficultyLevel): void {
      if (this.session.phase === 'welding') return; // cannot change mid-weld
      this.session.difficulty = difficulty;
      this.session.phase = 'welding';
    },

    addWeldPoint(point: WeldPoint): void {
      this.session.weldPoints.push(point);
    },

    updateQuality(): void {
      const pts = this.session.weldPoints;
      if (pts.length === 0) {
        this.session.averageQuality = 0;
        this.session.worstDefect = 'none';
        return;
      }
      const sum = pts.reduce((acc, p) => acc + p.instantQuality, 0);
      this.session.averageQuality = sum / pts.length;
      // Find worst defect (severity: none < porosity < overlap < undercut < ... use index ordering)
      const defectSeverity: Record<string, number> = {
        none: 0,
        porosity: 1,
        overlap: 2,
        undercut: 3,
        incomplete_fusion: 4,
        burn_through: 5,
        spatter: 6,
      };
      let worst = pts[0].defect;
      let maxSev = defectSeverity[worst] ?? 0;
      for (let i = 1; i < pts.length; i++) {
        const sev = defectSeverity[pts[i].defect] ?? 0;
        if (sev > maxSev) {
          maxSev = sev;
          worst = pts[i].defect;
        }
      }
      this.session.worstDefect = worst;
    },

    endWeldSession(): void {
      this.session.phase = 'heatmap';
      this.updateQuality();
    },

    resetSession(): void {
      this.session = getInitialSessionState();
    },

    commitFrame(delta: number, newWeldPoint: WeldPoint | null): void {
      // Increment elapsed time only during welding
      if (this.session.phase === 'welding') {
        this.session.elapsedTime += delta;
      }
      // Append weld point if provided
      if (newWeldPoint !== null) {
        this.addWeldPoint(newWeldPoint);
        this.updateQuality();
      }
    },
  };
}

// Named export for store composition
export const sessionSlice = createSessionSlice();
