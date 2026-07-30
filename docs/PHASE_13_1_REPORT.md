# Phase 13.1 Report — Username Safety, Performance, and Cutover Certification

Date: 2026-07-30
Branch: `redesign/profile-first-reconciliation`
HEAD at audit start: `0d275cd2d97d7331784593de449419ac08181aca`
Linked project: `auuoibdmjylrnekqquku` (`us-east-2`)

## Recommendation

- Database reservation release: **NO-GO for remote application from this
  checkout**. The additive migration is locally rehearsed, but this run did
  not write to production and the remote migration must be reviewed again
  before push.
- Domain cutover: **NO-GO**. External Cloudflare, Supabase Auth, and email
  verification remain incomplete; the Pages gate is still active.
- Public launch: **NO-GO**. Do not remove the password/maintenance gate.
- Phase 14: **NO-GO**. Stop after Phase 13.1; do not begin avatars, media, or
  music.

## Production change status

Production was **not changed by Phase 13.1**. No `supabase db push --linked`,
repair, reset, generated diff, or manual production SQL was executed. The
Phase 13 identity/canonical baseline remains the previously aligned release;
`20260730100000_username_reservation_policy.sql` is not recorded remotely.

The existing live `Admin` account was audited read-only. The owner approved
grandfathering it. A second existing `ChromaDie` collision was discovered when
the reviewed migration was attempted; the owner approved preserving that
account by renaming it to a deterministic `player_*` fallback inside the
transactional migration. No account deletion is used.

## Username audit

The proposed policy contains 131 hard-reserved names and 40 protected/manual
release names, for 171 normalized reservations. Existing public usernames were
audited against exact normalized equality. The collisions and approved
remediations are:

| Existing username | Normalized key | Classification | State | Decision |
| --- | --- | --- | --- | --- |
| `Admin` | `admin` | staff/official collision | confirmed; has signed in; staff | preserve and grandfather exact profile id |
| `ChromaDie` | `chromadie` | brand collision | existing account; migration-time details redacted | preserve account and rename to deterministic `player_*` fallback |

`admin` remains unavailable to every other account. `chromadie` remains
reserved after the approved rename. Ordinary substring variants are not
blocked.

## Local implementation

- `src/lib/usernamePolicy.js` defines route-independent hard/manual policy
  snapshots and exact normalized matching.
- `src/lib/routeContract.js` retains route reservations for actual endpoints;
  `admin` is intentionally not a route reservation so `/Admin` remains the
  existing profile route.
- `src/lib/Auth.svelte` performs friendly client checks but still calls the
  server availability/moderation RPCs and maps policy failures to a generic
  unavailable message.
- `20260730100000_username_reservation_policy.sql` adds the reservation table,
  RLS, helpers, trigger, explicit signup behavior, recovery fallback behavior,
  pending reclaim preservation, the approved Admin grandfather exception, and
  the exact ChromaDie rename remediation.
- `scripts/check-username-policy-drift.mjs` compares the JS snapshot, SQL seed,
  route contract, local table, and optionally the linked table.
- `supabase/tests/launch_security.sql` covers browser table access, fixed
  search paths, exact matching, direct-write rejection, Admin grandfathering,
  pending reclaim, confirmed-name rejection, and generated fallback.

## Local verification evidence

| Command | Result |
| --- | --- |
| `npm run db:reset` | PASS; complete local migration chain and seed |
| `supabase db lint --local --level warning --fail-on warning` | PASS; no schema errors |
| `npm run check:username-policy-drift` | PASS; 171 reservations, 18 valid route segments, local RLS enabled |
| `npm run check:db-security` | PASS; security/integrity assertions rolled back |
| `node --test test/phase-13-1-username-policy.test.js` | PASS; 4 tests |
| `npm test` | PASS; 129 tests |
| `npm run check` | PASS; 0 Svelte errors/warnings |
| `npx eslint src/` | PASS |
| `npm run check:links` | PASS |
| `npm run check:csp` | PASS; 1 inline script hash checked |
| `npm run check:balance-drift` | PASS; 66 conditions, 7 rarity tiers, 42 achievements |
| `npm run check:catalog-drift` | PASS locally; snapshot/seed match 82 items; remote mode not configured for this command |
| `npm run check:scoring-parity` | PASS; 5000 deterministic RGB samples |
| `bash scripts/repo-hygiene-check.sh` | PASS |
| `git diff --check` | PASS |
| `npm run build` | PASS; Vite 8.1.3; existing >500 kB JS warning remains |
| `npm run check:performance` | PASS; JS 602.27 kB/625 kB, CSS 294.39 kB/295 kB, HTML 5.22 kB/12 kB |

The CSS reduction removed obsolete global selectors for the retired header,
duplicate Phase 12 layout projection, and removed result/auth/shop markup. It
did not remove active cosmetic, roll, mobile, focus, or reduced-motion rules.

## Linked read-only baseline

The linked project is `auuoibdmjylrnekqquku`. Read-only checks on 2026-07-30
reported:

- `supabase migration list --linked`: remote timestamps match local through
  `20260725150000_profile_identity`; `20260730100000_username_reservation_policy`
  is the only local migration with an empty remote timestamp.
- `supabase db push --linked --dry-run`: exactly one pending migration,
  `20260730100000_username_reservation_policy.sql`; no write occurred.
- The prior linked row audit found 10 profiles, 71 scores, 82 catalog items
  after Phase 13A reconciliation, and the approved existing `Admin` collision.
- The final linked read-only Admin query returned one row: `Admin`,
  `is_staff = true`, `total_rolls = 8`, confirmed, and previously signed in.
- No linked username-policy drift check was run against the absent reservation
  table; running it before applying the migration would correctly report the
  missing remote table.

The linked schema diff remains informational only. Never apply its generated
drop statements.

## Cutover evidence and unavailable checks

- `curl -sSIL https://chm.lol/` on 2026-07-30 returned `401`,
  `Cache-Control: no-store, no-cache, must-revalidate`, and
  `x-robots-tag: noindex, nofollow`; the temporary gate is active.
- `curl -sSIL https://chromadie.com/` returned `307` to `https://chm.lol/`.
- `curl -sSIL https://chromadie.com/u/example` returned `307` to
  `https://chm.lol/example`; the canonical follow-up remains gate-protected
  with `401`.
- Cloudflare dashboard attachment, DNS/SSL state, cache state, Supabase Auth
  dashboard values, and real received-email link tests were not available to
  this repository run and are not reported as passing.
- Full Phase 13.1 screenshot capture/human review is not claimed complete by
  this report; existing Phase 13 artifacts remain historical evidence only.

## Risks and follow-up

1. The remote reservation migration still needs an owner-reviewed additive
   push and remote verification.
2. The `Admin` grandfather exception must be verified remotely before signup
   enforcement is enabled for the public deployment.
3. The CSS target has only 0.61 kB of measured headroom; keep the performance
   check mandatory for future changes.
4. The temporary Pages gate and external domain/auth/email checklist remain
   release controls.

## Completion assessment

Phase 13.1 local implementation and performance work are complete enough for
review, but the certification gate is not complete. The final launch state is
**NO-GO** until the remote reservation migration, external cutover settings,
browser evidence, and post-gate smoke tests are verified. Stop here.
