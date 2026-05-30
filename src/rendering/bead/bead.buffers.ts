// src/rendering/bead/bead.buffers.ts — Pre-allocated bead ribbon geometry
// Zero allocations in writeStamp() — hot path per A-03

import * as THREE from 'three';
import type { WeldPoint } from '../../app/store/types';

/**
 * Maximum number of weld stamps before session should end.
 * Safety limit for F-02 memory leak warning at MAX_STAMPS * 0.9.
 */
export const MAX_STAMPS = 2000;

// Module-scope pre-allocated refs for zero-allocation writeStamp (A-03)
// Reused across all writeStamp calls — never create new Vector3 instances
const _v0 = { x: 0, y: 0, z: 0 };
const _v1 = { x: 0, y: 0, z: 0 };
const _v2 = { x: 0, y: 0, z: 0 };
const _v3 = { x: 0, y: 0, z: 0 };
const _v4 = { x: 0, y: 0, z: 0 };
const _v5 = { x: 0, y: 0, z: 0 };

/**
 * Pre-allocated bead buffer layout.
 * Created once, reused across frames — zero reallocation.
 */
export interface BeadBufferLayout {
  /** Three.js BufferGeometry with pre-allocated attribute arrays */
  geometry: THREE.BufferGeometry;
  /** Reference to the positions Float32Array for direct mutation */
  positions: Float32Array;
  /** Reference to the normals Float32Array for direct mutation */
  normals: Float32Array;
  /** Reference to the uvs Float32Array for direct mutation */
  uvs: Float32Array;
  /** Total number of vertices allocated (MAX_STAMPS * 6) */
  vertexCount: number;
  /** Index count for the ribbon index buffer */
  indexCount: number;
}

/**
 * Creates a pre-allocated bead BufferGeometry.
 * The geometry is sized for MAX_STAMPS vertices (6 per stamp = 2 tris).
 * Returned layout gives direct Float32Array refs for zero-allocation writes.
 */
export function createBeadBuffer(): BeadBufferLayout {
  const vertexCount = MAX_STAMPS * 6; // 6 vertices per stamp (2 triangles)

  // Pre-allocate TypedArrays — no new calls in hot path
  const positions = new Float32Array(vertexCount * 3);
  const normals = new Float32Array(vertexCount * 3);
  const uvs = new Float32Array(vertexCount * 2);

  // Pre-compute index buffer for ribbon topology (strip-like quads)
  // Each stamp is a quad (4 unique verts) rendered as 2 triangles (6 indices)
  // Consecutive stamps share edge vertices for smooth ribbon continuity
  const indexCount = (MAX_STAMPS - 1) * 6 + (MAX_STAMPS * 6); // middle quads + end caps
  const indexData = new Uint32Array(indexCount);
  let idx = 0;

  for (let stamp = 0; stamp < MAX_STAMPS; stamp++) {
    const vBase = stamp * 6;

    if (stamp < MAX_STAMPS - 1) {
      // Middle quads: connect stamp i to stamp i+1
      // Lower-left triangle: v0, v1, v2
      indexData[idx++] = vBase + 0;
      indexData[idx++] = vBase + 1;
      indexData[idx++] = vBase + 4;
      // Upper-right triangle: v1, v2, v5
      indexData[idx++] = vBase + 1;
      indexData[idx++] = vBase + 4;
      indexData[idx++] = vBase + 5;
    }

    // End cap for this stamp (2 triangles = 6 indices)
    // Triangle 1: v0, v1, v2
    indexData[idx++] = vBase + 0;
    indexData[idx++] = vBase + 1;
    indexData[idx++] = vBase + 2;
    // Triangle 2: v1, v3, v2
    indexData[idx++] = vBase + 1;
    indexData[idx++] = vBase + 3;
    indexData[idx++] = vBase + 2;
  }

  // Build the BufferGeometry with all attributes pre-allocated
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(new THREE.Uint32BufferAttribute(indexData, 1));

  return {
    geometry,
    positions,
    normals,
    uvs,
    vertexCount,
    indexCount,
  };
}

/**
 * Writes a single stamp into the pre-allocated bead buffer at the given index.
 * ZERO allocations — all computation uses module-scope pre-allocated refs (A-03).
 *
 * @param buffer  Pre-allocated bead buffer layout
 * @param point   WeldPoint driving the stamp geometry
 * @param index   Stamp index (0-based), must be < MAX_STAMPS
 */
