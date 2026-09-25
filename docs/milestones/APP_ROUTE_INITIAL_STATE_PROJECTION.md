# App route initial-state projection — 2026-09-22

## Objective

Use the same pure route-state projection for the first browser render and later
route changes, removing the duplicate URL-to-App-state mapping.

## Audit

Mounted navigation already called `resolveRouteState()` from `routeState.js`,
but the initial App state still read fields such as `view`, auth parameters,
profile identity, alias state, and challenge data directly from the parser
record. That duplicate mapping could drift from the route behavior exercised by
the direct projection tests.

## Plan

1. Project the synchronously parsed initial route through `resolveRouteState()`.
2. Initialize the first-render route fields from that projection while keeping
   alias/challenge reads and selected-user store updates in mounted `parseRoute()`.
3. Add a regression for both initialization paths and update the existing
   direct-refresh source contract.
4. Run the mandatory validation suite and record the result.

## Compatibility and risk

This is a frontend-only refactor. Keep the initial parse before `RouteOutlet`
so direct refreshes still choose the correct lazy split point before the first
render. The initial projection must not start browser reads or history changes;
mounted `parseRoute()` continues to own those effects, stale-request guards,
and selected-user store updates. No URL, route, auth, privacy, data, or backend
contract changes are intended.

## Acceptance

- Initial render and mounted navigation use `resolveRouteState()`.
- Direct refresh still initializes the correct view, account route mode, and
  challenge placeholder before `RouteOutlet` first selects a target.
- Alias and challenge reads remain mount-owned and stale-guarded.
- Full mandatory checks pass; no schema changes.

## Implementation

- `App.svelte` now derives its initial view, tabs, auth values, challenge
  placeholder, profile route identity, alias state, and legacy flag from
  `resolveRouteState(initialRoute)`.
- The initial projection remains synchronous and side-effect free. Mounted
  `parseRoute()` continues to dispatch alias/challenge reads, update the
  selected-user store, repair `/shop`, track routes, and invalidate stale work.
- Added a direct regression for shared initialization and updated the
  direct-refresh source contract to the projected state shape.

## Validation

- Build, Svelte check (0 errors/warnings), ESLint, all 711 unit tests, internal
  links, CSP, performance budgets, username policy, balance, local catalog,
  5,000-sample scoring parity, and database security checks pass.
- Initial JavaScript is 278.33 kB / 300 kB; dashboard route JavaScript is
  541.90 kB / 542 kB. Aggregate JavaScript/CSS catalog overages remain
  advisory; enforced route budgets pass.
- Catalog verification used the local seed because remote Supabase credentials
  were unavailable. No schema change was made, so database lint/reset were not
  applicable.
