# Username Reservation Policy

## Purpose

Username reservation protects application routes and official identities
without broadly blocking creative names. It is separate from profanity
moderation, authentication identity, and username ownership.

The checked-in policy is defined in
[`src/lib/usernamePolicy.js`](../src/lib/usernamePolicy.js), seeded by
`supabase/migrations/20260730100000_username_reservation_policy.sql`, and
verified by `npm run check:username-policy-drift`. The database is the final
authority; browser validation is only immediate feedback.

## Two different protections

### Route-reserved segments

Route reservations protect actual top-level application paths, static assets,
auth endpoints, compatibility prefixes, and Pages Function endpoints. They
are consumed by browser parsing, Pages routing, canonical redirects, and
encoded-path handling. A route segment may contain punctuation that is not a
valid username.

`admin` is intentionally not a route-reserved segment: the existing approved
staff profile is reachable at `/Admin`. Its username is still hard-reserved in
the database for every other account.

### Protected usernames

Protected usernames are valid username-shaped strings held for application,
brand, official, trust, system, or manual-release purposes. They use exact
normalized equality only. A username is not blocked because it contains a
reserved word.

Examples that remain allowed by reservation logic include:

```text
supporter
administratorx
myspotifylist
chromadiefan
color
blue
rose
void
angel
gamer
artist
```

## Release classes

- `never`: hard-reserved. It cannot be registered through normal signup,
  availability checks, direct profile writes, recovery/bootstrap, or username
  updates.
- `manual`: protected by default. It remains unavailable unless a future
  deliberate, privileged release process changes the reservation row.

The proposed policy contains 131 hard-reserved names and 40 protected/manual
release names. Categories are `route`, `brand`, `official`, `trust`, `system`,
and `protected`. The migration enforces lowercase normalized keys, the real
username pattern, valid categories, and valid release policies.

## Normalization and matching

Both client and server trim surrounding whitespace and normalize case to a
lowercase key. Malformed values are rejected before reservation lookup.
Reservation checks compare only:

```text
lower(trim(username)) = reserved_usernames.username_key
```

There is no substring, prefix, fuzzy, or Unicode look-alike expansion in this
policy. Existing profanity moderation remains a separate server check.

## Server authority

The additive migration provides:

- `public.normalize_username_key(text)`;
- `public.is_username_reserved(text)`;
- `public.is_username_available(text)`;
- `public.enforce_username_policy()` on profile insert/username update.

These functions use fixed search paths and explicit public object references.
Browser roles receive bounded scalar/RPC behavior and no reservation-table
access. Availability returns only a generic boolean/unavailable result; it does
not disclose whether moderation, reservation, route protection, or ownership
caused rejection.

`handle_new_user()` rejects an explicitly requested invalid/reserved/taken name
with a generic username-unavailable error. It does not silently replace that
request with `player_...`. Generated fallback names remain only for legacy or
system flows where no username was explicitly requested. Valid pending-account
reclaim behavior remains intact.

## Approved Admin grandfather

The production account currently displayed as `Admin` is an existing confirmed
staff account. The owner approved preserving it. The migration seeds `admin`
as `protected`/`never` and records the existing profile id as
`grandfathered_profile_id` only when that profile is staff. The trigger permits
that exact existing id to retain its username and rejects the same name for
all other ids. No automatic rename is performed.

If the production collision differs from the audited account, stop before
remote enforcement and obtain a new owner-approved remediation plan.

## Adding future names

Add a name to the checked-in policy arrays and the additive SQL seed in the
same change. Choose the narrowest category and release policy. Run:

```bash
npm run check:username-policy-drift
npm run db:reset
npm run check:db-security
```

When credentials are intentionally supplied, `npm run check:username-policy-drift
-- --linked` can compare the remote reservation table. Normal tests do not
depend on production network access.

## Collision handling

Before remote enforcement, audit all existing profiles against the complete
policy. Never auto-rename an existing account or silently break a canonical
URL. A collision must be classified by route/brand/official/trust/system
purpose, confirmation/activity state, and owner-approved remediation. The
current `Admin` collision is the only audited collision and is grandfathered as
described above.
