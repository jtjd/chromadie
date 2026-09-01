# Phase 3 — Integrated Roll Vertical Slice Report

> Historical implementation record. The integrated owner-roll surface was
> retired on 2026-08-31; `/roll` is now the sole interactive Roll surface.

**Milestone:** Phase 3 — Integrated Roll Vertical Slice  
**Audit date:** 2026-07-25  
**Status:** Complete

## Baseline status

Phase 3 began from the completed Phase 2 baseline: 43 passing Node tests, clean Svelte diagnostics, clean ESLint, a successful Vite build, passing internal-link/CSP/balance/catalog/scoring/database-security checks, and no schema changes. The local Supabase database remained available from the Phase 0 recovery and was not reset during this milestone.

The existing root game already had a secure server-authoritative roll transaction, authenticated daily restoration, guest local persistence, share actions, reroll guards, and canonical presentation. The Phase 3 boundary was therefore an integration seam and owner presentation slice, not a replacement of the roll transaction or guest flow.

## Delivered

- Added `src/lib/rollService.js` as the shared client request seam for `roll_die` and the existing ten-second browser reroll lock.
- Added shared percentile tier presentation to `src/lib/rollPresentation.js`.
- Updated `src/lib/Game.svelte` to use the shared request, lock, canonical normalization, and percentile seams while preserving its guest persistence and share/challenge behavior.
- Added `src/lib/ProfileRoll.svelte` for authenticated owners inside the live `ProfileShell.svelte`:
  - restores today’s result through `get_my_daily_roll`;
  - presents roll readiness, rolling, canonical result, rarity, percentile, server-reported conditions/contributors, achievement/event/milestone rewards, profile-story update, countdown, and next actions;
  - calls the existing `roll_die` RPC for normal rolls and rerolls;
  - refreshes profile, inventory, and wallet stores after success;
  - dispatches a completion event so the profile projection reloads without navigation;
  - guards stale session/request responses and duplicate reroll clicks;
  - supports mobile layout, keyboard focus, and `prefers-reduced-motion`.
- Kept owner controls behind the existing `legacy=1` path, visitor profiles read-only, and guest/local rolling on the root `Game.svelte` path.
- Added five focused Phase 3 tests. The full suite now has 48 passing tests.

## Failures discovered and resolved

1. The first `npm run check` after adding the module reported one unused global CSS selector. The selector was removed; the final Svelte check reports zero errors and zero warnings.
2. The first focused Phase 3 test run used the wrong input for the existing bottom-5 percentile boundary. The test was corrected to use the same percentile semantics as the existing game; all 48 tests now pass.
3. ESLint initially identified an unused contributor presentation path. The profile result now displays server-reported contributors and the final `npx eslint src/` run is clean.

No database, RLS, scoring, economy, reward, production-data, route, metadata, or deployment failure was discovered. The build continues to emit Vite’s existing warning that the main JavaScript chunk is larger than 500 kB; this is recorded as a warning and is outside the Phase 3 scope.

## Test coverage added

`test/phase-3-profile-roll.test.js` covers:

- exact `roll_die({ p_is_reroll })` invocation and bounded canonical result mapping;
- server failure and thrown-RPC handling without inventing a client result;
- deterministic reroll-lock set, active, expiry, and cleanup behavior;
- existing percentile tier boundaries;
- owner-only profile mounting, profile refresh RPCs, reduced-motion contract, guest boundary, and absence of client score/reward calculation.

The Phase 2 shell contract test was also updated to assert that the roll module remains owner-only and that roll authority is not implemented in `ProfileShell.svelte`.

## Compatibility, migrations, and hazards

- No schema migration was required. Existing `roll_die`, `get_my_daily_roll`, `get_score_percentile`, RLS, score persistence, reward grants, and profile/inventory/wallet refresh semantics remain in use.
- The client uses server-returned `hex`/`hex_code`, score, rarity, badges/conditions, contributors, traits, identity, percentile, achievements, milestones, and event fields only for presentation. It does not calculate eligibility, scoring, rarity, rewards, or achievement grants.
- Guest local storage remains deliberately separate from authenticated profile state. A guest roll is not imported or presented as an account roll.
- The profile module is mounted only after the resolved target profile matches the authenticated session. Public visitors do not receive roll controls.
- There are now two presentation surfaces over one roll authority: root `Game.svelte` and owner `ProfileRoll.svelte`. The shared service and canonical contracts are the required migration seam for future changes.
- The main bundle is now 520.88 kB after minification across 237 transformed modules, and Vite reports its >500 kB chunk warning. Code-splitting is a later performance milestone, not a Phase 3 redesign.

## Recommended Phase 4 boundaries

Phase 4 should focus on structured profile configuration and discovery only after a separate audit. Candidate work includes validated profile links, optional profile fields, configuration persistence, privacy/RLS review, public metadata/sitemap implications, and migration/backfill planning. It should not move scoring, rewards, eligibility, or roll authority into client state; remove the legacy controls path before equivalent owner controls are shipped; or introduce SvelteKit and unrelated component refactors in the same milestone.

## Go / no-go assessment

**GO for Phase 3 completion.** The primary authenticated roll path now lives inside the profile shell, no separate roll page is needed for the owner’s primary flow, guest/authenticated behavior remains distinct, canonical result updates refresh the profile without navigation, reroll/scoring parity contracts pass, and all required validation commands pass. Stop here; do not begin Phase 4 work as part of this milestone.

## Final validation

| Command | Result |
| --- | --- |
| `npm run build` | PASS — Vite 8.1.3; 237 modules transformed; main JS 520.88 kB; >500 kB chunk warning recorded |
| `npm run check` | PASS — 0 errors, 0 warnings |
| `npx eslint src/` | PASS — 0 errors, 0 warnings |
| `npm test` | PASS — 48 passed, 0 failed |
| `npm run check:links` | PASS |
| `npm run check:csp` | PASS |
| `npm run check:balance-drift` | PASS |
| `npm run check:catalog-drift` | PASS — local snapshot/seed match; remote comparison skipped without Supabase environment variables |
| `npm run check:scoring-parity` | PASS — 5,000 deterministic RGB samples |
| `npm run check:db-security` | PASS |

No schema changes were made, so `supabase db lint --local --level warning --fail-on warning` and `npm run db:reset` were not applicable.
