// src/rendering/Scene.test.tsx — Tests for Scene component
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';

// Mock @react-three/fiber Canvas entirely
vi.mock('@react-three/fiber', () => ({
  Canvas: vi.fn(({ children }: { children: React.ReactNode }) => <div data-testid="canvas">{children}</div>),
  useFrame: vi.fn(),
}));

// Mock all sub-components
vi.mock('./bead/BeadRenderer', () => ({ default: () => <div data-testid="bead-renderer" /> }));
vi.mock('./electrode/ElectrodeModel', () => ({ default: () => <div data-testid="electrode-model" /> }));
vi.mock('./electrode/ArcEffect', () => ({ default: () => <div data-testid="arc-effect" /> }));
vi.mock('./particles/SpatterSystem', () => ({ default: () => <div data-testid="spatter-system" /> }));
vi.mock('./Workpiece', () => ({ default: () => <div data-testid="workpiece" /> }));

// Mock constants
vi.mock('../app/constants', () => ({
  FRAME_BUDGET: { TOTAL_TARGET: 8, BEAD_RENDERER: 2, SPATTER_SYSTEM: 1 },
}));

vi.mock('./scene.pure', () => ({
  checkFrameBudget: vi.fn(() => false),
}));

import Scene from './Scene';

describe('Scene', () => {
  it('renders sub-components inside a parent Canvas context', () => {
    // Scene no longer renders <Canvas> — it renders inside a parent Canvas.
    // WeldingScreen provides the Canvas wrapper; Scene provides the 3D content.
    const { getByTestId } = render(<Scene />);
    expect(getByTestId('bead-renderer')).toBeTruthy();
    expect(getByTestId('electrode-model')).toBeTruthy();
    expect(getByTestId('arc-effect')).toBeTruthy();
    expect(getByTestId('spatter-system')).toBeTruthy();
    expect(getByTestId('workpiece')).toBeTruthy();
  });
});
