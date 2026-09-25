# Legacy Profile context-read lifecycle — 2026-09-23

## Objective

Prevent a pending legacy Profile context read from restoring data after the
Profile has reset for a route/account transition or has been destroyed.

## Audit

`Profile.svelte` already increments `loadRequestId` when a new context read
starts and checks it before applying the result. `resetProfileState()` cleared
the visible profile without invalidating that ID. When a reset was not followed
by another read, such as when the signed-in account disappeared, the pending
read could still match and repopulate the cleared state. Component teardown
disposed the separate Rivals lifecycle but did not invalidate this context
read.

## Plan

1. Add a direct regression test that starts a deferred context read, resets
   Profile state, and confirms the late result remains ignored.
2. Reuse the existing request ID as the freshness generation and invalidate it
   on state reset and component teardown.
3. Keep profile loading, accepted-result projection, and data fetching in the
   existing `Profile.svelte` and `profileData.js` boundaries.
4. Update decision, progress, changelog, and milestone records; run the
   required validation suite.

## Compatibility and risk

No query, field projection, route, RLS, RPC, schema, or public-profile contract
changes are intended. Current reads continue to populate Profile state; only
reads invalidated by reset or destruction are ignored. No schema changes are
needed.

## Acceptance

- Resetting Profile state invalidates any pending context read before it can
  restore profile, score, or achievement data.
- Component teardown invalidates the pending context read and still disposes
  the existing Rivals lifecycle.
- Current context-read behavior and the existing stale Rivals tests remain
  intact.
- Full required validation passes.

## Implementation

- Added `invalidateProfileContextLoad()` and call it from `resetProfileState()`
  and `onDestroy`, reusing the existing `loadRequestId` guard.
- Added a VM-backed deferred-read regression test proving a late result cannot
  repopulate state after reset.

## Validation

- `npm run build`, `npm run check`, `npx eslint src/`, and `npm test` pass;
  the suite reports 817 passing tests.
- Link, CSP, performance, username-policy, balance, catalog-drift, scoring
  parity, and database-security checks pass. Catalog drift used the valid local
  seed because remote Supabase credentials were unavailable.
- Initial JavaScript is 277.22/300 kB and dashboard JavaScript is
  541.17/542 kB; route budgets pass. Aggregate JS/CSS catalog targets remain
  advisory overages.
- No schema changes were made, so database lint and reset were not applicable.
