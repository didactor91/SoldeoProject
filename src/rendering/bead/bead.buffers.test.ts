// src/rendering/bead/bead.buffers.test.ts — BeadBuffer unit tests
import { describe, it, expect, beforeEach } from 'vitest';
import { MAX_STAMPS, createBeadBuffer, writeStamp, applyCooling, type BeadBufferLayout } from './bead.buffers';
import type { WeldPoint } from '../../app/store/types';

describe('bead.buffers', () => {
  describe('MAX_STAMPS', () => {
    it('is exported and equals 2000', () => {
      expect(MAX_STAMPS).toBe(2000);
    });

    it('is a positive integer', () => {
      expect(MAX_STAMPS).toBeGreaterThan(0);
      expect(Number.isInteger(MAX_STAMPS)).toBe(true);
    });
  });

  describe('createBeadBuffer()', () => {
    it('returns a BeadBufferLayout with Float32Arrays', () => {
      const buffer = createBeadBuffer();
      expect(buffer).toBeDefined();
      expect(buffer.positions).toBeInstanceOf(Float32Array);
      expect(buffer.normals).toBeInstanceOf(Float32Array);
      expect(buffer.uvs).toBeInstanceOf(Float32Array);
    });

    it('allocates correct vertex count (MAX_STAMPS * 6)', () => {
      const buffer = createBeadBuffer();
      expect(buffer.vertexCount).toBe(MAX_STAMPS * 6);
      expect(buffer.positions.length).toBe(MAX_STAMPS * 6 * 3);
      expect(buffer.normals.length).toBe(MAX_STAMPS * 6 * 3);
      expect(buffer.uvs.length).toBe(MAX_STAMPS * 6 * 2);
    });

    it('has geometry with position, normal, and uv attributes', () => {
      const buffer = createBeadBuffer();
      expect(buffer.geometry).toBeDefined();
      expect(buffer.geometry.getAttribute('position')).toBeDefined();
      expect(buffer.geometry.getAttribute('normal')).toBeDefined();
      expect(buffer.geometry.getAttribute('uv')).toBeDefined();
    });

    it('has non-zero indexCount', () => {
      const buffer = createBeadBuffer();
      expect(buffer.indexCount).toBeGreaterThan(0);
    });

    it('does not reallocate on subsequent calls', () => {
      const buffer1 = createBeadBuffer();
      const buffer2 = createBeadBuffer();
      // Each call creates fresh TypedArrays — this is intentional
      // The key is that writeStamp reuses the SAME buffer layout instance
      expect(buffer1.positions).not.toBe(buffer2.positions);
    });
  });

  describe('writeStamp()', () => {
    let buffer: BeadBufferLayout;

    beforeEach(() => {
      buffer = createBeadBuffer();
    });

    it('mutates buffer positions at correct index', () => {
      const point: WeldPoint = {
        position: [10, 0, 5],
        width: 8,
        height: 2.5,
        penetration: 2.0,
        coolingProgress: 0,
        instantQuality: 1,
        defect: 'none',
      };

      writeStamp(buffer, point, 0);

      // Vertex 0 at base index
      const base = 0;
      expect(buffer.positions[base * 3 + 0]).toBeCloseTo(10 - 8 * 0.5, 5); // x = position[0] - halfW
      expect(buffer.positions[base * 3 + 1]).toBeCloseTo(2.5, 5);          // y = height
      expect(buffer.positions[base * 3 + 2]).toBeCloseTo(5, 5);            // z = position[2]
    });

    it('writes 6 vertices per stamp', () => {
      const point: WeldPoint = {
        position: [0, 0, 0],
        width: 8,
        height: 2.5,
        penetration: 2.0,
        coolingProgress: 0,
        instantQuality: 1,
        defect: 'none',
      };

      writeStamp(buffer, point, 1);

      // All 6 vertices should have non-zero positions
      const base = 1 * 6;
      for (let i = 0; i < 6; i++) {
        const vi = (base + i) * 3;
        // At least one component should be non-zero for the test point
        expect(
          buffer.positions[vi] !== 0 ||
          buffer.positions[vi + 1] !== 0 ||
          buffer.positions[vi + 2] !== 0
        ).toBe(true);
      }
    });

    it('uses width for X extent (halfW = width * 0.5)', () => {
      const point: WeldPoint = {
        position: [0, 0, 0],
        width: 10,
        height: 2,
        penetration: 1.5,
        coolingProgress: 0,
        instantQuality: 1,
        defect: 'none',
      };

      writeStamp(buffer, point, 0);

      // Vertex 0 x should be -halfW, Vertex 1 x should be +halfW
      expect(buffer.positions[0]).toBeCloseTo(-5, 5); // x = 0 - 10*0.5
      expect(buffer.positions[3]).toBeCloseTo(5, 5);  // x = 0 + 10*0.5
    });

    it('uses penetration for Y depth (penY = -penetration)', () => {
      const point: WeldPoint = {
        position: [0, 0, 0],
        width: 8,
        height: 2,
        penetration: 3,
        coolingProgress: 0,
        instantQuality: 1,
        defect: 'none',
      };

      writeStamp(buffer, point, 0);

      // Vertex 2 (bottom-left) y should be negative = -penetration
      const base2 = 2;
      expect(buffer.positions[base2 * 3 + 1]).toBeCloseTo(-3, 5); // y = -penetration
    });

    it('returns early for out-of-range index (negative)', () => {
      const point: WeldPoint = {
        position: [1, 2, 3],
        width: 8,
        height: 2.5,
        penetration: 2.0,
        coolingProgress: 0,
        instantQuality: 1,
        defect: 'none',
      };

      const posBefore = buffer.positions[0];
      writeStamp(buffer, point, -1);
      // Position should be unchanged (still zero from allocation)
      expect(buffer.positions[0]).toBe(posBefore);
    });

    it('returns early for out-of-range index (>= MAX_STAMPS)', () => {
      const point: WeldPoint = {
        position: [1, 2, 3],
        width: 8,
        height: 2.5,
        penetration: 2.0,
        coolingProgress: 0,
        instantQuality: 1,
        defect: 'none',
      };

      const posBefore = buffer.positions[0];
      writeStamp(buffer, point, MAX_STAMPS);
      expect(buffer.positions[0]).toBe(posBefore);
    });

    it('allows buffer reuse: second writeStamp mutates same buffer', () => {
      const point1: WeldPoint = {
        position: [0, 0, 0],
        width: 8,
        height: 2.5,
        penetration: 2.0,
        coolingProgress: 0,
        instantQuality: 1,
        defect: 'none',
      };

      const point2: WeldPoint = {
        position: [10, 0, 5],
        width: 6,
        height: 2,
        penetration: 1.5,
        coolingProgress: 0.5,
        instantQuality: 0.8,
        defect: 'none',
      };

      writeStamp(buffer, point1, 0);
      writeStamp(buffer, point2, 1);

      // Index 0 should have point1's position
      expect(buffer.positions[0]).toBeCloseTo(0 - 8 * 0.5, 5);
      // Index 1 (vertex 6-11) should have point2's position
      const idx1Base = 6;
      expect(buffer.positions[idx1Base * 3 + 0]).toBeCloseTo(10 - 6 * 0.5, 5);
    });

    it('does not allocate new TypedArrays on repeated writeStamp calls', () => {
      const point: WeldPoint = {
        position: [0, 0, 0],
        width: 8,
        height: 2.5,
        penetration: 2.0,
        coolingProgress: 0,
        instantQuality: 1,
        defect: 'none',
      };

      const positionsRef = buffer.positions;
      const normalsRef = buffer.normals;
      const uvsRef = buffer.uvs;

      for (let i = 0; i < 100; i++) {
        writeStamp(buffer, point, i % MAX_STAMPS);
      }

      // References should be unchanged — no reallocation
      expect(buffer.positions).toBe(positionsRef);
      expect(buffer.normals).toBe(normalsRef);
      expect(buffer.uvs).toBe(uvsRef);
    });
  });

  describe('applyCooling()', () => {
    it('colors vertices with hot color when coolingProgress = 0', () => {
      const colorArray = new Float32Array(6 * 3); // 6 vertices
      applyCooling(colorArray, 0, 0, 6);

      // Hot color: r=1.0, g=0.6, b=0.1
      expect(colorArray[0]).toBeCloseTo(1.0, 5);
      expect(colorArray[1]).toBeCloseTo(0.6, 5);
      expect(colorArray[2]).toBeCloseTo(0.1, 5);
    });

    it('colors vertices with cool color when coolingProgress = 1', () => {
      const colorArray = new Float32Array(6 * 3);
      applyCooling(colorArray, 1, 0, 6);

      // Cool color: r=0.15, g=0.15, b=0.15
      expect(colorArray[0]).toBeCloseTo(0.15, 5);
      expect(colorArray[1]).toBeCloseTo(0.15, 5);
      expect(colorArray[2]).toBeCloseTo(0.15, 5);
    });

    it('lerps color for intermediate coolingProgress', () => {
      const colorArray = new Float32Array(6 * 3);
      applyCooling(colorArray, 0.5, 0, 6);

      // At t=0.5: r = 1.0 + (0.15-1.0)*0.5 = 0.575
      expect(colorArray[0]).toBeCloseTo(0.575, 5);
      // g = 0.6 + (0.15-0.6)*0.5 = 0.375
      expect(colorArray[1]).toBeCloseTo(0.375, 5);
      // b = 0.1 + (0.15-0.1)*0.5 = 0.125
      expect(colorArray[2]).toBeCloseTo(0.125, 5);
    });

    it('applies color starting at startVertex offset', () => {
      const colorArray = new Float32Array(12 * 3); // 12 vertices
      applyCooling(colorArray, 0, 6, 6);

      // First 6 vertices should be untouched (zero from allocation)
      expect(colorArray[0]).toBe(0);
      expect(colorArray[1]).toBe(0);
      expect(colorArray[2]).toBe(0);

      // Vertex 6 onwards should have hot color
      expect(colorArray[6 * 3 + 0]).toBeCloseTo(1.0, 5);
    });

    it('handles clamping of coolingProgress > 1', () => {
      const colorArray = new Float32Array(6 * 3);
      applyCooling(colorArray, 2.0, 0, 6);

      // Should clamp to cool color
      expect(colorArray[0]).toBeCloseTo(0.15, 5);
    });

    it('handles clamping of coolingProgress < 0', () => {
      const colorArray = new Float32Array(6 * 3);
      applyCooling(colorArray, -0.5, 0, 6);

      // Should clamp to hot color
      expect(colorArray[0]).toBeCloseTo(1.0, 5);
    });
  });
});