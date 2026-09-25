# Profile Studio configuration write extraction — 2026-09-22

## Objective

Move the Profile Studio configuration publish/reset RPC contract and shared
response-envelope handling out of `ProfileSettings.svelte` into a focused
service module. Keep editor validation, account/request race guards, and local
state application in the Svelte adapter.

## Plan

1. Audit the current publish/reset handlers, RPC migrations, concurrency
   tokens, and source/lifecycle tests.
2. Add direct service tests for exact RPC names, parameters, optimistic
   timestamps, and success/failure response envelopes.
3. Add `profile-studio/configurationWrites.js` and route the existing publish
   and reset handlers through it without changing their state transitions.
4. Update source-contract tests to follow the service boundary and run the
   mandatory validation suite.
5. Record the decision and results in the project logs.

## Compatibility and risk

No schema or migration is expected. Preserve the existing atomic
`publish_profile_studio_v2` call and `save_profile_configuration_v2` reset
call, their exact parameter names, `expected_updated_at` conflict behavior,
server error messages, account/mutation request guards, and post-success
profile/store updates. The service only transports the existing structured
configuration and server response; validation, authorization, and writes
remain server-owned.

## Acceptance

- `ProfileSettings.svelte` no longer owns the configuration write RPC names or
  response-envelope parsing.
- Direct service tests protect publish/reset payload and response contracts.
- Draft validation, stale-request handling, conflict/retry behavior, and local
  state updates remain covered by existing tests.
- No UI, schema, route, or backend behavior changes; full mandatory checks pass.

## Implementation and validation — 2026-09-22

Added `src/lib/profile-studio/configurationWrites.js` as the single transport
for the existing publish and reset RPCs. It preserves their parameter names,
nullable identity fields, optimistic update timestamp, and PostgREST/RPC
failure envelope. `ProfileSettings.svelte` still builds validated drafts,
checks account and mutation tokens, and applies successful results to its
local profile state.

The service loads only when publish or reset starts, keeping the dashboard's
measured JavaScript within its existing limit. Handlers recheck account and
request tokens after loading and before dispatching the RPC. Tests cover stale
accounts during service loading, delayed responses, exact RPC parameters,
conflict messages, and local state transitions.

No migration or schema change was needed. Focused Profile Studio coverage
passes (64 tests); the full suite passes (653 tests). Dashboard route
JavaScript is 541.98 kB against its 542.00 kB cap. The catalog check validates
the local seed; no remote Supabase credentials were available for a linked
catalog comparison.
