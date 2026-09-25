# Profile Rivals read lifecycle — 2026-09-23

## Objective

Move the legacy Profile component's owner-only Rivals query behind a small,
directly testable lifecycle that rejects results after the followed-user scope
changes or the component is disposed.

## Audit

`Profile.svelte` fetches today's leaderboard rows for the owner's followed
users from `afterUpdate`. It clears the visible list when the owner has no
followed users, but an older in-flight query can still repopulate that list
after the scope changes. The query also has no direct behavioral coverage.
`RouteOutlet` keys profile components by route target, so a profile route
change remounts the legacy renderer; followed-user changes still happen while
the owner component remains mounted.

## Plan

1. Add lifecycle tests for owner gating, empty-list invalidation, stale
   followed-user results, repeated signatures, disposal, and the existing
   Supabase query contract.
2. Add a small `profileRivalLifecycle.js` module that owns the exact current
   leaderboard query and applies only the latest result through a callback.
3. Wire the legacy `Profile.svelte` to invalidate on profile-scope changes and
   dispose on component teardown; keep Svelte state and rendering in the
   component.
4. Update the decision, progress, and changelog records, then run the required
   validation suite.

## Compatibility and risk

No schema, RPC, authorization, leaderboard fields, filters, ordering, profile
route selection, or rendered layout changes are intended. The query remains
limited to the authenticated owner's followed user IDs and today's public
leaderboard projection. Errors keep the existing console message and empty
data fallback. The controller only prevents results from an obsolete scope
from replacing the current list.

## Acceptance

- Non-owners and empty followed lists issue no query and clear visible Rivals.
- An outdated response cannot replace the latest followed-user scope, including
  after the list becomes empty or the component is disposed.
- Repeated updates with the same profile and followed-user signature do not
  issue duplicate queries.
- The exact selected fields, today's date filter, followed-user filter, and
  deterministic ordering remain covered.
- The legacy route and server-side privacy boundaries remain unchanged.
- Full required validation passes; no schema changes are needed.

## Implementation

- Added `profileRivalLifecycle.js` for the existing owner-only today query,
  repeated-signature deduplication, and generation-based stale-result checks.
- `Profile.svelte` now invalidates reads when profile state resets, syncs the
  live owner/follow scope after updates, and disposes the lifecycle on teardown.
- Added direct tests for query fields and ordering, owner and empty-list gates,
  followed-list and profile-scope races, repeated signatures, error fallback,
  and disposal.

## Validation

- `npm run build`, `npm run check` (0 errors and warnings), `npx eslint src/`,
  all 799 tests, links, CSP, performance, username policy, balance, catalog,
  scoring parity, and database security checks passed.
- Route budgets pass; dashboard JavaScript is 540.94/542.00 kB. Aggregate asset
  catalog targets remain advisory overages (JavaScript 1384.12/800 kB and CSS
  670.58/400 kB). Catalog drift used the valid local seed because Supabase
  connection credentials were unavailable.
- No schema changed, so database lint and reset were not applicable.
