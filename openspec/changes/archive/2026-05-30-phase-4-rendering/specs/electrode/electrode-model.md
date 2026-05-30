# Delta for ElectrodeModel

## ADDED Requirements

### Requirement: ElectrodeModel renders 3D cylinder

The system SHALL render a 3D cylinder representing the consumable electrode rod. The mesh geometry MUST be a `CylinderGeometry` with appropriate dimensions for a3.2mm SMAW electrode.

#### Scenario: Electrode mesh renders

- GIVEN `ElectrodeModel` is mounted in the scene
- WHEN the scene renders
- THEN a cylinder mesh is visible representing the electrode

#### Scenario: Electrode geometry uses correct radius

- GIVEN `ElectrodeModel` is mounted
- WHEN the cylinder radius is inspected
- THEN it matches the 3.2mm electrode diameter (scaled for visualization)

### Requirement: currentLength drives visible electrode length

The system SHALL scale the electrode cylinder length proportional to `electrode.currentLength`. As the electrode depletes from 350mm toward 0mm, the visible rod shortens.

#### Scenario: Full electrode length

- GIVEN `electrode.currentLength = 350`
- WHEN `ElectrodeModel` renders
- THEN the cylinder length equals the full-scale electrode length

#### Scenario: Half-depleted electrode

- GIVEN `electrode.currentLength = 175`
- WHEN `ElectrodeModel` renders
- THEN the cylinder length is approximately half the full length

#### Scenario: Fully depleted electrode

- GIVEN `electrode.currentLength = 0`
- WHEN `ElectrodeModel` renders
- THEN the cylinder length is effectively zero (or the mesh is hidden)

### Requirement: electrode.type selects material and color

The system SHALL select the electrode material/color based on `electrode.type`. E6013 and E7018 electrodes MUST have visually distinct appearances.

#### Scenario: E6013 renders with rutile appearance

- GIVEN `electrode.type = 'E6013'`
- WHEN `ElectrodeModel` renders
- THEN the material color matches E6013 (typically lighter, silvery)

#### Scenario: E7018 renders with low-hydrogen appearance

- GIVEN `electrode.type = 'E7018'`
- WHEN `ElectrodeModel` renders
- THEN the material color matches E7018 (typically darker, matte)

### Requirement: isStuck triggers red glow indicator

The system SHALL apply a red emissive glow to the electrode mesh when `electrode.isStuck === true`.

#### Scenario: Stuck electrode glows red

- GIVEN `electrode.isStuck = true`
- WHEN `ElectrodeModel` renders
- THEN the electrode material has red emissive color

#### Scenario: Non-stuck electrode has no red glow

- GIVEN `electrode.isStuck = false`
- WHEN `ElectrodeModel` renders
- THEN the electrode material has no red emissive component

### Requirement: temperature affects color intensity

The system SHALL modulate the electrode material color intensity based on `electrode.temperature`. Higher temperature produces more intense/warmer color.

#### Scenario: Hot electrode appears brighter

- GIVEN `electrode.temperature` is high (near1.0)
- WHEN `ElectrodeModel` renders
- THEN the electrode color appears hotter/more intense

#### Scenario: Cold electrode appears neutral

- GIVEN `electrode.temperature` is low (near 0.0)
- WHEN `ElectrodeModel` renders
- THEN the electrode color appears cooler/more neutral

## Rollback Plan

1. Delete `src/rendering/electrode/ElectrodeModel.tsx` — purely additive
2. No side effects on engine or store
