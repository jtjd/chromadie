# Phase 14 Report — Profile Expression and Staff Audio Alpha

**Status:** implementation complete locally; the staff-audio migration is
pending linked-project release. The public gate remains active.

## Scope delivered

- Added additive profile-expression columns for `avatar_path`,
  `background_path`, `spotify_type`, and `spotify_id`.
- Added the `avatars` and `backgrounds` Storage buckets with WebP-only output,
  size limits, public reads, and owner-scoped write/delete policies.
- Added browser-side image validation, square avatar crop, background resize,
  WebP conversion, replacement, removal, and initials/generated-atmosphere
  fallbacks.
- Added stored-output budgets of 256 KiB per avatar and 1 MiB per background,
  enforced by the browser processor and Supabase Storage bucket limits.
- Added server-authoritative Spotify URL parsing for HTTPS
  `open.spotify.com` track, playlist, and album URLs. Only the bounded type and
  identifier are stored; the public profile uses Spotify's lazy official embed.
- Kept all controls inside `/profile/settings`; the approved public profile
  composition was not expanded.
- Added profile-deletion Storage cleanup and focused SQL/client regression
  coverage.
- Added a staff-only hosted MP3 alpha with one owner-scoped object per staff
  profile, 1 MiB storage limit, 60-second client duration limit, server-side
  staff enforcement, looping playback, and autoplay fallback controls.

## Verification

Local database reset and schema lint passed. The Phase 14 migration replayed
successfully after the complete local migration chain, and the database
security audit passed Storage ownership, RLS, bounded RPC, public projection,
invalid-input, and account-cleanup checks.

Focused and full tests: **136/136 passed**.

Performance budget passed:

- JavaScript: 622.55 kB / 625 kB
- CSS: 294.88 kB / 295 kB
- HTML shell: 5.22 kB / 12 kB

The Vite chunk-size advisory remains non-blocking; the repository performance
guard passes without raising its limits.

Browser evidence is stored in `artifacts/phase-14/` for avatar, background,
Spotify, no-expression, desktop/mobile profile, and desktop/mobile settings
states. The evidence was captured locally at device scale 1 and reviewed
visually.

## Release boundary

The linked project records `20260730110000_profile_expression_media.sql` and
`20260730120000_profile_media_size_limits.sql`. The new
`20260730150000_staff_profile_audio.sql` migration is additive and passed the
fresh local reset, schema lint, and database-security audit; it has not been
applied to the linked project in this implementation pass. The public gate
remains active.

**Recommendation:** GO for local review and staged deployment preparation;
NO-GO for production until the migration and media flows receive an explicit
release pass.
