// src/engine/drift/perlin.ts — Deterministic Perlin noise for drift system

/**
 * Classic 2D Perlin noise — fully deterministic from seed.
 * Used by DriftSystem to apply realistic parameter drift per RFC-002 §6.1.
 *
 * Zero allocations: permutation table pre-computed at module load.
 * All functions are pure: same inputs → same outputs.
 */

// ---------------------------------------------------------------------------
// Permutation table — pre-computed once at module load
// ---------------------------------------------------------------------------

function buildPermutationTable(seed: number): Uint8Array {
  const p = new Uint8Array(256);
  // Fisher-Yates shuffle seeded by simple LCG
  for (let i = 0; i < 256; i++) p[i] = i;
  let s = seed;
  for (let i = 255; i > 0; i--) {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    const j = ((s >>> 0) % (i + 1));
    const tmp = p[i];
    p[i] = p[j];
    p[j] = tmp;
  }
  // Duplicate for overflow index
  const perm = new Uint8Array(512);
  for (let i = 0; i < 256; i++) perm[i] = perm[i + 256] = p[i];
  return perm;
}

// Module-level permutation tables keyed by seed (lazy init)
const permCache: Map<number, Uint8Array> = new Map();

function getPermutation(seed: number): Uint8Array {
  if (!permCache.has(seed)) {
    permCache.set(seed, buildPermutationTable(seed));
  }
  return permCache.get(seed)!;
}

// ---------------------------------------------------------------------------
// Gradient vectors
// ---------------------------------------------------------------------------

function grad(hash: number, x: number, y: number): number {
  // Convert low 4 bits of hash to gradient direction
  const h = hash & 7;
  const u = h < 4 ? x : y;
  const v = h < 4 ? y : x;
  return ((h & 1) ? -u : u) + ((h & 2) ? -2.0 * v : 2.0 * v);
}

// ---------------------------------------------------------------------------
// Fade function (6t^5 - 15t^4 + 10t^3)
// ---------------------------------------------------------------------------

function fade(t: number): number {
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

// ---------------------------------------------------------------------------
// Linear interpolation
// ---------------------------------------------------------------------------

function lerp(a: number, b: number, t: number): number {
  return a + t * (b - a);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * 2D Perlin noise — deterministic from seed.
 * Returns value approximately in [-1, 1].
 *
 * @param x  — x coordinate (typically time * frequency)
 * @param seed — deterministic seed (default 0). DriftSystem uses different
 *              frequencies so seed mismatch is intentional per parameter.
 */
export function perlin(x: number, seed = 0): number {
  const perm = getPermutation(seed);
  const xi = Math.floor(x) & 255;
  const xf = x - Math.floor(x);
  const u = fade(xf);
  // Y is always 0 for 1D noise use case in DriftSystem
  const yi = 0;
  const yf = 0;

  const aa = perm[perm[xi] + yi];
  const ab = perm[perm[xi] + yi + 1];
  const ba = perm[perm[xi + 1] + yi];
  const bb = perm[perm[xi + 1] + yi + 1];

  const x1 = lerp(grad(aa, xf, yf), grad(ba, xf - 1.0, yf), u);
  const x2 = lerp(grad(ab, xf, yf - 1.0), grad(bb, xf - 1.0, yf - 1.0), u);

  return (x1 + x2) * 0.5; // Normalize to roughly [-1, 1]
}

/**
 * 2D Perlin noise — deterministic from seed.
 * Returns value approximately in [-1, 1].
 */
export function perlin2D(x: number, y: number, seed = 0): number {
  const perm = getPermutation(seed);
  const xi = Math.floor(x) & 255;
  const yi = Math.floor(y) & 255;
  const xf = x - Math.floor(x);
  const yf = y - Math.floor(y);
  const u = fade(xf);
  const v = fade(yf);

  const aa = perm[perm[xi] + yi];
  const ab = perm[perm[xi] + yi + 1];
  const ba = perm[perm[xi + 1] + yi];
  const bb = perm[perm[xi + 1] + yi + 1];

  const x1 = lerp(grad(aa, xf, yf), grad(ba, xf - 1.0, yf), u);
  const x2 = lerp(grad(ab, xf, yf - 1.0), grad(bb, xf - 1.0, yf - 1.0), u);

  return lerp(x1, x2, v);
}