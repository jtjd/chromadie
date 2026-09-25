# App challenge lookup rejection recovery — 2026-09-23

## Objective

Resolve a challenge's loading banner when lookup transport rejects instead of
leaving the route in its loading state.

## Audit

`App.svelte` catches failure to dynamically import the challenge lifecycle,
but `challengeLifecycle.load()` awaited the actual lookup without a catch.
`parseRoute()` starts that promise without awaiting it. A rejected Supabase
function request therefore escaped without replacing the route's initial
`loading: true` challenge placeholder.

## Plan

1. Add tests for a current lookup rejection and an older rejection after a
   newer lookup has superseded it.
2. Catch lookup rejection in the challenge lifecycle and project the existing
   unavailable shape only if that request remains current.
3. Preserve existing result mapping, sender fallback, route invalidation, and
   lazy-loading boundary.
4. Run full required validation and update the project records.

## Compatibility and risk

No challenge endpoint, payload, route, schema, RPC, or authority changes are
intended. Errors use the existing challenge error normalizer and unavailable
banner; stale rejected lookups remain ignored. The fix stays inside the
challenge-only dynamically loaded lifecycle.

## Acceptance

- A current rejected lookup resolves and replaces loading with an error state.
- A superseded rejected lookup cannot replace a newer challenge result.
- Existing success, resolved error, route invalidation, and dismissal behavior
  remain intact.
- Full required validation passes; no schema changes are needed.

## Implementation

- `challengeLifecycle.load()` now catches rejected lookups, checks request
  freshness, normalizes the error, and writes `loading: false` with the route's
  sender fallback.
- Added direct tests for current and superseded rejected promises.

## Validation

- `npm run build`, `npm run check` (0 errors and warnings), `npx eslint src/`,
  and `npm test` pass; the suite reports 829 passing tests.
- Link, CSP, performance, username-policy, balance, catalog-drift, scoring
  parity, and database-security checks pass. Catalog drift used the valid local
  seed because remote Supabase credentials were unavailable.
- Route budgets pass: initial JavaScript is 277.57/300 kB and dashboard
  JavaScript is 541.53/542 kB. Aggregate JS/CSS catalog totals remain advisory
  overages at 1385.96/800 kB and 670.60/400 kB.
- No schema changes were made, so database lint and reset were not applicable.
