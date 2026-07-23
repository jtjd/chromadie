# Data and Backend Plan

This document describes target concepts. Codex must inspect the current schema before naming or creating tables.

## Preserve Existing Authority

Continue using Supabase as the authority for:

- Authenticated identity.
- Username and public profile lookup.
- Rolls, scores, rewards, and eligibility.
- Inventory, purchases, and equipped cosmetics.
- Achievements, badges, ranks, and progression.
- Security and moderation state.

## Likely New Domains

### Profile configuration

Store a versioned validated profile configuration separately from core identity fields.

Potential fields:

- Profile owner.
- Schema version.
- Published configuration.
- Draft configuration, if server drafts are required.
- Updated timestamp.
- Publish timestamp.

### Links

Use structured link rows or a validated array with:

- Platform or custom type.
- Label.
- URL.
- Order.
- Visibility.
- Optional icon.
- Safety status.

Normalize and validate URLs server-side.

### Timeline

Create durable profile events from authoritative actions.

Examples:

- Joined.
- Milestone streak.
- Legendary roll.
- Rank threshold.
- Collection completion.
- Seasonal participation.
- Earned prestige cosmetic.

Do not derive all history dynamically at read time.

### Social graph

Potential entities:

- Follows or favorites.
- Reactions.
- Guestbook entries.
- Reports.
- Blocks.
- Visitor events or aggregate visit counts.

Every social table needs RLS, rate limits, blocking behavior, reporting, deletion rules, and privacy controls.

### Profile modules and unlocks

Prefer module definitions in versioned application/catalog data, with account unlocks or entitlements stored server-side.

## Privacy

Players need explicit controls for:

- Public profile visibility.
- Link visibility.
- Activity visibility.
- Visitor visibility.
- Guestbook availability.
- Social interaction permissions.
- Profile indexing where feasible.

Do not expose email, IP, internal user IDs, moderation notes, or private activity.

## Abuse Controls

Before launching guestbook or reactions:

- Rate limit writes.
- Require authentication for writes.
- Support blocks.
- Support reports.
- Permit owner deletion.
- Escape and sanitize text.
- Enforce length limits.
- Reject URLs in guestbook content initially.
- Add moderation status.
- Prevent notification spam.

## Migration Rules

- Use additive migrations first.
- Backfill safely and idempotently.
- Keep old fields readable during transition.
- Do not delete source data in the same milestone that introduces its replacement.
- Add indexes based on actual access paths.
- Test RLS from anonymous, authenticated-owner, authenticated-other, and privileged contexts.
