# Database security notes

## Leaderboard view warning

Reviewed: 2026-07-15

Supabase Security Advisor reports these views as `SECURITY DEFINER`:

- `public.leaderboard_view`
- `public.weekly_best_leaderboard_view`
- `public.monthly_best_leaderboard_view`
- `public.all_time_leaderboard_view`

This is an intentional exception and is currently accepted.

The views are owned by `postgres` and have `security_barrier = true`, but do
not have `security_invoker = true`. Consequently, the view query runs with
the owner's ability to read the protected source tables. `security_barrier`
helps contain predicate and function-leakage issues; it does not make a view
run under the caller's RLS policies.

This design is used as a public projection boundary:

- `anon` and `authenticated` receive `SELECT` on the four views only.
- `anon` and `authenticated` do not receive direct `SELECT` on `scores`.
- `anon` and `authenticated` do not receive direct access to
  `user_roll_best_candidates`, which is an internal all-time-ranking source.
- The view definitions select only leaderboard and presentation data needed by
  the browser app.

The warning is therefore not evidence that callers can write data or read the
whole `profiles`/`scores` tables. It does mean that any column added to one of
these views is publicly readable regardless of the source table's RLS rules.

### Approved public projection

The following fields are intentionally exposed through the leaderboard views:

- Ranking and roll data: `user_id`, `username`, `score`, `hex_code`, `rarity`,
  `roll_date`, and calculated `rank`.
- Roll presentation data: `condition_ids`, `contributors`, `traits`, and
  `identity`.
- Public profile presentation: `current_streak`, `equipped_cosmetics`,
  `equipped_badges`, and the public `is_staff` designation.

The views must not expose private progression, moderation, wallet, or account
state, including `is_admin`, `lifetime_ep`, `ep_spent`, `staff_test_ep`,
`staff_test_ep_spent`, private inventory, user follows, or raw score metadata
such as `created_at` and `score_version`.

### Change rules

Before changing a leaderboard view:

1. Treat every selected column as public data.
2. Check both the `SELECT` list and every joined/lateral source. A hidden source
   table is not private if its values are returned by the view.
3. Preserve the explicit grants: view `SELECT` for `anon`, `authenticated`,
   and `service_role`; no browser-role grant on the protected source tables.
4. Run the database security checks and manually verify that an anonymous
   caller can query the intended view but cannot query `public.scores` or
   `public.user_roll_best_candidates` directly.
5. Re-run Supabase Security Advisor. If the warning is to be removed, redesign
   the projection first; adding `security_invoker = true` by itself will make
   these views empty or fail because browser roles intentionally lack source
   table privileges.

The canonical definitions and grants live in
`migrations/20260712200000_launch_audit_remediation.sql`.

## Profile configuration boundary

Added in migration `20260725100000_profile_configuration.sql`,
`public.profile_configurations` stores one versioned structured configuration
per profile. The table has RLS enabled, no `anon` or `authenticated` table
grants, and `service_role` access for operational tooling. Browser callers use
only the following functions:

- `get_my_profile_configuration()` returns the authenticated owner's draft and
  published projections, creating a safe default row when needed.
- `save_profile_configuration(jsonb)` validates and stores a draft without
  changing the published projection.
- `publish_profile_configuration()` revalidates the stored draft and promotes
  it to the published projection.
- `get_public_profile_configuration(uuid)` returns only the published config,
  or a safe default for an existing profile.

The normalizer accepts only the version-1 module/link schema, fixed layout and
module identifiers, hex signature colors, bounded labels, and HTTPS URLs. It
does not accept raw HTML, CSS, script values, arbitrary link protocols, or a
hidden daily-roll module. Account deletion cascades to the configuration row.
The launch security test checks the role grants, invalid draft rejection,
explicit publish boundary, public draft exclusion, and deletion cascade.

## Profile expression media and Spotify boundary

Added in migration `20260730110000_profile_expression_media.sql`, optional
expression remains part of the protected profile configuration contract. The
only added values are `avatar_path`, `background_path`, `spotify_type`, and
`spotify_id`; public readers receive those bounded published values through the
existing configuration RPC and no private configuration row access.

