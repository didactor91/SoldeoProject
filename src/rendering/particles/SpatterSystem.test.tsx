// src/rendering/particles/SpatterSystem.test.tsx — Smoke tests for SpatterSystem component
import { describe, it, expect, vi } from 'vitest';

// Mock THREE.js
vi.mock('three', () => ({
  Vector3: vi.fn(() => ({ set: vi.fn() })),
  Mesh: vi.fn(() => ({})),
  SphereGeometry: vi.fn(),
  MeshStandardMaterial: vi.fn(() => ({})),
}));

// Mock store
vi.mock('../../app/store', () => ({
  useWelderStore: vi.fn(() => ({})),
}));

// Mock constants
vi.mock('../../app/constants', () => ({
  FRAME_BUDGET: { SPATTER_SYSTEM: 1 },
}));

// Mock pure functions
vi.mock('./spatter.pure', () => ({
  calculateParticleCount: vi.fn(() => 20),
  calculateParticleLifetime: vi.fn(() => 800),
  calculateSpawnY: vi.fn(() => 0.5),
  applyGravity: vi.fn(),
  updatePosition: vi.fn(),
  isLifetimeExpired: vi.fn(() => false),
  isBelowSurface: vi.fn(() => false),
  isFrameBudgetExceeded: vi.fn(() => false),
  FRAME_DT_SECONDS: 1 / 60,
}));

import SpatterSystem from './SpatterSystem';

describe('SpatterSystem', () => {
  it('is a valid module export', () => {
    expect(SpatterSystem).toBeDefined();
  });

  it('is a function (React component)', () => {
    expect(typeof SpatterSystem).toBe('function');
  });
});
