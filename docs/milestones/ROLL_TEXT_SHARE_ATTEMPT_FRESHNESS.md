# Roll text-share attempt freshness — 2026-09-23

## Objective

Prevent an older text-share attempt from showing warnings or copied feedback
after a newer attempt for the same roll has completed.

## Audit

`runRollTextShare` checks the current roll request and account before applying
challenge and clipboard outcomes. `Game.svelte` supplies that check using only
the roll request ID and account ID, so two clicks on the enabled share button
for the same roll both remain current. An older challenge failure can therefore
show a fallback warning after a newer share succeeds; a late clipboard outcome
can also publish stale feedback.

## Plan

1. Add tests for a later same-roll share invalidating earlier effects and for
   an older challenge failure completing after newer success.
2. Add a monotonically increasing text-share attempt ID to `Game.svelte` and
   combine it with existing request and account freshness.
3. Preserve the click-time result snapshot, server challenge creation,
   formatting, analytics, clipboard adapter, and copied-feedback timer.
4. Update the decision, progress, changelog, and milestone records; run the
   required validation suite.

## Compatibility and risk

No share payload, challenge endpoint, clipboard content, route, schema, RPC,
or gameplay authority changes are intended. An in-flight server challenge
request is not cancelled; once superseded, it cannot publish later client-side
warnings, analytics, copy writes, or copied-state effects.

## Acceptance

- Starting another share for the same roll makes the older attempt stale while
  preserving current roll-request and account checks.
- An older challenge failure completing after a newer successful share emits
  no warning or clipboard write.
- Existing guest, authenticated, fallback, clipboard failure, and stale-roll
  behavior remains covered.
- Full required validation passes. No schema changes are needed.

## Implementation

- Added `rollTextShareAttemptId` to `Game.svelte` and included its captured
  value in the helper's `isCurrent` predicate beside the existing roll and
  account checks.
- Added coverage for same-roll overlap and for the older challenge failure
  completing after a newer share succeeds.

## Validation

- Build, Svelte check (0 errors and warnings), ESLint, all 816 tests, links,
  CSP, performance, username policy, balance, catalog, scoring parity, and
  database security checks passed.
- Route budgets pass: initial JavaScript is 277.22/300 kB and dashboard
  JavaScript is 541.17/542.00 kB. Aggregate catalog JavaScript and CSS totals
  remain advisory overages. Catalog drift used the valid local seed because
  remote Supabase credentials were unavailable.
- No schema changed, so database lint and reset were not applicable.
