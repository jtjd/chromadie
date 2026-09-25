# App profile alias lifecycle — 2026-09-23

## Objective

Move profile-alias lookup and stale-result projection behind a lazy lifecycle
module while preserving the initial alias loading route, canonical URL
replacement, and existing server redirect contract.

## Audit

`resolveRouteState()` already projects an explicit `/a/<alias>` route to a
profile loading target and a separate lookup intent. `App.svelte` still
statically imports `resolveProfileAlias()` and owns lookup freshness,
not-found projection, and canonical replacement. Alias lookup runs only for
explicit alias routes, so the transport and result lifecycle do not need to be
part of the ordinary route graph. Current coverage checks route projection,
Cloudflare redirects, and a source-level stale-request guard, but has no direct
tests of the client lookup lifecycle.

## Plan

1. Add direct lifecycle tests for successful, missing/error, invalidated, and
   superseded lookup results.
2. Add `profileAliasLifecycle.js` to load the existing alias resolver and
   project each current result as a canonical-path or not-found result.
3. Dynamically import that module only for explicit alias routes; keep an App
   generation guard while the module loads, and keep `replaceState`, query/hash
   preservation, route parsing, and route tracking in App.
4. Update route ownership tests and run the complete required validation suite.

## Compatibility and risk

No schema, RPC, endpoint, alias shape, server redirect, profile renderer, or
privacy contract changes are intended. Preserve the immediate alias loading
target, route invalidation on every parse, not-found state for lookup failure
or missing usernames, and canonicalization with `replaceState` followed by
route parsing. A stale import or lookup must never rewrite the current URL.
Successful aliases retain the current search string and hash. No schema
changes are needed.

## Acceptance

- Alias resolver code is absent from ordinary initial-route imports and is
  loaded only when an explicit alias route is entered.
- Current alias lookups resolve to a canonical path or existing not-found
  state; stale lookups and stale import failures do not affect navigation.
- Alias query/hash preservation and `replaceState` behavior remain covered.
- Existing alias routing and Cloudflare redirect contracts remain intact.
- Full required validation passes; no backend authority changes.

## Implementation

- Added `profileAliasLifecycle.js` for alias resolution, canonical-path
  projection, and stale-result rejection. It uses the existing alias resolver
  and canonical username contract.
- Removed static alias resolver imports from `App.svelte`. The App now loads
  the lifecycle only when an explicit alias route is entered, guards the
  pending import with its route generation, and invalidates active work on
  every route parse.
- Kept loading and not-found route state, `replaceState`, query/hash
  preservation, and canonical-route reparsing in App.
- Added direct tests for canonical success, lookup failures, route
  invalidation, and superseded requests. App-level tests cover navigation
  during the pending import, import failure after navigation, and canonical
  URL replacement with query/hash preservation.

## Validation

- `npm run build`, `npm run check` (0 errors and warnings), `npx eslint src/`,
  all 776 tests, internal links, CSP, performance, username policy, balance,
  local catalog, 5,000-sample scoring parity, and database security checks
  passed.
- Initial JavaScript is 276.99/300 kB and dashboard route JavaScript is
  540.56/542 kB. Alias lookup modules remain outside the initial route graph.
  Aggregate JavaScript/CSS catalog targets remain advisory overages.
- Catalog drift used the valid local seed because remote Supabase credentials
  were unavailable. No schema changed, so database lint/reset were not
  applicable.
