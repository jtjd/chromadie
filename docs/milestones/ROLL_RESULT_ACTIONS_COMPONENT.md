# Roll result actions component — 2026-09-22

## Objective

Move the three result action clusters out of `Game.svelte` into a focused
presentation component while keeping Roll state, eligibility, handlers, and
navigation in the parent.

## Audit

`Game.svelte` already delegates the result hero, score breakdown, reward rows,
reveal stage, and image-share dialog. It still renders dedicated Roll actions,
the optional acquisition actions in the result footer, and the embedded
post-score toolbar. RollPage styles and browser smoke scripts target these DOM
classes directly. Generic `.chroma-btn` and `.reroll-btn` styles also serve the
Studio onboarding button.

## Plan

1. Add `RollResultActions.svelte` with dedicated-footer, acquisition-footer,
   and post-score placements; preserve the existing button tree and labels.
2. Keep account state, copied state, countdown, reroll visibility/disabled
   values, and all action callbacks in `Game.svelte`.
3. Move action-cluster styles into the component while preserving the shared
   Game button styles used by both the child and Studio onboarding.
4. Add direct component contract coverage and update existing Roll and homepage
   source contracts to follow the new boundary.
5. Run all mandatory checks and the Roll reliability browser smoke; record the
   results in project documentation.

## Compatibility and risk

Keep all three clusters at their current DOM locations and preserve wrapper
classes, button order, labels, ARIA labels, signed-out/authenticated branches,
reroll visibility and disabled conditions, and `data-roll-action="share-image"`.
Keep `RollPage.svelte` selectors and browser smoke geometry unchanged. The
component must not decide or mutate roll eligibility, request state, rewards,
or account state. No route, data, RPC, or schema changes are expected.

The main implementation risk is Svelte style scoping: the result buttons move
into a child component, but the Studio onboarding button remains in `Game`.
Preserve the shared base styles for both locations and keep the action-specific
styles with the action markup.

## Acceptance

- `Game.svelte` delegates all three result action clusters to the new component.
- Direct tests protect the presentation branches and parent event/state wiring.
- RollPage selectors, responsive behavior, and browser smoke contracts remain
  unchanged.
- All mandatory checks and the Roll reliability browser smoke pass; no schema
  changes.

## Implementation

Added `RollResultActions.svelte` for the dedicated action row, optional
acquisition actions, and embedded post-score toolbar. `Game.svelte` still owns
account and reroll state, copied state, countdown, roll eligibility, and the
share/navigation/reroll handlers. The component emits those actions back to
the parent and retains the original DOM placements and public selectors.

Moved action-cluster layout and responsive styles into the component. Kept the
shared Game button rules scoped to `.game-container` so they style both the
child actions and the Studio onboarding button. Added direct component and
parent-wiring contracts, and updated Roll/homepage source tests to follow the
new boundary. No schema, route, RPC, or authority changes.

## Validation

All mandatory checks pass: build, Svelte check (zero errors or warnings),
ESLint, 737 tests, links, CSP, performance, username policy, balance, catalog,
scoring parity, and database security. Route budgets pass; the dashboard route
is 541.99/542.00 kB JavaScript. The aggregate JavaScript and CSS catalog
targets remain advisory overages. Catalog drift used the local seed because
remote Supabase credentials were unavailable. The Roll reliability browser
smoke passes its guest, authenticated reroll, failure recovery, image sharing,
normal/reduced-motion, stale-account, and 320–1440 px layout checks. No schema
changes.
