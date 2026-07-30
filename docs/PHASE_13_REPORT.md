# Phase 13 Report — Real Identity Contract and chm.lol Canonicalization

Date: 2026-07-29  
Branch: `redesign/profile-first-reconciliation`  
HEAD: current working tree (pre-existing Phase 10–12 changes retained)  
Status: **PHASE 13 COMPLETE; PHASE 13.1 CERTIFICATION IN PROGRESS**

## Decision

Phase 13 repository work is complete. Phase 13A first reconciled the linked
production project, and the additive identity migration was then applied after
that verified baseline. No identity data was backfilled or deleted. The
approved Phase 10–12 profile composition remains the fixed visual boundary.

The repository and local browser gates are GO. Public domain cutover is still
NO-GO until the separate Cloudflare, Supabase dashboard, email, and gated
browser smoke checklists are completed. This report does not claim those
external changes were made.

Cloudflare custom-domain attachment, host forwarding, Supabase dashboard
settings, and email-template installation remain external checklist items;
this report does not claim they were changed.

The complete migration chain was rehearsed locally after the production audit.
The local reset applied all 64 active migrations and the seed successfully,
including the five pending production migrations. The later Phase 13A release
addendum records the corrected production push; no migration repair, reset, or
manual bypass was used.

## Historical baseline result

- The complete local inventory contains 64 active migrations, from
  `20260708230000_rebaseline_live_schema.sql` through
  `20260725140000_decoration_entitlements.sql`; `_obsolete/` migrations are
  not part of the active chain.
- `supabase migration list --linked` shows the remote ending at
  `20260712200000_launch_audit_remediation`.
- `supabase db push --linked --dry-run` proposes exactly the five contiguous
  `20260725...` migrations, in timestamp order, and no older or unrelated
  migration.
- Remote-pending migrations are profile configuration, profile story,
  discovery, social, and decoration entitlements, in that order.
- Local catalog snapshot and seed match at 82 items.
- Remote catalog comparison fails because `bg_prism_atmosphere` and
  `name_prism_atelier` are missing remotely.
- `supabase db diff --linked --schema public` emits broad drops for the local
  Phase 4–8 objects when compared with the remote state. This is evidence of
  the remote being behind the local migration state; it must not be applied as
  a generated destructive diff.
- A read-only linked schema dump confirms no remote `display_name` or `bio`
  columns and confirms that multiple RPCs used by the current profile are
  missing. The temporary dump was removed after inspection.
- A read-only linked query found `public.username_blocklist` with RLS disabled.
  It currently has no `anon` or `authenticated` table grants and no policies,
  but it remains a hardening finding. It was not changed because the correct
  RLS policy must be decided separately from this migration-tail release.

The complete evidence and exact safe migration sequence are in
[`PHASE_13_DATABASE_BASELINE.md`](PHASE_13_DATABASE_BASELINE.md).

## Current reconciled state

- Linked project: Supabase project `Chromadie`, ref `auuoibdmjylrnekqquku`,
  region `us-east-2`.
- Remote migration history now includes all five Phase 4–8 migrations and
  `20260725150000_profile_identity.sql`; local and remote lists are aligned.
- Production has 10 profiles, 71 scores, 82 catalog items, and both previously
  missing catalog keys (`bg_prism_atmosphere` and `name_prism_atelier`). The
  identity migration left all 10 existing profiles with null identity fields.
- Remote identity RPC verification passed: public projection RPCs are
  executable by `anon` and `authenticated`; the update RPC is executable only
  by `authenticated`; all three use a fixed `public` search path.
- `public.profiles` RLS remains enabled and direct browser table select/update
  privileges remain false. Public values are returned through bounded RPCs.
- Production was changed only by the approved Phase 13A five-migration push and
  the additive Phase 13 identity migration. No reset, repair, generated diff,
  manual bypass, or historical launch-reset was used.
- The live Pages site remains behind the temporary password gate. A direct
  unauthenticated request to `https://chromadie.com/` returns `401` with
  `noindex, nofollow`; the application has not been made public again.

