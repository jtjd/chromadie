# Profile Studio full-context refresh projection — 2026-09-22

## Objective

Move accepted full-context response reconciliation out of
`ProfileSettings.svelte` and into the tested Profile Studio settings load-state
module. Keep context acquisition and async lifecycle in the component.

## Audit

`ensureFullContext` owns the full context request, request freshness check,
error recovery, loading completion, and shared-promise cleanup. Its
accepted-response branch also merges context data, preserves staged editor
drafts, creates an identity draft, and marks whether configuration was fully
loaded. Those synchronous projection rules have no direct tests. A direct
non-Customize hash can start this full read while the first settings read is in
flight; the current request wins, so its completion must also release the page's
initial loading state.

## Plan

1. Keep request creation, fetch, freshness validation, catch, and promise
   cleanup in `ProfileSettings.svelte`.
2. Add a pure projection beside the existing settings load-state resolver in
   `profile-studio/settingsLoadState.js`, preserving its lazy loading boundary.
3. Keep staged identity edits when the identity editor is dirty; synchronize
   clean identity state from the refreshed profile.
4. Make missing projector chunks fail closed, and keep thrown and resolved
   read errors retryable. Let only the current full-context request finish page
   loading or release its promise.
5. Directly test draft projection, unavailable configuration, empty and failed
   responses, lazy-import failure, and the component freshness/lifecycle
   boundaries.
6. Run the mandatory validation suite and record the result in project logs.

## Compatibility and risk

No database, route, RPC, or publish behavior is expected to change. Preserve
the existing merge condition, staged-draft identity, identity bio projection,
unavailable-configuration flag, and empty-response semantics. A dirty identity
draft must survive same-profile refreshes, while no previous-profile data may
cross into a different profile. Stale responses must still be rejected before
projection; read errors must preserve the visible snapshot, surface a warning,
and remain retryable. Only the current request may finish loading or release
the shared promise.

## Acceptance

- The async request lifecycle and freshness guard remain component-owned.
- Full-context reconciliation is centralized and directly tested.
- Configuration-unavailable responses remain retryable and non-writable; dirty
  identity drafts remain intact across same-profile refreshes.
- Resolved and thrown full-context errors surface a warning and can be retried.
- Full mandatory checks pass; no schema, route, or authority changes.
## Implementation

Added `resolveProfileStudioFullContextRefreshState()` beside the existing
settings load-state resolver. `ProfileSettings.svelte` still starts the
full-context read, rejects stale requests, handles lazy module failures and
read errors, and releases the shared promise. The current request now also
clears initial loading when it completes. Same-profile refreshes preserve the
current staged configuration; dirty identity edits retain their typed bio
while clean identity state follows the refreshed profile. A changed profile
clears drafts before they can be reused.

The retry warning calls the full-context loader. Resolved and thrown read
errors leave the operation retryable. If the lazy projector cannot load, the
visible same-profile snapshot remains read-only and retryable. Direct tests
cover successful, empty, unavailable, stale, resolved-error, thrown-error,
and import-failure cases.

## Validation

Passed the required build, Svelte check, source ESLint, full test suite (753
tests), link, CSP, performance, username policy, balance, catalog, scoring
parity, and database security checks. Dashboard route JavaScript is
541.94/542.00 kB. Catalog drift used the valid local seed because remote
Supabase credentials were unavailable; aggregate asset catalog targets remain
advisory.
