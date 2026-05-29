// src/app/store/slices/inputSlice.test.ts — Input slice action tests
import { describe, it, expect, beforeEach } from 'vitest';
import { createInputSlice, type InputSlice } from './inputSlice';

describe('inputSlice', () => {
  let slice: InputSlice;

  beforeEach(() => {
    slice = createInputSlice();
  });

  describe('initial state', () => {
    it('has arcLength at E6013 L_optimal (3.2)', () => {
      expect(slice.input.arcLength).toBe(3.2);
    });

    it('has workAngle at 90°', () => {
      expect(slice.input.workAngle).toBe(90);
    });

    it('has dragAngle at 70°', () => {
      expect(slice.input.dragAngle).toBe(70);
    });

    it('has positionX and positionZ at 0', () => {
      expect(slice.input.positionX).toBe(0);
      expect(slice.input.positionZ).toBe(0);
    });

    it('has travelSpeed at 0', () => {
      expect(slice.input.travelSpeed).toBe(0);
    });
  });

  describe('updateRawInput', () => {
    it('updates rawArcLength', () => {
      slice.updateRawInput({ rawArcLength: 5.0 });
      expect(slice.input.rawArcLength).toBe(5.0);
    });

    it('updates rawWorkAngle', () => {
      slice.updateRawInput({ rawWorkAngle: 100 });
      expect(slice.input.rawWorkAngle).toBe(100);
    });

    it('updates rawDragAngle', () => {
      slice.updateRawInput({ rawDragAngle: 80 });
      expect(slice.input.rawDragAngle).toBe(80);
    });

    it('updates rawPositionX', () => {
      slice.updateRawInput({ rawPositionX: 25 });
      expect(slice.input.rawPositionX).toBe(25);
    });

    it('updates rawPositionZ', () => {
      slice.updateRawInput({ rawPositionZ: -100 });
      expect(slice.input.rawPositionZ).toBe(-100);
    });

    it('updates multiple raw fields in one call', () => {
      slice.updateRawInput({ rawArcLength: 4.0, rawWorkAngle: 110, rawDragAngle: 60 });
      expect(slice.input.rawArcLength).toBe(4.0);
      expect(slice.input.rawWorkAngle).toBe(110);
      expect(slice.input.rawDragAngle).toBe(60);
    });
  });

  describe('applyClamping', () => {
    it('clamps arcLength to [0, L_max] for E6013', () => {
      slice.input.rawArcLength = 10;
      slice.applyClamping('E6013');
      expect(slice.input.arcLength).toBeLessThanOrEqual(6.0); // L_max E6013
    });

    it('clamps arcLength to [0, L_max] for E7018', () => {
      slice.input.rawArcLength = 10;
      slice.applyClamping('E7018');
      expect(slice.input.arcLength).toBeLessThanOrEqual(6.5); // L_max E7018
    });

    it('clamps arcLength below 0 to 0', () => {
      slice.input.rawArcLength = -5;
      slice.applyClamping('E6013');
      expect(slice.input.arcLength).toBeGreaterThanOrEqual(0);
    });

    it('clamps workAngle to [60, 120]', () => {
      slice.input.rawWorkAngle = 150;
      slice.applyClamping('E6013');
      expect(slice.input.workAngle).toBe(120);
    });

    it('clamps workAngle below minimum to 60', () => {
      slice.input.rawWorkAngle = 30;
      slice.applyClamping('E6013');
      expect(slice.input.workAngle).toBe(60);
    });

    it('clamps dragAngle to [40, 90]', () => {
      slice.input.rawDragAngle = 100;
      slice.applyClamping('E6013');
      expect(slice.input.dragAngle).toBe(90);
    });

    it('clamps dragAngle below minimum to 40', () => {
      slice.input.rawDragAngle = 20;
      slice.applyClamping('E6013');
      expect(slice.input.dragAngle).toBe(40);
    });

    it('clamps positionX to [-50, 50]', () => {
      slice.input.rawPositionX = 100;
      slice.applyClamping('E6013');
      expect(slice.input.positionX).toBe(50);
    });

    it('clamps positionX below minimum to -50', () => {
      slice.input.rawPositionX = -100;
      slice.applyClamping('E6013');
      expect(slice.input.positionX).toBe(-50);
    });

    it('clamps positionZ to [-200, 200]', () => {
      slice.input.rawPositionZ = 300;
      slice.applyClamping('E6013');
      expect(slice.input.positionZ).toBe(200);
    });

    it('clamps positionZ below minimum to -200', () => {
      slice.input.rawPositionZ = -300;
      slice.applyClamping('E6013');
      expect(slice.input.positionZ).toBe(-200);
    });
  });

  describe('computeTravelSpeed', () => {
    it('computes speed from position delta / delta time', () => {
      slice.input.positionX = 2.5;
      slice.input.positionZ = 0;
      slice.computeTravelSpeed(0, 0, 0.016);
      // sqrt(2.5² + 0²) / 0.016 = 2.5 / 0.016 = 156.25
      expect(slice.input.travelSpeed).toBeCloseTo(156.25, 0);
    });

    it('uses both X and Z deltas', () => {
      slice.input.positionX = 3;
      slice.input.positionZ = 4;
      slice.computeTravelSpeed(0, 0, 1);
      // sqrt(3² + 4²) / 1 = 5
      expect(slice.input.travelSpeed).toBe(5);
    });

    it('returns 0 when delta is zero', () => {
      slice.input.positionX = 10;
      slice.computeTravelSpeed(0, 0, 0);
      expect(slice.input.travelSpeed).toBe(0);
    });

    it('returns 0 when delta is negative', () => {
      slice.input.positionX = 10;
      slice.computeTravelSpeed(0, 0, -1);
      expect(slice.input.travelSpeed).toBe(0);
    });
  });

  describe('commitInput', () => {
    it('replaces entire input state', () => {
      const newState = {
        rawArcLength: 3.0,
        rawWorkAngle: 85,
        rawDragAngle: 65,
        rawPositionX: 5,
        rawPositionZ: 10,
        arcLength: 3.0,
        workAngle: 85,
        dragAngle: 65,
        positionX: 5,
        positionZ: 10,
        travelSpeed: 100,
      };
      slice.commitInput(newState);
      expect(slice.input.arcLength).toBe(3.0);
      expect(slice.input.travelSpeed).toBe(100);
    });
  });
});
