# Dashboard Parity Milestone 5 — Positive Moderated Social

Status: deployed — 2026-08-08

## Goal

Make the existing safe social layer part of the shareable public profile so a
visitor can respond to an identity without turning Chromadie into a messaging
or competitive-social product.

## Implementation slice

- Reused the existing bounded `get_public_profile_social` projection in the
  live public `ProfileShell`.
- Mounted the existing RPC-backed favorite, positive reaction, moderated
  guestbook, block, and report controls for authenticated visitors, with
  guest-safe read states and sign-in guidance.
- Kept owner privacy controls in Profile Studio and added an additive
  `social_summary_visible` setting so owners can hide aggregate favorite and
  reaction counts while preserving their ability to receive positive signals.
- Preserved the older rivals/follow control as a separate gameplay-discovery
  action; social reactions never affect rolls, scores, rewards, ranks, or
  discovery ranking.

## Contract and security

- No browser table grants were added. All writes remain fixed,
  `SECURITY DEFINER`, rate-limited RPC calls with the existing RLS-protected
  tables and block/report boundaries.
- The new migration adds a nullable-compatible boolean with a `true` default
  and an owner-only five-argument settings RPC overload. Existing four-argument
  callers and historical social rows remain valid.
- Public aggregate counts are zeroed when hidden, while the current visitor's
  own saved/reaction state remains available so controls do not become
  ambiguous. Guestbook bodies remain bounded plain text and report details stay
  private.
- Profile preview mode does not load social reads, controls, or mutation
  paths.

## Acceptance criteria

- Public profiles render positive social controls from canonical server data.
- Anonymous visitors can read allowed public social content but cannot write.
- Authenticated visitors can favorite, react, leave moderated notes, block, or
  report through the existing RPC boundary.
- Owners can independently hide positive aggregate counts from Profile Studio.
- Desktop, mobile, keyboard, reduced-motion, blocked, private, empty, and
  unavailable states remain represented by the shared social component.
- Local schema lint/reset, database-security checks, and the full validation
  suite pass before deployment.

The post-deployment Chromium smoke was attempted but could not hydrate the
local homepage because the browser reported repeated `ERR_NETWORK_CHANGED`
resource failures. This is recorded as an environment gate, not a passing
browser certification.

## Boundary

This milestone does not add notifications, messaging, moderation dashboards,
analytics storage, new providers, social ranking, or comparisons. Those remain
separately authorized milestones.
