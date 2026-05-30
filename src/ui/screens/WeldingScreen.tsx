// src/ui/screens/WeldingScreen.tsx — Main welding view with 3D canvas and HUD
// Default export (R3F convention)

import React from 'react';
import { Canvas } from '@react-three/fiber';
import Scene from '../../rendering/Scene';
import HUD from '../HUD';

/**
 * WeldingScreen — the primary welding view.
 * Contains the R3F Canvas for 3D rendering and the HUD overlay.
 */
function WeldingScreen() {
  return (
    <div style={styles.container}>
      <Canvas
        camera={{ position: [5, 8, 8], fov: 50 }}
        shadows
        gl={{ antialias: true }}
      >
        <Scene />
      </Canvas>
      <HUD />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'relative',
    width: '100vw',
    height: '100vh',
    backgroundColor: '#0a0a0a',
    overflow: 'hidden',
  },
};

export default WeldingScreen;