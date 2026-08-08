# Dashboard Parity Milestone 3 — Structured Content Regions

Status: deployed — 2026-08-08

## Goal

Give owners a small, safe way to tell more of their story beyond the identity
card: one plain-text About region and up to four Projects. Content is a quiet
continuation of the profile, not a second dashboard or an equal grid of cards.

## Implementation slice

- Added version-one structured `content` configuration with bounded About and
  Projects fields.
- Added owner-only About & projects editing with draft, publish, conflict
  reload, dirty-navigation protection, and live preview support.
- Added a public continuation region that renders text and HTTPS project links
  without `innerHTML`, embeds, scripts, styles, or arbitrary user markup.
- Added an additive Supabase migration that normalizes content, preserves
  content during legacy whole-config saves, and adds `content` to the existing
  section-scoped RPC boundary.

## Contract and security

- About heading is limited to 40 characters and body to 600 characters.
- Projects are limited to four; each title is limited to 60 characters,
  description to 180 characters, and URL to HTTPS only at 2,048 characters.
- Draft configuration remains owner-readable through the existing private
  configuration RPC. Visitors receive only the published public projection.
- Empty or incomplete project rows remain editable in a draft but never render
  as public links.

## Acceptance criteria

- Public and preview rendering share the same normalized content projection.
- Desktop, mobile, keyboard focus, reduced motion, empty, draft, and conflict
  states are covered by the editor and renderer contracts.
- No profile-authored raw HTML, JavaScript, CSS, or arbitrary embed surface is
  introduced.
- The full required validation suite, local schema lint/reset, and remote
  migration deployment pass.
- The existing browser smoke harness was attempted three times; it reached
  homepage/signup but stalled before the content step on local authenticated
  route navigation with transient 401/loader failures. This remains an
  environment/harness follow-up, not a content-contract failure.

## Next handoff

The next separately scoped milestone is allowlisted provider widgets, beginning
with a deliberately bounded provider contract and explicit loading/privacy
behavior. It must not turn the profile into an arbitrary embed host.
