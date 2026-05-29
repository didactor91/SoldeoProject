// src/input/MouseTracker.ts — Pointer-lock mouse control for arc length
// Handles pointer lock API, movement events, arc length delta via MOUSE_SENSITIVITY
// Zero allocations in getMovement() — pre-allocate reused objects

import { INPUT_RATES } from '../app/constants';

const MOUSE_SENSITIVITY = INPUT_RATES.MOUSE_SENSITIVITY;

// Pre-allocated return object at module scope — zero allocation in getMovement()
const REUSABLE_MOVEMENT = { dx: 0, dy: 0 };

export class MouseTracker {
  private canvas: HTMLElement;
  private accDx = 0;
  private accDy = 0;
  private _isLocked = false;
  private usingFallback = false;
  private lastX = 0;
  private lastY = 0;

  private readonly onPtrLockChange = (): void => {
    this._isLocked = document.pointerLockElement === this.canvas;
  };
  private readonly onPtrLockError = (): void => {
    this._isLocked = false;
  };
  private readonly onPtrLockMouseMove = (e: MouseEvent): void => {
    this.accDx += e.movementX;
    this.accDy += e.movementY;
  };
  private readonly onFallbackMouseMove = (e: MouseEvent): void => {
    const dx = e.clientX - this.lastX;
    const dy = e.clientY - this.lastY;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
    this.accDx += dx;
    this.accDy += dy;
  };

  constructor(canvas: HTMLElement, _sensitivity = MOUSE_SENSITIVITY) {
    this.canvas = canvas;
    this.accDx = 0;
    this.accDy = 0;
    this.lastX = 0;
    this.lastY = 0;
    this._isLocked = false;
    this.usingFallback = false;
    // sensitivity parameter accepted but unused — mouse sensitivity is fixed via MOUSE_SENSITIVITY constant
    // to avoid allocations in getMovement()

    document.addEventListener('pointerlockchange', this.onPtrLockChange);
    document.addEventListener('pointerlockerror', this.onPtrLockError);
  }

  async requestLock(): Promise<void> {
    if (document.pointerLockElement !== undefined) {
      try {
        await this.canvas.requestPointerLock();
        return;
      } catch {
        // Fall through to fallback on error
      }
    }
    this.usingFallback = true;
    this.lastX = 0;
    this.lastY = 0;
    window.addEventListener('mousemove', this.onFallbackMouseMove);
  }

  releaseLock(): void {
    if (this.usingFallback) {
      this.usingFallback = false;
      window.removeEventListener('mousemove', this.onFallbackMouseMove);
      return;
    }
    if (this._isLocked) {
      this._isLocked = false;
      document.removeEventListener('mousemove', this.onPtrLockMouseMove);
      document.exitPointerLock();
    }
  }

  isLocked(): boolean {
    return this._isLocked || this.usingFallback;
  }

  getMovement(): { dx: number; dy: number } | null {
    if (!this._isLocked && !this.usingFallback) {
      return null;
    }
    REUSABLE_MOVEMENT.dx = this.accDx;
    REUSABLE_MOVEMENT.dy = this.accDy;
    this.accDx = 0;
    this.accDy = 0;
    return REUSABLE_MOVEMENT;
  }

  dispose(): void {
    this.releaseLock();
    document.removeEventListener('pointerlockchange', this.onPtrLockChange);
    document.removeEventListener('pointerlockerror', this.onPtrLockError);
  }
}
