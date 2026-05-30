// src/rendering/electrode/ElectrodeModel.test.tsx — Smoke tests for ElectrodeModel component
import { describe, it, expect, vi } from 'vitest';

// Mock THREE.js
vi.mock('three', () => ({
  Color: vi.fn(() => ({ setRGB: vi.fn(), copy: vi.fn() })),
  Mesh: vi.fn(() => ({})),
  MeshStandardMaterial: vi.fn(() => ({})),
}));

// Mock store
vi.mock('../../app/store', () => ({
  useWelderStore: vi.fn(() => ({})),
}));

// Mock pure functions
vi.mock('./electrode.pure', () => ({
  calculateLengthScale: vi.fn(() => 1.0),
  calculateTemperatureEmissive: vi.fn(() => 0.5),
  isStuckWarning: vi.fn(() => false),
  getElectrodeMaterialColor: vi.fn(() => ({ r: 0.75, g: 0.75, b: 0.75 })),
  getElectrodeMaterialProps: vi.fn(() => ({ roughness: 0.4, metalness: 0.5 })),
}));

import ElectrodeModel from './ElectrodeModel';

describe('ElectrodeModel', () => {
  it('is a valid module export', () => {
    expect(ElectrodeModel).toBeDefined();
  });

  it('is a function (React component)', () => {
    expect(typeof ElectrodeModel).toBe('function');
  });
});
