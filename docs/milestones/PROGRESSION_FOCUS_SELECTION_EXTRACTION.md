# Progression focus selection extraction — 2026-09-22

## Objective

Use one tested progression presentation rule to select the next intentional
goal across the profile's progression story and the dedicated Progress page.

## Audit

`ProfileProgression.svelte` and `ProgressionPage.svelte` independently select
from `nextJourney.ritual`, `nextJourney.rank`, and `nextObjective`, then skip
completed goals and stochastic Discovery goals. Their copies encode the same
behavior through separate unlocked checks. The profile also uses those
predicates when it accepts an injected `dailyFocusGoal` and when it renders
progress state.

## Plan

1. Add pure presentation helpers in `progressionPresentation.js` for the
   intentional-objective predicate, unlocked state, and focus-goal selection.
2. Use the helpers from both Svelte adapters and remove their duplicate
   implementations without changing candidate order or fallback behavior.
3. Add direct tests for candidate priority, explicit objective roles,
   stochastic Discovery exclusion, and all supported unlocked fields. Update
   the existing source contract to point at the shared module.
4. Run the mandatory validation suite and record the outcome.

## Compatibility and risk

This is a client-side projection of existing server-provided progression
records. It changes no RPC, schema, progression rules, reward authority, route,
or visible copy. Preserve the existing candidate order, the server-authored
`objective` override for Discovery records, and `unlocked`, `unlockedAt`, and
`unlocked_at` compatibility fields.

## Acceptance

- Both progression surfaces use the same focus-goal selector and objective
  predicate.
- Direct unit tests cover selection and compatibility fields.
- Existing profile and Progress page behavior stays unchanged.
- Full mandatory checks pass; no schema changes.

## Implementation

Added the pure predicates and selector to `progressionPresentation.js`. Both
consumers now import the shared rules; `ProfileProgression.svelte` also reuses
the shared unlocked predicate throughout its progress rendering. No markup or
copy changed.

## Validation

All required commands pass, including build, Svelte check, ESLint, 669 tests,
links, CSP, performance, username policy, balance, local catalog, scoring
parity, and database security. The progression route is 361.89/400 kB. The
catalog check used the local seed because remote Supabase credentials were
unavailable. No schema lint or reset was needed because this milestone has no
schema changes.
