# Phase 13A Production Database Reconciliation Report

Date: 2026-07-29  
Project: `Chromadie`  
Project reference: `auuoibdmjylrnekqquku`  
Region: `us-east-2`  

## Final classification

**ALIGNED — PHASE 13A COMPLETE.** The initial audit classified production as
drifted and requiring reconciliation. The release addendum at the end of this
report records the owner’s explicit recovery-risk acceptance, the corrected
retry, and the successful remote verification.

## Production change status

During the initial audit, production was **not changed**. The following
commands were read-only or failed before the later approved release began:

- `supabase projects list --output json`
- `supabase migration list --linked`
- `supabase db push --linked --dry-run`
- `supabase inspect db locks --linked`
- `supabase inspect db blocking --linked`
- linked REST row-count and RPC probes
- local rehearsal commands against the local Supabase instance

The later production push and its result are recorded in the release addendum
below.

## Migration baseline

The linked project is `auuoibdmjylrnekqquku` (`ACTIVE_HEALTHY`, `us-east-2`).
The current remote migration list contains these 59 timestamps:

```text
20260708230000  20260708233000  20260708234500  20260708300000
20260709000000  20260709002000  20260709003000  20260709010000
20260709020000  20260709030000  20260709040000  20260709050000
20260709060000  20260709070000  20260709080000  20260709120000
20260709130000  20260709140000  20260709150000  20260709210000
20260709211500  20260709213000  20260709220000  20260709223000
20260710000000  20260710001000  20260710010000  20260710030000
20260710143000  20260710144500  20260710153000  20260710160000
20260710170000  20260710180000  20260710190000  20260710200000
20260710201000  20260710202000  20260710203000  20260711120000
20260711123000  20260711130000  20260711133000  20260711140000
20260711143000  20260711150000  20260711160000  20260711170000
20260711180000  20260711190000  20260712010000  20260712011000
20260712012000  20260712013000  20260712150000  20260712160000
20260712170000  20260712180000  20260712200000
```

The local active list contains those same 59 timestamps plus exactly these
five pending migrations, in this order:

```text
20260725100000_profile_configuration.sql
20260725110000_profile_story.sql
20260725120000_public_discovery.sql
20260725130000_social_layer.sql
20260725140000_decoration_entitlements.sql
```

There are 64 active local migrations total. No other local migration is
pending according to `supabase migration list --linked`.

The required production migration order is therefore:

1. `20260725100000_profile_configuration.sql`
2. `20260725110000_profile_story.sql`
3. `20260725120000_public_discovery.sql`
4. `20260725130000_social_layer.sql`
5. `20260725140000_decoration_entitlements.sql`

## Exact migration object inventory

### `20260725100000_profile_configuration.sql`

Creates or changes:

- table `public.profile_configurations`;
- RLS, owner-read policy, browser table revokes, and `service_role` table grant;
- functions `profile_default_configuration(text)`,
  `normalize_profile_configuration(jsonb, text)`,
  `get_my_profile_configuration()`,
  `save_profile_configuration(jsonb)`,
  `publish_profile_configuration()`, and
  `get_public_profile_configuration(uuid)`;
- function execute revokes and authenticated/public execute grants for the
  bounded RPC surface.

It has no historical data backfill.

### `20260725110000_profile_story.sql`

Creates or changes:

- table `public.profile_events` and constraint
  `profile_events_type_check`;
- index `profile_events_user_occurred_idx`;
- RLS, owner-read policy, browser table revokes, and `service_role` table grant;
- functions `record_profile_created_event()`,
  `record_profile_roll_event()`, and `get_public_profile_story(uuid)`;
- triggers `profile_created_story_event` on `public.profiles` and
  `profile_roll_story_event` on `public.scores`;
- idempotent profile-created and roll-event backfill rows;
- function execute revokes and the public story RPC grant.

### `20260725120000_public_discovery.sql`

Creates or changes:

- non-concurrent index `profiles_created_at_id_idx`;
- non-concurrent index `profiles_best_roll_score_idx`;
- non-concurrent index `scores_user_score_roll_date_idx`;
- function `get_public_discovery(text, text, text, integer, integer)`;
- function execute revokes and anon/authenticated execute grants.

It has no data backfill, but its ordinary index builds can block writes while
they run.

### `20260725130000_social_layer.sql`

Creates or changes:

- tables `public.profile_social_settings`,
  `public.profile_favorites`, `public.profile_reactions`,
  `public.profile_guestbook_entries`, `public.profile_blocks`,
  `public.profile_reports`, and `public.profile_social_rate_limits`;
