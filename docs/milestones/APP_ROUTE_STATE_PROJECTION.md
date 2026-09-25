# App route state projection — 2026-09-22

## Objective

Separate parsed URL state projection from the browser and asynchronous effects
in `App.svelte` so route compatibility can be tested without mounting the app.

## Audit

`parseRouteLocation` already parses URLs without side effects, and
`resolveRouteTarget` already maps application state to a lazy route component.
Between those boundaries, `App.svelte` still branches across auth, alias,
username, challenge, and ordinary app routes to populate its Svelte state.
Alias/challenge request invalidation and their async loaders are interleaved
with that projection.

## Plan

1. Add a pure route-state projector from the existing parsed route record.
2. Keep location parsing, stale-request invalidation, `/shop` replacement,
   alias/challenge loading, route tracking, and header transitions in
   `App.svelte`.
3. Add direct tests for auth, alias, canonical/legacy profile, challenge, and
   ordinary app state; update App route contracts to protect the side-effect
   boundary.
4. Run the mandatory validation suite and record the outcome.

## Compatibility and risk

No database, RPC, route URL, metadata, or deployment changes are expected.
Preserve selected user IDs for root query routes, legacy profile flags,
account/auth query values, unresolved alias state, authoritative challenge
loading placeholders, stale-request guards, and route/tab initialization.

## Acceptance

- `App.svelte` delegates the parsed-route branch mapping to a pure tested
  module.
- Alias and challenge reads remain in the app adapter and retain stale response
  guards.
- Existing route parsing, URL compatibility, lazy target selection, and
  navigation tests pass.
- Full mandatory checks pass; no schema changes.

## Implementation

- Added `routeState.js` to project the existing parser result into normalized
  App route state and explicit alias/challenge lookup intents.
- Reduced `parseRoute()` to request invalidation, location/header handling,
  applying the projection, launching the existing async reads, and route
  tracking. Alias and challenge stale-response checks remain in `App.svelte`.
- Added direct projection tests for auth, alias, root and compatibility
  profiles, challenge paths, query-based profile state, and ordinary tabs.

## Validation

- All required build, type, lint, test, link, CSP, performance, username policy,
  balance, catalog, scoring parity, and database security commands pass.
- All 691 tests pass. Route budgets pass; initial JavaScript is
  279.72/300 kB, auth is 298.94/300 kB, homepage is 487.98/501 kB, public
  profile is 471.90/475 kB, and dashboard is 541.50/542 kB.
- The performance check reports advisory aggregate catalog overages
  (JavaScript 1377.26/800 kB and CSS 670.46/400 kB). Catalog drift used the
  valid local seed because remote Supabase credentials were unavailable. No
  schema changes were made.
