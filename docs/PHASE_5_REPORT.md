# Phase 5 — Story and Progression Report

**Date:** 2026-07-25  
**Branch:** `redesign/profile-first`  
**Status:** Complete  
**Assessment:** GO for Phase 5; STOP before Phase 6

## Baseline status

Phase 4 ended with 52 passing tests, a live profile shell, integrated owner
roll, version-1 profile configuration with explicit publish, public-safe links,
and a private/public configuration boundary. Existing auth, routes, metadata,
RLS, score/roll authority, achievements, shop, leaderboard, cosmetics,
account deletion, and historical score semantics remained compatibility
boundaries.

Phase 5 adds the first durable profile story slice:

- `profile_events` records profile creation and canonical score events through
  idempotent database triggers, with a safe historical backfill.
- `get_public_profile_story(uuid)` returns at most 40 timeline events and 30
  lifetime condition-collection entries.
- The existing recent and achievement modules now include a visual color
  timeline and collection showcase, preserving Phase 4 saved configurations.
- Story depth grows from server-owned `total_rolls`; the collection showcase
  unlocks at ten rolls.
- Private `user_achievements` progress is not copied into public story data.

No existing route, metadata contract, scoring path, reward, economy value,
authentication flow, or profile configuration schema was redesigned.

## Failures discovered and disposition

During client integration, Svelte diagnostics caught an unnecessary
`profileStats` prop passed to `ProfileEditor.svelte`. It was removed without
changing the editor contract; subsequent diagnostics passed with zero errors
and warnings.

The Phase 5 migration applied cleanly and schema lint reported no warnings or
errors. No application, security, link, CSP, balance, catalog, or scoring
parity failures remained at the milestone boundary.

## Coverage added

`test/phase-5-profile-story.test.js` adds four focused tests covering:

- progressive story thresholds derived from server-owned roll totals;
- bounded normalization of timeline and collection payloads, including unsafe
  condition filtering and unknown event rejection;
- owner/visitor loading of the same public story projection without private
  achievement reads or private profile fields;
- presentation-only component contracts, reduced-motion behavior, bounded RPC
  limits, and absence of raw HTML/eval escape hatches.

`supabase/tests/launch_security.sql` additionally verifies:

- intended story RPC grants and absent browser event-table grants;
- capture of a canonical roll as a public-safe timeline event;
- array bounds and public story projection availability;
- event cleanup after account deletion.

The full Node suite increased from 52 to 56 passing tests.

## Migration and compatibility notes

- Migration `20260725110000_profile_story.sql` is additive and references
  `profiles(id)` with `ON DELETE CASCADE`.
- Trigger writes are observational and idempotent. Score and roll SQL remain
  the authority for color, score, rarity, conditions, rewards, eligibility,
  and achievements.
- Historical backfill copies only public-safe profile/score presentation
  fields. It does not rewrite scores or user achievement rows.
- Browser roles have no direct `profile_events` privileges. The public RPC is
  a fixed-search-path security-definer projection with explicit anon and
  authenticated grants.
- The lifetime collection is grouped server-side from canonical
  `scores.condition_ids`; public achievement labels are optional enrichment,
  not unlock state.
- Story sections use the existing `recent` and `achievements` configuration
  modules. Existing version-1 eight-module saved layouts remain valid.
- Pages Function metadata, OG/JSON-LD, sitemap behavior, public URLs, and
  direct-refresh routing are unchanged.

## Recommended Phase 6 boundaries

The next milestone should be separately audited and limited to discovery:

- profile cards and a bounded discovery hub;
- today's strongest rolls, recent exceptional rolls, rising/new/random
  profiles, and filters/pagination;
- direct public-profile CTA and share affordances;
- indexed, bounded queries with explicit public-field projections.

Keep social writes, reactions, guestbooks, messaging, SvelteKit migration,
metadata redesign, scoring/economy changes, and unrelated refactors out of
that work.

## Final validation

| Command | Result |
| --- | --- |
| `npm run build` | PASS — `vite v8.1.3`; 245 modules transformed; 544.93 kB main JS and 221.71 kB CSS; existing >500 kB warning remains |
| `npm run check` | PASS — `svelte-check found 0 errors and 0 warnings` |
| `npx eslint src/` | PASS |
| `npm test` | PASS — 56 passed, 0 failed |
| `npm run check:links` | PASS — `Internal link check passed.` |
| `npm run check:csp` | PASS — 1 inline script block covered |
| `npm run check:balance-drift` | PASS — 66 v2 score conditions, 7 rarity tiers, 42 achievement checks, 42 seeded achievements |
| `npm run check:catalog-drift` | PASS — local snapshot/seed match (80 items); remote comparison skipped without Supabase env vars |
| `npm run check:scoring-parity` | PASS — 5,000 deterministic RGB samples |
| `npm run check:db-security` | PASS — security/integrity audit passed and rolled back its test transaction |
| `supabase db lint --local --level warning --fail-on warning` | PASS — no schema errors |
| `npm run db:reset` | PASS — local database reset and migration applied |

## Go/no-go

**GO:** Phase 5 acceptance criteria are met. Old and new profiles have a
durable public-safe story path; canonical rolls create timeline events;
lifetime conditions are grouped into a bounded collection; story depth is
understandable from server-owned progression; public reads exclude drafts and
private achievement progress; deletion and RLS boundaries remain protected;
and mobile/reduced-motion presentation is covered.

**NO-GO for Phase 6 work in this milestone:** stop here. Discovery redesign,
social interactions, SvelteKit, metadata changes, and unrelated refactors need
their own audit, plan, tests, and acceptance review.
