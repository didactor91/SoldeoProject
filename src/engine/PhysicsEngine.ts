// src/engine/PhysicsEngine.ts — Orchestrates all sub-engines per frame tick
// Per SDD-001 §2.2.1 and RFC-002 §4.2 Data Flow
// Pure TypeScript: no framework imports. Zero allocations in tick() hot path.

import { ArcEngine } from './arc/ArcEngine';
import { WeldEngine } from './weld/WeldEngine';
import { ElectrodeEngine } from './electrode/ElectrodeEngine';
import { ScoringEngine } from './scoring/ScoringEngine';
import { DriftSystem } from './drift/DriftSystem';
import type { WelderStore, FrameResult, InputState } from '../app/store/types';

/** Returned when arc is not active — no weld point produced */
const NULL_FRAME_RESULT: FrameResult = {
  electrode: {},
  arc: { arcLength: 0, voltage: 0, stability: 0, isActive: false },
  input: {} as InputState,
  newWeldPoint: null,
  spatterBurst: false,
};

/**
 * PhysicsEngine — orchestrates all sub-engines per frame tick.
 * Per SDD-001 §2.2.1 and RFC-002 §4.2 Data Flow.
 *
 * Pure TypeScript: no framework imports.
 * Zero allocations in tick() hot path.
 */
export class PhysicsEngine {
  private arcEngine: ArcEngine;
  private weldEngine: WeldEngine;
  private electrodeEngine: ElectrodeEngine;
  private scoringEngine: ScoringEngine;
  private driftSystem: DriftSystem;

  constructor() {
    this.arcEngine = new ArcEngine();
    this.weldEngine = new WeldEngine();
    this.electrodeEngine = new ElectrodeEngine();
    this.scoringEngine = new ScoringEngine();
    this.driftSystem = new DriftSystem();
  }

  /**
   * Advances physics simulation by one frame.
   *
   * Order per SDD-001 §2.2.1:
   * 1. DriftSystem.apply() — applies parameter drift to input
   * 2. ArcEngine.evaluate() — computes voltage, stability, arc validity
   * 3. ElectrodeEngine.deplete() — consumes electrode length
   * 4. WeldEngine.computeStamp() — computes bead geometry
   * 5. ScoringEngine.score() — computes quality
   *
   * @param delta  — frame time in seconds
   * @param store  — current WelderStore state
   * @returns FrameResult to be passed to store.commitFrame()
   */
  tick(delta: number, store: WelderStore): FrameResult {
    if (!store.arc.isActive) {
      return NULL_FRAME_RESULT;
    }

    // 1. Apply drift to input
    const driftedInput = this.driftSystem.apply(store.input, store.session.difficulty, delta);

    // 2. Evaluate arc
    const arcResult = this.arcEngine.evaluate(driftedInput, store.arc, store.electrode);

    // 3. Deplete electrode
    const electrodeResult = this.electrodeEngine.deplete(store.electrode, store.arc, delta);

    // 4. Compute bead stamp
    const beadGeometry = this.weldEngine.computeStamp(driftedInput, arcResult, store.arc);

    // 5. Score quality
    const quality = this.scoringEngine.score(driftedInput, arcResult, store.arc);

    return {
      electrode: electrodeResult,
      arc: arcResult,
      input: driftedInput,
      newWeldPoint: {
        position: [driftedInput.positionX, 0, driftedInput.positionZ],
        width: beadGeometry.width,
        height: beadGeometry.height,
        penetration: beadGeometry.penetration,
        coolingProgress: 0,
        instantQuality: quality.Q,
        defect: quality.dominantDefect,
      },
      spatterBurst: quality.isSpatter,
    };
  }
}
