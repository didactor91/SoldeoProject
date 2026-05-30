// src/audio/ArcAudioNode.test.ts — ArcAudioNode unit tests

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ArcAudioNode } from './ArcAudioNode';

// Stub AudioContext to avoid ReferenceError in jsdom
const mockContextInstance = {
  sampleRate: 48000,
  currentTime: 0,
  destination: {},
  state: 'running',
  createBufferSource: vi.fn().mockReturnValue({
    buffer: null, loop: false, connect: vi.fn(), disconnect: vi.fn(), start: vi.fn(), stop: vi.fn(),
  }),
  createOscillator: vi.fn().mockReturnValue({
    type: 'sine',
    frequency: { value: 0, setTargetAtTime: vi.fn() },
    connect: vi.fn(), disconnect: vi.fn(), start: vi.fn(), stop: vi.fn(),
  }),
  createWaveShaper: vi.fn().mockReturnValue({
    curve: null, oversample: 'none', connect: vi.fn(), disconnect: vi.fn(),
  }),
  createBiquadFilter: vi.fn().mockReturnValue({
    type: 'bandpass', frequency: { value: 0, setTargetAtTime: vi.fn() }, Q: { value: 0, setTargetAtTime: vi.fn() },
    connect: vi.fn(), disconnect: vi.fn(),
  }),
  createDynamicsCompressor: vi.fn().mockReturnValue({
    threshold: { value: 0 }, knee: { value: 0 }, ratio: { value: 0 }, attack: { value: 0 }, release: { value: 0 },
    connect: vi.fn(), disconnect: vi.fn(),
  }),
  createGain: vi.fn().mockReturnValue({
    gain: { value: 0, setTargetAtTime: vi.fn(), setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
    connect: vi.fn(), disconnect: vi.fn(),
  }),
  createBuffer: vi.fn().mockReturnValue({
    duration: 2, sampleRate: 48000,
    getChannelData: () => new Float32Array(96000),
  }),
  close: vi.fn(),
};

vi.stubGlobal('AudioContext', vi.fn(() => mockContextInstance));

describe('ArcAudioNode', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockContext: any;

  beforeEach(() => {
    mockContext = mockContextInstance;
  });

  afterEach(() => {
    // No-op cleanup
  });

  describe('constructor', () => {
    it('stores the provided AudioContext', () => {
      const node = new ArcAudioNode({ context: mockContext });
      expect(node).toBeDefined();
    });
  });

  describe('buildGraph', () => {
    it('creates audio nodes without throwing', () => {
      const node = new ArcAudioNode({ context: mockContext });
      expect(() => node.buildGraph()).not.toThrow();
    });

    it('is idempotent (calling twice does not error)', () => {
      const node = new ArcAudioNode({ context: mockContext });
      node.buildGraph();
      expect(() => node.buildGraph()).not.toThrow();
    });
  });

  describe('updateParameters', () => {
    it('accepts frequency, q, and gain without throwing', () => {
      const node = new ArcAudioNode({ context: mockContext });
      node.buildGraph();
      expect(() => node.updateParameters(2000, 5.0, 0.5)).not.toThrow();
    });

    it('handles calling updateParameters before buildGraph (no-op)', () => {
      const node = new ArcAudioNode({ context: mockContext });
      expect(() => node.updateParameters(2000, 5.0, 0.5)).not.toThrow();
    });
  });

  describe('suspend', () => {
    it('does not throw when called before resume', () => {
      const node = new ArcAudioNode({ context: mockContext as unknown as AudioContext });
      node.buildGraph();
      expect(() => node.suspend()).not.toThrow();
    });
  });

  describe('resume', () => {
    it('does not throw when called after suspend', () => {
      const node = new ArcAudioNode({ context: mockContext });
      node.buildGraph();
      node.suspend();
      expect(() => node.resume()).not.toThrow();
    });
  });

  describe('playStickClick', () => {
    it('does not throw when called', () => {
      const node = new ArcAudioNode({ context: mockContext });
      node.buildGraph();
      expect(() => node.playStickClick()).not.toThrow();
    });
  });

  describe('dispose', () => {
    it('does not throw when called after buildGraph', () => {
      const node = new ArcAudioNode({ context: mockContext });
      node.buildGraph();
      expect(() => node.dispose()).not.toThrow();
    });
  });
});