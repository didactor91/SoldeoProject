// src/ui/screens/SetupScreen.test.tsx — Tests for SetupScreen component
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock store
const mockSetAmperage = vi.fn();
const mockSetDifficulty = vi.fn();
const mockStrikeArc = vi.fn();

vi.mock('../../app/store', () => ({
  useWelderStore: vi.fn((selector?: (s: unknown) => unknown) => {
    if (selector) {
      return selector({
        setAmperage: mockSetAmperage,
        setDifficulty: mockSetDifficulty,
        strikeArc: mockStrikeArc,
      });
    }
    return {
      setAmperage: mockSetAmperage,
      setDifficulty: mockSetDifficulty,
      strikeArc: mockStrikeArc,
    };
  }),
}));

import SetupScreen from './SetupScreen';

describe('SetupScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the setup form', () => {
    const { container } = render(<SetupScreen />);
    expect(container.textContent?.length).toBeGreaterThan(0);
  });

  it('displays the title', () => {
    render(<SetupScreen />);
    expect(screen.getByText('SMAW WELDING SIMULATOR')).toBeInTheDocument();
  });

  it('displays amperage slider', () => {
    render(<SetupScreen />);
    const slider = screen.getByRole('slider');
    expect(slider).toBeInTheDocument();
  });

  it('displays difficulty buttons', () => {
    render(<SetupScreen />);
    expect(screen.getByText('School')).toBeInTheDocument();
    expect(screen.getByText('Professional')).toBeInTheDocument();
    expect(screen.getByText('Expert')).toBeInTheDocument();
  });

  it('displays STRIKE ARC button', () => {
    render(<SetupScreen />);
    expect(screen.getByText('STRIKE ARC')).toBeInTheDocument();
  });

  it('calls setAmperage and setDifficulty when start is clicked', () => {
    render(<SetupScreen />);
    const strikeButton = screen.getByText('STRIKE ARC');
    fireEvent.click(strikeButton);
    expect(mockSetAmperage).toHaveBeenCalledWith(100);
    expect(mockSetDifficulty).toHaveBeenCalledWith('school');
    expect(mockStrikeArc).toHaveBeenCalled();
  });
});
