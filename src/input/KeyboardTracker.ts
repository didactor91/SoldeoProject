// src/input/KeyboardTracker.ts — WASD/QE keyboard control for angles and arc
// Track pressed state per key, apply ANGLE_RATE/ARC_RATE per second
// Zero allocations in update() — pre-allocate reused objects

import { INPUT_RATES } from '../app/constants';

const ANGLE_RATE = INPUT_RATES.ANGLE_RATE;   // °/s — W/S/A/D
const ARC_RATE = INPUT_RATES.ARC_RATE;       // mm/s — Q/E

/** Keys tracked for SMAW input. */
const TRACKED_KEYS = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE'] as const;

export class KeyboardTracker {
  /** Internal key state map — reused, not reallocated. */
  private readonly keyMap = new Map<string, boolean>();

  /** Pre-allocated delta accumulators — mutated by update(), read by getters. */
  private _arcDelta = 0;
  private _workAngleDelta = 0;
  private _dragAngleDelta = 0;

  private readonly onKeyDown = (e: KeyboardEvent): void => {
    this.keyMap.set(e.code, true);
  };
  private readonly onKeyUp = (e: KeyboardEvent): void => {
    this.keyMap.set(e.code, false);
  };
  private readonly onBlur = (): void => {
    this.reset();
  };

  constructor() {
    for (const k of TRACKED_KEYS) {
      this.keyMap.set(k, false);
    }
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
  }

  /**
   * Updates delta accumulators based on currently pressed keys and frame time.
   * Hot path — zero allocations, reads internal map directly.
   */
  update(delta: number): void {
    this._arcDelta = 0;
    this._workAngleDelta = 0;
    this._dragAngleDelta = 0;

    if (this.keyMap.get('KeyQ') ?? false) {
      this._arcDelta += ARC_RATE * delta;
    }
    if (this.keyMap.get('KeyE') ?? false) {
      this._arcDelta -= ARC_RATE * delta;
    }
    if (this.keyMap.get('KeyW') ?? false) {
      this._workAngleDelta += ANGLE_RATE * delta;
    }
    if (this.keyMap.get('KeyS') ?? false) {
      this._workAngleDelta -= ANGLE_RATE * delta;
    }
    if (this.keyMap.get('KeyA') ?? false) {
      this._dragAngleDelta -= ANGLE_RATE * delta;
    }
    if (this.keyMap.get('KeyD') ?? false) {
      this._dragAngleDelta += ANGLE_RATE * delta;
    }
  }

  isPressed(key: string): boolean {
    return this.keyMap.get(key) ?? false;
  }

  /**
   * Returns a readonly view of the internal key state map.
   * The Map itself is NOT cloned — zero allocation.
   */
  getState(): ReadonlyMap<string, boolean> {
    return this.keyMap;
  }

  getArcDelta(): number {
    return this._arcDelta;
  }

  getWorkAngleDelta(): number {
    return this._workAngleDelta;
  }

  getDragAngleDelta(): number {
    return this._dragAngleDelta;
  }

  /**
   * Clears all pressed keys. Called on window blur to prevent stuck keys.
   * Zero allocation — iterates over the existing Map entries.
   */
  reset(): void {
    for (const k of TRACKED_KEYS) {
      this.keyMap.set(k, false);
    }
  }

  dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
  }
}