- indexes `profile_favorites_profile_idx`, `profile_reactions_profile_idx`,
  `profile_guestbook_profile_idx`, `profile_guestbook_author_idx`,
  `profile_blocks_blocked_idx`, `profile_reports_status_idx`,
  `profile_reports_profile_unique`, and `profile_reports_entry_unique`;
- RLS on all seven tables, no browser base-table grants, and `service_role`
  table grants;
- functions `is_profile_blocked(uuid, uuid)`,
  `consume_profile_social_rate_limit(uuid, text, integer, integer)`,
  `get_my_profile_social_settings()`,
  `update_my_profile_social_settings(boolean, boolean, boolean, boolean)`,
  `get_public_profile_social(uuid)`,
  `toggle_profile_favorite(uuid)`,
  `toggle_profile_reaction(uuid, text)`,
  `create_profile_guestbook_entry(uuid, text)`,
  `delete_profile_guestbook_entry(uuid)`,
  `toggle_profile_block(uuid)`, and
  `report_profile_social_content(uuid, uuid, text, text)`;
- replacement `toggle_follow(uuid)`;
- guarded replacements of `get_public_profile_scores(uuid)`,
  `get_public_profile_story(uuid)`, and
  `get_public_discovery(text, text, text, integer, integer)` to apply social
  privacy/activity rules;
- authenticated/public execute grants for the intended RPCs.

The migration contains an explicit transaction and guarded function-rewrite
blocks. A remote definition mismatch is a stop condition.

### `20260725140000_decoration_entitlements.sql`

Creates or changes:

- columns `shop_items.access_tier` and `shop_items.entitlement_key`;
- existing `shop_items` access-tier values/default and constraint
  `shop_items_access_tier_check`;
- table `public.profile_entitlements`;
- RLS, no-browser-row policy, browser table revokes, and `service_role` table
  grant on `profile_entitlements`;
- index `profile_entitlements_key_idx`;
- catalog rows `bg_prism_atmosphere` and `name_prism_atelier` through
  idempotent upserts;
- `meta.shop_version` through an idempotent upsert;
- functions `get_my_profile_entitlements()`,
  `grant_profile_entitlement(uuid, text, text)`,
  `purchase_item_impl(text)`, `equip_item(text)`, and
  `delete_account_data(uuid)`;
- purchase/equip/delete function grants and revokes.

This migration is not wrapped in an explicit transaction. A failure after an
earlier DDL or upsert can leave a partial migration, so it must be run once
and stopped at the first error.

## Production data and backfill findings

Read-only linked REST checks returned:

| Relation | Observed result | Reconciliation impact |
|---|---:|---|
| `public.profiles` | 10 rows | Story backfill will attempt 10 idempotent `profile_created` events |
| `public.scores` | 71 rows | Story backfill is expected to add 71 idempotent `roll` events |
| `public.shop_items` | 80 rows | Entitlement migration should add the two missing catalog keys and reach 82 |
| `public.meta` | 5 rows | Verify `shop_version` after migration |

The direct `public.scores` REST probe returned HTTP 401, which is consistent
with its private table boundary. No bypass query was used. The later linked
read-only count query confirmed the exact production counts above.

The remote catalog check failed with exactly:

```text
Catalog drift detected: snapshot and remote shop_items differ:
  - missing from remote shop_items: bg_prism_atmosphere
  - missing from remote shop_items: name_prism_atelier
```

## RPC and security findings

The existing remote RPC probe found `get_public_profile_scores` present. These
Phase 4–8 RPCs were not found in the remote schema cache:

```text
get_public_profile_configuration
get_public_profile_story
get_public_profile_social
get_public_discovery
get_my_profile_configuration
get_my_profile_social_settings
get_my_profile_entitlements
```

Mutation RPCs were not invoked as part of the read-only audit. Generic HTTP
`OPTIONS` responses were not treated as evidence that those functions exist.

The fresh local rehearsal confirmed that the five migrations provide the
expected Phase 4–8 RPCs with fixed `search_path = public`, explicit grants,
RLS on all ten new tables, and no anon/authenticated base-table grants. The
local security test passed and rolled back. This is local evidence only; it is
not production parity.

The local Supabase CLI repeatedly reports this existing advisory:

```text
public.username_blocklist has RLS disabled
remediation SQL: ALTER TABLE public.username_blocklist ENABLE ROW LEVEL SECURITY;
```

