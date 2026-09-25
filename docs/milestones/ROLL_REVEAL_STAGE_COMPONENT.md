# Daily Roll reveal stage component — 2026-09-22

## Objective

Move the existing `phase === 'rolling'` markup and its stage-specific styles
out of `Game.svelte` while retaining request orchestration and reveal state in
the parent.

## Audit

`Game.svelte` already delegates request sequencing, reveal timing, score
presentation helpers, hydration, persistence, and image sharing. It still
owns the full rolling-stage view alongside the pre-roll and results states.
The reveal sequence scrolls the condition list through a DOM reference held by
the component; skip input updates parent-owned reveal state.

## Plan

1. Add a presentation-only `RollRevealStage.svelte` that receives the existing
   reveal state, exposes the condition-list element, and emits skip input.
2. Move the rolling branch and its mobile/reduced-motion styles into the child
   without changing markup, layout wrappers, or accessibility attributes.
3. Add focused component-boundary coverage and update existing Roll source
   contracts to follow the view into its new module.
4. Run the mandatory validation suite and record the result.

## Compatibility and risk

No URL, data, RPC, scoring, eligibility, rarity, reward, or account contract
changes are intended. Preserve the current root element, reveal title and
status, condition visibility stages, score live region, progress bar values,
skip button, responsive heights, and reduced-motion behavior. `Game.svelte`
continues to own the scroll callback, count-up, skip handling, request identity,
stale checks, and confirmed result. No schema change is needed.

## Acceptance

- `Game.svelte` mounts the new stage with the same canonical display values.
- The stage returns the condition-list DOM element and routes skip input to
  the existing parent handler.
- Accessible reveal states, mobile styling, and reduced-motion rules remain in
  the extracted view; no gameplay authority enters the component.
- Full mandatory checks pass; no schema changes.

## Implementation

Added `RollRevealStage.svelte` with the existing rolling-stage markup,
accessibility attributes, responsive stage rules, and reduced-motion rules.
`Game.svelte` supplies the canonical presentation values, binds the condition
list element used by the existing scroll callback, and handles the emitted
skip event. Request orchestration, eligibility, stale checks, reveal timing,
confirmed results, and score state remain in their existing parent/controller
boundaries. Updated Roll source-contract tests and added focused component
boundary coverage. No schema, RPC, URL, or data changes.

## Validation

The required validation suite passes: build, Svelte check, ESLint, 714 tests,
links, CSP, performance, username-policy, balance, catalog, scoring parity,
and database-security checks. The browser Roll reliability smoke also passes,
including normal and reduced-motion reveals, skip, failed reroll recovery,
account changes during a pending roll, and responsive widths from 320 to 1440
pixels. Initial JavaScript is 278.33/300 kB; largest lazy JavaScript is
78.92/100 kB; route JavaScript budgets pass (auth 298.47/300 kB, homepage
486.83/501 kB, public profile 471.49/475 kB, dashboard 541.90/542 kB, and
progression 361.49/400 kB). The performance check retains advisory aggregate
catalog overages. Catalog verification used the local seed because remote
Supabase credentials were unavailable.
