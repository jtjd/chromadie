# Profile portfolio scroll controller — 2026-09-22

## Objective

Move viewport-page tracking and portfolio wheel handling out of
`ProfileShell.svelte` into a small controller with direct interaction tests.

## Audit

`ProfileShell.svelte` owns portfolio page selection, the profile-more cue
threshold, wheel gesture filtering, overflow continuation, page stepping,
reduced-motion scroll behavior, and listener cleanup. The code sits alongside
profile data loading and renderer state even though it is specific to the
portfolio layout. Existing tests cover the page list and markup contract but do
not exercise the wheel and scroll state transitions.

## Plan

1. Add `profile-layout/portfolioScrollController.js` to attach and clean up the
   existing scroll/wheel behavior against a supplied profile container; load
   it only when the owner-selected Portfolio layout is active.
2. Keep layout, reduced-motion, active-page, and “more” state in
   `ProfileShell.svelte`, passing them through callbacks so the controller does
   not own Svelte or profile data.
3. Add fake-container tests for active-page tracking, the profile-more
   threshold, wheel filtering, overflow scrolling, reduced motion, and cleanup.
   Update the profile portfolio source contract to verify the controller seam.
4. Run the mandatory validation suite and record the outcome.

## Compatibility and risk

No profile data, route, backend, or presentation markup changes are expected.
Preserve the existing 45% profile-more threshold, 45% viewport focus line,
wheel gesture timing and lock, 80% overflow scroll, scroll-snap page stepping,
and reduced-motion behavior. Wheel interception remains limited to vertical
gestures in the portfolio layout and continues to ignore Ctrl-wheel.

## Acceptance

- Portfolio scroll and wheel behavior is owned by a tested layout controller.
- `ProfileShell.svelte` keeps only Svelte state, callbacks, and click-to-page
  navigation for this interaction.
- Existing portfolio contracts remain unchanged.
- Full mandatory checks pass; no schema changes.

## Implementation

Moved page tracking, the profile-more threshold, wheel filtering, overflow
continuation, page stepping, and listener cleanup to
`portfolioScrollController.js`. `ProfileShell.svelte` loads the controller
only when Portfolio is selected and supplies its current layout, reduced-motion
preference, active page, and Svelte state callbacks. The public renderer keeps
its markup and click navigation unchanged.

## Validation

All required commands pass, including build, Svelte check, ESLint, 672 tests,
links, CSP, performance, username policy, balance, local catalog, scoring
parity, and database security. Dashboard JavaScript is 541.21/542.00 kB and
public-profile JavaScript is 471.17/475 kB. The catalog check used the local
seed because remote Supabase credentials were unavailable. No schema lint or
reset was needed because this milestone has no schema changes.