No remediation was applied. The table currently has no anon/authenticated
table grants or policies; a separate policy decision is required and it is not
part of Phase 13A.

## Lock and failure risks

- The profile-story backfill reads `profiles` and `scores` and writes
  `profile_events`; run it in an approved low-traffic window and monitor
  blocking.
- The three discovery indexes are non-concurrent. They can hold table locks
  on `profiles` and `scores` and delay writes during index construction.
- The social migration creates seven tables and eight indexes, then performs
  guarded security-sensitive function replacements. Any definition mismatch
  must stop the release.
- The entitlement migration changes `shop_items` DDL and rewrites purchase,
  equip, and account-deletion functions. Its lack of an explicit transaction
  increases partial-application risk.
- During the initial uncredentialed audit, exact table statistics and locks
  could not be read. The later credentialed follow-up completed both checks;
  no application blocker was observed and the exact row counts are recorded
  below.

## Backup, rollback, and ownership

Backup/PITR availability and a concrete restore point were **not verified** by
the repository audit. A named database/release rollback owner is
**unassigned** in the available documentation. These are release blockers.

Before any write, the owner must record the backup/PITR restore point and
retention window, low-traffic window, named rollback owner/contact, and the
compatible frontend release. If a migration fails, preserve the exact CLI
output and migration list, stop immediately, and use only the authorized
Supabase PITR/restore procedure through that named owner. Do not run repair,
reset, generated diff drops, manual bypass SQL, or the historical launch-reset
migration. Restore the last compatible frontend release if schema-dependent
calls have already been deployed.

## Reconciliation and verification plan

After the missing database credential is configured locally, rerun these
read-only checks and capture their output:

```bash
supabase migration list --linked
supabase db push --linked --dry-run
supabase db diff --linked --schema public
supabase inspect db table-stats --linked
supabase inspect db locks --linked
supabase inspect db blocking --linked
```

The dry run must contain only the five listed migrations. The diff must not be
used as executable SQL. Stop on any unexpected pending migration, unexpected
catalog/object difference, active blocker, or incompatible function
definition.

After the backup/PITR, ownership, low-traffic, and dry-run gates are green,
run one reviewed:

```bash
supabase db push --linked
```

Stop at the first error. After a successful push, run:

```bash
supabase migration list --linked
npm run check:catalog-drift
npm run check:db-security
```

Then verify remotely that all five timestamps exist, 82 catalog rows exist,
the two missing catalog keys exist, every Phase 4–8 RPC has the intended fixed
search path and grants, intended tables have RLS, private data remains
unexposed, and account deletion cascades through configuration, story, social,
and entitlement rows. Complete browser smoke tests for owner/visitor profiles,
settings, discovery, social, shop/entitlements, guest roll, authenticated roll,
and direct profile refresh.

## Local pre-release rehearsal

Against a fresh local database, the complete 64-migration chain and seed were
applied in 13.741 seconds. The following passed:

- `supabase db lint --local --level warning --fail-on warning` — no schema errors;
- `npm run check:db-security` — passed and rolled back;
- local catalog drift check — all 82 items matched;
- expected Phase 4–8 RPC existence, fixed search paths, and grants;
- RLS enabled on all ten new tables with browser base-table grants absent.

Fresh local counts were zero profiles/scores and 82 shop items, as expected
for the reset rehearsal. The profile-story backfill therefore had no local
production rows to exercise; the exact production counts are recorded in the
credentialed follow-up below.

## Recommendation

**NO-GO.** Do not run `supabase db push --linked` until the exact row counts
are recorded, backup/PITR and a restore point are confirmed, a rollback owner
is named, and the low-traffic window is approved.

Phase 13 identity work may resume only after this five-migration baseline is
applied and remotely verified. No identity, display-name, bio, root-routing,
canonical-domain, avatar, or music work was started by Phase 13A.

## Follow-up preflight — 2026-07-29

The owner-side CLI connection is now working. The supplied read-only results
confirm:

- migration history still has exactly the five expected pending migrations;
- `supabase db push --linked --dry-run` would apply only those five migrations;
- `supabase db diff --linked --schema public` completed against a shadow
  database, but emitted the expected broad reverse operations for the Phase
  4–8 objects missing remotely. That generated diff must not be executed;
- table statistics were followed by an exact count query confirming 10
  profiles, 71 scores, 80 shop items, and 5 meta rows; no current relation
  locks or blocking queries were observed. The
  sole lock row was the inspection query itself with `relname = null` and age
  zero.

Production remains unchanged. The exact read-only query returned:

