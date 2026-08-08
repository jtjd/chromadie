# Dashboard Parity Milestone 2 — Reusable Media Library

Status: complete locally — 2026-08-08

## Goal

Let an owner keep multiple bounded avatar and background images and switch the
selected expression without replacing the only stored file. The selected path
continues to flow through the existing profile-expression RPC and public
projection; the daily roll and its authority are unchanged.

## Implementation slice

- Added the private `profile_media_assets` owner library with RLS and a
  server-validated registration RPC.
- Expanded avatar/background paths to accept either the legacy slot or a
  generated UUID WebP asset while preserving bucket and owner boundaries.
- Added an owner-only deletion RPC that clears a selected reference before
  deleting its Storage object and library row.
- Updated Profile Studio Media to upload, register, preview, select, and
  remove reusable assets. Existing legacy uploads remain renderable.
- Kept Spotify and staff audio on their existing contracts; video, provider
  widgets, structured content regions, templates, and Premium capacity remain
  separate milestones.

## Compatibility and security

- Public profiles still receive only the selected expression path through the
  existing bounded public configuration projection.
- Browsers cannot register an arbitrary path: the RPC derives the owner path,
  checks the WebP Storage object and MIME boundary, and writes the private
  library row.
- The library table is readable only by the owner; browser insert/delete
  privileges are revoked in favor of the RPC boundary.
- Existing `avatar.webp` and `background.webp` paths remain accepted, so no
  historical profile loses its current expression.

## Acceptance criteria

- Local schema lint and reset pass with the new table, policies, and RPCs.
- Unit/source contracts cover reusable path normalization, owner boundaries,
  registration, deletion, and both Studio shelves.
- Auth routes use the shared homepage header/canvas contract so standalone
  additions do not create a second visual language.
- The full validation suite and local browser smoke pass before deployment.

## Next handoff

The next separately scoped milestone is structured public content regions,
starting with a bounded About/Projects contract. It must remain structured,
mobile-safe, public/private-aware, and free of raw HTML, JavaScript, CSS, or
arbitrary embeds.
