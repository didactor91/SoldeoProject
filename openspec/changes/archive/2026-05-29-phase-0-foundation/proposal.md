# Proposal: phase-0-foundation

## Intent

Implement **Phase 0 — Foundation** modules per AGENT-RULES-001-SMAW §B. Phase 0 has zero dependencies and must be fully complete before any Phase 1+ engine modules can begin. These files define physical constants, domain types, and pure utility functions used by every downstream module.

## Scope

### In Scope
- `src/app/constants.ts` — All physical constants, ELECTRODE_PROFILES, DRIFT_CONFIG, INPUT_RATES. No magic numbers anywhere.
- `src/app/store/types.ts` — All domain types: ElectrodeState, ArcState, InputState, WeldPoint, SessionState, FrameResult. Single source, no duplicates.
- `src/engine/drift/perlin.ts` — Deterministic (seedable) Perlin noise implementation. Pure TypeScript, no allocations, no external dependencies.
- `src/engine/scoring/gaussian.utils.ts` — Gaussian scoring factor helpers per RFC-002 §5.5: `gaussian(x, μ, σ) = exp(-0.5 · ((x-μ)/σ)²)`.

### Out of Scope
- No engine modules (ArcEngine, WeldEngine, ScoringEngine — Phase 1+)
- No input handlers, no render loop, no session orchestration
- No test runner (Vitest deferred to Phase 1)
- No quality tooling (linting, type-checking CI — deferred)

## Capabilities

### New Capabilities
- `phase-0-foundation`: Foundation layer providing constants, domain types, and pure math utilities for the entire simulator.

### Modified Capabilities
- None — greenfield Phase 0, no existing specs affected.

## Approach

Straight implementation per SDD-001 §5 and RFC-002 §5–6. No exploration needed; specs are complete and unambiguous.

| File | Spec source |
|------|-------------|
| `src/app/constants.ts` | SDD-001 §5 + RFC-002 §5.6 |
| `src/app/store/types.ts` | SDD-001 §2.1.2 |
| `src/engine/drift/perlin.ts` | RFC-002 §6.1 |
| `src/engine/scoring/gaussian.utils.ts` | RFC-002 §5.5 |

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/app/constants.ts` | New | ELECTRODE_PROFILES, DRIFT_CONFIG, INPUT_RATES, melt/speed/geometry constants |
| `src/app/store/types.ts` | New | All domain types exported as single source of truth |
| `src/engine/drift/perlin.ts` | New | Deterministic noise for drift model |
| `src/engine/scoring/gaussian.utils.ts` | New | Gaussian function used by Arc, Scoring, Weld engines |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| No test runner yet | Medium | Write trivial compile-check only; Vitest set up in Phase 1 |
| No quality tools yet | Low | ESLint/Prettier deferred to Phase 1 |
| Greenfield — no fallback | Low | Specs are complete; implementation is mechanical |

## Rollback Plan

Delete the four files. No other code depends on them yet (Phase 1 has not started). git rm + commit.

## Dependencies

- None — Phase 0 is the base with zero dependencies.

## Success Criteria

- [ ] `src/app/constants.ts` compiles and exports ELECTRODE_PROFILES, DRIFT_CONFIG, INPUT_RATES matching all values in SDD-001 §5
- [ ] `src/app/store/types.ts` exports all 6 domain types matching SDD-001 §2.1.2
- [ ] `src/engine/drift/perlin.ts` produces deterministic output given the same seed
- [ ] `src/engine/scoring/gaussian.utils.ts` matches the formula in RFC-002 §5.5
- [ ] No magic numbers anywhere in source
- [ ] No external npm dependencies introduced