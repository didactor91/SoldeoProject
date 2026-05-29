// src/app/store/index.test.ts — Store assembly integration tests
import { describe, it, expect, beforeEach } from 'vitest';
import { useWelderStore, getWelderStore } from './index';
import type { FrameResult } from './types';

function makeMinimalFrameResult(overrides: Partial<FrameResult> = {}): FrameResult {
  return {
    electrode: {},
    arc: { arcLength: 0, voltage: 0, stability: 0, isActive: false },
    input: {
      rawArcLength: 0, rawWorkAngle: 0, rawDragAngle: 0, rawPositionX: 0, rawPositionZ: 0,
      arcLength: 0, workAngle: 0, dragAngle: 0, positionX: 0, positionZ: 0, travelSpeed: 0,
    },
    newWeldPoint: null,
    spatterBurst: false,
    ...overrides,
  };
}

describe('useWelderStore', () => {
  beforeEach(() => {
    useWelderStore.getState().resetSession();
  });

  describe('initial state', () => {
    it('has all four state slices', () => {
      const state = useWelderStore.getState();
      expect(state).toHaveProperty('electrode');
      expect(state).toHaveProperty('arc');
      expect(state).toHaveProperty('input');
      expect(state).toHaveProperty('session');
    });

    it('electrode has E6013 defaults', () => {
      const state = useWelderStore.getState();
      expect(state.electrode.type).toBe('E6013');
      expect(state.electrode.isStuck).toBe(false);
      expect(state.electrode.temperature).toBe(0);
    });

    it('arc is extinguished', () => {
      const state = useWelderStore.getState();
      expect(state.arc.isActive).toBe(false);
      expect(state.arc.arcLength).toBe(0);
    });

    it('session is in setup phase with school difficulty', () => {
      const state = useWelderStore.getState();
      expect(state.session.phase).toBe('setup');
      expect(state.session.difficulty).toBe('school');
      expect(state.session.weldPoints).toEqual([]);
    });
  });

  describe('electrode actions', () => {
    it('setAmperage updates electrode temperature without throwing', () => {
      const state = useWelderStore.getState();
      state.setAmperage(70);
      expect(useWelderStore.getState().electrode.type).toBe('E6013');
    });

    it('unstickElectrode clears stuck flag', () => {
      const state = useWelderStore.getState();
      useWelderStore.setState({ electrode: { ...state.electrode, isStuck: true } });
      state.unstickElectrode();
      expect(useWelderStore.getState().electrode.isStuck).toBe(false);
    });
  });

  describe('arc actions', () => {
    it('strikeArc activates arc when conditions are met', () => {
      const state = useWelderStore.getState();
      useWelderStore.setState({
        electrode: { ...state.electrode, isStuck: false, currentLength: 350 },
      });
      state.strikeArc();
      expect(useWelderStore.getState().arc.isActive).toBe(true);
    });

    it('strikeArc is blocked when electrode is stuck', () => {
      // Reset arc to extinguished BEFORE testing guard (previous test left arc.isActive=true)
      useWelderStore.setState({
        arc: { isActive: false, arcLength: 0, voltage: 0, amperage: 100, stability: 0 },
        electrode: { isStuck: true, currentLength: 350, type: 'E6013', initialLength: 350, remainingMass: 1, temperature: 0 },
      });
      useWelderStore.getState().strikeArc();
      expect(useWelderStore.getState().arc.isActive).toBe(false);
    });

    it('strikeArc is blocked when electrode is depleted', () => {
      // Reset arc to extinguished BEFORE testing guard (previous test left arc.isActive=true)
      useWelderStore.setState({
        arc: { isActive: false, arcLength: 0, voltage: 0, amperage: 100, stability: 0 },
        electrode: { isStuck: false, currentLength: 0, type: 'E6013', initialLength: 350, remainingMass: 0, temperature: 0 },
      });
      useWelderStore.getState().strikeArc();
      expect(useWelderStore.getState().arc.isActive).toBe(false);
    });

    it('extinguishArc deactivates arc', () => {
      const state = useWelderStore.getState();
      useWelderStore.setState({
        arc: { ...state.arc, isActive: true, arcLength: 3.2, voltage: 28, stability: 0.8 },
      });
      state.extinguishArc();
      const next = useWelderStore.getState().arc;
      expect(next.isActive).toBe(false);
      expect(next.arcLength).toBe(0);
      expect(next.voltage).toBe(0);
      expect(next.stability).toBe(0);
    });

    it('extinguishArc preserves amperage', () => {
      useWelderStore.setState({ arc: { isActive: true, arcLength: 3.2, voltage: 28, amperage: 100, stability: 0.8 } });
      useWelderStore.getState().extinguishArc();
      expect(useWelderStore.getState().arc.amperage).toBe(100);
    });
  });

  describe('session actions', () => {
    it('setDifficulty changes difficulty and transitions to welding', () => {
      useWelderStore.getState().setDifficulty('expert');
      const state = useWelderStore.getState();
      expect(state.session.difficulty).toBe('expert');
      expect(state.session.phase).toBe('welding');
    });

    it('setDifficulty is blocked during welding', () => {
      useWelderStore.setState({ session: { ...useWelderStore.getState().session, phase: 'welding' } });
      const state = useWelderStore.getState();
      const prevDifficulty = state.session.difficulty;
      state.setDifficulty('professional');
      expect(useWelderStore.getState().session.difficulty).toBe(prevDifficulty);
    });

    it('resetSession returns to initial state', () => {
      useWelderStore.setState({
        session: {
          phase: 'welding',
          difficulty: 'expert',
          elapsedTime: 120,
          weldPoints: [],
          averageQuality: 0.9,
          worstDefect: 'none' as const,
        },
      });
      useWelderStore.getState().resetSession();
      const state = useWelderStore.getState().session;
      expect(state.phase).toBe('setup');
      expect(state.difficulty).toBe('school');
      expect(state.elapsedTime).toBe(0);
    });
  });

  describe('commitFrame', () => {
    it('updates all slices from FrameResult', () => {
      useWelderStore.getState().setDifficulty('professional');
      useWelderStore.getState().setAmperage(100);

      const frame: FrameResult = {
        electrode: {},
        arc: { arcLength: 3.5, voltage: 30, stability: 0.9, isActive: true },
        input: {
          rawArcLength: 3.5, rawWorkAngle: 85, rawDragAngle: 65, rawPositionX: 5, rawPositionZ: 10,
          arcLength: 3.5, workAngle: 85, dragAngle: 65, positionX: 5, positionZ: 10, travelSpeed: 100,
        },
        newWeldPoint: null,
        spatterBurst: false,
      };

      useWelderStore.getState().commitFrame(frame);

      const state = useWelderStore.getState();
      expect(state.arc.arcLength).toBe(3.5);
      expect(state.arc.voltage).toBe(30);
      expect(state.input.arcLength).toBe(3.5);
    });

    it('appends weld point when provided', () => {
      useWelderStore.getState().setDifficulty('school');
      const frame = makeMinimalFrameResult({
        newWeldPoint: {
          position: [1, 2, 3],
          width: 8,
          height: 2.5,
          penetration: 2.0,
          coolingProgress: 0,
          instantQuality: 0.9,
          defect: 'none',
        },
      });

      useWelderStore.getState().commitFrame(frame);

      const state = useWelderStore.getState();
      expect(state.session.weldPoints.length).toBe(1);
      expect(state.session.weldPoints[0].instantQuality).toBe(0.9);
    });

    it('does not append weld point when null', () => {
      useWelderStore.getState().setDifficulty('school');
      useWelderStore.getState().commitFrame(makeMinimalFrameResult({ newWeldPoint: null }));
      expect(useWelderStore.getState().session.weldPoints.length).toBe(0);
    });
  });

  describe('getWelderStore', () => {
    it('getState() returns fully populated state', () => {
      const state = getWelderStore.getState();
      expect(state.electrode).toBeDefined();
      expect(state.arc).toBeDefined();
      expect(state.input).toBeDefined();
      expect(state.session).toBeDefined();
    });

    it('getState() returns same reference as useWelderStore.getState()', () => {
      expect(getWelderStore.getState()).toBe(useWelderStore.getState());
    });
  });
});
