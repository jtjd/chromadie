# Daily Roll reveal sequence extraction — 2026-09-22

## Objective

Move the staged reveal orchestration out of `Game.svelte` and into a small
controller module. Keep Svelte presentation state, skip input, scroll behavior,
and server result application behind callbacks owned by the component.

## Plan

1. Audit the current result timeline, count-up controller, skip path, stale
   request handling, and lifecycle tests.
2. Add direct controller tests for immediate/reduced-motion completion,
   staged condition reveal, skip completion, and stale request cancellation.
3. Extract the sequence into `rollRevealSequence.js`, injecting state updates,
   dispatch, `tick`, scrolling, count-up, and current/skip predicates.
4. Keep the existing timeline data and confirmed server response unchanged;
   run the mandatory validation suite.
5. Record the result in the project decision, progress, and changelog docs.

## Compatibility and risk

No schema, route, or backend changes are expected. The controller must only
present the canonical response it receives; it cannot determine or modify
eligibility, score, rarity, rewards, or progression. Preserve the current
timings, contributor ordering, cancellation checks, result event dispatch,
reduced-motion behavior, and skip-to-confirmed-result behavior.

## Acceptance

- The reveal timeline orchestration is independently testable without Svelte.
- `Game.svelte` remains the owner of presentation fields and browser/Svelte
  effects, while the controller receives only explicit callbacks.
- Existing reveal timing, reduced-motion, stale-request, guest-save, and
  reroll behavior remains covered by tests.
- No visual or gameplay contract changes; full mandatory checks pass.

## Implementation and evidence

Completed on 2026-09-22. `rollRevealSequence.js` now sequences canonical color,
condition, and score reveal stages. It receives explicit callbacks for current
request and skip checks, Svelte state updates, roll-state dispatch, list
scrolling, score animation, and Svelte `tick`. `Game.svelte` retains the UI
fields and browser effects while acting as the callback adapter. The controller
does not request, calculate, or change the result.

Added direct coverage for the staged path, sorted contributor reveal,
reduced-motion completion, skip completion, and stale requests before and
during a reveal. Updated source contracts to follow the extracted module.
No visual, route, database, or backend behavior changed.

Validation passed: production build, Svelte check (0 errors/warnings), ESLint,
all 649 unit tests, internal links, CSP, performance, username policy and
balance drift, local catalog drift, 5,000-sample scoring parity, and database
security checks. The catalog check used the local seed because remote catalog
credentials were not set. Database reset and schema lint were not applicable.

## Follow-up — Stale sequence display state

On 2026-09-23, the current-request check was moved ahead of the initial
condition-list clear. The regression test now confirms a sequence that is
already stale leaves reveal state untouched. The full current validation suite
passes with 834 tests; the separate best-roll rarity schema correction is
documented in [`ROLL_CANDIDATE_LEGENDARY_RARITY.md`](ROLL_CANDIDATE_LEGENDARY_RARITY.md).
