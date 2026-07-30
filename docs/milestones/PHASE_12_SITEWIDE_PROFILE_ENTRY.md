# Phase 12 — Sitewide Profile Language and Default Entry

Status: complete on the current branch; visual review artifacts are recorded
under `artifacts/phase-12/`.

## Product intent

The approved profile composition is now the visual language for the rest of
the application. Supporting pages should feel like calm rooms around the
profile, not a return to the old game dashboard. A first visit should reach a
usable profile/game destination immediately:

- authenticated `/` resolves to the owner’s live profile after session
  hydration;
- signed-out `/` remains the guest daily-roll surface;
- explicit `/?view=game` remains a direct roll route.

## Scope

- Added a shared `SiteModeHeader` for non-profile routes using the approved
  `chm.lol` brand language and quiet Profile/Roll/Discover/Studio navigation.
- Reused the production `ProfileAtmosphere` with a sanitized mapped profile
  color as the application-wide background for supporting surfaces.
- Applied darker, readable shared surface treatment to Roll, Discovery, Studio,
  help, privacy, unavailable, and guest-lock pages.
- Preserved the separate approved `ProfileModeHeader` and `ProfileShell`
  composition for public and owner profiles.
- Added route/source contracts covering default entry, explicit routes, shared
  shell usage, mobile navigation attributes, and brand asset migration.

## Compatibility boundary

No database, Supabase RPC, RLS, authentication, roll authority, scoring,
rewards, rarity, economy, entitlements, history, cosmetics, social,
moderation, public profile URL, direct-refresh, metadata, or deployment
contract changed. Existing page components retain their domain behavior; this
milestone changes only their surrounding presentation and navigation shell.

The existing linked-project migration/catalog drift remains a release concern
from the earlier launch audit. This milestone did not push migrations or add a
client fallback.

## Acceptance criteria

- The approved profile header and centered profile composition remain intact.
- Non-profile routes share the atmospheric canvas and minimal application
  header.
- A signed-out first visit reaches the guest Roll surface at `/`.
- An authenticated first visit reaches the owner profile at `/` after session
  hydration.
- Explicit Roll, Discover, Studio, privacy, help, public-profile, challenge,
  and legacy routes remain direct-refreshable.
- Mobile navigation is keyboard/attribute-visible and does not introduce
  horizontal overflow in captured states.
- Required local validation commands pass; no backend feature work begins.

## Out of scope

No new profile fields, avatar uploads, media storage, Spotify/music provider,
social feature, notification, messaging, discovery system, monetization,
dashboard section, SvelteKit migration, schema migration, or identity-data
contract work is part of Phase 12.
