# Roll attempt orchestration — 2026-09-22

## Objective

Move the asynchronous roll-attempt sequence out of `Game.svelte` into a
directly tested controller that coordinates the existing server request,
guest persistence, confirmed-result reveal, and account refresh boundaries.

## Audit

`Game.svelte` already delegates the authoritative RPC envelope to
`rollService.js`, guest/authenticated hydration to `rollHydration.js`, local
storage to `rollStorage.js`, and the result animation to
`rollRevealSequence.js`. Its `initiateRoll` handler still owns the ordering
between those services: reject stale results, restore a previous result after
a failed reroll, persist a guest result before the interruptible reveal,
apply the confirmed result, refresh authenticated account stores, and release
the reroll lock. Existing tests verify several of these rules by extracting
the Svelte handler source; the sequence itself has no direct module contract.

## Plan

1. Add `rollAttempt.js` to coordinate injected request, persistence, reveal,
confirmed-result, account-refresh, stale, failure, and completion callbacks.
2. Keep eligibility checks, reroll lock creation, presentation state, score
display, analytics payloads, and Svelte/store updates in `Game.svelte`.
3. Add direct controller tests for failure, stale request/reveal/refresh,
guest persistence before an interruptible reveal, and authenticated refresh
ordering. Adapt the handler integration harness to supply the controller.
4. Run the mandatory validation suite and record the outcome.

## Compatibility and risk

No schema, route, storage key, or RPC change is expected. The controller must
not calculate score, rarity, rewards, or eligibility; `requestRoll` continues
to call the existing secure `roll_die` RPC. A confirmed guest result remains
saved for the request's UTC day before reveal can be interrupted. A failed
reroll must preserve the last confirmed result and clear only its own lock.
Account refresh must remain after the confirmed result is applied, and stale
account/request callbacks must not finalize the attempt.

## Acceptance

- `Game.svelte` delegates the post-eligibility attempt sequence to a tested
  controller while retaining all UI and canonical state projection.
- Existing guest navigation, rejected reroll, and account-switch protections
  remain covered by direct and integration tests.
- Secure roll authority and current RPC/storage contracts are unchanged.
- Full mandatory checks pass; no schema changes.

## Implementation

Added `rollAttempt.js` to sequence the existing request, guest persistence,
reveal, canonical result projection, authenticated refresh, and finish/stale
callbacks. `Game.svelte` retains eligibility, lock creation, presentation
updates, milestone/analytics projection, store refresh calls, and user
feedback. The controller does not calculate or mutate roll data; it receives
the successful result only from the existing `requestRoll` service.

Direct controller tests cover failed and stale requests, saving guest results
before reveal, guest completion, authenticated refresh order, and stale
refresh suppression. The existing handler integration tests still cover guest
navigation and failed rerolls.

## Validation

All required commands pass, including build, Svelte check, ESLint, 682 tests,
links, CSP, performance, username policy, balance, local catalog, scoring
parity, and database security. Dashboard JavaScript is 541.21/542.00 kB and
public-profile JavaScript is 471.17/475 kB. Route budgets pass; the performance
check reports the existing advisory aggregate JavaScript/CSS catalog targets
above target. Catalog verification used the local seed because remote
Supabase credentials were unavailable. No schema lint or reset was needed.
