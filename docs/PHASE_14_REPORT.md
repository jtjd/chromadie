# Phase 14 Report — Avatars, Backgrounds, and Spotify

**Status:** local implementation complete; production deployment not performed.

## Scope delivered

- Added additive profile-expression columns for `avatar_path`,
  `background_path`, `spotify_type`, and `spotify_id`.
- Added the `avatars` and `backgrounds` Storage buckets with WebP-only output,
  size limits, public reads, and owner-scoped write/delete policies.
- Added browser-side image validation, square avatar crop, background resize,
  WebP conversion, replacement, removal, and initials/generated-atmosphere
  fallbacks.
- Added server-authoritative Spotify URL parsing for HTTPS
  `open.spotify.com` track, playlist, and album URLs. Only the bounded type and
  identifier are stored; the public profile uses Spotify's lazy official embed.
- Kept all controls inside `/profile/settings`; the approved public profile
  composition was not expanded.
- Added profile-deletion Storage cleanup and focused SQL/client regression
  coverage.

## Verification

Local database reset and schema lint passed. The Phase 14 migration replayed
successfully after the complete local migration chain, and the database
security audit passed Storage ownership, RLS, bounded RPC, public projection,
invalid-input, and account-cleanup checks.

Focused tests: **133/133 passed**.

Performance budget passed:

- JavaScript: 619.01 kB / 625 kB
- CSS: 294.81 kB / 295 kB
- HTML shell: 5.22 kB / 12 kB

The Vite chunk-size advisory remains non-blocking; the repository performance
guard passes without raising its limits.

Browser evidence is stored in `artifacts/phase-14/` for avatar, background,
Spotify, no-expression, desktop/mobile profile, and desktop/mobile settings
states. The evidence was captured locally at device scale 1 and reviewed
visually.

## Release boundary

No linked Supabase migration was pushed, no production database was changed,
and no deployment or public-gate change was made. The local-only Phase 14
migration is `20260730110000_profile_expression_media.sql`. Production rollout
remains a separate reviewed release action.

**Recommendation:** GO for local review and staged deployment preparation;
NO-GO for production until the migration and media flows receive an explicit
release pass.
