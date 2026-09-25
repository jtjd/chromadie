# Profile Expression preview teardown — 2026-09-23

## Objective

Prevent asynchronous image or audio preparation from allocating a temporary
preview URL after `ProfileExpressionEditor` has been destroyed.

## Audit

The image and audio upload actions invoke `onPrepared` after asynchronous file
processing. Their editor callbacks allocate a Blob URL and store it in preview
state. The editor revokes URLs already stored in that state during `onDestroy`,
but processing can finish after teardown; that later callback then allocates a
URL the completed cleanup cannot see.

## Plan

1. Add a deferred-completion regression test for preparation finishing after
   the editor becomes inactive, plus coverage that mounted preparation remains
   unchanged.
2. Add a small tested callback boundary that checks liveness before allocating
   or publishing a preview URL.
3. Use the same guard for image, background, and audio preparation and mark the
   editor inactive before its existing URL cleanup.
4. Run the full required validation and record results.

## Compatibility and risk

The upload, promotion, selection, cleanup, and public-media URL behavior remains
unchanged. Preparation completed while the editor is alive still creates and
shows its local preview. Preparation completed after teardown is ignored before
calling `URL.createObjectURL`. No route, schema, storage, RPC, entitlement, or
profile-rendering changes are intended.

## Acceptance

- Late image/audio preparation cannot create an unreleased Blob URL.
- Mounted image/audio preparation still creates and publishes its preview.
- Existing upload and selection behavior remains covered.
- Full required validation passes; no schema changes are needed.

## Implementation

- Added `createPreviewPreparationHandler()` with injected liveness, URL, and
  preview adapters so the callback can be tested without browser APIs.
- Reused it for both image/background and audio preparation, and made teardown
  close the callback before revoking current previews.
- Added deferred-completion tests for the inactive and active cases and a
  source contract that checks both editor paths use the guard.

## Validation

- `npm run build`, `npm run check` (0 errors and warnings), `npx eslint src/`,
  and `npm test` pass; the suite reports 820 passing tests.
- Link, CSP, performance, username-policy, balance, catalog-drift, scoring
  parity, and database-security checks pass. Catalog drift used the valid local
  seed because remote Supabase credentials were unavailable.
- Route budgets pass, including 277.22/300 kB initial JavaScript and
  541.17/542 kB dashboard JavaScript. Aggregate JS/CSS catalog totals remain
  advisory overages at 1385.43/800 kB and 670.60/400 kB.
- No schema changes were made, so database lint and reset were not applicable.
