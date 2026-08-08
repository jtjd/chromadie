# Competitor parity M12 — privacy-safe insights and social depth

## Outcome

Milestone 12 adds practical discovery feedback and richer, moderated social
signals without turning Chromadie into an analytics broker or messaging app.
Owners can understand aggregate profile views and exploration, while visitors
can reply to, like, and report guestbook notes. All browser mutations remain
RPC-backed and the daily-roll, reward, rank, and prestige authorities are
unchanged.

## Implementation

- Added `profile_insight_daily` dimensional daily aggregates for views and
  stable link/project clicks, with bounded device, country, and referrer-host
  dimensions. Existing `profile_view_daily` remains readable during rollout.
- Added a consent-gated same-origin analytics function. Edge-derived metadata
  is normalized before the owner RPC; viewer IDs, IPs, raw user agents, exact
  timestamps, and complete referrer URLs are never stored.
- Added 7/30/90-day owner comparisons, top-entry/device/country/referrer
  summaries, and formula-safe CSV export. Public aggregate view display has a
  separate owner setting from private collection.
- Added one-level guestbook replies, positive likes, sorting, owner pins (up to
  three), deletion, and reply-aware reports. Entries and replies remain plain
  text with existing rate limits and block behavior.
- Added an owner-only grouped notification inbox for favorites, reactions,
  guestbook activity, and server-authoritative reward events. No private
  messaging or email notification is introduced.

## Compatibility and rollback

The migration is additive and keeps the one-argument public social and profile
view RPC contracts. V1 profile configuration remains readable. Feature flags
can disable new client surfaces while preserving aggregate rows, guestbook
history, notifications, and legacy rendering. Daily cleanup covers both
insight tables at the existing 90-day boundary.

## Acceptance evidence

Source/unit coverage exercises consent and daily deduplication, safe CSV
export, notification redaction, stable project keys, reply/like/pin/report
RPC contracts, and browser/RLS boundaries. Local schema reset and the database
security suite must pass before rollout; hosted analytics and notification
operations remain service-owned.
