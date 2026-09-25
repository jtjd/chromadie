# Daily Roll result presentation helpers — 2026-09-22

## Objective

Move the display-only contributor score breakdown and descending badge
presentation order out of `Game.svelte` into the existing `rollPresentation.js`
domain module. Keep canonical result data and all gameplay authority unchanged.

## Audit

`Game.svelte` currently owns three pure result projections: contributor points,
the residual score shown as the base contribution, and badge ordering by
`getBadgeMeta(...).points`. The same component applies the projections when it
hydrates a saved result and when a confirmed roll completes. `rollPresentation.js`
already owns percentile labels and validated authoritative badge IDs, so the
result-only helpers fit its existing boundary. These values are presentation
inputs; they do not calculate or change the server score.

## Plan

1. Add direct tests for contributor-point fallback, residual display score,
   non-negative clamping, badge ordering, and input immutability.
2. Move the pure helpers into `rollPresentation.js` and route the component's
   hydration, completed-result, and template paths through them.
3. Update source assertions to protect the new module boundary and preserve the
   existing badge metadata source.
4. Run the mandatory validation suite and record the evidence in project logs.

## Compatibility and risk

No migration, route, or backend change is expected. The displayed base score
must remain `max(0, total display score - contributor display points)`, with
the same `awardedPoints`/`points` fallback and display-score fallback order.
Badge ordering continues to use the existing canonical `getBadgeMeta` point
values. No client-side scoring, reward, rarity, or eligibility logic is added.

## Acceptance

- `Game.svelte` delegates these pure projections to `rollPresentation.js`.
- Direct unit tests lock the current numeric and badge-order behavior.
- The canonical response and all roll lifecycle, reveal, and persistence
  boundaries remain unchanged.
- No visible, route, schema, or gameplay change; full mandatory checks pass.

## Implementation and validation — 2026-09-22

Added `getDisplayedBaseRollScore` and `sortRollBadgesDescending` to
`rollPresentation.js`. The displayed base amount retains the existing total
fallback, `awardedPoints`/`points` precedence, and zero clamp. Badge ordering
uses `getBadgeMeta` and returns a sorted copy. `Game.svelte` keeps ownership of
hydration assignment, confirmed-result lifecycle, and rendering.

Direct and source tests cover the helper contracts and component boundary. The
focused Roll suite passes (25 tests); the full suite passes (655 tests). Build,
Svelte check, ESLint, links, CSP, performance, username policy, balance, local
catalog, scoring parity, and database security checks pass. The catalog check
used the local seed because remote Supabase credentials were unavailable. No
migration or authority change was needed.
