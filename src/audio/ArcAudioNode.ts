// src/audio/ArcAudioNode.ts — Audio synthesis node for arc crackle and hum
// Web Audio API node graph: pink noise + oscillator → filter → compressor → gain

/**
 * ArcAudioNode builds and manages the Web Audio synthesis graph for the welding arc.
 *
 * Node graph (per RFC-002 §8.1):
 *
 * [OscillatorNode 120Hz square]──┐
 *                                 ├──[WaveShaperNode]──┐
 * [Pink Noise Buffer Source]──────┘   (distortion)     │
 *                                                       │
 *                                               [BiquadFilterNode]
 *                                               type: bandpass
 *                                               freq: mapped(arcLength)
 *                                               Q: mapped(stability)
 *                                                       │
 *                                               [DynamicsCompressor]
 *                                                       │
 *                                               [GainNode]
 *                                               gain: mapped(amperage)
 *                                                       │
 *                                               [AudioContext.destination]
 *
 * Lifecycle:
 * - buildGraph() constructs the node tree once at init
 * - updateParameters() called each frame to modulate filter/gain
 * - suspend() ramps gain to 0 over 80ms on arc extinction
 * - resume() ramps gain back up on arc restrike
 */

export interface ArcAudioNodeConfig {
  /** AudioContext must be passed — AudioEngine manages lifecycle */
  context: AudioContext;
  /** Initial filter frequency in Hz (default 1700Hz at mid arc) */
  initialFrequency?: number;
  /** Initial filter Q (default 4.0 mid-stability) */
  initialQ?: number;
  /** Initial gain (default 0.1 minimum) */
  initialGain?: number;
}

/**
 * Build the pink noise buffer used as the base sound source.
 * Pink noise is 1/f spectrum — sounds like natural arc buzz.
 *
 * @param context AudioContext
 * @returns Completed AudioBuffer with pink noise
 */
function buildPinkNoiseBuffer(context: AudioContext): AudioBuffer {
  const bufferSize = context.sampleRate * 2; // 2 seconds of noise
  const buffer = context.createBuffer(1, bufferSize, context.sampleRate);
  const data = buffer.getChannelData(0);

  // Paul Kellet's pink noise algorithm
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.96900 * b2 + white * 0.1538520;
    b3 = 0.86650 * b3 + white * 0.3104856;
    b4 = 0.55000 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.0168980;
    data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
    b6 = white * 0.115926;
  }

  return buffer;
}

/**
 * ArcAudioNode encapsulates the Web Audio synthesis for the welding arc.
 * It is NOT a Web Audio node itself — it manages multiple nodes.
 *
 * Usage:
 * ```typescript
 * const arcNode = new ArcAudioNode({ context: audioContext });
 * arcNode.buildGraph();
 * arcNode.updateParameters({ frequency: 2000, q: 5.0, gain: 0.5 });
 * arcNode.suspend(); // fade out on arc extinction
 * arcNode.resume();  // fade in on arc restrike
 * ```
 */
export class ArcAudioNode {
  private context: AudioContext;
  private noiseSource: AudioBufferSourceNode | null = null;
  private oscillator: OscillatorNode | null = null;
  private waveshaper: WaveShaperNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private gainNode: GainNode | null = null;

  private isGraphBuilt = false;
  private isActive = false;

  constructor(config: ArcAudioNodeConfig) {
    this.context = config.context;
  }

  /**
   * Build the audio synthesis graph.
   * Called once during AudioEngine.init().
   * After this, updateParameters() modulates the live graph.
   */
  buildGraph(): void {
    if (this.isGraphBuilt) {
      return; // Already built — idempotent
    }

    // Pink noise source (looping buffer)
    const noiseBuffer = buildPinkNoiseBuffer(this.context);
    this.noiseSource = this.context.createBufferSource();
    this.noiseSource.buffer = noiseBuffer;
    this.noiseSource.loop = true;

    // Square wave oscillator at 120Hz — adds arc crackle texture
    this.oscillator = this.context.createOscillator();
    this.oscillator.type = 'square';
    this.oscillator.frequency.value = 120;

    // WaveShaper for distortion — gives metallic edge to the arc
    this.waveshaper = this.context.createWaveShaper();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.waveshaper.curve = this.makeDistortionCurve(50) as any;
    this.waveshaper.oversample = '2x';

    // Bandpass filter — shapes the arc sound character
    this.filter = this.context.createBiquadFilter();
    this.filter.type = 'bandpass';
    this.filter.frequency.value = 1700; // Initial: mid-arc position
    this.filter.Q.value = 4.0;          // Initial: mid-stability

    // Dynamics compressor — prevents clipping on high amperage
    this.compressor = this.context.createDynamicsCompressor();
    this.compressor.threshold.value = -24;
    this.compressor.knee.value = 30;
    this.compressor.ratio.value = 12;
    this.compressor.attack.value = 0.003;
    this.compressor.release.value = 0.25;

    // Master gain — maps to amperage
    this.gainNode = this.context.createGain();
    this.gainNode.gain.value = 0.1; // Initial: minimum amperage

    // Connect graph:
    // Noise → WaveShaper → Filter → Compressor → Gain → Destination
    this.noiseSource.connect(this.waveshaper);
    this.waveshaper.connect(this.filter);

    // Oscillator → WaveShaper (adds crackle layer)
    this.oscillator.connect(this.waveshaper);

    this.filter.connect(this.compressor);
    this.compressor.connect(this.gainNode);
    this.gainNode.connect(this.context.destination);

    // Start sources
    this.noiseSource.start(0);
    this.oscillator.start(0);

    this.isGraphBuilt = true;
    this.isActive = false; // Starts suspended
  }

