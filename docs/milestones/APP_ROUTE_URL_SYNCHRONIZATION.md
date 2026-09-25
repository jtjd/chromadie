# App route URL synchronization — 2026-09-22

## Objective

Move reactive route-to-URL projection out of `App.svelte` into a directly
tested pure helper. Keep App responsible for the browser environment and the
history replacement side effect.

## Audit and plan

`App.svelte` currently guards alias resolution, route mode, prototype paths,
and active challenges; selects canonical profile paths using account and
selection state; projects tabs; preserves the pricing-success path; and calls
`replaceState` when pathname plus search differ. Hash handling and browser
history remain in App.

1. Extract the path decision into `resolveRouteSyncPath()` beside the existing
   route parser and canonical path helpers.
2. Add direct cases for guards, profile identity precedence, tabs, pricing
   return parameters, and no-op matching URLs.
3. Keep App's SSR guard and `replaceState` orchestration, without changing
   explicit navigation or `/shop` repair.
4. Run the mandatory project checks and record results below.

## Compatibility and risk

This is a frontend-only route refactor with no data or schema migration. The
checkout query parameters `session_id` on `/pricing/success` and
`checkout=cancelled` on `/pricing` are read by `Pricing.svelte`; reactive sync
must leave these valid return URLs and their search parameters intact.
Canonicalization of ordinary routes continues to drop unrelated query
parameters. Preserve account username precedence, legacy `/u/` URLs, ID-based
profile URLs, tab defaults, alias/challenge guards, hash comparison behavior,
and the existing `replaceState` history semantics. Explicit `setRoute()`
navigation remains canonical `/pricing`.

## Acceptance

- `App.svelte` delegates route URL selection to the directly tested helper.
- Pricing return and cancellation state survive reactive synchronization.
- Route guards, profile URL selection, tabs, and browser history behavior
  remain covered and unchanged outside the Pricing return routes.
- Mandatory checks pass; no database or RPC contracts change.

## Implementation

Added `resolveRouteSyncPath()` beside the route parser and canonical path
helpers. `App.svelte` retains its SSR guard and `replaceState` side effect.
Pricing success and cancellation URLs now remain untouched during reactive
sync, including their query strings and trailing-slash variants. `Pricing`
also recognizes a trailing slash on its success route so checkout restoration
still runs. Explicit pricing navigation still uses `/pricing`.

Added direct coverage for route guards, profile username and ID precedence,
legacy paths, tab URLs, query/hash comparison boundaries, and pricing return
URLs. Two independent route audits found no remaining behavior mismatches.

## Validation

The required validation suite passed: build, Svelte check (zero
errors/warnings), ESLint, 742 tests, internal links, CSP, performance,
username policy, balance, catalog, scoring parity, and database security.
Dashboard JavaScript is 541.95/542.00 kB and initial JavaScript is
278.38/300.00 kB. Aggregate asset catalog overages remain advisory. Catalog
verification used the local seed because remote Supabase credentials were
unavailable. No schema, RPC, or authority changes.
