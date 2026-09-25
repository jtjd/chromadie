# Social follow action lifecycle — 2026-09-23

## Objective

Prevent an in-flight follow toggle from changing a later account's client state,
and recover the shared follow controls when the RPC transport rejects.

## Audit

`toggleFollow()` updated the shared `followedUsers` store and showed feedback
whenever its RPC resolved, even if authentication had since cleared that
store. A late response from account A could therefore mutate account B's
Rivals list. The function also handled Supabase's returned `error` value but
not a rejected network promise. Rejection escaped before feedback or failure
return, leaving Profile and Leaderboard loading flags set.

## Plan

1. Add deferred-RPC tests for follow success and for success/rejection after
   account state is cleared.
2. Move the action's request, feedback, store updates, and clear-generation
   guard behind a directly testable lifecycle used by the existing exports.
3. Convert rejected RPC transport into the existing error toast and failure
   result; use `finally` in the Profile and Leaderboard loading controls.
4. Update project records and run the full required validation suite.

## Compatibility and risk

The existing `toggle_follow` RPC name, payload, server authority, return values
for resolved responses, follow cap, and user-facing success/error messages
remain unchanged. Clearing social state invalidates pending client effects;
the underlying RPC still completes under its original authenticated request.
No schema, RLS, route, or scoring changes are needed.

## Acceptance

- An old account's response cannot update `followedUsers` or display feedback
  after social state is cleared for an account transition.
- A rejected current RPC returns `{ success: false }`, shows the established
  error feedback, and leaves followed state unchanged.
- Successful current toggles keep their existing store and toast behavior.
- Profile and Leaderboard loading flags are released if a handler rejects.
- Full required validation passes; no schema changes are needed.

## Implementation

- Added `createSocialFollowLifecycle()` with a generation invalidated by
  `clearSocialState()`, stale completion suppression, and rejected-transport
  recovery.
- Kept `socialState.js` exports stable and routed Profile/Leaderboard lock
  cleanup through `finally` blocks.
- Added deferred account-transition tests, success and rejection coverage, and
  direct loading-lock recovery tests for both consumers.

## Validation

- `npm run build`, `npm run check` (0 errors and warnings), `npx eslint src/`,
  and `npm test` pass; the suite reports 827 passing tests.
- Link, CSP, performance, username-policy, balance, catalog-drift, scoring
  parity, and database-security checks pass. Catalog drift used the valid local
  seed because remote Supabase credentials were unavailable.
- Route budgets pass: initial JavaScript is 277.57/300 kB and dashboard
  JavaScript is 541.53/542 kB. Aggregate JS/CSS catalog totals remain advisory
  overages at 1385.81/800 kB and 670.60/400 kB.
- No schema changes were made, so database lint and reset were not applicable.
