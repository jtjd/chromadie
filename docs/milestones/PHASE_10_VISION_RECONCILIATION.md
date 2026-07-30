# Phase 10 — Vision Reconciliation and Profile Simplification

Status: active milestone definition; implementation stops at this boundary.

## Goal

Make the live public profile feel like a composed personal website first and
make the authenticated default home the owner’s live profile, while preserving
the completed Phase 0–9 infrastructure and all server-authoritative behavior.

## Required composition

The default public profile has at most four primary visual regions:

1. identity;
2. today’s roll or latest result;
3. selected links or expression;
4. one featured collection, accomplishment, or story surface.

Identity and the roll lead on mobile. Primary content must fit without
vertical scrolling at 1440×900. At 1280×720, identity, the roll, and at least
one supporting expression remain visible without scrolling.

## Acceptance gates

- The bare authenticated `/` route resolves to the owner’s live profile.
- An explicit authenticated `/?view=game` still opens the roll surface.
- Public `/u/<username>` routing, direct refresh, metadata, old share links,
  and `legacy=1` remain valid.
- Production rendering uses the existing mapped profile, score, story,
  configuration, cosmetic, and social data seams; fixture data is used only
  for tests or visual inspection setup.
- The public visual hierarchy has no visible public-boundary/developer
  explanation module.
- Editing, configuration, detailed statistics, moderation, account
  management, entitlements, and large histories are outside the default
  hierarchy and remain accessible through deliberate detail/owner/fallback
  surfaces.
- Secondary stats, timelines, collections, achievements, and social controls
  are demoted or collapsed rather than deleted.
- Redundant edit, explore, shop, and share calls are removed from the primary
  presentation.
- Typography, spacing, alignment, media, and atmosphere lead the composition;
  borders and containers are supporting treatments.
- Keyboard focus, reduced-motion behavior, loading/error/empty/guest/private/
  blocked/deleted states, and mobile layout remain considered.
- No authentication, RLS, roll RPC, anti-reroll, scoring, reward, rarity,
  economy, entitlement, history, cosmetic, privacy, social, moderation,
  deployment, or schema behavior is weakened.
- Repeatable screenshots exist for 1440×900, 1280×720, and 390×844, with
  before/after artifacts and measured viewport results.
- Required tests, documentation, build, lint, security, drift, parity,
  performance, and repository-hygiene checks are recorded in the phase report.

## Explicit non-goals

Avatar uploads, Cloudflare media integration, Spotify, new social features,
notifications, private messaging, broad discovery, new monetization, SvelteKit,
unrestricted customization, schema redesign, and unrelated cleanup.

## Compatibility and stop boundary

The v1 profile configuration remains additive and normalized. Its `boundary`
and `explore` module definitions are retained for stored-config compatibility
but are not rendered as primary public modules. The legacy renderer remains
available through `legacy=1`. Phase 11 begins only after this report and gate
are complete; no Phase 11 detail-route or renderer-retirement work belongs here.
