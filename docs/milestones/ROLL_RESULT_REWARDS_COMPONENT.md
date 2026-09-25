# Daily Roll result rewards component — 2026-09-22

## Objective

Move the non-dedicated Roll bonus and achievement rows into a small
presentation component without moving badge classification or reward authority.

## Audit

`Game.svelte` owns the authoritative result state and already delegates the
result hero, breakdown, pre-roll, and reveal stage. It still contains two
display-only sections for wallet bonuses and newly earned achievements, plus
their small-screen styles. The rows resolve each existing badge ID through
the canonical `getBadgeMeta` module.

## Plan

1. Add `RollResultRewards.svelte` to render the existing grid and two sections.
2. Keep the `!dedicated` condition in `Game.svelte`, pass the existing badge
   arrays, and retain the empty grid wrapper when both arrays are empty.
3. Move only the reward-row-specific styles and add focused source-contract
   coverage; update Roll page source assertions to follow the component.
4. Run the mandatory validation suite and Roll reliability browser smoke.

## Compatibility and risk

Preserve the current section labels and IDs, row ordering, symbol fallbacks,
description handling, localized point formatting, `Granted` wording, and
responsive badge wrapping. Keep badge lookup canonical. `Game.svelte` remains
the owner of result arrays, authentication and dedicated-mode gating, scoring,
wallet rewards, and all actions. No URL, data, RPC, or schema changes.

## Acceptance

- The result page mounts the reward component only for the existing non-
  dedicated branch and passes the unchanged badge arrays.
- Empty results preserve the existing `.roll-detail-grid` wrapper behavior.
- Shared Roll selectors, accessible labels, and responsive styles continue to
  target the same class names.
- Full mandatory checks pass; no schema changes.

## Implementation

Added `RollResultRewards.svelte` for the existing wallet-bonus and achievement
sections. It imports the canonical badge metadata lookup and receives the
existing `systemBadges` and `earnedAchievements` arrays. `Game.svelte` retains
the non-dedicated guard and always-mounted grid wrapper, along with all result
state and reward decisions. Moved the matching base and mobile row styles to
the child. Updated Roll page source contracts and added focused coverage for
props, ordering, labels, metadata, responsive styles, and the component
boundary. No schema, RPC, URL, or data changes.

## Validation

The required validation suite passes: build, Svelte check with zero warnings,
ESLint, 716 tests, links, CSP, performance, username-policy, balance, catalog,
scoring parity, and database-security checks. The Roll reliability browser
smoke passes, including confirmed-result and retry flows, reduced and normal
motion, skip, stale-account protection, the share dialog, and responsive
viewports from 320 to 1440 pixels. Initial JavaScript is 278.33/300 kB and
largest lazy JavaScript is 78.92/100 kB; all route budgets pass. Aggregate
catalog totals remain advisory overages (JavaScript 1378.06/800 kB and CSS
670.52/400 kB). Catalog verification used the local seed because remote
Supabase credentials were unavailable.
