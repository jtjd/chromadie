# App challenge banner component — 2026-09-23

## Objective

Move the challenge prompt's presentation and responsive styles out of the
application route shell while keeping route selection, challenge state, and URL
cleanup in `App.svelte`.

## Audit

`App.svelte` already delegates challenge lookup and stale-result handling to
`challengeLifecycle.js`, but it still owns the loading/error/success banner
markup and all of its desktop and mobile styles. The banner is a distinct
presentation surface: App decides when it is shown and dismisses the challenge
through the existing URL cleanup, while the banner renders the current
`challengeData`. Existing lifecycle tests cover the data shape and stale
results but do not cover the banner's wording, accessibility labels, or target
presentation.

## Plan

1. Add a `ChallengeBanner.svelte` component with the existing root section,
   states, labels, and challenge-specific styles.
2. Keep the current `challengeData && view === 'game'` gate in App, pass the
   same data object, and forward the component's dismiss event to
   `clearChallengeState()`.
3. Add source-contract tests for loading/error/success presentation, sender,
   score/color, accessibility, dismissal wiring, and responsive styles.
4. Update the decision, progress, changelog, and milestone records; run the
   required validation suite and confirm route budgets still pass.

## Compatibility and risk

No challenge transport, lookup, route, history, state shape, backend, schema,
or gameplay authority changes are intended. Keep the banner immediately
available when challenge state is present, with no loading flash added by the
component boundary. Preserve existing DOM structure, copy, accessible labels,
and responsive styles. The static component import adds a small amount to the
initial shell bundle; verify the established budget rather than assuming the
cost is negligible.

## Acceptance

- App retains the existing render gate and owns challenge dismissal/URL
  cleanup.
- The component preserves loading, unavailable, and successful target states,
  sender display, score/color, and accessible labels.
- Challenge-specific desktop and mobile styles move with the component;
  unrelated founder and account-error styling stays in App.
- Full required validation passes and route bundle budgets remain within their
  limits. No schema changes are needed.

## Implementation

- Added `ChallengeBanner.svelte` for the existing challenge states, sender,
  target score/color, accessible labels, dismissal event, and responsive styles.
- Kept the immediate route visibility gate, challenge state, and URL cleanup in
  `App.svelte`; the component input now reflects the loading, unavailable, and
  ready result shapes.
- Added source-contract tests for the render gate, lifecycle handoff, content,
  accessibility, and desktop/mobile styling.

## Validation

- `npm run build`, `npm run check` (0 errors and warnings), `npx eslint src/`,
  all 812 tests, links, CSP, performance, username policy, balance, catalog,
  scoring parity, and database security checks passed.
- Route performance budgets pass: initial JavaScript 277.22/300 kB and
  dashboard JavaScript 541.17/542 kB. Aggregate catalog JavaScript and CSS
  totals remain advisory overages. Catalog drift used the valid local seed
  because remote Supabase credentials were unavailable.
- No schema changed, so database lint and reset were not applicable.
