# Phase 13.1 Plan — Username Safety, Performance, and Cutover Certification

Date: 2026-07-30
Status: implementation in local checkout; production username migration not applied

## Scope

Phase 13.1 certifies the existing Phase 13 identity and canonical-domain work.
It adds no avatar, media, music, payment, social, economy, scoring, or profile
composition feature. The approved profile composition and the temporary Pages
password gate remain unchanged.

The work has four release boundaries:

1. Make route protection and username reservation separate, explicit contracts.
2. Make the database authoritative for exact reserved-name enforcement.
3. Restore the measured asset budget without changing the approved design.
4. Certify the chm.lol cutover without removing the gate until external and
   browser checks pass.

## Pre-implementation audit

- Branch: `redesign/profile-first-reconciliation`
- HEAD: `0d275cd2d97d7331784593de449419ac08181aca`
- Linked Supabase project: `auuoibdmjylrnekqquku` (`us-east-2`)
- Phase 13 identity migration is remotely present; the Phase 13.1 username
  reservation migration is local only.
- The linked site remains behind the temporary Pages gate. No production
  database write was performed for Phase 13.1.
- Existing production username collision: `Admin` normalizes to `admin`.
  The account is staff, confirmed, and has signed in. The owner explicitly
  approved grandfathering this account.

The approved remediation is to preserve the existing `Admin` profile and URL,
mark `admin` hard-reserved for all other accounts, and allow only that existing
profile id through the trigger's grandfather exception. No automatic rename or
historical URL break is allowed.

## Implementation order

1. Read the shared route/auth/profile contracts and the Phase 13 cutover docs.
2. Add the checked-in username policy and compare it with route contracts.
3. Add the additive reservation migration and SQL security tests.
4. Reset and lint a fresh local database; verify direct-write, reclaim,
   moderation, uniqueness, RLS, grants, and grandfather behavior.
5. Remove only measured dead global CSS and lower the performance budgets to
   JavaScript 625 kB, CSS 295 kB, and HTML 12 kB.
6. Run the full repository validation suite.
7. Perform read-only linked/domain checks and record any unavailable external
   dashboard or email verification.
8. Stop. Applying `supabase db push --linked`, removing the Pages gate, or
   declaring a public cutover requires a separately reviewed release decision.

## Migration release boundary

`20260730100000_username_reservation_policy.sql` is additive and locally
rehearsed. It creates `public.reserved_usernames`, enables RLS on
`public.username_blocklist`, adds exact-match helpers, hardens availability and
profile-write paths, and records the approved `Admin` grandfather relation.

Before applying it remotely, the release owner must re-run the linked migration
list and confirm that the only local/remote difference is this new migration.
The owner must also review the existing-name audit, the migration lock risk,
the gate state, and the exact verification plan. Do not use migration repair,
generated diff SQL, reset, or manual SQL to bypass an error.

## Acceptance criteria

- A browser bypass cannot register a hard or manual-release name.
- Exact matching does not block ordinary names such as `supporter`,
  `administratorx`, `myspotifylist`, or `chromadiefan`.
- The existing staff `Admin` profile remains valid and is not renamed.
- `username_blocklist` and `reserved_usernames` are inaccessible to browser
  roles while security-definer checks continue to work.
- CSS is at or below 295 kB, JavaScript at or below 625 kB, and HTML at or
  below 12 kB.
- The approved composition, mobile behavior, reduced motion, and public/private
  identity parity remain intact.
- External cutover items are verified or explicitly marked incomplete.
- The Pages gate remains until the public-launch checklist is green.
