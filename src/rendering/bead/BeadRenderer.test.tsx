// src/rendering/bead/BeadRenderer.test.tsx — Smoke tests for BeadRenderer component
import { describe, it, expect, vi } from 'vitest';

// Mock THREE.js
vi.mock('three', () => ({
  Mesh: vi.fn(() => ({})),
  BufferAttribute: vi.fn(),
}));

// Mock store
vi.mock('../../app/store', () => ({
  useWelderStore: vi.fn(() => ({})),
}));

// Mock constants
vi.mock('../../app/constants', () => ({
  FRAME_BUDGET: { BEAD_RENDERER: 2 },
}));

// Mock pure functions
vi.mock('./bead.pure', () => ({
  isSessionReset: vi.fn(() => false),
  isAtLeakWarningThreshold: vi.fn(() => false),
  isFrameBudgetExceeded: vi.fn(() => false),
  applyCoolingToArray: vi.fn(),
}));

// Mock bead.buffers
vi.mock('./bead.buffers', () => ({
  MAX_STAMPS: 3000,
  createBeadBuffer: vi.fn(() => ({
    positions: new Float32Array(3000 * 8 * 3),
    geometry: {},
  })),
  writeStamp: vi.fn(),
}));

// We only import to verify the module is valid
import BeadRenderer from './BeadRenderer';

describe('BeadRenderer', () => {
  it('is a valid module export', () => {
    expect(BeadRenderer).toBeDefined();
  });

  it('is a function (React component)', () => {
    expect(typeof BeadRenderer).toBe('function');
  });
});
