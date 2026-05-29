# Tasks: phase-0-foundation

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~400 (4 files × ~100 lines each) |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | auto-chain (received from orchestrator) |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Constants, types, utilities (4 files) | PR 1 | Phase 0 foundation — all independent foundation files |

## Phase 1: Foundation Modules

- [ ] 1.1 Create `src/app/constants.ts` — ELECTRODE_PROFILES (E6013), DRIFT_CONFIG (school/professional/expert), INPUT_RATES
  - No magic numbers — every numeric value is a named constant
  - All exports use `as const` assertion
  - Header comment per Rule D-03

- [ ] 1.2 Create `src/app/store/types.ts` — domain types: ElectrodeState, ArcState, InputState, WeldPoint, SessionState, FrameResult
  - Named exports for all types
  - No duplicate types in codebase (Rule A-06)
  - Header comment per Rule D-03

- [x] 1.3 Create `src/engine/drift/perlin.ts` — deterministic seedable Perlin noise
  - `perlin(x, seed?)` returns value in [-1, 1]
  - Zero allocations in function calls (no `new`, no array creates)
  - Pure TypeScript — no framework imports
  - Pre-computed permutation table at module level
  - Header comment per Rule D-03

- [ ] 1.4 Create `src/engine/scoring/gaussian.utils.ts` — `gaussian(x, mu, sigma)` helper
  - Returns value in (0, 1] range
  - Guard sigma=0 edge case (x===mu returns 1, else 0)
  - Zero allocations — pure math only
  - Pure TypeScript — no framework imports
  - Header comment per Rule D-03

## Verification Criteria

- [ ] All 4 files compile under TypeScript strict mode
- [ ] No external npm dependencies introduced
- [ ] No magic numbers in any file
- [ ] Each file has header comment (Rule D-03)
- [ ] All constants use `as const` assertion
- [ ] Zero allocations verified — no `new` or array creates in hot-path functions