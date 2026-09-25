# Profile Studio shared write lifecycle — 2026-09-22

## Objective

Consolidate the duplicated publish/reset mutation lifecycle in
`ProfileSettings.svelte` while preserving each action's existing payload,
validation, and post-write state projection.

## Audit

`publishDashboard` and `resetDashboard` each guard concurrent writes and
read-only configuration, acquire a mutation token, capture the current request
and account IDs, lazy-load the existing write transport, check freshness before
and after the RPC, report failures, and release the save lock. Their action
inputs and successful state effects differ: publish validates the current
editor and updates the account bio, while reset writes the published snapshot.

## Plan

1. Replace the duplicated async mutation lifecycle with one action-parameterized
   `ProfileSettings.svelte` handler.
2. Keep publish validation, draft/identity capture, reset snapshot selection,
   successful response projection, messages, and the existing transport
   contract action-specific.
3. Update source-contract tests to verify both action paths and the shared
   freshness/finalization boundary; retain direct RPC payload and response tests.
4. Run the mandatory validation suite and record the outcome.

## Compatibility and risk

No schema, migration, route, RPC, security boundary, or account data contract
changes are expected. Preserve editor validation before publish, the optimistic
`updated_at` token, stale account/request/mutation guards, published-profile bio
store synchronization, reset-to-published semantics, conflict messages, and
the unconditional save-lock release for the current mutation.

## Acceptance

- Publish and reset use the same tested component mutation lifecycle.
- Action-specific write arguments and successful state updates remain intact.
- Existing write transport tests continue to cover exact RPC payloads and
  conflict/error envelopes.
- Full mandatory checks pass; no schema changes.

## Implementation

- Replaced separate publish and reset handlers with
  `writeDashboardConfiguration(action)`. Shared concurrency/readiness gates,
  lazy service loading, stale account/request/mutation checks, response errors,
  and save-lock cleanup now live in one lifecycle.
- Kept publish draft validation, current draft and identity payload, account
  bio synchronization, and publish status action-specific. Reset still selects
  the last published snapshot and preserves its existing response fallbacks.
- Updated lifecycle tests to invoke the shared handler through both public
  action callbacks, covering stale accounts, lock ownership, and action-specific
  payload selection.

## Validation

- All required build, type, lint, test, link, CSP, performance, username policy,
  balance, catalog, scoring parity, and database security commands pass.
- All 685 tests pass. Route budgets pass; dashboard JavaScript is
  540.76/542 kB. The performance check reports advisory aggregate catalog
  overages (JavaScript 1376.53/800 kB and CSS 670.46/400 kB).
- Catalog drift used the valid local seed because remote Supabase credentials
  were unavailable. No schema changes were made.
