# App challenge route lifecycle — 2026-09-22

## Objective

Move challenge transport and result mapping behind a challenge-only dynamic
import while preserving route parsing, the loading banner, synchronous URL
cleanup, navigation ordering, and the existing challenge endpoint.

## Audit

`resolveRouteState()` already projects explicit `/c/<id>` routes into an
immediate loading placeholder and separate lookup intent. `App.svelte` owns
the challenge request invalidation, success/error result mapping, query
cleanup, and navigation predicate. Challenge links are uncommon; loading their
transport and result controller on every route adds to the dashboard's tight
JavaScript budget. Existing navigation tests cover guard and history order,
but lookup mapping and challenge URL cleanup lack direct tests.

## Plan

1. Add direct tests for success/error projection, stale results, and URL
   cleanup rules.
2. Dynamically import `challengeLifecycle.js` only when an explicit challenge
   route starts its lookup; keep a synchronous generation guard in App while
   that module is loading.
3. Keep route state, loading placeholder, synchronous dismissal URL cleanup,
   challenge banner, metadata, and navigation orchestration in `App.svelte`.
4. Run the full required suite, confirm dashboard route performance, and
   update the project logs.

## Compatibility and risk

This is a client-side code-splitting change. No schema, migration, endpoint,
RPC, route, or challenge data contract changes are expected. Preserve lookup
only for explicit challenge paths; reject results while the dynamic module is
loading after route change or dismissal; retain the current success/error
state shape; remove only `challenge`, `hex`, and `from` when clearing query
state; and preserve `/c/` redirect to `/` plus query/hash retention on other
paths. Keep guard → challenge cleanup → `pushState` → route parse → focus
ordering and allow navigation between challenge paths without clearing active
state. Challenge-only code should remain outside non-challenge route payloads.

## Acceptance

- Challenge loading and URL path selection are directly testable outside
  `App.svelte`.
- App still renders the route-projected loading state before the lookup
  resolves and continues to own route/presentation state.
- Stale lookups cannot overwrite the current route or a dismissed challenge,
  including while the dynamic module is loading.
- Existing route, URL, and navigation behavior remains covered.
- Challenge-only code is dynamically loaded and route performance budgets pass.
- Full mandatory checks pass; no backend authority changes.

## Implementation

Split creation and lookup transport into `challenges.js` and
`challengeLookup.js`, with shared endpoint and error definitions in
`challengeTransport.js`. The lookup controller and transport are dynamically
imported only for explicit challenge routes. App retains a synchronous
generation guard while that import is pending, route-projected loading data,
challenge state, and dismissal/navigation coordination. Import failures
resolve the current placeholder to an unavailable state; stale failures are
ignored. `getChallengeClearPath()` keeps synchronous history cleanup directly
testable without waiting for the lazy chunk. The challenge banner, endpoint
payloads, and navigation ordering are unchanged.

Tests cover challenge create/get payloads, server/fallback sender selection,
success/error mapping, invalidated and superseded results, challenge/root URL
cleanup, and App's lazy wiring/error fallback.

## Validation

Passed the required build, Svelte check, source ESLint, full test suite (769
tests), links, CSP, performance, username policy, balance, catalog, scoring
parity, and database security checks. Initial JavaScript is 277.96/300 kB and
dashboard route JavaScript is 541.53/542 kB. The lookup operation and lifecycle
are loaded only with explicit challenge routes; challenge creation retains its
current Roll path. Aggregate asset catalog targets remain advisory overages.
Catalog drift used the valid local seed because remote Supabase credentials
were unavailable. No schema lint or database reset was applicable.
