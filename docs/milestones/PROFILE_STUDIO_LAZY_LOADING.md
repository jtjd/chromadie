# Profile Studio lazy loading — 2026-09-22

## Objective

Move Profile Studio's lazy component request, cache, error, and retry state out
of `ProfileSettings.svelte` into a directly tested Studio-specific module.

## Audit

`ProfileSettings.svelte` currently implements three connected lazy-loading
paths: per-section chunks, the live profile preview, and editor groups selected
by the active Customize tab. Section loading deduplicates concurrent requests,
supports forced retry, reports errors, and tracks whether any section is still
loading. Preview loading separately caches and deduplicates its request. The
existing retry test extracts a function's source and evaluates it in a VM,
which tests a copied component fragment rather than an importable module.

## Plan

1. Add `profile-studio/lazyComponents.js` to own section/preview load promises,
   resolved components, errors, loading state, retry, and tab-to-editor groups.
2. Keep active navigation, Svelte variables, and component rendering in
   `ProfileSettings.svelte`; mirror controller snapshots through one callback.
3. Replace the VM source test with direct module tests for request deduplication,
   overlapping loading, retry, error recovery, preview loading, and all tab
   groups.
4. Run the mandatory validation suite and record the outcome.

## Compatibility and risk

No profile data, route, auth, save, or backend behavior changes are intended.
Preserve the current tab-to-section mapping, lazy import targets, forced retry,
per-section error text, preview error text, and the rule that `sectionLoading`
stays true until every pending section request settles. The dashboard route is
close to its JavaScript budget, so route performance must be checked after the
extraction. No schema change is needed.

## Acceptance

- Section and preview requests are loaded and deduplicated by the controller.
- Retry and failure recovery are tested by importing the real module directly.
- The current Profile Studio tab mapping and UI state remain unchanged.
- All mandatory checks, including route budgets, pass. No schema changes.

## Implementation

- Added `profile-studio/lazyComponents.js` to own section and preview loader
  promises, resolved component caches, error recovery, aggregate loading state,
  and the current Customize-tab groups.
- Kept Svelte navigation and rendering state in `ProfileSettings.svelte`,
  mirrored from controller snapshots, and disposed the controller on teardown.
- Replaced the VM source extraction test with direct tests for concurrent
  deduplication, overlapping section loads, retry, tab mapping, preview cache
  recovery, and teardown. Updated the state-gap contract to target the module.

## Validation

- Build, Svelte check, full-source ESLint, 705 tests, links, CSP, performance,
  username policy, balance, catalog, scoring parity, and database security
  checks pass.
- Dashboard route JavaScript is 540.95/542 kB; enforced route budgets pass.
  Aggregate JavaScript (1376.68/800 kB) and CSS (670.46/400 kB) catalog checks
  remain advisory. Catalog drift validated the local seed because remote
  Supabase credentials were unavailable.
- No schema changes.
