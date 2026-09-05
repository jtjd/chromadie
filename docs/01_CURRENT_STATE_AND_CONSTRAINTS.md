# Current State and Constraints

This plan is based on the uploaded Chromadie source.

## Current Technical Baseline

- Svelte 5 SPA built with Vite.
- Supabase authentication, database, RLS, RPCs, migrations, and Edge Functions.
- Cloudflare Pages hosting and Pages Functions for route-aware metadata.
- Guest play remains local-only.
- Server-authoritative gameplay mutations.
- Existing public profile route: `/u/<username>`.
- Existing shop, leaderboard, profile, game, auth, FAQ, privacy, and challenge flows.
- Existing tests and security/parity scripts.

## Important Existing Assets to Preserve

- Authentication and session hydration.
- Username handling and moderation.
- Daily roll eligibility and anti-reroll protections.
- Scoring and reward parity between JavaScript and SQL.
- Achievements, badges, ranks, cosmetics, shop ownership, and equipped items.
- Public-profile privacy controls.
- Leaderboard data.
- Account deletion.
- CSP, HSTS, sitemap, metadata, OG cards, and direct-route behavior.
- Historical rolls and lifetime progression.

## Current Structural Risk

Several central components are already very large:

- `src/App.svelte`
- `src/lib/Profile.svelte`
- `src/lib/Game.svelte`
- `src/lib/Shop.svelte`

Do not continue adding major systems directly into these files.

The redesign must extract stable domain components and services while keeping the site operational.

## Migration Strategy

Use a strangler migration:

1. Keep current routes and backend behavior working.
2. Introduce a new profile shell and module registry.
3. Place existing functionality inside adapters where practical.
4. Replace one vertical slice at a time.
5. Retire old components only after behavioral parity and tests.
6. Preserve rollback points throughout the process.

## Product Constraints

- The profile must be valuable before premium purchases.
- The roll must remain immediately understandable.
- Visitors must be able to understand a profile without knowing the game.
- Customization must remain safe, responsive, and legible.
- Social systems require moderation, rate limiting, privacy controls, and abuse handling from the beginning.
- New systems should remain viable on Supabase and Cloudflare free/low-cost infrastructure until growth justifies expansion.

## Owner-Facing Surface Map — 2026-09-04

| Capability | Canonical surface | Authority and loading boundary |
| --- | --- | --- |
| Journey summary | `/progression` | Existing profile and progression stores |
| Achievements | `/progression?tab=achievements` | Existing achievement rows; owner unlocks load on demand |
| Condition collection | `/progression?tab=collection` | Active v6 catalog plus an owner-only bounded discovery aggregate |
| Profile history | `/progression?tab=history` | Owner-only keyset RPC, 40 records per page |
| Profile content and widgets | `/profile/settings#customize-content` | Validated v2 Studio draft and existing publish RPC |
| Rivals | `/leaderboard?tab=rivals` | Authenticated owner RPC over the existing five-follow relationship |
| Analytics and notifications | Profile menu under More | Existing dedicated routes remain canonical |

The former shop surface remains retired and redirected; this work does not
restore it. Public profile URLs, metadata, direct-refresh routing, gameplay
authority, historical records, and existing privacy controls remain unchanged.
