// src/ui/screens/WeldingScreen.test.tsx — Tests for WeldingScreen component
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';

// Mock R3F Canvas
vi.mock('@react-three/fiber', () => ({
  Canvas: vi.fn(({ children }: { children: React.ReactNode }) => <div data-testid="canvas">{children}</div>),
}));

// Mock Scene
vi.mock('../../rendering/Scene', () => ({ default: () => <div data-testid="scene" /> }));

// Mock HUD
vi.mock('../HUD', () => ({ default: () => <div data-testid="hud" /> }));

import WeldingScreen from './WeldingScreen';

describe('WeldingScreen', () => {
  it('renders the canvas with scene and HUD', () => {
    const { getByTestId } = render(<WeldingScreen />);
    expect(getByTestId('canvas')).toBeInTheDocument();
    expect(getByTestId('scene')).toBeInTheDocument();
    expect(getByTestId('hud')).toBeInTheDocument();
  });
});
