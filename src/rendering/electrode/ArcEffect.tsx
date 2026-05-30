// src/rendering/electrode/ArcEffect.tsx — Renders arc glow + point light at electrode tip
// Default export (R3F convention)
// useFrame reads getState() per A-05
// D-03: File header comment | D-04: Default export for R3F component

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useWelderStore } from '../../app/store';
import {
  calculateArcLightY,
  calculateBaseIntensity,
  calculateArcColor,
  calculateFlickerIntensity,
  calculateEmissiveIntensity,
} from './arc.pure';

/**
 * ArcEffect — renders the welding arc as a point light + emissive sphere.
 *
 * Visibility: arc.isActive → show/hide arc effect
 * Position: arc.arcLength → light position along electrode (farther = longer arc)
 * Intensity: arc.voltage → brightness (higher voltage = brighter arc)
 * Color temperature: arc.stability → glow color
 *   - High stability (→1): blue-white (hot, consistent)
 *   - Low stability (<0.5): orange-red (unstable, flickering)
 * Flicker: stability < 0.5 triggers random intensity modulation
 *
 * Reads store via getState() (A-05), never hook subscription in useFrame.
 */
function ArcEffect() {
  const groupRef = useRef<THREE.Group>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const sphereRef = useRef<THREE.Mesh>(null);

  // Flicker state — module scope for zero allocation in hot path
  const flickerIntensity = useRef(1.0);

  // Pre-allocated color — zero allocation in hot path per A-03
  const _stabilityColor = new THREE.Color();

  useFrame(() => {
    // A-05: read from getState(), never hook subscription
    const { arc } = useWelderStore.getState();

    const group = groupRef.current;
    const light = lightRef.current;
    const sphere = sphereRef.current;
    if (!group || !light || !sphere) return;

    // Visibility driven by arc.isActive
    group.visible = arc.isActive;
    if (!arc.isActive) return;

    // Position arc light based on arcLength — longer arc = further from electrode tip
    group.position.y = calculateArcLightY(arc.arcLength, 0.5);

    // Voltage → light intensity (voltage range 20-40V per constants)
    const baseIntensity = calculateBaseIntensity(arc.voltage);

    // Stability affects color: high stability = blue-white, low = orange-red
    const colorRGB = calculateArcColor(arc.stability);
    _stabilityColor.setRGB(colorRGB.r, colorRGB.g, colorRGB.b);

    // Apply color to both light and sphere emissive
    light.color.copy(_stabilityColor);
    const sphereMat = sphere.material as THREE.MeshStandardMaterial;
    if (sphereMat.emissive) {
      sphereMat.emissive.copy(_stabilityColor);
    }

    // Flicker when stability < 0.5 (random modulation 0.7-1.0)
    const flickerMultiplier = arc.stability < 0.5
      ? calculateFlickerIntensity(arc.stability, Math.random())
      : 1.0;
    const finalIntensity = baseIntensity * flickerMultiplier;
    if (arc.stability < 0.5) {
      flickerIntensity.current = flickerMultiplier;
    }

    light.intensity = finalIntensity;

    // Sphere emissive intensity follows flicker
    if (sphereMat.emissive) {
      sphereMat.emissiveIntensity = calculateEmissiveIntensity(finalIntensity);
    }
  });

  return (
    <group ref={groupRef} visible={false}>
      {/* Point light at arc tip — primary illumination source */}
      <pointLight
        ref={lightRef}
        intensity={1}
        distance={5}
        decay={2}
        castShadow
      />
      {/* Emissive sphere at arc tip — visible glow effect */}
      <mesh ref={sphereRef} position={[0, 0, 0]}>
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshStandardMaterial
          emissive="#ff8800"
          emissiveIntensity={0.8}
          roughness={0.2}
          metalness={0.0}
          transparent
          opacity={0.9}
        />
      </mesh>
    </group>
  );
}

export default ArcEffect;