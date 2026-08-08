# Dashboard Parity Milestone 1A — One- and Two-Character Usernames

Status: planned; implement after Dashboard Parity Milestone 0 and before the
standalone authentication-route release.

## Goal

Allow available one- and two-character usernames under the same structured,
case-insensitive, server-authoritative identity contract as existing names.
Short names are scarce identity choices, not paid rank or premium inventory.

This is an additive compatibility migration. Existing usernames, profile URLs,
historical data, authentication identities, reservations, and moderation rules
must remain unchanged.

## Canonical policy

- Valid usernames contain 1–20 ASCII letters, digits, or underscores.
- Matching and uniqueness remain case-insensitive.
- Exact route reservations, protected names, moderation rules, and the
  grandfathered `Admin` profile remain authoritative.
- A short name that collides with an application route or protected term is not
  claimable merely because it passes the length/character expression.
- Availability checks are advisory; the database remains authoritative at
  account creation and username change time.
- Short names are first-claim identity choices. They are not auctioned, sold,
  reserved for Premium, or treated as gameplay prestige.

## Implementation slice

1. Add a forward-only migration that changes the active profile username
   constraint from the current 3–20 character expression to 1–20.
2. Recreate every active authoritative function that embeds the old expression,
   including signup/profile creation, availability, reservation, rename, and
   identity-update boundaries. Do not edit historical migrations.
3. Update bounded challenge-link sender validation so legitimate short account
   names remain representable without weakening challenge identifiers.
4. Update the shared client username policy, standalone signup form, homepage
   username claim, and any remaining HTML length hints from 3 to 1.
5. Keep canonical root routing and `/u/<username>` compatibility working for
   one- and two-character names while preserving reserved application routes
   such as challenge, auth, legal, asset, and dashboard paths.
6. Update policy-drift, route, signup, profile projection, database-security,
   and direct-refresh tests before applying the linked migration.

## Data and rollout risks

- The migration must be additive and safely reversible during rollout; it may
  broaden validation but may not rewrite existing usernames.
- Case-insensitive unique indexes remain unchanged.
- Reservation tables and RLS remain private; browser clients continue using
  bounded policy RPCs.
- A failed signup race must return a clear unavailable-name result and must not
  create a partial profile.
- Short root paths must not shadow real application routes, files, challenge
  URLs, or authentication callbacks.
- Moderation and impersonation protections apply equally to short names.

## Acceptance examples

- Valid when available: `a`, `Z`, `7`, `_`, `ab`, `A7`, `_x`.
- Invalid: empty input, spaces, punctuation outside underscore, non-ASCII
  lookalikes, more than 20 characters, reserved routes, and protected terms.
- `a` and `A` resolve to the same availability/uniqueness key.
- Existing 3–20 character names and canonical URLs are unchanged.

## Acceptance criteria

- One- and two-character names can be claimed through the authoritative signup
  path and render at their canonical public root URL.
- Availability, reservation, signup, rename, challenge sender, and profile
  projection agree on the exact 1–20 character policy.
- Reserved one- and two-character route names cannot be claimed.
- Case-insensitive races and duplicate claims are rejected transactionally.
- Desktop/mobile signup and homepage claim controls expose the new minimum.
- Local schema reset, schema lint, policy drift, database security, browser
  signup/direct-refresh coverage, and the complete `AGENTS.md` suite pass.
- Linked deployment remains a separately reviewed step after local acceptance.
