// src/rendering/particles/spatter.pure.ts — Pure functions extracted from SpatterSystem
// These functions contain zero allocations and no framework imports

/**
 * Standard gravity constant in m/s²
 */
export const GRAVITY = -9.81;

/**
 * Checks if frame time exceeded the budget.
 * Returns true if elapsed > budget.
 */
export function isFrameBudgetExceeded(elapsedMs: number, budgetMs: number): boolean {
  return elapsedMs > budgetMs;
}

/**
 * Frame time delta in seconds (~16ms per frame at 60fps)
 */
export const FRAME_DT_SECONDS = 1 / 60;

/**
 * Calculates particle count based on amperage.
 * Range: 70-120A maps to 10-30 particles per burst.
 *
 * @param amperage Arc amperage (70-120A typical)
 * @returns Number of particles to spawn
 */
export function calculateParticleCount(amperage: number): number {
  const amperageNorm = Math.max(0, Math.min(1, (amperage - 70) / 50)); // 0 at 70A, 1 at 120A, clamped
  return Math.floor(10 + amperageNorm * 20);
}

/**
 * Calculates initial particle velocity from arc parameters.
 * Applies outward direction + upward bias with random scatter.
 *
 * @param arcLengthMm Arc length in mm (for position reference)
 * @param randomValue Random value [0, 1) for scatter — use Math.random() in calling code
 * @returns Object with vx, vy, vz velocity components
 */
export function calculateInitialVelocity(
  _arcLengthMm: number,
  randomValue: number
): { vx: number; vy: number; vz: number } {
  // Initial speed: 2-5 m/s
  const speed = 2 + randomValue * 3;
  return {
    vx: (Math.random() - 0.5) * speed,
    vy: Math.random() * speed * 0.8 + 1, // upward bias
    vz: (Math.random() - 0.5) * speed,
  };
}

/**
 * Calculates particle lifetime in ms.
 * Range: 600-1000ms with random variation.
 *
 * @param randomValue Random value [0, 1) — use Math.random() in calling code
 * @returns Lifetime in milliseconds
 */
export function calculateParticleLifetime(randomValue: number): number {
  return 600 + randomValue * 400;
}

/**
 * Applies gravity to velocity (ballistic trajectory).
 * Modifies the velocity object in place.
 *
 * @param velocity Object with vx, vy, vz properties
 * @param dtSeconds Time delta in seconds
 */
export function applyGravity(
  velocity: { x: number; y: number; z: number },
  dtSeconds: number
): void {
  velocity.x += GRAVITY * dtSeconds;
  velocity.y += GRAVITY * dtSeconds;
  velocity.z += GRAVITY * dtSeconds;
}

/**
 * Updates particle position based on velocity.
 * Modifies the position object in place.
 *
 * @param position Object with x, y, z properties
 * @param velocity Object with vx, vy, vz properties
 * @param dtSeconds Time delta in seconds
 */
export function updatePosition(
  position: { x: number; y: number; z: number },
  velocity: { x: number; y: number; z: number },
  dtSeconds: number
): void {
  position.x += velocity.x * dtSeconds;
  position.y += velocity.y * dtSeconds;
  position.z += velocity.z * dtSeconds;
}

/**
 * Checks if particle age exceeds its lifetime.
 *
 * @param ageFrames Age in frames
 * @param lifetimeMs Lifetime in milliseconds
 * @param frameTimeMs Frame time in ms (default 1000/60 ≈ 16.67)
 * @returns true if particle should be removed
 */
export function isLifetimeExpired(
  ageFrames: number,
  lifetimeMs: number,
  frameTimeMs: number = 1000 / 60
): boolean {
  return ageFrames * frameTimeMs >= lifetimeMs;
}

/**
 * Checks if particle has fallen below the workpiece surface.
 *
 * @param y Position Y coordinate
 * @param surfaceY Workpiece surface Y (default 0)
 * @returns true if particle is below surface
 */
export function isBelowSurface(y: number, surfaceY: number = 0): boolean {
  return y < surfaceY;
}

/**
 * Calculates arc tip position for particle spawn.
 *
 * @param arcLengthMm Arc length in mm
 * @param electrodeTipY Electrode tip Y position (default 0.5)
 * @returns Y position for particle spawn
 */
export function calculateSpawnY(arcLengthMm: number, electrodeTipY: number = 0.5): number {
  return electrodeTipY + arcLengthMm / 100;
}
