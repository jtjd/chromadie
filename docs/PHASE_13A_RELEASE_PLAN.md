# Phase 13A Production Database Reconciliation Release Plan

Date: 2026-07-29  
Project: `Chromadie`  
Project reference: `auuoibdmjylrnekqquku`  
Region: `us-east-2`  
Approval: explicit owner approval received in the task conversation  
Status: **COMPLETE — baseline aligned; recovery risk explicitly accepted**

## Scope

This release reconciles only the existing Phase 4–8 production baseline. It
does not implement identity fields, root username routing, canonical metadata,
avatars, music, or any Phase 13 identity migration.

The only migrations in scope, in order, are:

```text
20260725100000_profile_configuration.sql
20260725110000_profile_story.sql
20260725120000_public_discovery.sql
20260725130000_social_layer.sql
20260725140000_decoration_entitlements.sql
```

## Preflight gates

| Gate | Result | Required action |
|---|---|---|
| Linked project reference | PASS | Confirmed `auuoibdmjylrnekqquku` |
| Remote migration history | PASS | Remote ends at `20260712200000_launch_audit_remediation` |
| Pending migration set | PASS | Exactly the five migrations above |
| Local rehearsal | PASS | All 64 migrations, seed, lint, catalog, grants, RLS, and SQL security tests passed |
| Owner approval | PASS | Explicit approval received |
| `SUPABASE_DB_PASSWORD` | PASS | CLI confirmed it is using the password from the environment |
| Read-only database preflight | PASS | Migration list, dry-run, diff, table stats, locks, and blocking checks completed |
| Backup/PITR restore point | **UNAVAILABLE** | Free plan has no managed backup/PITR gate; upgrade/enable recovery or keep production NO-GO |
| Named rollback owner | **UNASSIGNED** | Record a person and recovery contact |
| Remote row counts | PASS | Exact query confirms profiles 10, scores 71, shop items 80, and meta 5 |
| Low-traffic window | **UNCONFIRMED** | Schedule before applying non-concurrent indexes |

No production write may begin while any required gate is unresolved.

The owner confirmed the linked project is on Supabase Free. A private manual
logical dump can be taken as an additional fallback, but it is not
point-in-time recovery and does not provide an equivalent managed restore
point for this release.

## Read-only preflight commands

Run from the reviewed checkout after `SUPABASE_DB_PASSWORD` is configured:

```bash
supabase migration list --linked
supabase db push --linked --dry-run
supabase db diff --linked --schema public
supabase inspect db locks --linked
supabase inspect db blocking --linked
```

The dry run must show only the five migrations above. Any additional pending
migration, unexpected diff, active blocking query, or function-definition
mismatch is a stop condition.

Capture read-only counts for:

```text
public.profiles
public.scores
public.shop_items
public.meta
```

The story migration will add one profile event per existing profile and one
roll event per existing score. The exact linked count confirms 10 profiles and
71 scores, so the profile-story backfill is expected to add 81 events. The
catalog currently has 80 rows and should reach 82 after the two idempotent
entitlement upserts; `meta` currently has 5 rows.

## Backup and rollback gate

Before applying migrations, record:

1. the backup/PITR restore point and retention window;
2. the low-traffic window;
3. the named release/database owner;
4. the compatible frontend release to restore if schema-dependent calls fail;
5. the exact migration-list and dry-run output.

If a migration fails, stop immediately. Preserve the error and migration list.
Do not repair migration history, skip the migration, run generated diff drops,
run a down migration, replay the chain, or run the historical launch reset.
Use the authorized Supabase PITR/restore process only through the named
database owner. If the frontend has already been deployed, restore the last
compatible frontend release before investigating further.

## Production application

After every preflight gate is green, run exactly one reviewed command:

```bash
supabase db push --linked
```

The CLI must apply the five files in timestamp order. Stop on the first error;
do not repair or manually mark any migration as applied.

## Post-release verification

Immediately run:

```bash
supabase migration list --linked
npm run check:catalog-drift
npm run check:db-security
```

Also verify remotely:

- all five migration timestamps are present;
- all 82 catalog rows exist, including `bg_prism_atmosphere` and
  `name_prism_atelier`;
- every Phase 4–8 RPC exists with the intended browser-role grant;
- fixed `search_path` is present on security-definer functions;
- all intended tables have RLS and no browser base-table grants;
- public projections omit private data;
- profile deletion cascades to configuration, story, social, and entitlement
  rows;
- no unexpected locks or blocking queries remain.

Then smoke-test owner profile, visitor profile, profile settings, discovery,
social interactions, shop/entitlements, guest roll, authenticated roll, and
direct profile refresh before considering Phase 13A reconciled.

## Resume condition

Phase 13 may resume only after the five migrations are remotely applied, the
catalog is at 82 items, RPC/RLS/grant checks pass, the deletion cascade is
verified, and backup/PITR plus rollback ownership are recorded.

## Temporary Pages preview gate

The repository now contains `functions/_middleware.js`, a temporary global
Cloudflare Pages Function. When the production Pages secret
`PREVIEW_PASSWORD` is present, it requires that password before forwarding a
request to the existing Pages application. Successful sessions use a signed,
one-hour, `HttpOnly`/`Secure` cookie. The password is never stored in the
repository. If the secret is absent, the middleware fails closed with a 503
maintenance response.

To activate it, add an encrypted production environment secret named
`PREVIEW_PASSWORD` in the Cloudflare Pages project, then deploy the reviewed
branch to the production branch. After reconciliation and smoke tests, remove
the middleware and redeploy to return the domain to public access. The gate
protects browser traffic to Pages; it does not change Supabase API/RLS rules.

For a reversible public release, deploy the middleware with
`PREVIEW_PROTECTION=off` instead. The middleware forwards requests directly
when that exact flag is present; removing the flag restores the password gate.
Do not remove `PREVIEW_PASSWORD` before enabling the bypass, because an
unconfigured gate intentionally returns the maintenance response.

## Release execution addendum — 2026-07-29

The owner accepted the Free-plan no-recovery risk. The live Pages domain was
kept behind the configured `PREVIEW_PASSWORD` gate for the release.

The first push applied `20260725100000_profile_configuration.sql` and stopped
on `20260725110000_profile_story.sql` because production exposes the UUID
generator as `extensions.uuid_generate_v4()`. The failed migration was not
recorded. The only correction was to qualify the three UUID defaults in the
two migrations that had not been applied; no applied migration was edited.

After a complete local reset, seed, schema lint, catalog/security checks, and
scoring parity passed, a single retry applied the remaining four migrations.
The post-release migration list, catalog, 81-event story backfill, RPC
definitions, fixed search paths, grants, RLS state, foreign keys, locks, and
blocking checks passed as recorded in
`docs/PHASE_13A_RECONCILIATION_REPORT.md`.

The release is complete for the database baseline. Keep the Pages gate active
until owner-side browser smoke tests are finished. Remove the middleware and
redeploy only when the site is ready to become public again.
