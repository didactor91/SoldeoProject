// src/rendering/Workpiece.test.tsx — Tests for Workpiece component
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock the pure functions used by Workpiece
vi.mock('./workpiece.pure', () => {
  return {
    PLATE_WIDTH: 3.0,
    PLATE_DEPTH: 1.0,
    PLATE_THICKNESS: 0.06,
    GRID_SPACING: 0.25,
    GRID_LINE_THICKNESS: 0.003,
    calculateHorizontalGridCount: vi.fn(() => 13),
    calculateVerticalGridCount: vi.fn(() => 5),
    calculateHorizontalGridX: vi.fn((i: number) => -1.5 + i * 0.25),
    calculateVerticalGridZ: vi.fn((i: number) => -0.5 + i * 0.25),
    calculateGridY: vi.fn(() => -0.028),
    getHorizontalGridLineDims: vi.fn(() => ({ width: 0.003, height: 0.001, depth: 1.0 })),
    getVerticalGridLineDims: vi.fn(() => ({ width: 3.0, height: 0.001, depth: 0.003 })),
  };
});

import Workpiece from './Workpiece';

describe('Workpiece', () => {
  it('renders the workpiece group', () => {
    const { container } = render(<Workpiece />);
    // Just verify the component renders something
    expect(container.querySelector('group')).toBeTruthy();
  });
});
