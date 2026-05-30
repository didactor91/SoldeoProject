// src/rendering/workpiece.pure.test.ts — Tests for workpiece pure utility functions
import { describe, it, expect } from 'vitest';
import {
  PLATE_WIDTH,
  PLATE_DEPTH,
  PLATE_THICKNESS,
  GRID_SPACING,
  GRID_LINE_THICKNESS,
  calculateHorizontalGridCount,
  calculateVerticalGridCount,
  calculateHorizontalGridX,
  calculateVerticalGridZ,
  calculateGridY,
  getHorizontalGridLineDims,
  getVerticalGridLineDims,
} from './workpiece.pure';

describe('workpiece.pure', () => {
  describe('constants', () => {
    it('PLATE_WIDTH is 3.0 (300mm)', () => {
      expect(PLATE_WIDTH).toBe(3.0);
    });

    it('PLATE_DEPTH is 1.0 (100mm)', () => {
      expect(PLATE_DEPTH).toBe(1.0);
    });

    it('PLATE_THICKNESS is 0.06 (6mm)', () => {
      expect(PLATE_THICKNESS).toBe(0.06);
    });

    it('GRID_SPACING is 0.25 (25mm)', () => {
      expect(GRID_SPACING).toBe(0.25);
    });

    it('GRID_LINE_THICKNESS is 0.003', () => {
      expect(GRID_LINE_THICKNESS).toBe(0.003);
    });
  });

  describe('calculateHorizontalGridCount', () => {
    it('returns correct count for 300mm plate at 25mm spacing', () => {
      expect(calculateHorizontalGridCount(300, 25)).toBe(13);
    });

    it('returns 1 for spacing larger than plate width', () => {
      expect(calculateHorizontalGridCount(100, 200)).toBe(1);
    });
  });

  describe('calculateVerticalGridCount', () => {
    it('returns correct count for 100mm plate at 25mm spacing', () => {
      expect(calculateVerticalGridCount(100, 25)).toBe(5);
    });
  });

  describe('calculateHorizontalGridX', () => {
    it('returns negative half for index 0', () => {
      expect(calculateHorizontalGridX(0, 3.0, 0.25)).toBe(-1.5);
    });

    it('returns center for middle index', () => {
      expect(calculateHorizontalGridX(6, 3.0, 0.25)).toBe(0);
    });
  });

  describe('calculateVerticalGridZ', () => {
    it('returns negative half for index 0', () => {
      expect(calculateVerticalGridZ(0, 1.0, 0.25)).toBe(-0.5);
    });
  });

  describe('calculateGridY', () => {
    it('returns slightly above plate surface', () => {
      const result = calculateGridY(0.06, 0.002);
      expect(result).toBeCloseTo(-0.028);
    });
  });

  describe('getHorizontalGridLineDims', () => {
    it('returns correct dimensions', () => {
      const dims = getHorizontalGridLineDims(1.0, 0.003);
      expect(dims.width).toBe(0.003);
      expect(dims.height).toBe(0.001);
      expect(dims.depth).toBe(1.0);
    });
  });

  describe('getVerticalGridLineDims', () => {
    it('returns correct dimensions', () => {
      const dims = getVerticalGridLineDims(3.0, 0.003);
      expect(dims.width).toBe(3.0);
      expect(dims.height).toBe(0.001);
      expect(dims.depth).toBe(0.003);
    });
  });
});