  /**
   * Update filter frequency, Q, and gain from current arc parameters.
   * Called every frame from AudioEngine.update().
   *
   * @param frequency Filter frequency in Hz
   * @param q Filter Q value
   * @param gain Master gain (0.0 to 1.0)
   */
  updateParameters(frequency: number, q: number, gain: number): void {
    if (!this.isGraphBuilt || !this.filter || !this.gainNode) {
      return;
    }

    // Clamp to safe ranges
    const safeFreq = Math.max(20, Math.min(20000, frequency));
    const safeQ = Math.max(0.1, Math.min(20, q));
    const safeGain = Math.max(0, Math.min(1, gain));

    // Use setTargetAtTime for smooth transitions (avoids clicks/pops)
    const smoothingTime = 0.01; // 10ms smoothing — fast enough for 60Hz updates

    this.filter.frequency.setTargetAtTime(safeFreq, this.context.currentTime, smoothingTime);
    this.filter.Q.setTargetAtTime(safeQ, this.context.currentTime, smoothingTime);
    this.gainNode.gain.setTargetAtTime(safeGain, this.context.currentTime, smoothingTime);
  }

  /**
   * Suspend the arc audio — fade out over 80ms.
   * Called when arc extinguishes (arc.isActive → false).
   *
   * Per RFC-002 §8.2: "GainNode ramps to 0 over 80ms when arc goes inactive."
   */
  suspend(): void {
    if (!this.isActive || !this.gainNode) return;

    // 80ms ramp to silence
    const rampTime = 0.08;
    this.gainNode.gain.setTargetAtTime(0, this.context.currentTime, rampTime);
    this.isActive = false;
  }

  /**
   * Resume the arc audio — fade in to current gain level.
   * Called when arc restrikes (arc.isActive → true).
   */
  resume(): void {
    if (this.isActive || !this.gainNode) return;

    // Re-apply current gain target (stored in AudioEngine state)
    // Fade-in happens naturally as updateParameters is called each frame
    this.isActive = true;
  }

  /**
   * Play a short metallic click for electrode stick event.
   * Per RFC-002 §8.2: "Electrode stick: Play a short 50ms metallic click (OscillatorNode 800Hz)."
   */
  playStickClick(): void {
    const clickOsc = this.context.createOscillator();
    const clickGain = this.context.createGain();

    clickOsc.type = 'sine';
    clickOsc.frequency.value = 800;

    // Fast attack, 50ms decay envelope
    const now = this.context.currentTime;
    clickGain.gain.setValueAtTime(0, now);
    clickGain.gain.linearRampToValueAtTime(0.3, now + 0.005); // 5ms attack
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05); // 50ms decay

    clickOsc.connect(clickGain);
    clickGain.connect(this.context.destination);

    clickOsc.start(now);
    clickOsc.stop(now + 0.06); // Slightly beyond decay to ensure clean stop
  }

  /**
   * Generate the WaveShaper distortion curve.
   * Amount parameter controls the intensity of the distortion.
   */
  private makeDistortionCurve(amount: number): Float32Array {
    const samples = 44100;
    const curve = new Float32Array(samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x));
    }
    return curve;
  }

  /**
   * Cleanup: stop all nodes and disconnect.
   * Called when AudioEngine is destroyed or context is closed.
   */
  dispose(): void {
    try {
      this.noiseSource?.stop();
      this.oscillator?.stop();
      this.noiseSource?.disconnect();
      this.oscillator?.disconnect();
      this.waveshaper?.disconnect();
      this.filter?.disconnect();
      this.compressor?.disconnect();
      this.gainNode?.disconnect();
    } catch {
      // Ignore errors during cleanup — context may already be closed
    }
    this.isGraphBuilt = false;
    this.isActive = false;
  }
}