## Historical pre-implementation audit

### Identity

- `IdentityCard.svelte` already has presentation slots for `displayName` and
  `bio`, but `ProfileShell.svelte` passes the username as the display name and
  a generated public-roll-history sentence as the bio.
- `profileData.js` uses an explicit `PUBLIC_PROFILE_SELECT` and currently has
  no identity fields. `profileContract.js` maps only the existing public-safe
  profile fields.
- `ProfileEditor.svelte` edits only version-1 configuration and structured
  HTTPS links. It has no identity form and correctly remains inside the owner
  detail surface.
- The old bio implementation was deliberately removed during launch
  hardening. Phase 13 must add a new additive contract, not restore it.

### Current profile RPC parity

Present remotely: `get_my_profile`, `get_public_profile_scores`,
`get_my_daily_roll`, `get_score_percentile`, `get_wallet_balance`, and
`toggle_follow`.

Missing remotely: `get_public_profile_social`,
`get_my_profile_social_settings`, `get_public_profile_story`,
`get_my_profile_configuration`, `get_public_profile_configuration`,
`get_my_profile_entitlements`, `save_profile_configuration`, and
`publish_profile_configuration`.

### Routing and metadata

- The client and Pages Function currently use `/u/<username>` as the public
  profile path; there is no shared reserved-route list and no root
  `/<username>` profile route.
- Runtime origin helpers support `VITE_SITE_URL`, but static defaults,
  sitemaps, robots, `llms.txt`, README deployment instructions, Pages Function
  fallbacks, JSON-LD, and visible email-template links still use
  `chromadie.com`.
- `getSafeNextUrl` is same-origin constrained and must remain so during any
  host transition.

### Approved composition boundary

No profile visual component was changed. The future implementation must put
real display name and bio into the existing identity surface, keep editing in
the existing owner tools disclosure, and preserve the current roll, color,
collection, atmosphere, and owner/visitor hierarchy.

## Historical pre-reconciliation checkpoint

The following cannot be truthfully claimed until the baseline clears:

- server-authoritative display-name/bio updates;
- owner/visitor published identity parity;
- identity RLS/grant/public-projection tests;
- root username routing and old-domain redirect behavior;
- canonical `chm.lol` metadata and external-domain verification;
- identity screenshots and Phase 13 completion-gate validation.

The historical checkpoint above predates the Phase 13A release and the
identity implementation. It is retained to explain why Phase 13 originally
stopped; it is not the current release status.

## Historical validation checkpoint

These checks were recorded before Phase 13A reconciliation and are retained as
historical evidence:

| Command | Result | Exact result |
|---|---|---|
| `npm run build` | PASS with existing warning | Vite 8.1.3; 275 modules; JS 596.79 kB; CSS 305.29 kB; existing post-minification >500 kB chunk warning |
| `npm run check` | PASS | `svelte-check found 0 errors and 0 warnings` |
| `npx eslint src/` | PASS | No errors |
| `npm test` | PASS | 108 passed, 0 failed |
| `npm run check:links` | PASS | Internal link check passed |
| `npm run check:csp` | PASS | 1 inline script block passed |
| `npm run check:performance` | PASS | JavaScript 582.81/650 kB; CSS 298.14/300 kB; HTML 5.59/12 kB |
| `supabase db lint --local --level warning --fail-on warning` | PASS | No schema errors found |
| `npm run db:reset` | PASS | All 64 active migrations and seed applied successfully locally |
| `npm run check:balance-drift` | PASS | 66 conditions, 7 rarity tiers, 42 achievement checks, 42 seeded achievements |
| Local catalog check against local REST | PASS | Snapshot, seed, and local database match (82 items) |
| `supabase migration list --linked` | PASS / blocker finding | Remote ends at `20260712200000`; five local migrations pending; no write performed |
| `supabase db push --linked --dry-run` | PASS / blocker finding | Exactly the five pending `20260725...` migrations would be pushed; no writes |
| `supabase db diff --linked --schema public` | PASS / blocker finding | Read-only diff emits broad Phase 4–8 drops against the behind remote schema |
| `node --env-file=.env scripts/check-catalog-drift.mjs` | **FAIL / blocker** | Remote missing `bg_prism_atmosphere` and `name_prism_atelier` |
| `supabase db dump --linked --schema public` | PASS / evidence | Remote dump confirms no identity columns and missing current profile RPCs |
| `npm run check:scoring-parity` | PASS | 5,000 deterministic RGB samples |
| `npm run check:db-security` | PASS | Local audit assertions passed and rolled back |
| Linked `username_blocklist` RLS query | FINDING | RLS disabled; no anon/authenticated grants or policies; no remediation applied |
| `bash scripts/repo-hygiene-check.sh` | PASS | Required phase documents exist; no forbidden paths |
| `git diff --check` | PASS | No whitespace errors |

