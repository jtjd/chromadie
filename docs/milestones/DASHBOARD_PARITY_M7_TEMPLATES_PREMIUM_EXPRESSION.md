# Dashboard Parity Milestone 7 — Structured Templates and Premium Expression

> Historical implementation record. The former Atelier expression preset is
> retired from the active catalog; profile structure is free and current Plus
> value is bounded hosted media as documented in
> [`PLUS_PAID_MEDIA_DISTILLATION.md`](PLUS_PAID_MEDIA_DISTILLATION.md).

Status: deployed

## Goal

Let a player shape a beautiful profile quickly through finite, structured
composition presets while making premium expression legible as optional
creative expansion rather than a requirement for a complete identity.

## Implementation slice

- Add three free templates—Signal Garden, Editorial, and Color Archive—with
  code-owned module order, visibility, sizing, and layout variants.
- Add an Atelier preset gated by the existing `atelier_plus` entitlement. The
  entitlement is read-only to the browser and remains service-granted through
  the existing premium path.
- Persist a bounded `templateKey` in the existing versioned profile
  configuration. Applying a template changes composition only; links,
  content, appearance, media, widgets, history, and equipped cosmetics remain
  untouched.
- Keep manual edits explicit by marking the composition `custom`, preserve
  draft/publish/conflict behavior, and keep the public renderer on finite
  code-owned layouts.

## Security and compatibility boundary

- The additive migration backfills legacy configurations from their existing
  layout variant and keeps the old config JSON shape readable.
- The composition RPC accepts only the finite template keys. `atelier` is
  accepted only when the authenticated owner already has `atelier_plus`; the
  migration never grants entitlements.
- No purchase, payment, rank, roll, reward, achievement, inventory, asset
  copy, or prestige mutation is introduced.
- Public profiles receive only normalized configuration. Premium entitlement
  rows remain private and service-owned.

## Acceptance criteria

- Owners can preview and apply free templates, save drafts, publish, reset,
  recover conflicts, and continue manual composition edits.
- An entitled owner can apply Atelier; a non-entitled caller cannot persist it
  through the RPC boundary and is directed to existing expression acquisition.
- Links, appearance, media, widgets, content, equipped cosmetics, and profile
  history survive template application unchanged.
- Desktop, mobile, keyboard, reduced-motion, loading, empty, and error states
  remain safe and legible.
- Local reset, schema lint, database-security checks, full validation, browser
  smoke, linked migration deployment, and documentation all pass.

Deployment evidence

- Migration: `20260808180000_profile_templates`, applied to local and linked
  databases.
- Browser smoke: `/tmp/chromadie-profile-studio-smoke-4X676k` (the harness
  used the equivalent `localhost` loopback origin because Chromium returned
  `ERR_NETWORK_CHANGED` for `127.0.0.1` local REST requests).
- Validation: the repository-required build, type check, lint, tests, link/CSP,
  performance, policy, catalog, scoring, and database-security checks pass.

## Boundary

This milestone does not add payments, webhooks, new entitlement grants,
aliases, domains, API keys, raw HTML/CSS/JavaScript, or arbitrary embeds.
