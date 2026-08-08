# Dashboard Parity Milestone 6 — Privacy-Conscious Profile Insights

Status: deployed — 2026-08-08

## Goal

Give a profile owner a quiet, personal signal that their public identity is
being explored without turning public profile visits into a visitor database.

## Implementation slice

- Added a lazy Profile Studio Insights section with an owner-controlled opt-in
  preference, aggregate totals, active-day count, daily bars, loading/error,
  empty, mobile, keyboard, and reduced-motion states.
- Added a separate `recordPublicProfileView` adapter seam. It runs only when
  the visitor has granted the existing product-event consent and the profile
  owner has enabled insights. A browser-local profile/day key avoids repeated
  counting during ordinary navigation.
- Added the additive
  `20260808170000_profile_insights` migration with a daily aggregate table,
  owner-only reads and settings writes, a bounded public recording RPC, and a
  90-day retention cleanup schedule.

## Privacy and security contract

- `profile_view_daily` stores only `(profile_id, view_date, view_count)`.
  Viewer ids, usernames as event properties, IP addresses, exact visit times,
  user agents, and raw event rows are not retained.
- The profile owner must explicitly enable collection. The visitor must also
  explicitly grant product-event consent; authentication is never treated as
  consent.
- The public recording RPC is deliberately non-authoritative, capped at one
  million views per profile/day, and has no browser table grants. It does not
  affect gameplay, scoring, rewards, discovery rank, social state, or profile
  rendering.
- Owner reads are bounded to a 7–90 day window and expose daily totals only.
  Profile deletion cascades aggregate rows through the existing profile
  foreign-key boundary.

## Acceptance criteria

- Owners can opt in or out from Profile Studio without changing profile
  appearance, social controls, or gameplay.
- Consent absent, denied, malformed, or unavailable produces no recorder RPC.
- A granted visitor records at most one view per profile and UTC day through
  the client seam; the database remains safe if a caller bypasses that seam.
- Anonymous callers can record only the bounded aggregate RPC; only the
  authenticated owner can read or change insights.
- Local reset, schema lint, database-security checks, the full validation
  suite, linked migration deployment, source-contract tests, and the
  loopback Chromium smoke pass. Smoke evidence: `/tmp/chromadie-profile-studio-smoke-InKDJi`.

## Boundary

This milestone does not add raw product-event storage, visitor identity,
analytics exports, moderator tooling, templates, premium entitlements,
aliases, domains, or API access. Those remain separate milestones.
