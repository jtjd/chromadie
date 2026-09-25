# Shared progression node presentation — 2026-09-22

## Objective

Use one tested set of progression node metrics and labels in the profile
progression story and the dedicated Progression page.

## Audit

`ProfileProgression.svelte` and `ProgressionPageBoard.svelte` independently
implement unlock checks, node targets/current values, completion percentages,
goal pace copy, progress labels, and number formatting. These values describe
the same server-projected milestones but can drift between the embedded story
and the dedicated route. `progressionPresentation.js` already owns shared
focus-goal rules and the canonical unlock predicate.

## Plan

1. Add the shared number, node metric, pace, and progress-label helpers to
   `progressionPresentation.js`.
2. Replace the duplicate helpers in both Svelte consumers, preserving each
   surface's lifetime-EP fallback and page-specific focus copy.
3. Add direct tests for aliases, boundaries, pace bands, unlock state, and
   label output; update source contracts to point to the shared module.
4. Run the mandatory validation suite and record the outcome.

## Compatibility and risk

No data, RPC, reward, route, or visual design changes are intended. Keep
unlocked nodes at 100%/Complete, clamp partial progress to 100%, use lifetime EP
for rank nodes without explicit current progress, preserve EP-to-points copy,
and keep expected-roll/discovery wording unchanged. These helpers remain
presentation-only; progression eligibility and reward authority stay server
owned.

## Acceptance

- Both progression surfaces consume the same node metric and label helpers.
- Existing lane selection, focus ordering, rendered copy, and mobile behavior
  remain unchanged.
- Direct tests cover the shared metric and text contracts; full mandatory
  checks pass. No schema changes.

## Implementation

- Added shared number formatting, target/current calculation, completion
  percentage, expected-roll pace text, and progress labels to
  `progressionPresentation.js`.
- Replaced duplicate implementations in `ProfileProgression.svelte` and
  `ProgressionPageBoard.svelte`; small component wrappers only supply the
  current lifetime EP value.
- Extended direct tests for legacy field aliases, unlocked and clamped
  percentages, lifetime EP fallback, EP-to-points labels, discovery odds, and
  pace copy. Updated source contracts to verify both consumers use the shared
  module.

## Validation

- All required build, type, lint, test, link, CSP, performance, username policy,
  balance, catalog, scoring parity, and database security commands pass.
- All 693 tests pass. Route budgets pass; progression JavaScript is
  362.88/400 kB and its CSS is 113.63/115 kB. The lazy ProgressionPageBoard
  asset is 24.48 kB.
- Aggregate asset catalog overages remain advisory (JavaScript 1376.32/800 kB
  and CSS 670.46/400 kB). Catalog drift used the valid local seed because
  remote Supabase credentials were unavailable. No schema changes were made.
