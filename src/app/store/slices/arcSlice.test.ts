// src/app/store/slices/arcSlice.test.ts — Arc slice action tests
import { describe, it, expect, beforeEach } from 'vitest';
import { createArcSlice, type ArcSlice } from './arcSlice';

describe('arcSlice', () => {
  let slice: ArcSlice;

  beforeEach(() => {
    slice = createArcSlice();
  });

  describe('initial state', () => {
    it('is extinguished (isActive = false)', () => {
      expect(slice.arc.isActive).toBe(false);
    });

    it('has zero arcLength', () => {
      expect(slice.arc.arcLength).toBe(0);
    });

    it('has zero voltage', () => {
      expect(slice.arc.voltage).toBe(0);
    });

    it('has zero amperage', () => {
      expect(slice.arc.amperage).toBe(0);
    });

    it('has zero stability', () => {
      expect(slice.arc.stability).toBe(0);
    });
  });

  describe('extinguishArc', () => {
    it('sets isActive to false', () => {
      slice.arc.isActive = true;
      slice.extinguishArc();
      expect(slice.arc.isActive).toBe(false);
    });

    it('resets arcLength to zero', () => {
      slice.arc.isActive = true;
      slice.arc.arcLength = 5;
      slice.extinguishArc();
      expect(slice.arc.arcLength).toBe(0);
    });

    it('resets voltage to zero', () => {
      slice.arc.isActive = true;
      slice.arc.voltage = 30;
      slice.extinguishArc();
      expect(slice.arc.voltage).toBe(0);
    });

    it('resets stability to zero', () => {
      slice.arc.isActive = true;
      slice.arc.stability = 0.8;
      slice.extinguishArc();
      expect(slice.arc.stability).toBe(0);
    });

    it('preserves amperage', () => {
      slice.arc.isActive = true;
      slice.arc.amperage = 100;
      slice.extinguishArc();
      expect(slice.arc.amperage).toBe(100);
    });
  });

  describe('updateArc', () => {
    it('merges partial update', () => {
      slice.updateArc({ arcLength: 3.2 });
      expect(slice.arc.arcLength).toBe(3.2);
    });

    it('preserves unmodified fields', () => {
      slice.arc.amperage = 100;
      slice.updateArc({ stability: 0.5 });
      expect(slice.arc.amperage).toBe(100);
      expect(slice.arc.stability).toBe(0.5);
    });
  });

  describe('commitArc', () => {
    it('applies ArcResult to arc state', () => {
      slice.commitArc({
        arcLength: 3.5,
        voltage: 30,
        stability: 0.9,
        isActive: true,
      });
      expect(slice.arc.arcLength).toBe(3.5);
      expect(slice.arc.voltage).toBe(30);
      expect(slice.arc.stability).toBe(0.9);
      expect(slice.arc.isActive).toBe(true);
    });

    it('overwrites previous arc values', () => {
      slice.arc.arcLength = 2;
      slice.arc.voltage = 20;
      slice.commitArc({
        arcLength: 5,
        voltage: 35,
        stability: 0.3,
        isActive: false,
      });
      expect(slice.arc.arcLength).toBe(5);
      expect(slice.arc.voltage).toBe(35);
    });

    it('clamps arcLength to non-negative', () => {
      slice.commitArc({
        arcLength: -1,
        voltage: 0,
        stability: 0,
        isActive: false,
      });
      expect(slice.arc.arcLength).toBeGreaterThanOrEqual(0);
    });
  });
});
