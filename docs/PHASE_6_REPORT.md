# Phase 6 — Discovery Report

**Date:** 2026-07-25  
**Branch:** `redesign/profile-first`  
**Status:** Complete  
**Scope:** Public discovery hub and profile-card migration only

## Baseline status

Phase 5 entered with the live Svelte 5/Vite SPA, existing `/leaderboard` route,
four public leaderboard projection views, and the authenticated
`get_rivals_scores()` compatibility path. Public profiles already had the
canonical `/u/<username>` route, profile metadata Pages Function, bounded
public profile projections, and the Phase 5 story/configuration boundaries.

The pre-Phase 6 baseline was green: 56 tests passed, the required frontend and
security checks passed, and the only recurring build note was the existing
Vite warning that the main JavaScript chunk is larger than 500 kB.

## Audit findings and failures

- The old leaderboard rendered period rows and one daily feature, but did not
  provide a discovery hub, strong reusable profile cards, public pagination,
  exceptional/rising/new/random surfaces, or profile-link sharing.
- Existing ranking views were safe public projections, but a new feed could not
  safely be built by selecting `scores` or broad `profiles` fields in the
  browser. A dedicated bounded RPC was required.
- The existing rivals RPC returns a target id because the follow mutation needs
  it. That behavior remains isolated to the authenticated rivals compatibility
  surface; the new public discovery RPC omits internal ids.
- No scoring, roll eligibility, reward, economy, RLS policy, or production-data
  failure was found. The additive migration applied cleanly locally.
- One new client contract test initially exposed a mismatch between the
  server's hard cap and the client page-size contract. The normalizer now caps
  and slices responses to the eight-card client boundary.
- The production build still reports the pre-existing >500 kB chunk warning;
  it is recorded and does not block this milestone.

## Implemented slice

- Added `get_public_discovery(text,text,text,integer,integer)` with fixed search
  path, explicit browser grants, eight allow-listed surfaces, safe username and
  rarity filters, page/limit caps, public-only JSON, and deterministic daily
  random ordering.
- Added additive indexes for profile creation order, profile best-roll order,
  and recent per-player score selection.
- Added `discoveryData.js` for username/path/share validation, bounded public
  normalization, response pagination normalization, and the rivals-only
  compatibility adapter.
- Added `DiscoveryHub.svelte` and `DiscoveryCard.svelte`; kept
  `Leaderboard.svelte` as the existing route entry point.
- Preserved today, rivals, weekly, monthly, and all-time tabs while adding
  exceptional, rising, new, and random surfaces, username/rarity filters,
  load-more pagination, profile CTAs, and Web Share/clipboard actions.
- Updated route allow-lists and leaderboard metadata without changing the
  canonical `/leaderboard` or `/u/<username>` URLs.

## Coverage added

`test/phase-6-discovery.test.js` adds six focused tests covering:

- public card field normalization and internal-id removal;
- bounded response pagination and surface allow-lists;
- safe public profile paths and share text;
- the rivals-only follow-id compatibility boundary;
- discovery route parsing;
- RPC/card/hub source contracts, reduced motion, and raw-HTML safety.

`supabase/tests/launch_security.sql` now also checks discovery RPC grants,
fixed search path, required indexes, page bounds, username filtering, and the
absence of `user_id` in public discovery JSON.

## Migration and privacy boundary

Migration `20260725120000_public_discovery.sql` is additive and reversible by
removing the new RPC/index objects during a migration window. It does not alter
existing rows or existing roll/score/economy functions. The public function
returns only approved profile/card fields. It does not expose email, wallet
state, private achievement progress, draft configuration, direct score-table
access, or internal identifiers. Existing rivals behavior is explicitly
separate and authenticated.

## Recommended Phase 1 boundary

Phase 7 should own follows/favorites as a deliberate social contract,
positive reactions, moderated guestbook, block/report controls, and any social
rate limiting. Keep discovery read-only until those write boundaries are
designed. Defer SvelteKit, broad component refactors, subjective beauty
ranking, profile metadata redesign, and additional profile schema fields.

## Go/no-go assessment

**GO.** The discovery vertical slice is implemented behind a bounded public
projection, existing profile and leaderboard URLs are preserved, privacy and
server-authority boundaries remain explicit, and the focused client/database
tests pass.

Final validation was green: build (249 modules; existing >500 kB warning),
Svelte check, ESLint, 62 tests, internal links, CSP, balance drift, catalog
drift, scoring parity, database security, and local schema lint all passed.
The additive migration was also applied successfully by `npm run db:reset`.