```bash
profiles | scores | shop_items | meta_rows
10       | 71     | 80         | 5
```

The release is still NO-GO until the backup/PITR restore point, named rollback
owner, and low-traffic window are recorded.

## Free-plan recovery gate — 2026-07-29

The owner confirmed the linked project uses the Supabase Free plan. Managed
database backups/PITR are therefore unavailable for this release. Production
remains unchanged and the recovery gate is **UNAVAILABLE**, not passed.

Recommended path: upgrade or otherwise enable a managed backup/PITR capability
before applying the five migrations, then record the available restore point,
retention window, rollback owner, and maintenance window.

Fallback path if the project must remain Free: take a private logical dump of
the public schema from the credentialed terminal, store it outside the
repository with restrictive permissions, and record its path and checksum.
That dump is read-only and useful for manual recovery, but it is not PITR and
does not remove the NO-GO recommendation under the approved safety boundary.

```fish
set backup_dir "/home/alex/Chromadie-private-backups"
mkdir -p "$backup_dir"
chmod 700 "$backup_dir"
supabase db dump --linked --schema public --file "$backup_dir/chromadie-public-20260729.sql"
chmod 600 "$backup_dir/chromadie-public-20260729.sql"
sha256sum "$backup_dir/chromadie-public-20260729.sql"
```

Do not commit, upload, or paste the dump. Do not attempt a restore as part of
this milestone. Supabase documents managed daily backups under Database →
Backups and PITR recovery windows in its [database backup documentation](https://supabase.com/docs/guides/platform/backups).

## Temporary Pages preview gate — 2026-07-29

Because Zero Trust Access requires billing setup in this account, the safer
no-cost testing alternative is the temporary Pages middleware in
`functions/_middleware.js`. It reads an encrypted production Pages secret
named `PREVIEW_PASSWORD`, verifies the submitted password, and forwards only
authenticated browser sessions to the existing live application. It uses a
signed one-hour secure cookie and fails closed with a 503 response if the
secret is absent.

The middleware is local-only until deployed through the Pages production
branch. It must be removed and redeployed after migration verification. No
Cloudflare or production deployment was performed by this change.

## Production release addendum — 2026-07-29

The owner accepted the lack of managed recovery on the Supabase Free plan and
authorized the live release with that risk. The live site remained behind the
temporary Pages password gate during the database work.

The first reviewed `supabase db push --linked` stopped immediately on
`20260725110000_profile_story.sql` with:

```text
ERROR: function uuid_generate_v4() does not exist (SQLSTATE 42883)
```

The first migration, `20260725100000_profile_configuration.sql`, had already
applied. The failed migration was not recorded remotely and its transaction
left no `profile_events` table. Read-only inspection showed that production
provides `extensions.uuid_generate_v4()`, so the unqualified UUID defaults
were not portable to the linked project.

Only the three defaults in the two still-unapplied migration files were
corrected to `extensions.uuid_generate_v4()`. The already-applied migration
was not edited. A fresh local reset, seed, schema lint, catalog check,
database-security check, and scoring-parity check passed after the correction.

The reviewed retry then applied the remaining four migrations successfully:

- `20260725110000_profile_story.sql`;
- `20260725120000_public_discovery.sql`;
- `20260725130000_social_layer.sql`;
- `20260725140000_decoration_entitlements.sql`.

No migration repair, reset, generated diff SQL, manual bypass, or skipped
migration was used.

Remote verification after release:

- all five migration timestamps are present;
- catalog count is 82, including `bg_prism_atmosphere` and
  `name_prism_atelier`;
- profile story contains 10 profile-created events and 71 roll events, 81 in
  total;
- all ten new tables have RLS enabled and no anon/authenticated base-table
  grants;
- all reviewed Phase 4–8 RPCs exist with fixed search paths and the intended
  browser-role grants;
- profile-related foreign keys use cascading deletion where designed;
- no blocking query remains after release.

The production database is now classified **ALIGNED** with the corrected local
Phase 4–8 migration chain. Managed backup/PITR remains unavailable by plan
level and was explicitly accepted as a release risk. A destructive remote
account-deletion exercise was not run against a real account; the cascade
constraints and local database-security suite passed. Remote catalog and
object checks were run directly through the linked CLI. The application smoke
suite was run locally; live browser smoke testing remains an owner-side step
because the preview password is intentionally not available to automation.

Recommendation: **GO for Phase 13A reconciliation; Phase 13 may resume after
the owner completes the gated browser smoke checks.** Do not begin identity
implementation automatically in this reconciliation report.
