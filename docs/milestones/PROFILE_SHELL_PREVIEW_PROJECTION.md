# Profile Shell preview projection — 2026-09-22

## Objective

Move Studio-preview identity and profile-state projection out of
`ProfileShell.svelte` into directly tested profile presentation helpers.

## Audit

`ProfileShell.svelte` contains the preview branch of `syncProfileData()`. It
keys the preview by profile/scores/timeline/collection/achievements, resolves
the explicit preview profile or snapshot fallback, supplies identity defaults,
normalizes numeric and cosmetic fields, normalizes the selected profile config,
and creates empty social/progression state. Only the profile key and data
context should reconstruct the shell: changing the staged configuration must
continue to update the live preview without resetting its mounted effects.

## Plan

1. Add `profileShellPreview.js` with a preview-context key helper and a
   normalized preview-state projector.
2. Replace the data construction in `ProfileShell.svelte` with the projector;
   keep request invalidation, shell reset, and state assignment in the Svelte
   adapter.
3. Add direct projection tests for the key boundary, profile/snapshot fallback,
   identity defaults, numeric coercion, arrays, social state, and configuration
   fallback. Update the rollout source contract to follow the new boundary.
4. Run the mandatory validation suite and record the outcome.

## Compatibility and risk

No profile route, server read, analytics, privacy, or visual contract changes
are intended. Preserve the current key's five inputs and serialized form;
profile configuration remains excluded so normal editor updates do not rebuild
the preview shell. Preserve the explicit-profile-first snapshot fallback,
`Chromanaut` and `profile-studio-preview` defaults, color fallback, profile
field coercions, and empty-state projection. No schema change is needed.

## Acceptance

- The preview profile and associated state are produced by the tested module.
- The shell still owns preview identity invalidation and rendering lifecycle.
- Existing public, owner, and Studio preview contracts remain covered; route
  budgets and all mandatory checks pass. No schema changes.

## Implementation

- Added `profileShellPreview.js` for the preview identity key, source/config
  precedence, normalized profile projection, and associated preview state.
- Included the empty progression proof, social data, and default social
  settings in the projection so the tested output covers the whole preview
  state boundary.
- Kept key invalidation, request invalidation, shell reset, and Svelte state
  assignment in `ProfileShell.svelte`. Configuration remains outside the key,
  so editing the draft does not remount the preview.
- Added direct tests for snapshot fallback, default identity and values,
  configuration fallback, retained arrays, and empty social/progression
  state.

## Validation

- Build, Svelte check (0 errors/warnings), ESLint, all 711 unit tests, internal
  links, CSP, performance budgets, username policy, balance, local catalog,
  5,000-sample scoring parity, and database security checks pass.
- Public-profile route JavaScript is 471.49 kB / 475 kB; dashboard route
  JavaScript is 541.90 kB / 542 kB. The performance checker reports advisory
  aggregate JavaScript/CSS catalog overages; enforced route and asset budgets
  pass.
- Catalog verification used the local seed because remote Supabase credentials
  were unavailable. No schema change was made, so database lint/reset were not
  applicable.