The `avatars` and `backgrounds` buckets accept only the processed `image/webp`
representation and enforce 256 KB and 4 MB object limits respectively. The
browser accepts originals up to 5 MB for avatars and 10 MB for backgrounds so
they can be processed locally before upload. Public
reads are limited to those buckets. Authenticated inserts, replacements, and
deletes require the exact current user's Storage path and matching WebP MIME
metadata; browser roles cannot modify another user's object path. SVG and
other original input types are rejected before upload by the client and are
not accepted by the bucket boundary.

`update_my_profile_expression(text,text,text)` is `SECURITY DEFINER`, derives
the owner only from `auth.uid()`, uses a fixed `public` search path, validates
exact object paths, parses only HTTPS `open.spotify.com` track/playlist/album
URLs, and stores only the provider type and 22-character identifier. Browser
execution is granted only to `authenticated`; the profile deletion trigger
cleans up the exact owned objects without exposing a direct cleanup RPC.

The database security audit covers unauthenticated/other-owner Storage access,
invalid paths and Spotify hosts, public projection bounds, fixed permissions,
and deletion cleanup. The migration is currently local-only.

## Staff profile audio alpha boundary

Migration `20260730150000_staff_profile_audio.sql` adds one bounded
`audio_path` to profile configuration and a public `profile_audio` bucket.
The object path is exactly `profile_audio/{auth.uid()}/profile.mp3`, the bucket
accepts only `audio/mpeg` objects up to 5 MiB, and Storage insert/update/delete
policies require the current profile's `is_staff = true`. Public reads are
limited to the bucket and the public profile projection returns the path only
while the profile is currently staff.

`update_my_profile_audio(text)` is a `SECURITY DEFINER` RPC with fixed
`public` search path. It derives identity from `auth.uid()`, requires staff
status, validates the exact path and existing MIME-tagged object, and returns
only the bounded audio path. The profile deletion media trigger removes the
owned MP3 with the existing account cleanup boundary. This is an alpha access
gate, not a payment or entitlement system; future paid access must replace the
staff predicate through a separately reviewed migration.

## Public profile story boundary

Migration `20260725110000_profile_story.sql` adds
`public.profile_events` as an internal, append/refresh-only projection of
public profile creation and canonical score records. Score/profile triggers
write only safe presentation fields; they do not calculate scores, grant
rewards, or decide eligibility. Existing score and roll transactions remain
the authority.

Browser roles have no direct event-table privileges. They use
`get_public_profile_story(uuid)`, which returns at most 40 public timeline
events and 30 lifetime condition-collection entries. The collection is grouped
from public-safe `scores.condition_ids` and public achievement labels where
available; it does not read or expose `user_achievements` unlock progress.
Profile deletion cascades the event rows. The security audit checks grants,
canonical roll-event capture, bounded arrays, and deletion cleanup.

## Public discovery boundary

Migration `20260725120000_public_discovery.sql` adds the read-only
`get_public_discovery(text,text,text,integer,integer)` projection used by the
Phase 6 discovery hub. It accepts only eight allow-listed surfaces, a safe
username prefix, an allow-listed rarity, and bounded page/limit values. Pages
are capped at 20 and responses at 12 rows; the client displays eight cards per
page.

The RPC returns public profile/card fields only: username, canonical roll
presentation, public streak/roll/EP summaries, structured equipped cosmetics
and badges, staff designation, rank, and profile creation time. It does not
return `user_id`, email, wallet state, private achievement progress, draft
configuration, or direct score-table access. New profile, best-roll, and
recent per-player indexes support the bounded ordering paths. The random
surface is a deterministic daily hash order, not a competitive ranking.

Browser roles have no base-table grants for this feature; they receive only
the RPC execute grant. The existing authenticated `get_rivals_scores()` path
continues to return its target id solely because the pre-existing follow
toggle requires it. That compatibility exception must not be copied into new
public discovery surfaces. The launch security audit checks grants, fixed
search path, index presence, page bounds, username filtering, and absence of
`user_id` in discovery JSON.

## Social interaction boundary

