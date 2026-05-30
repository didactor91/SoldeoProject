# Delta for bead.buffers

## ADDED Requirements

### Requirement: MAX_STAMPS constant defines bead buffer capacity

The system SHALL define `MAX_STAMPS` as the maximum number of weld stamps before a session should end. This value MUST be exported from the module and MUST be settable via configuration without code changes.

#### Scenario: MAX_STAMPS used as buffer size

- GIVEN a weld session is in progress with `weldPoints.length` approaching `MAX_STAMPS`
- WHEN `BeadRenderer` checks `totalSegments >= MAX_STAMPS * 0.9`
- THEN a DEV warning is logged indicating buffer90% capacity

#### Scenario: MAX_STAMPS export

- GIVEN `bead.buffers.ts` is imported in any module
- WHEN `MAX_STAMPS` is referenced
- THEN the constant value is accessible as a named export

### Requirement: createBeadGeometry returns pre-allocated BufferGeometry

The system SHALL return a `BufferGeometry` with pre-allocated stamp buffers. The geometry MUST be created once and reused across frames without re-allocation.

#### Scenario: Geometry created with correct attribute sizes

- GIVEN `createBeadGeometry([])` is called with an empty array
- WHEN the returned geometry is inspected
- THEN it has `position`, `normal`, and `uv` attributes sized for `MAX_STAMPS` vertices

#### Scenario: Geometry reused across frames

- GIVEN a `BufferGeometry` returned from `createBeadGeometry`
- WHEN `writeStamp` is called multiple times with different points
- THEN no new `BufferGeometry` is created — the same instance is mutated

### Requirement: writeStamp mutates buffer in-place with zero allocations

The system SHALL mutate existing buffer attributes in-place. The function MUST NOT call `new`, create arrays, or produce garbage per invocation (A-03).

#### Scenario: writeStamp updates position attribute

- GIVEN a pre-allocated `BufferGeometry` with 100 stamps already written
- WHEN `writeStamp(buffer, newPoint, 50)` is called
- THEN attribute arrays at index50 are updated in-place
- AND no new TypedArrays are created

#### Scenario: writeStamp called repeatedly in useFrame

- GIVEN `useFrame` is running at 60Hz
- WHEN `writeStamp` is called every frame for 300 consecutive frames
- THEN zero garbage is produced (verify with performance.memory)

#### Scenario: writeStamp handles out-of-range index gracefully

- GIVEN `writeStamp(buffer, point, 99999)` is called with index beyond MAX_STAMPS
- WHEN the function executes
- THEN it returns early without crashing
- AND no attributes are modified

### Requirement: Pre-allocated reusable Vector3/Float32Array refs

The system SHALL hold reusable `Vector3` instances and `Float32Array` views at module scope. These refs MUST be used by `writeStamp` to avoid per-call allocation.

#### Scenario: Module-level refs exist

- GIVEN `bead.buffers.ts` is loaded
- WHEN the module is inspected
- THEN module-level `Vector3` refs exist for cross-frame reuse

#### Scenario: writeStamp uses pre-allocated refs

- GIVEN `writeStamp` is called with a point
- WHEN the internal computation runs
- THEN no `new Vector3()` or `new Float32Array()` calls occur

## Rollback Plan

1. Delete `src/rendering/bead/bead.buffers.ts` — purely additive
2. No side effects on other modules — engine and store are unaffected
