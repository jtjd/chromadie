# Daily Roll state hydration extraction — 2026-09-22

## Objective

Separate browser persistence and initial daily-roll data acquisition from the
`Game.svelte` presentation lifecycle. Keep UI state, request invalidation, reveal
timing, and event dispatch in the component.

## Plan

1. Audit current guest-roll persistence, reroll locks, account-specific daily
   reads, optional percentile reads, and their lifecycle regressions.
2. Move Roll local-storage operations and Roll-owned key constants into
   `rollStorage.js`.
3. Move authenticated/guest initial snapshot acquisition into
   `rollHydration.js`, returning data for `Game.svelte` to apply after checking
   request identity.
4. Add direct storage and hydration tests, adapt existing source checks, and
   run the full mandatory validation suite.
5. Update the project decision, progress, and changelog records.

## Compatibility and risk

No schema or migration is expected. Guest results must continue to be saved
before reveal, validated for the current UTC day, retained when the optional
percentile read fails, and cleared on invalid data or account cleanup. Reroll
locks remain account/day scoped and token-safe. Authenticated daily results and
all eligibility, score, rarity, reward, and progression authority remain on
their existing server RPCs. UI request IDs still reject stale completions.

## Acceptance

- Roll persistence and reroll-lock behavior have one implementation in
  `rollStorage.js`; account cleanup continues matching the same persisted key
  strings without importing this route module into the global store bundle.
- Initial loaders return snapshots and do not mutate Svelte stores or UI state.
- `Game.svelte` applies only results confirmed current for the active account.
- Guest save timing, invalid data cleanup, optional percentile failure, day
  rollover, and reroll lock behavior remain covered by tests.
- Full mandatory checks pass; no backend, route, or deployment changes.

## Implementation and evidence

Completed on 2026-09-22. `rollStorage.js` now owns guest result serialization,
safe storage access, and account/day reroll locks. `rollHydration.js` loads the
server-owned authenticated daily result or validates the current-day guest
snapshot, then returns data for `Game.svelte` to apply. Optional percentile
failures do not discard a valid result. The component retains UI transitions,
request identity checks, reveal behavior, and event dispatch. The daily roll
RPC remains authoritative for eligibility, score, rarity, and rewards.

Added direct storage and snapshot-loader tests, and updated existing roll
lifecycle and browser-audit contracts. Account cleanup retains matching string
filters locally so the authenticated global store does not pull Roll storage
code into its bundle. No schema, backend, route, or deployment changes.

Validation passed: production build, Svelte check (0 errors/warnings), ESLint,
all 644 unit tests, internal links, CSP, performance, username policy and
balance drift, local catalog drift, 5,000-sample scoring parity, and database
security checks. Dashboard JavaScript is 541.95 kB against the 542 kB cap. The
catalog check used the local seed because remote catalog credentials were not
set. Database reset and schema lint were not applicable.
