# Competitor Profile Parity Milestone 10 — Bounded Rich Media

> Superseded on 2026-08-29 by
> `docs/milestones/PLUS_PAID_MEDIA_DISTILLATION.md`. This file records the
> historical implementation; its banner, per-kind library-count, and 150 MB
> product contracts are no longer current.

## Goal

Give Chromadie Plus and authoritative staff profiles the practical media depth
of competitor profile pages while keeping free profiles attractive and keeping
the public renderer structured, finite, and safe.

## Vertical slice

- Added a private `profile_media_assets` extension with `background_video`,
  `banner`, `audio`, `cursor`, and `pointer_cursor` kinds.
- Added staged uploads, MIME verification against Storage metadata, active
  selection, owner deletion, abandoned-upload cleanup, per-kind limits, and a
  150 MB per-profile rich-media quota.
- Enforced three 25 MB MP4/WebM background videos, five 10 MB MP3 tracks, one
  bounded WebP banner, and two 128×128/128 KB WebP cursor slots.
- Rich selection stores only validated paths and a bounded audio playlist with
  order, trim points, shuffle, loop, volume, autoplay intent, and controls.
- Refunded non-staff accounts retain private recovery data but lose the public
  rich-media projection; free image backgrounds, atmospheres, Spotify/YouTube,
  and earned cosmetics remain unchanged.
- Public profiles render muted video with poster fallback, optional banner and
  cursor variables, and reduced-motion suppression.
- Configured audio autoplay is gated behind a finite Enter profile action.
  Pause, volume, track, and media-key controls remain available without a
  page-wide gesture listener.

## Compatibility and rollout risks

- V1 profile configuration and legacy avatar/background/staff-audio paths stay
  readable. Rich fields are additive columns and normalized client-side.
- Deploy the migration before enabling the rich-media editor. Storage upload
  policies require a staged owner row, so direct object writes cannot bypass
  quotas.
- Staff access comes from `profiles.is_staff`; browser entitlements are only a
  presentation hint and never grant server authority.
- A rollback disables the rich editor/feature flag while V1 rendering and
  private asset rows remain recoverable. Cleanup is service-owned.

## Acceptance

- Source and unit contracts cover paths, MIME/size limits, quotas, staged and
  finalized states, cross-owner rejection, deletion, refund projection,
  reduced motion, blocked autoplay, keyboard entry, and visible controls.
- Database security checks cover browser table/RPC privileges, malformed MIME,
  staged verification, owner selection, public projection, and active-asset
  deletion.
- Required repository validation plus local schema lint/reset pass. Actual
  hosted transcoding/CDN playback remains an operator/mobile release check.