The old failing remote catalog check and missing remote Phase 4–8 objects were
resolved by Phase 13A; they are not current blockers.

The linked migration and catalog checks were re-run on 2026-07-29 after an
attempt to continue. The migration list still ended at
`20260712200000_launch_audit_remediation`, with all five `20260725...`
migrations pending. The catalog check still failed for
`bg_prism_atmosphere` and `name_prism_atelier`; no remote state change was
observed.

## Historical resume condition and recommendation

Resume only after an authorized release/DB owner applies and verifies the
five pending Phase 4–8 migrations, reconciles all 82 catalog rows, records
backup/PITR and rollback ownership, and confirms remote RPC/RLS/security
parity. Then implement the additive identity migration and canonical-domain
work as a new, separately validated vertical slice.

The historical recommendation was superseded by the approved Phase 13A
release. Phase 13 remains bounded by its explicit stop boundary: do not begin
Phase 14, avatar, media, or music work.

## Phase 13A reconciliation addendum — 2026-07-29

Phase 13A was limited to reconciling the existing Phase 4–8 production
baseline. Owner approval was received, but production was **not changed**.
The linked project remains classified as **drifted and requiring
reconciliation**: the remote migration history ends at
`20260712200000_launch_audit_remediation`, exactly five local migrations are
pending, the remote catalog has 80 rows instead of 82, and the two Phase 4–8
decoration catalog keys are absent.

The fresh local rehearsal passed for all 64 active migrations, seed, schema
lint, catalog parity, database security, expected RPC grants/search paths, and
RLS. This does not establish production parity. The latest linked database
preflight remains blocked because `SUPABASE_DB_PASSWORD` is not configured;
backup/PITR and rollback ownership are also unverified. Consequently the
approved `supabase db push --linked` command was not executed.

See `docs/PHASE_13A_RELEASE_PLAN.md` and
`docs/PHASE_13A_RECONCILIATION_REPORT.md` for the exact migration objects,
backfill row findings, lock risks, safe order, verification commands, and
NO-GO recommendation.

## Credentialed preflight follow-up — 2026-07-29

The owner-side Supabase CLI connection is now working. Read-only checks
confirmed the exact five pending migrations and a dry run containing only
those five. The linked schema diff completed but emitted broad reverse
operations because the remote database lacks the local Phase 4–8 objects; the
generated diff was not executed and remains prohibited.

The exact count query confirmed 10 profiles, 71 scores, 80 shop items, and 5
meta rows. No application relation lock or blocking query was observed.
Production was not changed. The backup/PITR restore point, named rollback
owner, and low-traffic window are still required before the approved push.

The owner confirmed the project is on the Supabase Free plan, so managed
database backup/PITR is unavailable. No production write was made. The
reconciliation remains NO-GO unless managed recovery is enabled or the owner
explicitly changes the approved safety boundary after reviewing the limits of
a manual public-schema dump.

## Phase 13A production release addendum — 2026-07-29

The owner explicitly changed the recovery-risk decision and authorized the
live database reconciliation. The site was kept behind the temporary Pages
password gate during the release.