Migration `20260725130000_social_layer.sql` adds protected tables for social
settings, favorites, positive reactions, guestbook entries, blocks, reports,
and per-account social rate-limit windows. Every table has RLS enabled, no
`anon`/`authenticated` table grants, and `service_role` access for moderation
or operational cleanup. The existing `user_follows` table remains the rival
compatibility graph; its authenticated toggle now shares the block and
interaction boundary.

Browser callers use only these RPCs:

- `get_public_profile_social(uuid)` returns bounded counts, viewer-safe state,
  up to 20 visible notes, and no account ids, reporter details, or moderation
  fields.
- `toggle_profile_favorite(uuid)` and `toggle_profile_reaction(uuid,text)`
  accept only authenticated users, allow-listed reaction types, enabled target
  settings, and unblocked relationships.
- `create_profile_guestbook_entry(uuid,text)` accepts authenticated plain text
  only, limits bodies to 240 characters, rejects URLs/control characters, and
  applies a per-account write window. Authors and profile owners can delete
  through `delete_profile_guestbook_entry(uuid)`.
- `toggle_profile_block(uuid)` removes reciprocal follows/favorites/reactions
  and makes future social reads/writes unavailable across the relationship.
- `report_profile_social_content(uuid,uuid,text,text)` records profile or
  guestbook reports with bounded reasons/details and protected moderation
  status. It is rate limited and deduplicated per reporter/target/reason.
- `get_my_profile_social_settings()` and
  `update_my_profile_social_settings(boolean,boolean,boolean,boolean)` expose
  owner-only interaction, guestbook, activity, and discovery controls.

Activity visibility is enforced by the existing public score/story RPCs and
discovery visibility by the existing bounded discovery RPC. A direct profile
URL remains link-accessible when discovery indexing is disabled. Social rows
cascade with profile deletion; guestbook report details never enter public
JSON. The launch security audit covers grants, fixed search paths, RLS,
plain-text/URL bounds, rate limiting, block enforcement, privacy settings,
discovery exclusion, and account cleanup.

## Decoration entitlement boundary

Migration `20260725140000_decoration_entitlements.sql` adds explicit
`access_tier` and `entitlement_key` metadata to `public.shop_items` and the
protected `public.profile_entitlements` table. The table has RLS enabled, no
`anon`/`authenticated` table grants, and service-role access only. Entitlement
rows cascade with account deletion and use a unique `(user_id,
entitlement_key)` key so service-side grants are idempotent.

Browser callers use only:

- `get_my_profile_entitlements()` for the current owner's bounded list of
  allow-listed entitlement keys;
- `purchase_item(text)` for the existing earned/EP purchase contract; premium
  rows are rejected before any EP or inventory mutation;
- `equip_item(text)` for the existing cosmetic equip contract, which rechecks
  the matching premium entitlement inside the server function.

`grant_profile_entitlement(uuid,text,text)` is executable only by
`service_role`, uses a fixed search path, validates that the key belongs to a
premium catalog row, and upserts the grant. A zero catalog cost is not a free
access signal for premium rows. The launch security audit checks table grants,
RLS, fixed search paths, premium metadata, wrapper/implementation grants, and
account-deletion cleanup.

## Username reservation and moderation boundary — Phase 13.1

`reserved_usernames` is the authoritative exact-match policy for route,
brand, official, trust, system, and protected identities. It is separate from
the profanity/moderation algorithm and never performs substring blocking.
Browser routing and signup feedback use the checked-in policy snapshot for
fast feedback, but `is_username_available(text)` and the
`profiles_username_policy` trigger remain the final authority for every
profile insert or username update.

The table has RLS enabled, no `anon` or `authenticated` table privileges, and
only bounded SECURITY DEFINER helpers expose the policy result. Helpers use
fixed search paths and explicitly qualified objects. `username_blocklist` now
also has RLS enabled with no browser policies or direct browser grants;
moderation helpers retain their service/security-definer access.

The existing confirmed staff profile `Admin` is the only approved grandfather
for the normalized `admin` reservation. The reservation row stores the
specific profile identity, so that profile keeps its historical URL while
other accounts cannot claim the key. No automatic rename or historical-data
deletion is allowed.

The Phase 13.1 migration is currently local-only. Re-run
`npm run check:username-policy-drift` and `npm run check:db-security` after
resets and before any reviewed linked release.
