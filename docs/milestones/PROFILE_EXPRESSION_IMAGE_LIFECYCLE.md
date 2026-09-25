# Profile expression image lifecycle — 2026-09-22

## Objective

Unify the duplicated avatar and background upload/removal workflows in the
Profile Expression Editor and keep their staged-upload cleanup in the existing
Profile Studio action boundary.

## Audit

`ProfileExpressionEditor.svelte` contains near-identical avatar and background
handlers. Each resets its file input, checks the R2 feature flag, creates a
local preview, uploads and promotes a WebP asset, selects it through the
existing server RPC, removes the staged asset if selection fails, refreshes the
library, and reports kind-specific feedback. The removal handlers also repeat
the same distinction between clearing a selected R2 asset and clearing a
legacy profile path.

## Plan

1. Add a tested action that composes the existing image upload with selection
   and deletes the uploaded asset through the existing provider control plane
   if selection fails.
2. Replace the duplicate component handlers with one kind-parameterized image
   upload flow and one image removal flow. Keep the exact avatar/background
   feedback, preview fallbacks, and file-input behavior.
3. Update source contracts and test successful selection plus cleanup after
   selection failure.
4. Run the mandatory validation suite and record the outcome.

## Compatibility and risk

No schema, RPC, storage path, feature flag, entitlement, markup, or visual
change is intended. Image processing remains client-side; upload registration,
promotion, selection, and deletion continue through their existing server
control-plane functions. The avatar initials fallback and generated background
atmosphere remain unchanged. Failed selection must still remove the staged
asset and revoke the temporary preview.

## Acceptance

- Avatar and background uploads use one shared component flow and one tested
  upload/select action.
- Both image removals use one shared component flow while retaining their
  current kind-specific confirmation text.
- Staged-asset cleanup, owner RPC contracts, and library refresh/retry behavior
  remain covered.
- Full mandatory checks pass; no schema changes.

## Implementation

- Added `uploadAndSelectProfileImageAsset` beside the existing upload actions.
  It removes the promoted asset through the provider control plane when the
  owner-scoped selection RPC fails.
- Consolidated avatar and background upload handling, preview revocation, and
  removal into kind-parameterized editor functions. Kind-specific feedback,
  legacy path writes, and preview fallbacks remain in place.
- Added direct action tests for successful selection and cleanup on selection
  failure, and updated component contracts to assert the shared handlers.

## Validation

- The required build, type, lint, test, link, CSP, performance, username policy,
  balance, catalog, scoring parity, and database security commands all pass.
- All 684 tests pass. Route performance budgets pass. The performance check
  reports advisory aggregate catalog overages (JavaScript 1376.98/800 kB and
  CSS 670.46/400 kB).
- Catalog drift used the valid local seed because remote Supabase credentials
  were unavailable. No schema changes were made.
