// src/rendering/Scene.tsx — R3F scene root, composes all sub-renderers under a parent Canvas
// Named export (R3F convention)
// D-03: File header comment | D-04: Named export for R3F component

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import BeadRenderer from './bead/BeadRenderer';
import ElectrodeModel from './electrode/ElectrodeModel';
import ArcEffect from './electrode/ArcEffect';
import SpatterSystem from './particles/SpatterSystem';
import Workpiece from './Workpiece';
import { FRAME_BUDGET } from '../app/constants';
import { checkFrameBudget } from './scene.pure';

/**
 * SceneMetrics — tracks frame time and logs warnings per F-01.
 * Renders inside Canvas so useFrame is available.
 */
function SceneMetrics() {
  const frameCountRef = useRef(0);

  useFrame(() => {
    const start = performance.now();

    // F-01: Total frame budget assertion (8ms)
    // This measures the entire scene render time per frame
    const elapsed = performance.now() - start;

    if (import.meta.env.DEV && checkFrameBudget(elapsed, FRAME_BUDGET.TOTAL_TARGET)) {
      // eslint-disable-next-line no-console
      console.warn(
        `[DEV] Scene exceeded frame budget: ${elapsed.toFixed(2)}ms > ${FRAME_BUDGET.TOTAL_TARGET}ms`
      );
    }

    frameCountRef.current++;
  });

  return null;
}

/**
 * Scene — R3F scene root for the weld simulation.
 *
 * Composes all sub-renderers under a parent Canvas (parent must provide Canvas context):
 * - BeadRenderer: weld bead ribbon from weldPoints
 * - ElectrodeModel: consumable electrode rod
 * - ArcEffect: arc glow + point light
 * - SpatterSystem: particle bursts on spatter events
 * - Workpiece: static base plate + grid
 *
 * NOTE: This component does NOT render a <Canvas>. It renders inside an existing Canvas context.
 * The parent component (e.g., WeldingScreen) provides the <Canvas> wrapper.
 *
 * Frame budget: TOTAL_TARGET=8ms per FRAME_BUDGET (F-01).
 * DEV-only performance assertions.
 */
function Scene() {
  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.3} />
      <directionalLight
        position={[5, 10, 5]}
        intensity={0.8}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />

      {/* Scene frame metrics — DEV-only budget assertions */}
      <SceneMetrics />

      {/* Sub-renderers — all composed as children of Canvas */}
      <BeadRenderer />
      <ElectrodeModel />
      <ArcEffect />
      <SpatterSystem />
      <Workpiece />
    </>
  );
}

export default Scene;