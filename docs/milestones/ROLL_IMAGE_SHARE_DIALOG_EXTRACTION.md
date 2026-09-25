# Roll image share dialog extraction — 2026-09-22

## Objective

Move the Roll share image preview dialog and its accessibility lifecycle out of
`Game.svelte` into a focused component that loads on the first image-share
action. Keep the existing share card renderer, result action placement,
palette, keyboard behavior, clipboard feedback, and request invalidation
contract.

## Audit

`Game.svelte` owns image export setup, modal open/close state, focus management,
Escape and focus-trap handling, page scroll locking, clipboard writes, and all
modal markup and styling. The share card itself is already rendered by the
lazy `rollShareExport.js` module. The parent increments `rollRequestId` when a
new roll or account hydration invalidates an old result; image generation
checks that version before opening the dialog.

## Plan

1. Extract the modal, image clipboard interaction, focus lifecycle, scroll
   lock, and dialog styling into `RollShareImageDialog.svelte`.
2. Pass only the confirmed result fields, ink color, and current request
   version from `Game.svelte`. Preserve the current share buttons in the
   Roll layouts and delegate their image action to the dialog.
3. Add focused coverage for the component boundary, request-version guard,
   modal keyboard behavior, and retained Roll action contract.
4. Run the mandatory validation suite and record the result in the project
   logs.

## Compatibility and risk

No database, route, RPC, or scoring change is expected. The dialog must keep
using the existing share-card renderer and confirmed score, rarity, and color.
Do not add identity or private account data to the export. Preserve focus
restoration, focus trapping, Escape close, body scroll lock, and stale-result
suppression. No reduced-motion behavior changes are needed because the dialog
does not introduce animation.

## Acceptance

- `Game.svelte` no longer owns image dialog state, image-copy behavior, modal
  focus/scroll handling, or dialog markup and CSS.
- The extracted component loads only on demand, opens only for the current Roll
  request, and retains the existing keyboard and clipboard behavior.
- Roll share buttons and appearance remain in their current layouts.
- Full mandatory checks pass; no backend, route, or authority changes.

## Implementation and validation — 2026-09-22

Added `RollShareImageDialog.svelte` to own the share preview, clipboard copy,
focus trap, Escape handling, focus restoration, page scroll lock, and dialog
styles. `Game.svelte` loads the component only after an image-share action.
The parent passes only the captured request version and a current-request
predicate to `open`; new account hydration and roll requests close the dialog
before invalidating that version. The dialog uses the existing lazy
`rollShareExport.js` renderer with score, rarity, and color only. Existing share
buttons retain their placement and classes.

Added coverage for the lazy boundary, stale request checks, focus and keyboard
behavior, and the existing canonical image export. Validation passed: build,
Svelte check (0 errors and warnings), ESLint, 660 tests, links, CSP,
performance, username policy, balance, local catalog, scoring parity, and
database security. Dashboard route JavaScript is 541.98/542.00 kB; the Roll
route JavaScript is 64.42 kB. The catalog check used the local seed because
remote Supabase credentials were unavailable. No schema, route, or gameplay
change.
