# Delta for ArcEffect

## ADDED Requirements

### Requirement: ArcEffect renders arc glow when arc.isActive

The system SHALL render an arc glow effect when `arc.isActive === true`. When inactive, the arc effect MUST NOT be visible.

#### Scenario: Arc visible when active

- GIVEN `arc.isActive = true`
- WHEN `ArcEffect` renders
- THEN a visible arc glow/spark effect is present in the scene

#### Scenario: Arc hidden when inactive

- GIVEN `arc.isActive = false`
- WHEN `ArcEffect` renders
- THEN no arc glow is visible

### Requirement: Point light positioned at arc tip

The system SHALL place a `PointLight` at the arc tip position. The light position SHALL be driven by `arc.arcLength` — longer arc length moves the light further from the electrode tip.

#### Scenario: Short arc length positions light close

- GIVEN `arc.arcLength` is at `L_optimal` (3.2mm)
- WHEN `ArcEffect` renders
- THEN the point light is positioned close to the electrode tip

#### Scenario: Long arc length positions light far

- GIVEN `arc.arcLength` is near `L_max` (6.0mm)
- WHEN `ArcEffect` renders
- THEN the point light is positioned further from the electrode tip

### Requirement: arc.voltage drives glow intensity

The system SHALL map `arc.voltage` to the arc glow brightness. Higher voltage produces a more intense glow.

#### Scenario: High voltage produces bright arc

- GIVEN `arc.voltage` is high (near 40V)
- WHEN `ArcEffect` renders
- THEN the arc glow is very bright

#### Scenario: Low voltage produces dim arc

- GIVEN `arc.voltage` is low (near V0 = 20V)
- WHEN `ArcEffect` renders
- THEN the arc glow is dimmer

### Requirement: arc.stability drives glow color and flicker

The system SHALL map `arc.stability` to arc glow color and flicker behavior. Stability< 0.5 SHALL trigger a visible flicker effect.

#### Scenario: Stable arc has consistent color

- GIVEN `arc.stability = 1.0`
- WHEN `ArcEffect` renders
- THEN the arc glow color is consistent (no flicker)

#### Scenario: Unstable arc flickers

- GIVEN `arc.stability = 0.3`
- WHEN `ArcEffect` renders
- THEN the arc glow visibly flickers

#### Scenario: Stability affects color temperature

- GIVEN `arc.stability` is high
- WHEN `ArcEffect` renders
- THEN the arc glow color skews toward blue/white (hot)
- AND when `arc.stability` is low, the color skews toward orange/red

## Rollback Plan

1. Delete `src/rendering/electrode/ArcEffect.tsx` — purely additive
2. No side effects on engine or store
