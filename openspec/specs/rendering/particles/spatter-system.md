# Delta for SpatterSystem

## ADDED Requirements

### Requirement: SpatterSystem reads lastSpatterBurst from store

The system SHALL read `lastSpatterBurst` from `arcSlice` state via `useWelderStore.getState()` inside `useFrame`. The renderer MUST clear the flag after consuming it (one-frame persistence pattern).

#### Scenario: lastSpatterBurst read on frame

- GIVEN `lastSpatterBurst = true` in store
- WHEN `SpatterSystem` `useFrame` fires
- THEN `getState().arc.lastSpatterBurst` is read
- AND the flag is cleared to `false` in the same tick

#### Scenario: No burst when flag is false

- GIVEN `lastSpatterBurst = false` in store
- WHEN `SpatterSystem` `useFrame` fires
- THEN no particle burst is triggered

### Requirement: Particle burst count proportional to arc.amperage

The system SHALL emit a number of particles proportional to `arc.amperage`. Higher amperage produces more spatter particles.

#### Scenario: High amperage produces many particles

- GIVEN `arc.amperage` is high (120A)
- WHEN a spatter burst triggers
- THEN a large number of particles are emitted (proportional count)

#### Scenario: Low amperage produces few particles

- GIVEN `arc.amperage` is low (70A)
- WHEN a spatter burst triggers
- THEN fewer particles are emitted

### Requirement: Particles follow ballistic trajectory

The system SHALL simulate particles with gravity. Each particle has an initial velocity and falls under gravitational acceleration.

#### Scenario: Particles fall due to gravity

- GIVEN a particle burst is emitted
- WHEN500ms elapses
- THEN particles have fallen downward relative to their initial trajectory

#### Scenario: Particles scatter in arc direction

- GIVEN a particle burst is emitted
- WHEN the initial frame renders
- THEN particles scatter outward from the arc tip

### Requirement: Particles cleaned up after burst

The system SHALL remove particles after their lifetime expires. Particles MUST NOT accumulate across multiple bursts (no memory leak).

#### Scenario: Particles removed after lifetime

- GIVEN a burst emits50 particles
- WHEN the particle lifetime (typically< 1s) expires
- THEN those particles are removed from the scene

#### Scenario: No particle accumulation across bursts

- GIVEN multiple spatter bursts occur over10 seconds
- WHEN the scene is inspected
- THEN particle count remains bounded (old particles cleaned up)

## Rollback Plan

1. Delete `src/rendering/particles/SpatterSystem.tsx` — purely additive
2. No side effects on engine or store
