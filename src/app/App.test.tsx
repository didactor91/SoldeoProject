// src/app/App.test.tsx — Tests for App component
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock all screens
vi.mock('../ui/screens/SetupScreen', () => ({ default: () => <div data-testid="setup-screen">SetupScreen</div> }));
vi.mock('../ui/screens/WeldingScreen', () => ({ default: () => <div data-testid="welding-screen">WeldingScreen</div> }));
vi.mock('../ui/screens/HeatmapScreen', () => ({ default: () => <div data-testid="heatmap-screen">HeatmapScreen</div> }));

// Mock store — vi.hoisted ensures factory runs at module evaluation time
const mockUseWelderStore = vi.hoisted(() => vi.fn(() => ({
  session: { phase: 'setup' },
})));

vi.mock('./store', () => ({
  useWelderStore: mockUseWelderStore,
}));

import App from './App';

describe('App', () => {
  it('renders the setup screen by default', () => {
    const { getByTestId } = render(<App />);
    expect(getByTestId('setup-screen')).toBeInTheDocument();
  });
});
