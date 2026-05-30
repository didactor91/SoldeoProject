// src/rendering/scene.pure.ts — Pure functions extracted from Scene
// These functions contain zero allocations and no framework imports

/**
 * Checks if frame time exceeded the budget.
 * Returns true if elapsed > budget.
 *
 * @param elapsedMs Elapsed time in milliseconds
 * @param budgetMs Budget in milliseconds
 * @returns true if frame budget was exceeded
 */
export function checkFrameBudget(elapsedMs: number, budgetMs: number): boolean {
  return elapsedMs > budgetMs;
}

/**
 * Gets the current frame count from a ref.
 * This is a simple accessor for frame counting.
 *
 * @param frameCountRef Current frame count
 * @returns The frame count value
 */
export function getFrameCount(frameCountRef: { current: number }): number {
  return frameCountRef.current;
}

/**
 * Increments and returns the next frame count.
 * Pure function version of frame counter increment.
 *
 * @param currentCount Current frame count
 * @returns Next frame count (current + 1)
 */
export function incrementFrameCount(currentCount: number): number {
  return currentCount + 1;
}
