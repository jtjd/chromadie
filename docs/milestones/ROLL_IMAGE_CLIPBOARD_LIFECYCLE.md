# Roll image clipboard lifecycle — 2026-09-23

## Objective

Move the asynchronous share-image copy sequence into a directly tested
lifecycle helper, preserving the lazy export renderer and the image dialog's
presentation responsibilities.

## Audit

`RollShareImageDialog.svelte` owns confirmed-result canvas generation, PNG blob
creation, and clipboard writing. It checks request freshness before and after
successful writes, but its rejection handler logs, clears copied state, and
shows an error without rechecking freshness. A clipboard rejection from an old
roll can therefore affect the replacement result. Overlapping successful
copies also share one timer, so an earlier timer can clear newer feedback.
The prior image-dialog extraction contract requires stale-result suppression;
current tests do not cover clipboard completion races.

The first extraction still allowed two copy attempts for the same confirmed
roll to share the same result-freshness predicate. If the older write rejected
after the newer write succeeded, that rejection could replace the current
success feedback. Closing or reopening the dialog also needs to invalidate any
copy still in flight.

## Plan

1. Add direct helper tests for current success/failure, stale clipboard
   success/rejection, and unavailable canvas/blob outcomes.
2. Add `rollImageCopy.js` to sequence canvas, blob, and clipboard adapters,
   checking result freshness before applying current UI effects.
3. Keep rendering, browser APIs, toasts, and copied-state ownership in the
   dialog; version copied-feedback timers so older timers cannot clear newer
   feedback.
4. Update decision, progress, changelog, and milestone records; run the
   required validation suite.
5. Give each copy attempt its own freshness generation and invalidate pending
   attempts when a new dialog opens or the current dialog closes.

## Compatibility and risk

Keep exported images limited to confirmed score, rarity, and color. Preserve
the existing canvas renderer, browser support check, error logging, success
and failure messages, and two-second feedback. Stale operations must neither
toast nor change current copied state. No route, data, schema, RPC, or gameplay
authority changes are intended.

## Acceptance

- Direct tests prove current success/failure effects and suppress all effects
  from stale clipboard success/rejection, including older same-result success
  or rejection that completes after a newer success.
- The dialog adapts its existing lazy renderer and browser clipboard to the
  helper, and older copied timers cannot clear the latest feedback.
- New copies, reopening, closing, and component teardown invalidate older
  clipboard attempts before they can publish UI effects.
- Existing dialog focus, keyboard, scroll-lock, and confirmed-result
  boundaries remain unchanged.
- Full required validation passes; no schema changes are needed.

## Implementation

- Added `rollImageCopy.js` to sequence the existing lazy canvas renderer,
  PNG conversion, and clipboard write behind explicit adapters.
- Currentness is checked before starting, after each asynchronous stage, and
  inside error handling, so stale success and rejection have no UI effects.
- `createRollImageCopyFreshness` combines confirmed-result freshness with a
  per-attempt generation. Beginning another copy and invalidating on dialog
  open, close, or teardown prevents an older same-result write from replacing
  newer feedback.
- The dialog retains browser support detection, logging, toasts, copied state,
  and rendering. A copied-feedback version prevents older timers from clearing
  newer status.
- Direct tests cover current success/failure, stale success/rejection,
  same-result success and rejection overlap, pending-copy dialog invalidation,
  unavailable exports, and overlapping feedback timers. Existing dialog and
  Roll integration tests remain in place.

## Validation

- Build, Svelte check (0 errors and warnings), ESLint, all 815 tests, links,
  CSP, performance, username policy, balance, catalog, scoring parity, and
  database security checks passed.
- Route budgets pass; initial JavaScript is 277.22/300 kB and dashboard
  JavaScript is 541.17/542.00 kB. Aggregate asset catalog totals remain
  advisory overages (JavaScript 1385.07/800 kB and CSS 670.60/400 kB). Catalog
  drift used the valid local seed because remote Supabase credentials were
  unavailable.
- No schema changed, so database lint and reset were not applicable.
