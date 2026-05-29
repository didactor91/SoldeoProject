// src/app/store/slices/electrodeSlice.test.ts — Electrode slice action tests
import { describe, it, expect, beforeEach } from 'vitest';
import { createElectrodeSlice, type ElectrodeSlice } from './electrodeSlice';
import { ELECTRODE_PROFILES } from '../../constants';

describe('electrodeSlice', () => {
  let slice: ElectrodeSlice;

  beforeEach(() => {
    slice = createElectrodeSlice();
  });

  describe('initial state', () => {
    it('matches expected E6013 initial values', () => {
      const profile = ELECTRODE_PROFILES['E6013'];
      expect(slice.electrode.type).toBe('E6013');
      expect(slice.electrode.initialLength).toBe(profile.initialLength);
      expect(slice.electrode.currentLength).toBe(profile.initialLength);
      expect(slice.electrode.temperature).toBe(0);
      expect(slice.electrode.isStuck).toBe(false);
    });
  });

  describe('setAmperage', () => {
    it('stores amperage within [I_min, I_max] for E6013 without throwing', () => {
      slice.electrode.type = 'E6013';
      slice.setAmperage(100);
    });

    it('clamps amperage below I_min to I_min without throwing', () => {
      slice.electrode.type = 'E6013';
      slice.setAmperage(50);
    });

    it('clamps amperage above I_max to I_max without throwing', () => {
      slice.electrode.type = 'E6013';
      slice.setAmperage(200);
    });

    it('increases temperature when amperage deviates from I_optimal', () => {
      slice.electrode.type = 'E6013';
      const initialTemp = slice.electrode.temperature;
      slice.setAmperage(70);
      expect(slice.electrode.temperature).toBeGreaterThan(initialTemp);
    });

    it('does not exceed temperature 1.0 when amperage far below optimal', () => {
      slice.electrode.type = 'E6013';
      slice.setAmperage(70);
      expect(slice.electrode.temperature).toBeLessThanOrEqual(1);
    });
  });

  describe('unstickElectrode', () => {
    it('clears isStuck when called while stuck', () => {
      slice.electrode.isStuck = true;
      slice.electrode.temperature = 0.9;
      slice.unstickElectrode();
      expect(slice.electrode.isStuck).toBe(false);
    });

    it('reduces temperature on unstick', () => {
      slice.electrode.isStuck = true;
      slice.electrode.temperature = 0.8;
      slice.unstickElectrode();
      expect(slice.electrode.temperature).toBeLessThan(0.8);
    });

    it('is no-op when electrode is not stuck', () => {
      slice.electrode.isStuck = false;
      const originalTemp = slice.electrode.temperature;
      slice.unstickElectrode();
      expect(slice.electrode.isStuck).toBe(false);
      expect(slice.electrode.temperature).toBe(originalTemp);
    });

    it('does not reduce temperature below zero', () => {
      slice.electrode.isStuck = true;
      slice.electrode.temperature = 0.1;
      slice.unstickElectrode();
      expect(slice.electrode.temperature).toBeGreaterThanOrEqual(0);
    });
  });

  describe('commitElectrode', () => {
    it('merges partial update into electrode state', () => {
      slice.commitElectrode({ temperature: 0.7 });
      expect(slice.electrode.temperature).toBe(0.7);
    });

    it('preserves unmodified fields', () => {
      const originalType = slice.electrode.type;
      slice.commitElectrode({ currentLength: 300 });
      expect(slice.electrode.type).toBe(originalType);
      expect(slice.electrode.currentLength).toBe(300);
    });

    it('can update isStuck to true', () => {
      slice.commitElectrode({ isStuck: true });
      expect(slice.electrode.isStuck).toBe(true);
    });

    it('can update currentLength and remainingMass together', () => {
      slice.commitElectrode({ currentLength: 200, remainingMass: 10 });
      expect(slice.electrode.currentLength).toBe(200);
      expect(slice.electrode.remainingMass).toBe(10);
    });
  });
});
