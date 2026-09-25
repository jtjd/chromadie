# Profile expression action boundary — 2026-09-22

## Objective

Move the expression editor's media-library query and profile-expression RPC
calls behind the existing tested Profile Studio action module.

## Audit

`ProfileExpressionEditor.svelte` combines preview and Svelte state with direct
Supabase reads and writes for the owner media library, media selection, and
expression updates. Image and audio upload preparation already lives in
`profile-studio/expressionMediaActions.js`; the remaining transport calls
belong beside those actions. The editor's request counter currently protects
the library view from stale responses and preserves saved assets on load
failure.

## Plan

1. Add tested action functions for loading the existing owner-scoped asset
   query, selecting avatar/background/audio through the existing RPCs, and
   saving expression fields through the existing update RPC.
2. Keep request/account race checks, preview and expression state, event
   dispatch, and user feedback in the Svelte editor. Replace only its direct
   query/RPC calls with action calls.
3. Update source-contract and media-library retry tests, then add direct tests
   for query scope, selected asset arguments, and expression write arguments.
4. Run the mandatory validation suite and record its outcome.

## Compatibility and risk

No data model, migration, route, rendering, upload, storage, or authority
change is intended. The existing owner query and RPC names/arguments remain
unchanged. Authenticated authorization continues to be enforced by Supabase
RLS and the existing security-definer RPCs. A failed or stale library request
must continue to leave the last successful asset lists visible.

## Acceptance

- `ProfileExpressionEditor.svelte` no longer constructs the media-library
  query or invokes the expression selection/update RPCs directly.
- The action module has direct tests for the unchanged Supabase contracts.
- Existing upload cleanup, owner scope, stale-response, and retry behavior
  remain covered.
- Full mandatory checks pass; no schema changes.

## Implementation

Added media-library loading, avatar/background/audio selection, and expression
save actions to `profile-studio/expressionMediaActions.js`. The editor delegates
only query and RPC transport; it retains its stale-request guard, filtering,
expression/reference projection, event dispatch, and feedback. The direct
service tests cover the owner filter and ordering plus each unchanged RPC
contract. Existing retry and stale-response coverage remains in place.

## Validation

All required commands pass, including build, Svelte check, ESLint, 676 tests,
links, CSP, performance, username policy, balance, local catalog, scoring
parity, and database security. Dashboard JavaScript is 541.21/542.00 kB and
public-profile JavaScript is 471.17/475 kB. The performance check reports the
existing advisory aggregate JavaScript/CSS catalog targets above target; route
budgets pass. Catalog verification used the local seed because remote
Supabase credentials were unavailable. No schema lint or reset was needed.
