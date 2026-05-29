// src/input/InputController.ts — Orchestrates MouseTracker + KeyboardTracker
// Applies INPUT_RATES, produces RawInputState each frame
// Zero allocations — hot path runs every frame via useFrame

import { useWelderStore } from '../app/store';
import { INPUT_RATES, ELECTRODE_PROFILES } from '../app/constants';
import type { InputState, FrameResult } from '../app/store/types';
import { MouseTracker } from './MouseTracker';
import { KeyboardTracker } from './KeyboardTracker';

// Physical clamping bounds (match inputSlice.ts)
const WORK_ANGLE_MIN = 60;
const WORK_ANGLE_MAX = 120;
const DRAG_ANGLE_MIN = 40;
const DRAG_ANGLE_MAX = 90;
const POSITION_X_MIN = -50;
const POSITION_X_MAX = 50;
const POSITION_Z_MIN = -200;
const POSITION_Z_MAX = 200;
const TRAVEL_SPEED_MAX = 20;

// Pre-allocated reuse objects — mutated by tick(), never recreated
// eslint-disable-next-line prefer-const
let REUSABLE_INPUT: InputState = {
  rawArcLength: 0,
  rawWorkAngle: 0,
  rawDragAngle: 0,
  rawPositionX: 0,
  rawPositionZ: 0,
  arcLength: 0,
  workAngle: 90,
  dragAngle: 70,
  positionX: 0,
  positionZ: 0,
  travelSpeed: 0,
};

const REUSABLE_FRAME: FrameResult = {
  electrode: {},
  arc: {
    arcLength: 0,
    voltage: 0,
    stability: 0,
    isActive: false,
  },
  input: REUSABLE_INPUT,
  newWeldPoint: null,
  spatterBurst: false,
};

/** Reset reusable objects to initial state. Called by dispose() / detach(). */
function resetReusable(): void {
  REUSABLE_INPUT.rawArcLength = 0;
  REUSABLE_INPUT.rawWorkAngle = 0;
  REUSABLE_INPUT.rawDragAngle = 0;
  REUSABLE_INPUT.rawPositionX = 0;
  REUSABLE_INPUT.rawPositionZ = 0;
  REUSABLE_INPUT.arcLength = 0;
  REUSABLE_INPUT.workAngle = 90;
  REUSABLE_INPUT.dragAngle = 70;
  REUSABLE_INPUT.positionX = 0;
  REUSABLE_INPUT.positionZ = 0;
  REUSABLE_INPUT.travelSpeed = 0;
}

export class InputController {
  private mouseTracker: MouseTracker;
  private keyboardTracker: KeyboardTracker;
  /** Previous position X for travelSpeed computation. */
  private prevX = 0;
  /** Previous position Z for travelSpeed computation. */
  private prevZ = 0;

  constructor(canvas: HTMLElement) {
    this.mouseTracker = new MouseTracker(canvas);
    this.keyboardTracker = new KeyboardTracker();
  }

  /**
   * Hot path — runs every frame via useFrame.
   * Reads trackers, applies INPUT_RATES, clamps, commits to store.
   * Zero allocations.
   */
  tick(delta: number): void {
    // Step 1: Mouse delta for positionX
    const mouse = this.mouseTracker.getMovement();
    const rawMouseDx = mouse ? mouse.dx : 0;

    // Step 2: Keyboard deltas
    this.keyboardTracker.update(delta);
    const arcDelta = this.keyboardTracker.getArcDelta();
    const workAngleDelta = this.keyboardTracker.getWorkAngleDelta();
    const dragAngleDelta = this.keyboardTracker.getDragAngleDelta();

    // Step 3: Accumulate raw inputs — add this frame's deltas to previous raw values
    // (raw fields are NOT reset each frame — they persist as accumulated totals)
    REUSABLE_INPUT.rawPositionX += rawMouseDx * INPUT_RATES.MOUSE_SENSITIVITY;
    REUSABLE_INPUT.rawArcLength += arcDelta;
    REUSABLE_INPUT.rawWorkAngle += workAngleDelta;
    REUSABLE_INPUT.rawDragAngle += dragAngleDelta;
    // rawPositionZ: not updated here (engine handles Z drift separately)

    // Step 4: Get electrode type for L_max clamp
    const store = useWelderStore.getState();
    const electrodeType = store.electrode.type;
    const L_max =
      (ELECTRODE_PROFILES[electrodeType as keyof typeof ELECTRODE_PROFILES] ?? ELECTRODE_PROFILES['E6013']).L_max;

    // Step 5: Clamp all values to physical bounds
    REUSABLE_INPUT.arcLength = Math.max(0, Math.min(L_max, REUSABLE_INPUT.rawArcLength));
    REUSABLE_INPUT.workAngle = Math.max(WORK_ANGLE_MIN, Math.min(WORK_ANGLE_MAX, REUSABLE_INPUT.rawWorkAngle));
    REUSABLE_INPUT.dragAngle = Math.max(DRAG_ANGLE_MIN, Math.min(DRAG_ANGLE_MAX, REUSABLE_INPUT.rawDragAngle));
    REUSABLE_INPUT.positionX = Math.max(POSITION_X_MIN, Math.min(POSITION_X_MAX, REUSABLE_INPUT.rawPositionX));
    REUSABLE_INPUT.positionZ = Math.max(POSITION_Z_MIN, Math.min(POSITION_Z_MAX, REUSABLE_INPUT.rawPositionZ));

    // Step 6: Compute travelSpeed = euclidean magnitude of position delta / delta
    const dx = REUSABLE_INPUT.positionX - this.prevX;
    const dz = REUSABLE_INPUT.positionZ - this.prevZ;
    const dist = Math.sqrt(dx * dx + dz * dz);
    REUSABLE_INPUT.travelSpeed = Math.max(0, Math.min(TRAVEL_SPEED_MAX, dist / delta));

    // Bookkeep previous position for next frame travelSpeed
    this.prevX = REUSABLE_INPUT.positionX;
    this.prevZ = REUSABLE_INPUT.positionZ;

    // Step 7: Commit to store
    useWelderStore.getState().commitFrame(REUSABLE_FRAME);
  }

  /**
   * Attach event listeners. MouseTracker.requestLock() is called by UI
   * on canvas click; KeyboardTracker already attached in constructor.
   */
  attach(): void {
    // No additional listeners needed; mouse lock is UI-driven
  }

  /**
   * Cleanup: dispose both trackers and reset reusable state.
   */
  detach(): void {
    this.mouseTracker.dispose();
    this.keyboardTracker.dispose();
    resetReusable();
  }
}
