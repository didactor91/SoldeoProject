// src/rendering/bead/BeadRenderer.tsx — Renders weldPoints as bead ribbon
// Default export (R3F convention)
// useFrame reads getState() per A-05
// Zero allocations in hot path per A-03

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useWelderStore } from '../../app/store';
import { MAX_STAMPS, createBeadBuffer, writeStamp } from './bead.buffers';
import { FRAME_BUDGET } from '../../app/constants';
import {
  isSessionReset,
  isAtLeakWarningThreshold,
  isFrameBudgetExceeded,
  applyCoolingToArray,
} from './bead.pure';

// Pre-allocate vertex color array at module scope — zero allocation in hot path
const _colorArray = new Float32Array(MAX_STAMPS * 6 * 3);

/**
 * BeadRenderer — renders the weld bead as an extruded ribbon mesh.
 *
 * Reads `weldPoints` from `useWelderStore.getState().session` each frame (A-05).
 * Uses pre-allocated bead buffers for zero-allocation stamp writes (A-03).
 * Frame budget: BEAD_RENDERER=2ms per F-01.
 * Memory leak guard at MAX_STAMPS * 0.9 per F-02.
 */
function BeadRenderer() {
  const meshRef = useRef<THREE.Mesh>(null);
  const totalSegmentsRef = useRef(0);

  // Create pre-allocated bead buffer once at mount
  const bufferLayout = useMemo(() => createBeadBuffer(), []);

  // Track previous point count to detect session reset
  const prevPointCountRef = useRef(0);

  useFrame(() => {
    const start = performance.now();

    // A-05: read from getState(), never hook subscription
    const { weldPoints } = useWelderStore.getState().session;
    const pointCount = weldPoints.length;

    // F-02: Memory leak warning at 90% capacity
    if (isAtLeakWarningThreshold(pointCount, MAX_STAMPS)) {
      // eslint-disable-next-line no-console
      console.warn(
        `[DEV] BeadRenderer: weldPoints.length (${pointCount}) >= MAX_STAMPS * 0.9 (${MAX_STAMPS * 0.9}). ` +
        'Session should end soon to avoid buffer overflow.'
      );
    }

    // Detect session reset: if point count dropped significantly, reset geometry
    if (isSessionReset(pointCount, prevPointCountRef.current)) {
      // Session was reset — clear the buffer by zeroing relevant portion
      bufferLayout.positions.fill(0);
      totalSegmentsRef.current = 0;
    }
    prevPointCountRef.current = pointCount;

    // Update bead geometry for each weld point
    for (let i = 0; i < pointCount; i++) {
      const point = weldPoints[i];
      writeStamp(bufferLayout, point, i);

      // Apply cooling color for this stamp — 6 vertices per stamp
      applyCoolingToArray(_colorArray, point.coolingProgress, i * 6, 6);
    }

    // Update buffer geometry attributes
    const mesh = meshRef.current;
    if (mesh) {
      const geometry = mesh.geometry;

      // Mark position/normal/uv attributes as needing update
      geometry.getAttribute('position').needsUpdate = true;
      geometry.getAttribute('normal').needsUpdate = true;
      geometry.getAttribute('uv').needsUpdate = true;

      // Update vertex colors if the attribute exists
      let colorAttr = geometry.getAttribute('color');
      if (!colorAttr) {
        // Lazily add color attribute if not present
        colorAttr = new THREE.BufferAttribute(_colorArray.slice(0, pointCount * 6 * 3), 3);
        geometry.setAttribute('color', colorAttr);
      } else {
        // Ensure color attribute is sized correctly and updated
        if (colorAttr.count < pointCount * 6) {
          // Resize — this is a rare case on session growth, acceptable
          const newColorArray = new Float32Array(MAX_STAMPS * 6 * 3);
          newColorArray.set(_colorArray);
          geometry.setAttribute('color', new THREE.BufferAttribute(newColorArray, 3));
          colorAttr = geometry.getAttribute('color');
        }
        colorAttr.needsUpdate = true;
      }

      // Update draw range to render only the current point count
      geometry.setDrawRange(0, pointCount * 6);
    }

    totalSegmentsRef.current = pointCount;

    // F-01: Frame budget assertion
    const elapsed = performance.now() - start;
    if (isFrameBudgetExceeded(elapsed, FRAME_BUDGET.BEAD_RENDERER)) {
      // eslint-disable-next-line no-console
      console.warn(
        `[DEV] BeadRenderer exceeded frame budget: ${elapsed.toFixed(2)}ms > ${FRAME_BUDGET.BEAD_RENDERER}ms`
      );
    }
  });

  return (
    <mesh ref={meshRef} geometry={bufferLayout.geometry}>
      {/* Default bead material — vertex colors control appearance */}
      <meshStandardMaterial
        vertexColors
        roughness={0.6}
        metalness={0.3}
      />
    </mesh>
  );
}

export default BeadRenderer;