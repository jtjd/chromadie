# Daily Roll initial-state coordinator — 2026-09-22

## Objective

Move the asynchronous coordination of authenticated and guest initial Roll
snapshots out of `Game.svelte`, keeping Svelte presentation state and dispatch
in the component and preserving the existing server-authoritative roll path.

## Audit

`rollHydration.js` already acquires authenticated RPC results and validated
guest snapshots. `Game.svelte` still owns two nearly parallel async handlers
and the surrounding mode selection, request freshness, error, and completion
ordering. Those lifecycle rules are only partly covered through extracted
component source. The prior hydration milestone explicitly kept snapshot
application in `Game.svelte`; this slice isolates the async coordinator and
adds direct lifecycle tests while leaving presentation projection in that
adapter.

## Plan

1. Add direct tests for authenticated/guest loader selection, current snapshots,
   stale request behavior, errors, and current-request-only completion.
2. Add `rollInitialState.js` to coordinate one snapshot load while accepting
   explicit freshness, application, error, and completion callbacks.
3. Keep result field mapping, Svelte stores, event dispatch, account/day keys,
   and request invalidation in `Game.svelte`.
4. Preserve authenticated RPC authority, guest storage validation, UTC rollover,
   and optional percentile behavior.
5. Run the full required validation suite and update the project logs.

## Compatibility and risk

No schema, migration, route, storage key, RPC, or deployment change is
expected. Authenticated eligibility and results must continue to come from
`get_my_daily_roll` through `rollHydration.js`; the coordinator must not
calculate or authorize a roll. A stale account/snapshot must not update the
visible result, while only the current request ID may release loading after a
superseding request. Preserve the existing account key and UTC-day deduplication,
guest activation behavior, ready events, and percentile fallback.

## Acceptance

- Initial authenticated/guest snapshot sequencing is directly testable outside
  the Svelte component.
- `Game.svelte` retains presentation state, request IDs, account/day lifecycle,
  and roll-state dispatch.
- Current snapshots, failures, stale requests, guest storage state, and UTC-day
  refresh remain covered by tests.
- Full mandatory checks pass; no backend or authority changes.
## Implementation

Added `runInitialRollHydration()` in `rollInitialState.js`. It selects the
existing authenticated or guest snapshot loader, rejects stale snapshots
before presentation, forwards only current failures, and runs completion only
for the request that still owns the request ID. `Game.svelte` retains
account-ID freshness checks, request invalidation, account/day deduplication,
loading state, store updates, roll presentation, ready analytics, and event
dispatch. Authenticated state still comes from the existing daily-roll RPC;
guest data still passes through the existing bounded storage validator.

Direct tests cover both loader modes, current snapshot application, stale
snapshot and superseded-request behavior, error handling, and completion
ownership. Component integration tests cover authenticated/guest result
projection, the server-provided color and percentile, guest progress state,
and ready-event behavior.

## Validation

Passed the required production build, Svelte check, source ESLint, full test
suite (762 tests), links, CSP, performance, username policy, balance, catalog,
scoring parity, and database security checks. Dashboard route JavaScript is
541.94/542.00 kB. Catalog drift used the valid local seed because remote
Supabase credentials were unavailable; aggregate asset catalog targets remain
advisory. No schema lint or database reset was applicable.