export function writeStamp(buffer: BeadBufferLayout, point: WeldPoint, index: number): void {
  if (index < 0 || index >= MAX_STAMPS) return;

  const base = index * 6; // 6 vertices per stamp
  const p = point.position;

  // Stamp geometry driven by WeldPoint dimensions
  // Width → X extent, penetration → Y depth (negative = below surface)
  const halfW = point.width * 0.5;
  const penY = -point.penetration; // negative Y = penetration into workpiece

  // 6 vertices per stamp (2 triangles forming a quad):
  // v4 ─── v5
  // │    ╱ │
  // v0 ─── v1   ← center line (travel direction)
  // │  ╱    │
  // v2 ─── v3

  // Vertex 0: left, top, same Z
  _v0.x = p[0] - halfW; _v0.y = point.height; _v0.z = p[2];
  // Vertex 1: right, top, same Z
  _v1.x = p[0] + halfW; _v1.y = point.height; _v1.z = p[2];
  // Vertex 2: left, bottom (at penetration), same Z
  _v2.x = p[0] - halfW; _v2.y = penY; _v2.z = p[2];
  // Vertex 3: right, bottom (at penetration), same Z
  _v3.x = p[0] + halfW; _v3.y = penY; _v3.z = p[2];

  // For ribbon continuity, we need to project vertices slightly along travel direction
  // Assuming stamp represents a short segment along the weld path
  // The Z offset connects this stamp to the next in the ribbon
  // v4 and v5 are projections at the next Z position (top and bottom)
  const ribbonLen = Math.min(point.width, Math.abs(point.penetration) + point.height);
  _v4.x = p[0] - halfW; _v4.y = point.height; _v4.z = p[2] + ribbonLen * 0.5;
  _v5.x = p[0] + halfW; _v5.y = point.height; _v5.z = p[2] + ribbonLen * 0.5;

  // Write all 6 vertices into TypedArrays — direct mutation, zero allocation
  const pos = buffer.positions;
  const norm = buffer.normals;
  const uv = buffer.uvs;

  // Vertex 0
  pos[base * 3 + 0] = _v0.x; pos[base * 3 + 1] = _v0.y; pos[base * 3 + 2] = _v0.z;
  norm[base * 3 + 0] = 0; norm[base * 3 + 1] = 1; norm[base * 3 + 2] = 0;
  uv[base * 2 + 0] = 0; uv[base * 2 + 1] = 0;

  // Vertex 1
  const b1 = (base + 1);
  pos[b1 * 3 + 0] = _v1.x; pos[b1 * 3 + 1] = _v1.y; pos[b1 * 3 + 2] = _v1.z;
  norm[b1 * 3 + 0] = 0; norm[b1 * 3 + 1] = 1; norm[b1 * 3 + 2] = 0;
  uv[b1 * 2 + 0] = 1; uv[b1 * 2 + 1] = 0;

  // Vertex 2
  const b2 = (base + 2);
  pos[b2 * 3 + 0] = _v2.x; pos[b2 * 3 + 1] = _v2.y; pos[b2 * 3 + 2] = _v2.z;
  norm[b2 * 3 + 0] = 0; norm[b2 * 3 + 1] = -1; norm[b2 * 3 + 2] = 0;
  uv[b2 * 2 + 0] = 0; uv[b2 * 2 + 1] = 1;

  // Vertex 3
  const b3 = (base + 3);
  pos[b3 * 3 + 0] = _v3.x; pos[b3 * 3 + 1] = _v3.y; pos[b3 * 3 + 2] = _v3.z;
  norm[b3 * 3 + 0] = 0; norm[b3 * 3 + 1] = -1; norm[b3 * 3 + 2] = 0;
  uv[b3 * 2 + 0] = 1; uv[b3 * 2 + 1] = 1;

  // Vertex 4 (ribbon projection top)
  const b4 = (base + 4);
  pos[b4 * 3 + 0] = _v4.x; pos[b4 * 3 + 1] = _v4.y; pos[b4 * 3 + 2] = _v4.z;
  norm[b4 * 3 + 0] = 0; norm[b4 * 3 + 1] = 1; norm[b4 * 3 + 2] = 0;
  uv[b4 * 2 + 0] = 0; uv[b4 * 2 + 1] = 0;

  // Vertex 5 (ribbon projection top)
  const b5 = (base + 5);
  pos[b5 * 3 + 0] = _v5.x; pos[b5 * 3 + 1] = _v5.y; pos[b5 * 3 + 2] = _v5.z;
  norm[b5 * 3 + 0] = 0; norm[b5 * 3 + 1] = 1; norm[b5 * 3 + 2] = 0;
  uv[b5 * 2 + 0] = 1; uv[b5 * 2 + 1] = 0;
}

/**
 * Applies cooling color to vertex color attribute.
 * Uses pre-allocated color refs for zero-allocation hot path (A-03).
 *
 * @param colorArray  Pre-allocated Float32Array for vertex colors (RGB triplets)
 * @param coolingProgress  0.0 (hot) → 1.0 (cool)
 * @param startVertex  First vertex index to color
 * @param vertexCount  Number of vertices to color
 */
export function applyCooling(
  colorArray: Float32Array,
  coolingProgress: number,
  startVertex: number,
  vertexCount: number,
): void {
  // Pre-allocate lerp targets at module scope for zero-allocation color computation (A-03)
  // Hot color (coolingProgress = 0): bright orange-white
  const hotR = 1.0;
  const hotG = 0.6;
  const hotB = 0.1;
  // Cool color (coolingProgress = 1): dark gray
  const coolR = 0.15;
  const coolG = 0.15;
  const coolB = 0.15;

  // Lerp between hot and cool based on coolingProgress
  const t = Math.max(0, Math.min(1, coolingProgress));
  const r = hotR + (coolR - hotR) * t;
  const g = hotG + (coolG - hotG) * t;
  const b = hotB + (coolB - hotB) * t;

  // Write color for each vertex in the stamp — direct TypedArray mutation, zero allocation
  for (let i = 0; i < vertexCount; i++) {
    const vi = (startVertex + i) * 3;
    colorArray[vi] = r;
    colorArray[vi + 1] = g;
    colorArray[vi + 2] = b;
  }
}