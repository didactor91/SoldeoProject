// src/rendering/electrode/ElectrodeModel.tsx — Renders consumable 3D electrode rod
// Default export (R3F convention)
// useFrame reads getState() per A-05
// D-03: File header comment | D-04: Default export for R3F component

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useWelderStore } from '../../app/store';
import {
  calculateLengthScale,
  calculateTemperatureEmissive,
  isStuckWarning,
  getElectrodeMaterialColor,
  getElectrodeMaterialProps,
} from './electrode.pure';

/**
 * ElectrodeModel — renders the SMAW consumable electrode as a 3D cylinder.
 *
 * Geometry:
 * - CylinderGeometry with radius 1.6mm (scaled: 0.016 units at 1 unit = 100mm per design decision)
 * - Length driven by electrode.currentLength (350mm → 0mm scale)
 *
 * Material per electrode.type (E6013/E7018):
 * - E6013: lighter silvery rutile appearance (color: #C0C0C0)
 * - E7018: darker matte low-hydrogen appearance (color: #404040)
 *
 * Thermal state: temperature → emissive intensity (0 = cold, 1 = hot glow)
 * Stuck state: isStuck → red emissive warning glow
 *
 * Reads store via getState() (A-05), never hook subscription in useFrame.
 */
function ElectrodeModel() {
  const meshRef = useRef<THREE.Mesh>(null);

  // Material refs — created once, reused across frames
  const e6013Material = useRef<THREE.MeshStandardMaterial | null>(null);
  const e7018Material = useRef<THREE.MeshStandardMaterial | null>(null);
  const activeMaterialRef = useRef<THREE.MeshStandardMaterial | null>(null);

  // Pre-allocated color objects — zero allocation in hot path per A-03
  const _redEmissive = new THREE.Color(1, 0, 0);
  const _blackEmissive = new THREE.Color(0, 0, 0);

  useFrame(() => {
    // A-05: read from getState(), never hook subscription
    const { electrode } = useWelderStore.getState();

    const mesh = meshRef.current;
    if (!mesh) return;

    // Scale Y (height) proportional to currentLength vs initialLength
    // 350mm full → scale 1.0; 0mm depleted → scale ~0
    mesh.scale.y = calculateLengthScale(electrode.currentLength, electrode.initialLength);

    // Get or create materials for the current electrode type
    let targetMaterial: THREE.MeshStandardMaterial;
    if (electrode.type === 'E7018') {
      if (!e7018Material.current) {
        const color = getElectrodeMaterialColor('E7018');
        const props = getElectrodeMaterialProps('E7018');
        e7018Material.current = new THREE.MeshStandardMaterial({
          color: new THREE.Color(color.r, color.g, color.b),
          roughness: props.roughness,
          metalness: props.metalness,
        });
      }
      targetMaterial = e7018Material.current;
    } else {
      // E6013 default
      if (!e6013Material.current) {
        const color = getElectrodeMaterialColor('E6013');
        const props = getElectrodeMaterialProps('E6013');
        e6013Material.current = new THREE.MeshStandardMaterial({
          color: new THREE.Color(color.r, color.g, color.b),
          roughness: props.roughness,
          metalness: props.metalness,
        });
      }
      targetMaterial = e6013Material.current;
    }

    // Update emissive based on temperature (thermal glow)
    if (isStuckWarning(electrode.isStuck)) {
      targetMaterial.emissive = _redEmissive;
      targetMaterial.emissiveIntensity = 0.6;
    } else {
      targetMaterial.emissive = _blackEmissive;
      targetMaterial.emissiveIntensity = calculateTemperatureEmissive(electrode.temperature);
    }

    // Apply material to mesh if changed
    if (mesh.material !== targetMaterial) {
      mesh.material = targetMaterial;
    }

    activeMaterialRef.current = targetMaterial;
  });

  // Electrode cylinder: radius 0.016 (1.6mm at 1 unit = 100mm), height 1.0 (100mm base)
  // Scale Y drives the visible length depletion
  return (
    <mesh ref={meshRef} position={[0, 0.5, 0]} castShadow>
      <cylinderGeometry args={[0.016, 0.016, 1.0, 16]} />
      <meshStandardMaterial
        color="#888888"
        roughness={0.5}
        metalness={0.5}
      />
    </mesh>
  );
}

export default ElectrodeModel;