# Roll reveal failure recovery — 2026-09-23

## Objective

Keep a server-confirmed roll visible and unlock roll controls if the staged
reveal unexpectedly rejects after the authoritative RPC has succeeded.

## Audit

`executeRollAttempt()` awaited the reveal without a recovery path. A rejected
presentation promise escaped `Game.initiateRoll()`, leaving `loading` and the
reroll lock active even though the server had committed the new roll. Guest
rolls are persisted before reveal; authenticated results need the already
received RPC payload projected immediately and account state refreshed.

## Plan

1. Add controller coverage for current and stale reveal rejections.
2. On a current rejection, report the presentation failure and normalize the
   already-confirmed server payload as the canonical result.
3. Continue through the existing result projection, guest completion or account
   refresh, and lock-release callbacks.
4. Add an integration regression test for a confirmed reroll whose reveal
   rejects, then run full required validation and update project records.

## Compatibility and risk

No roll RPC, payload, eligibility, scoring, rewards, storage key, schema, or
route changes are intended. The fallback canonical data is normalized from the
successful server response; it does not calculate or alter gameplay values.
Stale requests remain ignored, and normal reveal timing is unchanged.

## Acceptance

- A current reveal rejection reports the presentation issue and completes the
  attempt from the confirmed server result.
- A stale reveal rejection does not project data or report feedback.
- A confirmed reroll's current result is displayed and its loading/reroll locks
  are released after reveal failure.
- Full required validation passes; no schema changes are needed.

## Implementation

- `executeRollAttempt()` now catches a current reveal rejection, normalizes the
  confirmed RPC payload, and continues through canonical result application,
  guest completion or account refresh, and finalization. A stale rejection
  still exits through the existing stale callback without feedback.
- `Game.svelte` immediately applies the confirmed color and score, reports that
  the reveal did not finish, and then uses the existing result/lock lifecycle.
- Added controller tests for current and stale rejection plus a reroll
  integration regression test.

## Validation

- `npm run build`, `npm run check` (0 errors and warnings), `npx eslint src/`,
  and `npm test` pass; the suite reports 834 passing tests.
- Link, CSP, performance, username-policy, balance, catalog-drift, scoring
  parity, and database-security checks pass. Catalog drift used the valid local
  seed because remote Supabase credentials were unavailable.
- Route budgets pass: initial JavaScript is 277.57/300 kB, largest lazy
  JavaScript is 78.92/100 kB, dashboard JavaScript is 541.59/542 kB, and
  progression JavaScript is 360.86/400 kB. Aggregate JS/CSS catalog totals
  remain advisory overages at 1386.24/800 kB and 670.60/400 kB.
- No schema changes were made, so database lint and reset were not applicable.