The first push applied the profile-configuration migration and stopped on the
profile-story migration because `uuid_generate_v4()` was installed remotely
under the `extensions` schema. The unapplied migration files were corrected to
use `extensions.uuid_generate_v4()`. A fresh local migration reset, seed,
schema lint, catalog check, database-security check, and scoring-parity check
passed, and the remaining four migrations then applied successfully.

Remote verification now confirms the complete five-migration baseline, 82
catalog items, the 81-event story backfill, expected Phase 4–8 RPCs with fixed
search paths and grants, RLS on all new tables, and the designed profile
cascades. Production is **ALIGNED** for the Phase 4–8 baseline. Phase 13
identity work may resume after owner-side gated browser smoke testing; it was
not started automatically by this release.

## Phase 13 implementation addendum — 2026-07-29

### Identity contract

- Added and applied `20260725150000_profile_identity.sql` after the aligned
  Phase 4–8 baseline. It adds nullable `public.profiles.display_name` and
  `public.profiles.bio`; all 10 existing profiles remain null for both fields.
- The migration adds Unicode-aware `char_length` limits of 40 and 160,
  whitespace normalization, control-character rejection, fixed search paths,
  explicit grants, and comments describing the public/private boundary.
- `public.update_my_profile_identity(text,text)` derives the target solely
  from `auth.uid()`, cannot accept a client-selected user id, is safe to retry,
  and returns only username/display-name/bio.
- `get_public_profile_identity(text)` and its internal id variant return an
  explicit bounded public projection. Private account, auth, recovery,
  moderation, wallet, and unpublished configuration fields are not included.
- No historical data was deleted and no identity backfill was performed.

### Rendering and editing

- Owner and visitor hydration use the same published identity projection.
- `IdentityCard.svelte` renders plain Svelte text interpolation only, with
  display-name-first ordering, username fallback, `@username`, optional bio,
  and the designed missing-bio state.
- `/profile/settings` contains the owner-only identity editor. It has labels,
  Unicode-aware counters, local feedback, authoritative server validation,
  retry/repeated-click protection, accessible errors, draft persistence, and
  live post-save context updates without optimistic publication.
- The approved profile composition gained no new primary visual region; the
  color story remains hidden by default and is still opt-in in settings.

### Routing and domain behavior

- Added the shared reserved-route contract, root `/<username>` parsing and
  Pages Function rendering, case normalization, encoded-path rejection, and
  `/u/<username>` compatibility redirects.
- Canonical metadata, profile JSON-LD, OG/Twitter URLs, share helpers,
  sitemaps, robots, `llms.txt`, auth URL helpers, and visible email-template
  labels now use `https://chm.lol`; local development remains local and legacy
  origin inputs canonicalize safely.
- The repository's compatibility redirect is a temporary `307`; permanent
  host forwarding is intentionally deferred until external cutover checks
  pass. The full operator checklist is in `docs/CHM_LOL_DOMAIN_CUTOVER.md`.

### Current recommendation

**CONDITIONAL GO for repository Phase 13 implementation; NO-GO for public
domain cutover until external configuration and browser verification pass.**

The maintenance/password gate remains in place during staged release. Before
removing it, verify the required screenshots, direct profile refresh, owner
and visitor parity, auth flows, share cards, legacy redirects, and mobile
behavior. Keep the existing warning that local schema lint reports RLS
disabled on `public.username_blocklist`; it was not changed by Phase 13.

## Final validation and visual gate — 2026-07-29

The fresh local reset and required repository checks completed after the final
identity, routing, and editor changes:

| Command | Result |
|---|---|
| `npm run build` | PASS; Vite 8.1.3, 282 modules; existing >500 kB JS chunk warning remains |
| `npm run check` | PASS; 0 errors, 0 warnings |
| `npx eslint src/` | PASS |
| `npm test` | PASS; 125 passed, 0 failed |
| `npm run check:links` | PASS |
| `npm run check:csp` | PASS; 1 inline script hash verified |
| `npm run check:balance-drift` | PASS; 66 conditions, 7 rarities, 42 achievements |
| `npm run check:catalog-drift` | PASS locally; 82 items |
| `npm run check:scoring-parity` | PASS; 5,000 deterministic samples |
| `npm run check:db-security` | PASS; local security assertions rolled back |
| `supabase db lint --local --level warning --fail-on warning` | PASS; no schema errors |
| `npm run db:reset` | PASS; complete 65-migration chain and seed |
| `bash scripts/repo-hygiene-check.sh` | PASS |
| `git diff --check` | PASS |
| `npm run check:performance` | FAIL; CSS 305.34 kB / 300 kB budget, JS and HTML within budget |

