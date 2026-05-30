// src/audio/AudioEngine.ts — AudioContext lifecycle management and frame updates
// Default export (R3F convention)

// A-03 hot path: AudioEngine.update() runs in useFrame — zero allocations per frame
// A-05: Store reads use getState(), not hook subscription
// A-04: AudioEngine is NOT a pure engine module — it uses Web Audio API (stateful by nature)
//       but it remains framework-agnostic (no React imports)

import { useWelderStore } from '../app/store';
import { mapArcLengthToFrequency, mapStabilityToQ, mapAmperageToGain } from './audio.mappings';
import { ArcAudioNode } from './ArcAudioNode';

/**
 * AudioEngine — manages Web Audio synthesis for the SMAW welding arc.
 *
 * Lifecycle:
 * - init() called on first arc strike (satisfies browser autoplay policy)
 * - update() called every useFrame in Scene.tsx
 * - suspend()/resume() called on arc.isActive state changes
 * - playStickClick() called when electrode.isStuck becomes true
 *
 * A-05: All reads from store use getState() inside update(), never hook form.
 * This prevents React re-render subscriptions in the 60Hz render loop.
 */
class AudioEngine {
  private context: AudioContext | null = null;
  private arcNode: ArcAudioNode | null = null;

  // Track previous state for edge detection
  private wasActive = false;
  private wasStuck = false;

  /**
   * Initialize the AudioContext on first user gesture (arc strike).
   * Per RFC-002 §8.2: "AudioContext must be initialised on user gesture."
   *
   * Idempotent — subsequent calls do nothing.
   */
  init(): void {
    if (this.context !== null) {
      // Already initialized — AudioContext cannot be recreated
      return;
    }

    // Create AudioContext (browser will only allow this after user gesture)
    this.context = new AudioContext();

    // Build the synthesis graph
    this.arcNode = new ArcAudioNode({ context: this.context });
    this.arcNode.buildGraph();

    // Start suspended (arc not yet struck)
    this.arcNode.suspend();
  }

  /**
   * Update audio parameters from current store state.
   * Called every useFrame from Scene.tsx.
   *
   * A-05: Uses getState() — never subscribes to store changes.
   * A-03: Zero allocations — all work is simple math and parameter updates.
   *
   * @param _delta Unused — audio parameters driven by state, not delta time
   */
  update(_delta: number): void {
    // A-05: read store state with getState() — not hook form
    const { arc, electrode } = useWelderStore.getState();

    // Initialize on first arc strike (autoplay policy)
    if (arc.isActive && this.context === null) {
      this.init();
    }

    // Guard: no-op if not initialized or context is closed
    if (this.context === null || this.arcNode === null) {
      return;
    }

    // Edge detection: track arc.active transitions
    if (arc.isActive && !this.wasActive) {
      // Arc was just struck — resume audio
      this.arcNode.resume();
    } else if (!arc.isActive && this.wasActive) {
      // Arc was just extinguished — suspend audio
      this.arcNode.suspend();
    }
    this.wasActive = arc.isActive;

    // Edge detection: electrode stick event
    if (electrode.isStuck && !this.wasStuck) {
      // First frame of stick — play metallic click
      this.arcNode.playStickClick();
    }
    this.wasStuck = electrode.isStuck;

    // Only update parameters when arc is active
    if (!arc.isActive) {
      return;
    }

    // Map arc parameters to audio parameters
    const frequency = mapArcLengthToFrequency(arc.arcLength, electrode.type);
    const q = mapStabilityToQ(arc.stability);
    const gain = mapAmperageToGain(arc.amperage, electrode.type);

    // Push parameters to the audio graph
    this.arcNode.updateParameters(frequency, q, gain);
  }

  /**
   * Cleanup: close AudioContext and dispose nodes.
   * Called when the application is being destroyed.
   */
  dispose(): void {
    if (this.arcNode) {
      this.arcNode.dispose();
      this.arcNode = null;
    }
    if (this.context) {
      this.context.close();
      this.context = null;
    }
    this.wasActive = false;
    this.wasStuck = false;
  }
}

// Singleton — one AudioEngine per application
const audioEngine = new AudioEngine();

export default audioEngine;

// Named export for direct import (alternative pattern)
export { AudioEngine };