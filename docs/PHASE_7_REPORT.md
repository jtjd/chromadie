# Phase 7 — Social Layer Report

**Date:** 2026-07-25  
**Status:** Complete  
**Scope:** Safe profile-to-profile interactions; no notifications, private messaging, or Phase 8 work.

## Baseline status

Phase 6 ended with 62 passing native tests, a green mandatory validation suite,
and the existing authenticated five-rival `user_follows` path as the only
social write surface. The audit found no reactions, guestbook, block, report,
social privacy, or social rate-limit tables/RPCs. Public profile, story, and
discovery projections were already the correct seams for an additive social
layer.

Existing gameplay, authentication, profile URLs, metadata, scoring, rewards,
economy, RLS authority, and historical roll data remained the compatibility
baseline.

## Implementation

- Added `profile_social_settings`, `profile_favorites`,
  `profile_reactions`, `profile_guestbook_entries`, `profile_blocks`,
  `profile_reports`, and `profile_social_rate_limits` in the additive
  `20260725130000_social_layer.sql` migration.
- Added fixed-search-path SECURITY DEFINER RPCs for public social projection,
  favorites, positive reactions (`spark`, `glow`, `cheer`), guestbook create/
  delete, blocks, reports, and owner settings.
- Kept all new social tables RLS-enabled with no `anon` or `authenticated`
  table privileges. Reports and rate-limit state stay outside public JSON.
- Enforced authentication, reciprocal block checks, owner interaction settings,
  plain-text/240-character guestbook bounds, URL/control-character rejection,
  report reason/detail bounds, per-action rate windows, and profile-deletion
  cascades in SQL.
- Updated the existing `toggle_follow` RPC to apply the block and interaction
  boundary while preserving its five-rival cap and action return contract.
- Applied activity privacy to the existing score/story projections and
  discovery privacy to the existing bounded discovery projection. Direct
  `/u/<username>` links remain valid when discovery inclusion is disabled.
- Added `profileSocial.js` normalization/RPC helpers and `ProfileSocial.svelte`
  inside the existing `ProfileShell` without creating a second legacy social
  renderer or changing route/metadata behavior.

## Failures discovered and resolved

- The first ESLint pass identified one reactive assignment warning and two
  unkeyed Svelte `{#each}` blocks in the new social component. These were
  corrected; the final source lint is clean.
- The first social privacy security assertion found that the hidden story
  projection returned `NULL` rather than a stable empty projection. The
  migration now gates timeline/collection rows while preserving the JSON
  shape; anonymous hidden activity returns empty arrays and owners retain
  access.
- No pre-existing validation command failed after the implementation was
  stabilized.

## Coverage added

`test/phase-7-social.test.js` adds four focused tests covering:

- bounded public social normalization and removal of private fields;
- owner social settings versus visitor public-only hydration;
- safe defaults for incomplete settings payloads;
- RPC-backed social writes, safe text rendering, migration bounds, and the
  no-raw-HTML contract.

`supabase/tests/launch_security.sql` now covers browser grants/RLS, fixed
search paths, authenticated-only writes, guestbook URL and length/rate
controls, report writes, block cleanup and suppression, owner settings,
activity/discovery privacy, and social account-deletion cleanup.

The native suite increased from 62 to 66 passing tests.

## Migration and compatibility risks

The schema change is additive and local reset verified the complete migration
chain. Social rows reference profiles with `ON DELETE CASCADE`; guestbook
report references use `ON DELETE SET NULL` so moderation records do not hold a
deleted note. The migration narrowly replaces existing score/story/discovery
function definitions to enforce privacy, so a production rollback must restore
those prior function bodies before removing social settings. No automatic
down-migration or production data rewrite is included.

The opaque guestbook entry reference is an action handle, not a profile/user
identifier. Do not expose author ids, reporter ids, moderation details, email,
or private activity in future social projections. Existing guestbook rows are
hidden across blocks but retained for moderation; changing that policy needs a
separate decision.

## Recommended Phase 8 boundary

Begin with the decoration studio and monetization slice only: preview current
structured cosmetics on the real profile canvas, preserve earned/free/premium
labels, and keep gameplay prestige non-purchasable. Do not combine that work
with notifications, private messaging, visitor analytics, comparisons,
broader profile visibility, SvelteKit, or unrelated cleanup.

## Validation results

All required commands passed on 2026-07-25:

| Command | Result |
| --- | --- |
| `npm run build` | PASS — Vite 8.1.3; 252 modules; JS 569.39 kB; CSS 235.41 kB; existing >500 kB chunk warning |
| `npm run check` | PASS — 0 errors, 0 warnings |
| `npx eslint src/` | PASS — no errors |
| `npm test` | PASS — 66 passed, 0 failed |
| `npm run check:links` | PASS — internal link check passed |
| `npm run check:csp` | PASS — 1 inline script block passed |
| `npm run check:balance-drift` | PASS — 66 v2 conditions, 7 rarity tiers, 42 achievement checks, 42 seeded achievements |
| `npm run check:catalog-drift` | PASS — local snapshot/seed match, 80 items; remote comparison skipped without Supabase env vars |
| `npm run check:scoring-parity` | PASS — 5000 deterministic RGB samples |
| `npm run check:db-security` | PASS — database security and integrity checks passed; transaction rolled back |
| `supabase db lint --local --level warning --fail-on warning` | PASS — no schema errors found |
| `npm run db:reset` | PASS — local database reset and social migration applied successfully |

## Go/no-go assessment

**GO for Phase 7.** The social slice meets its acceptance criteria: protected
RPC-backed writes, RLS/grant boundaries, abuse controls, owner interaction
controls, safe guestbook rendering, block/report enforcement, privacy gates,
and no private messaging. **NO-GO for Phase 8 work in this milestone**; the
next implementation should begin only under a separate decoration-studio
request and plan.