The performance-budget failure is a measurable CSS overage, not hidden or
silenced. It should be handled as a follow-up optimization before removing
the gate; the mandatory AGENTS.md validation commands above otherwise pass.

Full-browser screenshots were captured at 100% zoom and device scale factor 1
under `artifacts/phase-13/`: visitor, owner/completed-roll, pre-roll,
username-only, missing-bio, maximum-length identity, reduced-motion, and the
390×844 owner identity editor. Human review confirmed the sparse approved
composition, safe long-text wrapping, owner/visitor identity ordering, and
correct editor counters after the final CSS pass.

The temporary Pages preview middleware now bypasses only
`/.well-known/acme-challenge/*` GET/HEAD requests so Cloudflare can complete
custom-domain HTTP validation. All other requests remain password-protected;
the behavior is covered by the Pages Function regression test.

## Final recommendation

**GO for the repository Phase 13 implementation and gated deployment.**
**NO-GO to remove the maintenance gate or claim the chm.lol public cutover.**

The remaining work is external/operator verification: attach and verify the
custom domain, configure Supabase production auth URLs, install/review email
templates, perform gated browser smoke tests, resolve the CSS budget overage,
and only then remove the temporary password gate. Stop after those Phase 13
checks; do not begin avatar storage, media uploads, or Spotify integration.

## Phase 13.1 superseding addendum — 2026-07-30

Phase 13.1 addresses the documented username-safety and performance follow-up.
The additive local reservation migration contains 131 hard-reserved names and
40 manual-release names, exact normalized equality checks, server-authoritative
availability/trigger enforcement, the approved `Admin` grandfather exception,
and RLS on the moderation and reservation tables. It has not been pushed to
the linked production project, so this addendum does not claim production
reservation parity or a public launch.

Current local evidence:

| Check | Result |
|---|---|
| `npm run build` | PASS; CSS 294.39 kB, JavaScript 602.27 kB, HTML 5.22 kB by the budget script |
| `npm run check:performance` | PASS at CSS 295 kB, JavaScript 625 kB, HTML 12 kB limits |
| `npm run check:username-policy-drift` | PASS; 171 reservations, 18 valid route segments, local RLS enabled |
| local username-policy tests | PASS; 4 tests |
| `npm run check:db-security` | PASS |
| local schema lint and complete reset | PASS |

The Pages password/maintenance gate remains active. Full Phase 13.1 browser
screenshots and human review, external Cloudflare/Supabase/email verification,
and a reviewed production reservation release are not complete in this
working session.

The final linked read-only checks on 2026-07-30 reported that the remote
migration history matches local through `20260725150000_profile_identity` and
that `supabase db push --linked --dry-run` would apply exactly one migration:
`20260730100000_username_reservation_policy.sql`. No linked write was run.
`https://chm.lol/` returned `401` with `noindex, nofollow`; the root legacy
domain returned a `307` to `https://chm.lol/`, and
`https://chromadie.com/u/example` returned a `307` to
`https://chm.lol/example`. These are expected gated-transition observations,
not public-launch certification.

## Phase 13.1 final recommendation

- Database reservation release: **NO-GO** until the additive migration is
  reviewed again against the live collision and release procedure.
- chm.lol public cutover: **NO-GO** until external DNS, SSL, auth/email,
  legacy-domain, and gated browser checks are verified.
- Public launch/password-gate removal: **NO-GO**.
- Phase 14/avatar/music work: **NO-GO**; stop after Phase 13.1.
