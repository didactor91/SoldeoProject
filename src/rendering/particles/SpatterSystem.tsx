// src/rendering/particles/SpatterSystem.tsx — Renders spatter particle bursts with ballistic trajectories
// Default export (R3F convention)
// useFrame reads getState() per A-05
// D-03: File header comment | D-04: Default export for R3F component

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useWelderStore } from '../../app/store';
import { FRAME_BUDGET } from '../../app/constants';
import {
  calculateParticleCount,
  calculateParticleLifetime,
  calculateSpawnY,
  applyGravity,
  updatePosition,
  isLifetimeExpired,
  isBelowSurface,
  isFrameBudgetExceeded,
  FRAME_DT_SECONDS,
} from './spatter.pure';

interface SpatterParticle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  birthFrame: number;
  lifetime: number; // ms
}

// Module scope particle list — pre-allocated, reused per burst (zero allocation in hot path per A-03)
const MAX_PARTICLES = 200;
const _activeParticles: SpatterParticle[] = [];

// Pre-allocated Vector3 pool — zero allocation in hot path per A-03
// Position pool
const _positionPool: THREE.Vector3[] = [];
for (let i = 0; i < MAX_PARTICLES; i++) {
  _positionPool.push(new THREE.Vector3());
}
// Velocity pool
const _velocityPool: THREE.Vector3[] = [];
for (let i = 0; i < MAX_PARTICLES; i++) {
  _velocityPool.push(new THREE.Vector3());
}

/**
 * SpatterSystem — renders spatter particle bursts triggered by lastSpatterBurst.
 *
 * Particle burst:
 * - Triggered when arc.lastSpatterBurst === true (set by commitFrame)
 * - Clears lastSpatterBurst after spawning (atomic consume pattern)
 * - Particle count proportional to arc.amperage (higher amperage = more particles)
 *
 * Trajectory: Ballistic with gravity (9.81 m/s² downward).
 * Particles inherit initial velocity from arc direction + random scatter.
 *
 * Cleanup: Particles removed after lifetime expires — no accumulation.
 *
 * Reads store via getState() (A-05), never hook subscription in useFrame.
 * Frame budget: SPATTER_SYSTEM=1ms per F-01.
 */
function SpatterSystem() {
  const groupRef = useRef<THREE.Group>(null);
  const frameCountRef = useRef(0);

  // Pre-allocate particle mesh refs for pool management
  const particleRefs = useMemo(() => {
    const refs: THREE.Mesh[] = [];
    for (let i = 0; i < MAX_PARTICLES; i++) {
      refs.push(new THREE.Mesh(
        new THREE.SphereGeometry(0.003, 4, 4), // 3mm spatter particles
        new THREE.MeshStandardMaterial({ color: '#ffaa00', emissive: '#ff6600', emissiveIntensity: 0.5 })
      ));
    }
    return refs;
  }, []);

  useFrame(() => {
    const start = performance.now();
    const currentFrame = frameCountRef.current++;

    // A-05: read from getState(), never hook subscription
    const { arc, clearSpatterBurst } = useWelderStore.getState();

    const group = groupRef.current;
    if (!group) return;

    // Atomic consume: if lastSpatterBurst is true, clear it immediately
    if (arc.lastSpatterBurst) {
      const particleCount = calculateParticleCount(arc.amperage);

      for (let i = 0; i < particleCount; i++) {
        // Get particle from pool — zero allocation per A-03
        const particle = _activeParticles.length < MAX_PARTICLES
          ? {
            position: _positionPool[_activeParticles.length],
            velocity: _velocityPool[_activeParticles.length],
            birthFrame: currentFrame,
            lifetime: 800,
          }
          : _activeParticles[i % _activeParticles.length];

        // Initialize at arc tip position (near electrode tip)
        particle.position.set(
          (Math.random() - 0.5) * 0.1,
          calculateSpawnY(arc.arcLength, 0.5),
          (Math.random() - 0.5) * 0.1
        );

        // Initial velocity: outward from arc + upward bias
        // Arc is upward from electrode, spatter scatters outward
        const speed = 2 + Math.random() * 3; // 2-5 m/s initial speed
        particle.velocity.set(
          (Math.random() - 0.5) * speed,
          Math.random() * speed * 0.8 + 1, // upward bias
          (Math.random() - 0.5) * speed
        );

        particle.birthFrame = currentFrame;
        particle.lifetime = calculateParticleLifetime(Math.random());

        if (_activeParticles.length < MAX_PARTICLES) {
          _activeParticles.push(particle);
        }
      }

      // Clear the transient flag immediately (atomic consume)
      clearSpatterBurst();
    }

    // Update all active particles: apply gravity + update position
    const toRemove: SpatterParticle[] = [];

    for (let i = _activeParticles.length - 1; i >= 0; i--) {
      const particle = _activeParticles[i];
      const age = currentFrame - particle.birthFrame;

      // Check lifetime expiry
      if (isLifetimeExpired(age, particle.lifetime)) {
        toRemove.push(particle);
        _activeParticles.splice(i, 1);
        continue;
      }

      // Ballistic: velocity += gravity * dt
      applyGravity(particle.velocity, FRAME_DT_SECONDS);

      // Position += velocity * dt
      updatePosition(particle.position, particle.velocity, FRAME_DT_SECONDS);

      // Hide particle when below workpiece (y < 0)
      if (isBelowSurface(particle.position.y)) {
        toRemove.push(particle);
        _activeParticles.splice(i, 1);
      }
    }

    // Update visible particle meshes to match particle positions
    // Reuse mesh refs — no new allocations per frame
    for (let i = 0; i < _activeParticles.length && i < MAX_PARTICLES; i++) {
      const particle = _activeParticles[i];
      const mesh = particleRefs[i];
      mesh.position.copy(particle.position);
      mesh.visible = true;
      group.add(mesh);
    }

    // Hide unused mesh slots
    for (let i = _activeParticles.length; i < MAX_PARTICLES; i++) {
      particleRefs[i].visible = false;
    }

    // F-01: Frame budget assertion
    const elapsed = performance.now() - start;
    if (isFrameBudgetExceeded(elapsed, FRAME_BUDGET.SPATTER_SYSTEM)) {
      // eslint-disable-next-line no-console
      console.warn(
        `[DEV] SpatterSystem exceeded frame budget: ${elapsed.toFixed(2)}ms > ${FRAME_BUDGET.SPATTER_SYSTEM}ms`
      );
    }
  });

  return <group ref={groupRef} />;
}

export default SpatterSystem;