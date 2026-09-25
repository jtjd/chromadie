# Progression journey model extraction — 2026-09-22

## Objective

Move lane construction and journey presentation-state projection out of the
large `ProfileProgression.svelte` component into a pure, directly tested model
shared by the embedded profile story and lazy Progress page.

## Audit

`ProfileProgression.svelte` currently selects rank, ritual, and discovery
records; filters published/non-legacy tracks; derives state fallbacks; groups
discovery roles; and computes completion and earned-cosmetic counts inline.
The resulting lane models are passed to `ProgressionPageBoard.svelte` in page
mode and rendered by the profile story otherwise.

## Plan

1. Add `progressionJourneyModel.js` with a single pure lane projection and no
   store, DOM, event, or server dependencies.
2. Replace the component-local track selection and lane builders with the
   helper while retaining its existing display variables and markup.
3. Add direct table-driven tests for source precedence, filtering, state
   precedence and fallbacks, discovery grouping, and derived counts; update
   the source contract to pin the component/helper boundary.
4. Run the mandatory validation suite and record results.

## Compatibility and risk

Keep `PROGRESSION_JOURNEY_LANES`, server-published records, the 32-node cap,
rank and track fallback behavior, unlocked aliases, state precedence,
discovery role aliases, discovery `new` handling, active-node limits, lane
ordering, and counters unchanged. This is a client-side projection only. No
RPC, schema, reward authority, route, copy, or UI change.

## Acceptance

- Both embedded and page-mode progression use the same tested projection.
- Direct tests cover the current precedence and compatibility behavior.
- Existing progression markup and server authority remain unchanged.
- Full mandatory checks pass; no schema changes.

## Implementation

Added `progressionJourneyModel.js` to select and cap track records, derive
presentation states, build the ordered lane models, and calculate the existing
summary counters. `ProfileProgression.svelte` now passes progression through
that model and retains the same variables consumed by its embedded markup and
`ProgressionPageBoard.svelte`. The component retains focus selection, display
formatting, interaction state, analytics, and reward previews.

Added direct tests for source precedence, filtering and caps, unlock aliases,
explicit state priority, rank fallback, active-node presentation, discovery
groups and `new` records, and derived counters. The existing source contract
now checks that the component uses the model.

## Validation

The mandatory suite passes: build, Svelte check (zero errors or warnings),
ESLint, 733 tests, links, CSP, performance, username policy, balance, catalog,
scoring parity, and database security. Initial JavaScript is 278.41/300 kB;
the progression route is 361.71/400 kB. Aggregate JavaScript and CSS catalogs
remain advisory overages. Catalog drift used the local seed because remote
Supabase credentials were unavailable. No schema changes.
