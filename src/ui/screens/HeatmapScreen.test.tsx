// src/ui/screens/HeatmapScreen.test.tsx — Tests for HeatmapScreen component
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock store
const mockState = {
  session: {
    phase: 'heatmap' as const,
    difficulty: 'school' as const,
    elapsedTime: 125,
    weldPoints: [
      { position: [0, 0, 0] as [number, number, number], width: 8, height: 2.5, penetration: 2, coolingProgress: 1, instantQuality: 0.85, defect: 'none' as const },
      { position: [1, 0, 0] as [number, number, number], width: 7.5, height: 2.4, penetration: 1.9, coolingProgress: 1, instantQuality: 0.72, defect: 'none' as const },
    ],
    averageQuality: 0.85,
    worstDefect: 'none' as const,
  },
};

vi.mock('../../app/store', () => ({
  useWelderStore: vi.fn((selector?: (s: unknown) => unknown) => {
    if (selector) return selector(mockState);
    return mockState;
  }),
}));

import HeatmapScreen from './HeatmapScreen';

describe('HeatmapScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the analysis header', () => {
    const { container } = render(<HeatmapScreen />);
    expect(container.textContent?.length).toBeGreaterThan(0);
  });

  it('displays WELD ANALYSIS title', () => {
    render(<HeatmapScreen />);
    expect(screen.getByText('WELD ANALYSIS')).toBeInTheDocument();
  });

  it('displays average quality percentage', () => {
    render(<HeatmapScreen />);
    expect(screen.getByText('85.0%')).toBeInTheDocument();
  });

  it('displays NONE for worst defect when no defect', () => {
    render(<HeatmapScreen />);
    expect(screen.getByText('NONE')).toBeInTheDocument();
  });

  it('displays total weld points count', () => {
    render(<HeatmapScreen />);
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('displays NEW WELD button', () => {
    render(<HeatmapScreen />);
    expect(screen.getByText('NEW WELD')).toBeInTheDocument();
  });
});
