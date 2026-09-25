# App browser navigation adapter — 2026-09-22

## Objective

Move browser history, internal-link interception, and listener lifecycle into a
directly tested adapter while leaving route projection and app state in
`App.svelte`.

## Audit

`App.svelte` already delegates route-target selection and URL-to-state
projection. It still implements SPA internal-link filtering, a cancelable
navigation guard, `pushState`, challenge cleanup before leaving a challenge,
route parsing, focus restoration, `popstate`, and listener setup/cleanup.

## Plan

1. Add `routeNavigation.js` as a browser adapter with injected route-state
   getters and App callbacks.
2. Move internal-link filtering, guarded navigation order, popstate handling,
   and listener lifecycle into the adapter.
3. Keep canonical URL synchronization, route state, auth redirects, alias and
   challenge loading, lazy target selection, and store updates in `App.svelte`.
4. Add direct tests for filters, cancelation, challenge transitions, focus, and
   listener cleanup; update source contracts and run all mandatory checks.

## Compatibility and risk

Preserve the navigation guard → challenge cleanup → `pushState` → route parse
→ focus order. Keep modified clicks, downloads, external links, same-URL
navigation, and non-SPA paths in the browser's native behavior. Continue
handling `/privacy`, `/terms`, and `/how-to-play` through the SPA. Do not move
canonical URL repair or route/account state into the adapter. No route, data,
RPC, or schema changes.

## Acceptance

- `App.svelte` delegates browser navigation and listener ownership to the
  tested adapter while retaining route projection and canonical sync.
- Navigation guard cancellation prevents all later effects.
- Leaving a challenge clears challenge state before the new history entry is
  pushed; navigating among challenge paths preserves it.
- Full mandatory checks pass; no schema changes.

## Implementation

Added `src/lib/routeNavigation.js` as a small adapter with injected App state
getters and callbacks. It owns link eligibility, guarded history navigation,
`popstate`, and idempotent listener lifecycle. `App.svelte` retains route
projection, auth redirect construction, canonical synchronization, challenge
loading, and lazy route selection. Both view navigation and login/signup entry
points now call the adapter.

Added direct tests for cancellation, challenge transitions, route and focus
ordering, app/auth/information links, native-navigation exclusions, and listener
ownership. Updated source contracts where navigation ownership moved.

## Validation

The full required suite passed: build, Svelte check (zero errors or warnings),
ESLint, 728 tests, links, CSP, performance, username policy, balance, catalog,
scoring parity, and database security. Route payloads remain within limits:
initial JavaScript 278.41/300 kB and dashboard JavaScript 541.99/542 kB. The
aggregate JavaScript and CSS catalogs remain advisory overages. Catalog drift
used the local seed because remote Supabase credentials were unavailable. No
schema changes.
