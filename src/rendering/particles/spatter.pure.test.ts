// src/rendering/particles/spatter.pure.test.ts — Tests for spatter pure utility functions
import { describe, it, expect } from 'vitest';
import {
  GRAVITY,
  isFrameBudgetExceeded,
  FRAME_DT_SECONDS,
  calculateParticleCount,
  calculateInitialVelocity,
  calculateParticleLifetime,
  applyGravity,
  updatePosition,
  isLifetimeExpired,
  isBelowSurface,
  calculateSpawnY,
} from './spatter.pure';

describe('spatter.pure', () => {
  describe('constants', () => {
    it('GRAVITY is -9.81 m/s²', () => {
      expect(GRAVITY).toBeCloseTo(-9.81);
    });

    it('FRAME_DT_SECONDS is 1/60', () => {
      expect(FRAME_DT_SECONDS).toBeCloseTo(1 / 60);
    });
  });

  describe('isFrameBudgetExceeded', () => {
    it('returns true when elapsed exceeds budget', () => {
      expect(isFrameBudgetExceeded(10, 8)).toBe(true);
    });

    it('returns false when within budget', () => {
      expect(isFrameBudgetExceeded(5, 8)).toBe(false);
    });
  });

  describe('calculateParticleCount', () => {
    it('returns 10 at70A minimum', () => {
      expect(calculateParticleCount(70)).toBe(10);
    });

    it('returns 30 at 120A maximum', () => {
      expect(calculateParticleCount(120)).toBe(30);
    });

    it('returns mid value at 95A', () => {
      expect(calculateParticleCount(95)).toBe(20);
    });

    it('clamps below70A to10', () => {
      expect(calculateParticleCount(50)).toBe(10);
    });

    it('clamps above 120A to 30', () => {
      expect(calculateParticleCount(150)).toBe(30);
    });
  });

  describe('calculateInitialVelocity', () => {
    it('returns velocity with upward bias', () => {
      const vel = calculateInitialVelocity(3.2, 0.5);
      expect(vel.vy).toBeGreaterThan(0);
    });

    it('scales with random value', () => {
      const vel0 = calculateInitialVelocity(3.2, 0);
      const vel1 = calculateInitialVelocity(3.2, 1);
      expect(vel0.vy).not.toBe(vel1.vy);
    });
  });

  describe('calculateParticleLifetime', () => {
    it('returns600ms at random 0', () => {
      expect(calculateParticleLifetime(0)).toBe(600);
    });

    it('returns 1000ms at random 1', () => {
      expect(calculateParticleLifetime(1)).toBe(1000);
    });

    it('returns mid value at random 0.5', () => {
      expect(calculateParticleLifetime(0.5)).toBe(800);
    });
  });

  describe('applyGravity', () => {
    it('applies gravity to all velocity components', () => {
      const vel = { x: 0, y: 0, z: 0 };
      applyGravity(vel, 1 / 60);
      expect(vel.x).toBeCloseTo(GRAVITY * (1 / 60));
      expect(vel.y).toBeCloseTo(GRAVITY * (1 / 60));
      expect(vel.z).toBeCloseTo(GRAVITY * (1 / 60));
    });
  });

  describe('updatePosition', () => {
    it('updates position based on velocity and dt', () => {
      const pos = { x: 0, y: 0, z: 0 };
      const vel = { x: 3, y: 6, z: 3 };
      updatePosition(pos, vel, 1 / 60);
      expect(pos.x).toBeCloseTo(3 * (1 / 60));
      expect(pos.y).toBeCloseTo(6 * (1 / 60));
      expect(pos.z).toBeCloseTo(3 * (1 / 60));
    });
  });

  describe('isLifetimeExpired', () => {
    it('returns false when age * frameTime < lifetime', () => {
      expect(isLifetimeExpired(30, 1000)).toBe(false);
    });

    it('returns true when age * frameTime >= lifetime', () => {
      expect(isLifetimeExpired(60, 1000)).toBe(true);
    });
  });

  describe('isBelowSurface', () => {
    it('returns true when y< surfaceY', () => {
      expect(isBelowSurface(-0.1, 0)).toBe(true);
    });

    it('returns false when y >= surfaceY', () => {
      expect(isBelowSurface(0, 0)).toBe(false);
      expect(isBelowSurface(0.1, 0)).toBe(false);
    });
  });

  describe('calculateSpawnY', () => {
    it('returns electrode tip Y plus arc length offset', () => {
      expect(calculateSpawnY(0, 0.5)).toBe(0.5);
      expect(calculateSpawnY(100, 0.5)).toBe(1.5);
    });
  });
});
