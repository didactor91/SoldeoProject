// src/input/MouseTracker.test.ts — MouseTracker unit tests
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MouseTracker } from './MouseTracker';

// Mock INPUT_RATES
vi.mock('../app/constants', () => ({
  INPUT_RATES: { MOUSE_SENSITIVITY: 0.15 },
}));

describe('MouseTracker', () => {
  let canvas: HTMLElement;
  let tracker: MouseTracker;

  beforeEach(() => {
    canvas = document.createElement('div');
    tracker = new MouseTracker(canvas);
  });

  afterEach(() => {
    tracker.dispose();
  });

  describe('initial state', () => {
    it('is not locked initially', () => {
      expect(tracker.isLocked()).toBe(false);
    });

    it('getMovement returns null when not locked', () => {
      expect(tracker.getMovement()).toBe(null);
    });
  });

  describe('requestLock', () => {
    it('does not throw when called', async () => {
      await expect(tracker.requestLock()).resolves.not.toThrow();
    });

    it('is safe to call multiple times', async () => {
      await tracker.requestLock();
      await tracker.requestLock();
      tracker.releaseLock();
    });
  });

  describe('releaseLock', () => {
    it('is safe to call when already unlocked', () => {
      tracker.releaseLock();
      expect(tracker.isLocked()).toBe(false);
    });

    it('is safe to call after requestLock', async () => {
      await tracker.requestLock();
      tracker.releaseLock();
    });
  });

  describe('dispose', () => {
    it('is safe to call multiple times', () => {
      tracker.dispose();
      tracker.dispose();
    });

    it('is safe to call after releaseLock', () => {
      tracker.releaseLock();
      tracker.dispose();
    });

    it('prevents subsequent isLocked false-positive after full cleanup', () => {
      tracker.dispose();
      // After dispose, isLocked should reflect unlocked state
      expect(tracker.isLocked()).toBe(false);
    });
  });

  describe('getMovement', () => {
    it('returns null when not locked (not throw)', () => {
      expect(tracker.getMovement()).toBe(null);
    });

    it('isLocked reflects usingFallback state', () => {
      // Before any lock attempt, isLocked is false
      expect(tracker.isLocked()).toBe(false);
    });

    it('dispose does not throw', () => {
      expect(() => tracker.dispose()).not.toThrow();
    });
  });

  describe('isLocked()', () => {
    it('returns false when not locked', () => {
      expect(tracker.isLocked()).toBe(false);
    });
  });
});
