# Profile Studio settings load-state extraction — 2026-09-22

## Objective

Move the loaded-context reconciliation branches out of `ProfileSettings.svelte`
into a directly tested state projection. Keep asynchronous data acquisition,
account/request guards, and Svelte state application in the route adapter.

## Audit

`loadProfileStudioContext` already owns the narrow first-paint read contract.
`loadSettings` in `ProfileSettings.svelte` then checks request/account identity
and applies three distinct outcomes: retain the current draft after a failed
refresh, retain visible configuration while making the editor read-only when
configuration is unavailable, or apply a fresh context and editor draft. That
projection logic is embedded in the Svelte adapter and its branch behavior is
not directly unit tested.

## Plan

1. Keep context acquisition, stale request/account checks, and Svelte state
   application in `ProfileSettings.svelte`.
2. Add a directly tested resolver in `profile-studio/settingsLoadState.js`,
   loaded in parallel with the context request to keep it out of the public
   profile and initial dashboard bundle graphs.
3. Add direct tests for retained drafts, same-account unavailable reads,
   cross-account isolation, and successful context projection.
4. Run the mandatory validation suite and record the outcome in project logs.

## Compatibility and risk

No database, route, RPC, or publish behavior is expected to change. Preserve
the account/request checks before applying a loaded context, keep the old
configuration visible but non-writable after an unavailable read, and never
carry a previous account's configuration into a new account context. If the
resolver chunk or context read fails, retain same-account edits in read-only
mode and offer the existing retry affordance. Existing draft normalization and
identity projection remain the canonical helpers.

## Acceptance

- `loadSettings` remains the asynchronous adapter and keeps its stale-response
  guards.
- Context/draft reconciliation is centralized and directly tested.
- Configuration-unavailable state remains visible and read-only.
- Full mandatory checks pass; no schema, route, or authority changes.

## Implementation

Added the resolver as a dependency-free module with the existing context merge
and draft projection supplied by `ProfileSettings.svelte`. The adapter loads
the resolver in parallel with the context read. If the lazy chunk fails, it
uses the fresh context response in read-only mode, preserves drafts only when
the returned profile ID matches the previous profile ID, and exposes the
existing retry action.

## Validation

All required commands pass, including build, Svelte check, ESLint, 665 tests,
links, CSP, performance, username policy, balance, local catalog, scoring
parity, and database security. Dashboard JavaScript is 541.94/542.00 kB and
public-profile JavaScript is 471.89/475 kB. The catalog check used the local
seed because remote Supabase credentials were unavailable. No schema lint or
reset was needed because this milestone has no schema changes.
