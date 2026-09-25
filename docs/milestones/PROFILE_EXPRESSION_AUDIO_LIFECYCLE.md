# Profile Expression audio selection lifecycle — 2026-09-22

## Objective

Move the audio upload-to-selection transaction into the existing Profile Studio
media action boundary while preserving editor-owned preview and feedback state.

## Audit

`expressionMediaActions.js` already owns audio validation, preparation, upload,
promotion, and cleanup after promotion failure. Its image counterpart also
selects the uploaded asset and deletes it when the selection RPC fails.
`ProfileExpressionEditor.svelte` still performs audio selection and staged
asset cleanup itself, duplicating part of the image action contract.

## Plan

1. Add `uploadAndSelectProfileAudioAsset` beside the audio and image actions.
2. Move audio selection and selection-failure cleanup into the action; keep the
   editor responsible for busy state, prepared/public preview, media reference,
   and user feedback.
3. Test successful order, selection-failure cleanup, cleanup-failure error
   preservation, and validation short-circuiting; update source contracts.
4. Run the mandatory validation suite; no schema changes.

## Compatibility and risk

Keep existing audio validation, MP3 preparation, owner-scoped selection RPC,
preview timing, media-reference update, and success message. If selection
fails, delete the promoted staged asset and propagate the original selection
error even if deletion also fails. The editor continues clearing/revoking its
blob preview on failure. No storage, RPC, entitlement, route, or schema change.

## Acceptance

- The editor calls one tested audio upload-and-select action.
- Validation and preparation failures do not select or delete an asset.
- Selection failure cleans up the promoted asset and preserves its error.
- Full mandatory checks pass; no schema changes.

## Implementation

Added `uploadAndSelectProfileAudioAsset` beside the image lifecycle action.
It delegates validation, preparation, preview callback, upload, and promotion
to `uploadProfileAudioAsset`, then invokes the existing owner-scoped selection
callback and deletes the promoted staged asset if selection fails. Updated the
editor to call the composed action; busy state, audio preview, media reference,
status/error text, and preview cleanup remain local. Added tests for operation
order, success, selection failure even when cleanup fails, and validation
short-circuiting. No schema, RPC, or storage changes.

## Validation

The required validation suite passes: build, Svelte check with zero warnings,
ESLint, 722 tests, links, CSP, performance, username-policy, balance, catalog,
scoring parity, and database-security checks. All route budgets pass. Aggregate
catalog totals remain advisory overages (JavaScript 1378.34/800 kB and CSS
670.52/400 kB). Catalog verification used the local seed because remote
Supabase credentials were unavailable.
