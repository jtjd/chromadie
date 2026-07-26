# Phase 2 — Profile Shell Report

**Date:** 2026-07-25  
**Branch:** `redesign/profile-first`  
**Milestone:** Phase 2 — Profile Shell  
**Status:** Complete  
**Assessment:** GO

## Baseline status

Phase 2 began from the Phase 1 baseline: 39 passing Node tests, a clean Svelte check and ESLint run, a successful Vite build, passing link/CSP/drift/parity/security checks, and no schema changes. The local Supabase database remained available from the Phase 0 recovery; it was not reset during this milestone.

The live profile path is now a small vertical slice rather than a fixture-only surface. Existing `/u/<username>`, `/profile`, and profile-id routes select `ProfileShell.svelte` by default. The shell reads the same public/owner profile contract as the legacy renderer and presents identity, rank, stats, best roll, recent colors, pinned badges, and validated cosmetics.

## Delivered

- Added `src/lib/profileData.js` as the shared profile hydration seam.
  - Authenticated self lookups continue through `get_my_profile()`.
  - Visitor and guest public lookups continue through the explicit public `profiles` field list.
  - Recent history continues through bounded `get_public_profile_scores(p_user_id)`.
  - `user_achievements` is requested only for the owner path.
  - `profileContract.js` remains the field and ownership mapping boundary.
- Added `src/lib/ProfileShell.svelte` using Phase 1 foundations.
  - Identity hero with username, title/staff/event presentation, safe monogram/brand-mark avatar treatment, mood, and owner/visitor mode.
  - Rank progress, streaks, lifetime EP, total rolls, best roll, recent public colors, pinned achievements, and public-boundary explanation.
  - Authenticated visitor rival action and owner links to the existing controls.
  - Loading, unavailable, warning, empty-history, mobile, focus, and reduced-motion states.
- Integrated the shell in `App.svelte` without deleting the existing renderer.
- Added `legacy=1` route parsing and fallback behavior. Public legacy profile URLs are canonicalized to `/u/<username>` and marked `noindex,follow` by the Pages Function and client metadata.
- Preserved the existing mood RPC, badge RPC, rival RPC, account deletion flow, shop catalog, cosmetic sanitizer, score projection, and auth boundaries.
- Documented the current schema limitation: there is no public bio or avatar column, so no invented profile fields were added.

## Failures discovered and resolution

During the implementation checks:

1. `npm run check` initially reported that the injected `supabaseClient` property was missing from the inferred JavaScript parameter type. The loader parameter was corrected and the check passed.
2. `npx eslint src/` initially reported an unused shell helper/effect and a useless initialization in the loader. The unused helper was removed, the frame effect was applied to the shell avatar, and the loader response was simplified.
3. The first Phase 2 `npm test` run failed because the new Node-imported loader referenced `profileContract` without its `.js` extension. The import was corrected; the final test run passed.
4. `npm run build` reports a Vite chunk-size warning after the shell was added: the main minified JavaScript chunk is over 500 kB. This is a performance follow-up for the launch-polish phase, not a validation failure.

No validation command remained failing after these corrections. No database failure occurred in Phase 2.

## Test coverage added

`test/phase-2-profile-shell.test.js` adds four focused tests:

- Owner hydration uses `get_my_profile`, maps only approved profile/score fields, and loads owner achievement progress.
- Visitor hydration uses the public profile select and never requests `user_achievements` or exposes unlock counts.
- Public and owner route parsing preserves the profile path and `legacy=1` fallback.
- The shell is live-data based and does not begin Phase 3 roll/economy work.

The final Node suite contains 43 passing tests.

## Migration and security assessment

- Database migrations: none.
- RLS, RPC definitions, score/economy/reward semantics: unchanged.
- Production data: no writes.
- Public profile fields: unchanged and still allow-listed.
- Owner-only fields/progress: not rendered to visitors; shell data loader preserves the owner branch.
- Cosmetics: still sourced from the live catalog and interpreted through `cosmetics.js`/`cosmeticSafety.js`.
- Share URLs and direct refresh: preserved for `/u/<username>`, `/profile`, profile-id query routes, and the explicit legacy fallback.
- Bio/avatar: intentionally deferred because the current schema does not provide those public fields.

## Recommended Phase 3 boundaries

Phase 3 should integrate today's existing secure roll flow into the shell only after a separate audit. It may reuse `roll_die`, `get_my_daily_roll`, `rollState.js`, and the canonical result fields, but must:

- keep eligibility, scoring, reroll locks, rewards, achievements, and persistence server-authoritative;
- update the shell without changing public profile privacy or route metadata;
- preserve guest versus authenticated state and stale-request guards;
- add reduced-motion/mobile result states and parity tests;
- leave profile configuration, bio/avatar, links, discovery, SvelteKit, and broad refactors out of scope.

## Final validation

| Command | Result | Exact result |
| --- | --- | --- |
| `npm run build` | PASS | `vite v8.1.3`; 234 modules transformed; main JS asset 505.93 kB; Vite emitted its >500 kB chunk-size warning |
| `npm run check` | PASS | `svelte-check found 0 errors and 0 warnings` |
| `npx eslint src/` | PASS | No output/errors |
| `npm test` | PASS | 43 passed, 0 failed |
| `npm run check:links` | PASS | `Internal link check passed.` |
| `npm run check:csp` | PASS | `CSP check passed for 1 inline script block(s) in dist/index.html.` |
| `npm run check:balance-drift` | PASS | `Balance drift check passed: 66 v2 score conditions, 7 rarity tiers, 42 achievement checks, 42 seeded achievements.` |
| `npm run check:catalog-drift` | PASS | `Catalog drift check passed locally: snapshot and seed match (80 items).` Remote comparison skipped without Supabase env vars |
| `npm run check:scoring-parity` | PASS | `Scoring parity passed for 5000 deterministic RGB samples.` |
| `npm run check:db-security` | PASS | `Database security and integrity checks passed.` |

Schema-specific `supabase db lint --local --level warning --fail-on warning` and `npm run db:reset` were not applicable because this milestone added no schema change.

## Go / no-go assessment

**GO for Phase 2 completion.** Current public profile routes render through the live shell, the owner/visitor data boundary remains covered, cosmetics and public history remain mapped through existing sources, direct-refresh/canonical behavior is preserved, and the legacy controls path remains available. Stop here. Do not begin Phase 3 roll integration or Phase 4 profile configuration in this milestone.
