// src/app/store/slices/sessionSlice.test.ts — Session slice action tests
import { describe, it, expect, beforeEach } from 'vitest';
import { createSessionSlice, type SessionSlice } from './sessionSlice';
import type { WeldPoint } from '../types';

function makeWeldPoint(quality: number, defect: 'none' | 'porosity' | 'undercut' = 'none'): WeldPoint {
  return {
    position: [0, 0, 0],
    width: 8,
    height: 2.5,
    penetration: 2.0,
    coolingProgress: 0,
    instantQuality: quality,
    defect,
  };
}

describe('sessionSlice', () => {
  let slice: SessionSlice;

  beforeEach(() => {
    slice = createSessionSlice();
  });

  describe('initial state', () => {
    it('phase is setup', () => {
      expect(slice.session.phase).toBe('setup');
    });

    it('difficulty is school', () => {
      expect(slice.session.difficulty).toBe('school');
    });

    it('elapsedTime is 0', () => {
      expect(slice.session.elapsedTime).toBe(0);
    });

    it('weldPoints is empty', () => {
      expect(slice.session.weldPoints).toEqual([]);
    });

    it('averageQuality is 0', () => {
      expect(slice.session.averageQuality).toBe(0);
    });

    it('worstDefect is none', () => {
      expect(slice.session.worstDefect).toBe('none');
    });
  });

  describe('setPhase', () => {
    it('transitions to welding', () => {
      slice.setPhase('welding');
      expect(slice.session.phase).toBe('welding');
    });

    it('transitions to heatmap', () => {
      slice.setPhase('heatmap');
      expect(slice.session.phase).toBe('heatmap');
    });
  });

  describe('setDifficulty', () => {
    it('changes difficulty during setup', () => {
      slice.setDifficulty('expert');
      expect(slice.session.difficulty).toBe('expert');
    });

    it('transitions phase to welding on difficulty change', () => {
      slice.setDifficulty('professional');
      expect(slice.session.phase).toBe('welding');
    });

    it('blocks difficulty change during welding', () => {
      slice.session.phase = 'welding';
      const prevDifficulty = slice.session.difficulty;
      slice.setDifficulty('expert');
      expect(slice.session.difficulty).toBe(prevDifficulty);
      expect(slice.session.phase).toBe('welding');
    });

    it('allows changedifficulty during heatmap', () => {
      slice.session.phase = 'heatmap';
      slice.setDifficulty('expert');
      expect(slice.session.difficulty).toBe('expert');
    });
  });

  describe('addWeldPoint', () => {
    it('appends weld point to array', () => {
      slice.addWeldPoint(makeWeldPoint(1.0));
      expect(slice.session.weldPoints.length).toBe(1);
    });

    it('accumulates multiple weld points', () => {
      slice.addWeldPoint(makeWeldPoint(1.0));
      slice.addWeldPoint(makeWeldPoint(0.8));
      slice.addWeldPoint(makeWeldPoint(0.6));
      expect(slice.session.weldPoints.length).toBe(3);
    });
  });

  describe('updateQuality', () => {
    it('computes average quality from weld points', () => {
      slice.addWeldPoint(makeWeldPoint(1.0));
      slice.addWeldPoint(makeWeldPoint(0.6));
      slice.updateQuality();
      expect(slice.session.averageQuality).toBeCloseTo(0.8, 5);
    });

    it('returns 0 average when no weld points', () => {
      slice.updateQuality();
      expect(slice.session.averageQuality).toBe(0);
    });

    it('identifies worst defect by severity', () => {
      slice.addWeldPoint(makeWeldPoint(1.0, 'none'));
      slice.addWeldPoint(makeWeldPoint(0.9, 'porosity'));
      slice.addWeldPoint(makeWeldPoint(0.8, 'undercut'));
      slice.updateQuality();
      expect(slice.session.worstDefect).toBe('undercut');
    });
  });

  describe('endWeldSession', () => {
    it('transitions phase to heatmap', () => {
      slice.session.phase = 'welding';
      slice.endWeldSession();
      expect(slice.session.phase).toBe('heatmap');
    });

    it('computes final average quality', () => {
      slice.addWeldPoint(makeWeldPoint(1.0));
      slice.addWeldPoint(makeWeldPoint(0.4));
      slice.endWeldSession();
      expect(slice.session.averageQuality).toBeCloseTo(0.7, 5);
    });
  });

  describe('resetSession', () => {
    it('resets all fields to initial state', () => {
      slice.session.phase = 'welding';
      slice.session.difficulty = 'expert';
      slice.session.elapsedTime = 120;
      slice.session.weldPoints.push(makeWeldPoint(0.9));
      slice.session.averageQuality = 0.9;
      slice.session.worstDefect = 'undercut';

      slice.resetSession();

      expect(slice.session.phase).toBe('setup');
      expect(slice.session.difficulty).toBe('school');
      expect(slice.session.elapsedTime).toBe(0);
      expect(slice.session.weldPoints).toEqual([]);
      expect(slice.session.averageQuality).toBe(0);
      expect(slice.session.worstDefect).toBe('none');
    });
  });

  describe('commitFrame', () => {
    it('increments elapsedTime during welding', () => {
      slice.session.phase = 'welding';
      slice.commitFrame(0.016, null);
      expect(slice.session.elapsedTime).toBeCloseTo(0.016, 5);
    });

    it('does not increment elapsedTime during setup', () => {
      slice.session.phase = 'setup';
      slice.commitFrame(0.016, null);
      expect(slice.session.elapsedTime).toBe(0);
    });

    it('does not increment elapsedTime during heatmap', () => {
      slice.session.phase = 'heatmap';
      slice.commitFrame(0.016, null);
      expect(slice.session.elapsedTime).toBe(0);
    });

    it('appends weld point when non-null', () => {
      slice.commitFrame(0, makeWeldPoint(0.9));
      expect(slice.session.weldPoints.length).toBe(1);
    });

    it('does not append when newWeldPoint is null', () => {
      slice.commitFrame(0, null);
      expect(slice.session.weldPoints.length).toBe(0);
    });

    it('updates quality incrementally when weld point added', () => {
      slice.commitFrame(0, makeWeldPoint(0.5));
      expect(slice.session.averageQuality).toBe(0.5);
    });
  });
});
