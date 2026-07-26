# Phase 4 — Profile Configuration Report

**Date:** 2026-07-25  
**Branch:** `redesign/profile-first`  
**Status:** Complete  
**Assessment:** GO for Phase 4; STOP before Phase 5

## Baseline status

Phase 3 entered with the live profile shell, owner-only canonical roll module,
guest/local root flow, legacy controls escape hatch, shared profile hydration,
and 48 passing tests. Existing authentication, public profile URLs, metadata,
RLS, server-authoritative roll RPCs, scoring, economy, rewards, shop,
leaderboard, cosmetics, and historical data were treated as compatibility
boundaries.

Phase 4 adds a small, additive profile-expression slice:

- `profile_configurations` stores one version-1 draft and published JSONB
  projection per profile.
- Owner RPCs load, validate/save, and explicitly publish the configuration.
- Public RPCs return published configuration only.
- `ProfileEditor.svelte` provides owner-local preview, signature color, layout
  variant, module order/visibility, and up to six typed HTTPS links.
- `ProfileShell.svelte` renders configured modules and links through a shared
  safe client normalizer. The owner roll module remains visible and the visitor
  shell remains read-only.

No existing route, metadata contract, scoring path, economy value, reward,
authentication flow, or production data was redesigned.

## Failures discovered and disposition

The first required schema lint pass reported that
`normalize_profile_configuration` was declared `IMMUTABLE` even though its
JSON-building PL/pgSQL assignments were classified as `STABLE`. The function
is deterministic but its volatility declaration was corrected to `STABLE`.
The database was reset again and the final schema lint completed with no
errors.

No application type, lint, test, security, link, CSP, balance, catalog, or
scoring failures remained at the milestone boundary.

## Coverage added

`test/phase-4-profile-config.test.js` adds four focused tests covering:

- safe version-1 defaults, complete module structure, and always-visible roll;
- malformed configuration fallback and unsafe link removal;
- owner draft versus visitor published-only profile loading, including the
  RPC split and public field allow-list;
- editor/rendering source contracts for save, publish, preview, HTTPS links,
  and the absence of raw HTML/eval-style escape hatches.

`supabase/tests/launch_security.sql` additionally verifies:

- intended function grants and absent browser table grants;
- default owner configuration creation;
- invalid configuration rejection;
- save-without-publish behavior and explicit publication;
- anonymous owner-RPC denial and public draft exclusion;
- configuration cleanup through account deletion.

The full Node suite increased from 48 to 52 passing tests.

## Migration and compatibility notes

- Migration `20260725100000_profile_configuration.sql` is additive and
  references `profiles(id)` with `ON DELETE CASCADE`.
- `anon` and `authenticated` receive no direct table privileges. Browser
  access uses fixed-search-path security-definer RPCs with explicit grants.
- The SQL validator accepts only fixed module/layout/link identifiers, safe
  six-digit hex colors, bounded labels, and HTTPS URLs. It rejects hidden roll
  configuration, raw markup/CSS, arbitrary URL protocols, malformed module
  sets, and invalid ordering.
- The client normalizer is defensive for stale or malformed public responses;
  it is not a replacement for server validation.
- Public Pages Function metadata remains username/profile based. Configuration
  is loaded by the bounded browser RPC and is not injected into OG/JSON-LD or
  sitemap generation.
- The existing `legacy=1` route remains the owner-controls fallback for mood,
  pinned badges, rivals, and account deletion.

## Recommended Phase 5 boundaries

The next milestone should be separately audited and should stay outside this
configuration slice:

- profile story/history/collection data that tells the player’s color story;
- public discovery/search and profile-to-profile exploration improvements;
- any new profile fields requiring privacy, moderation, or metadata decisions;
- configuration versioning only when a concrete new module needs it.

Do not begin SvelteKit migration, broad component refactors, scoring/economy
changes, reward changes, metadata redesign, or unrestricted customization as
part of that work.

## Final validation

| Command | Result |
| --- | --- |
| `npm run build` | PASS — 240 modules transformed; 536.35 kB main JS asset; existing >500 kB warning remains |
| `npm run check` | PASS — 0 errors, 0 warnings |
| `npx eslint src/` | PASS |
| `npm test` | PASS — 52 passed, 0 failed |
| `npm run check:links` | PASS |
| `npm run check:csp` | PASS — 1 inline script block covered |
| `npm run check:balance-drift` | PASS — 66 conditions, 7 rarity tiers, 42 achievement checks |
| `npm run check:catalog-drift` | PASS — local snapshot/seed match; remote comparison skipped without Supabase env vars |
| `npm run check:scoring-parity` | PASS — 5,000 deterministic RGB samples |
| `npm run check:db-security` | PASS — security/integrity audit passed and rolled back its test transaction |
| `supabase db lint --local --level warning --fail-on warning` | PASS — no schema errors |
| `npm run db:reset` | PASS — local database reset and migration applied |

## Go/no-go

**GO:** Phase 4 acceptance criteria are met. Two profile configurations can be
kept separate through the validated owner draft/publish path; previews remain
local until save/publish; public reads are published-only; malformed data and
unsafe links are rejected or safely normalized; existing owner/visitor,
guest/authenticated, route, roll, metadata, auth, deletion, RLS, scoring,
economy, reward, and historical-data boundaries remain protected.

**NO-GO for Phase 5 work in this milestone:** stop here. Story/history,
collection depth, discovery redesign, SvelteKit, and unrelated refactors need
their own audit, plan, tests, and acceptance review.
