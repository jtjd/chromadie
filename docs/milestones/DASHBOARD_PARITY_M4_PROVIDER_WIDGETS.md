# Dashboard Parity Milestone 4 — Allowlisted Provider Widgets

Status: deployed — 2026-08-08

## Goal

Give profile owners a small, safe expression surface for approved provider
players without turning public profiles into arbitrary embed hosts.

## Implementation slice

- Added a version-one `widgets` configuration projection with a maximum of two
  provider-unique widgets.
- Kept legacy Spotify `spotify_type` / `spotify_id` readable by projecting it
  into the new normalized widget model when no widget list is stored.
- Added Spotify track/playlist/album and YouTube video URL parsing with strict
  HTTPS host, path, identifier, and provider-type allowlists.
- Added owner-only draft, publish, conflict reload, reset, and live-preview
  controls in a lazy Profile Studio section.
- Added a public and fitting-room renderer that generates only fixed official
  embed URLs, lazy-loads frames, and requires an explicit click to load players
  in preview.
- Added the YouTube privacy-enhanced frame origin to both static and dynamic
  CSP contracts.

## Contract and security

- The database stores provider, type, id, visibility, and order only.
- Arbitrary frame sources, markup, scripts, styles, query strings, and embeds
  are rejected by the client normalization and server-side JSONB normalizer.
- A profile can render at most one widget per provider and at most two widgets.
- Public profiles use lazy iframes; dashboard preview uses a deferred card and
  mounts the external player only after an owner action.
- Provider widgets remain expression content and never alter daily-roll,
  scoring, reward, inventory, or entitlement authority.

## Acceptance criteria

- Public and preview rendering share the same normalized widget projection.
- Existing Spotify configurations remain visible during the additive migration.
- Desktop, mobile, keyboard, reduced-motion, empty, draft, and conflict states
  are represented in the editor contract.
- RLS and RPC boundaries remain owner-scoped; the public projection exposes only
  published normalized configuration.
- The complete validation suite, local schema lint/reset, and linked migration
  deployment pass before release.

## Next handoff

The next separately scoped milestone is positive moderated social features. Do
not expand provider count, add arbitrary providers, or add messaging in this
milestone.
