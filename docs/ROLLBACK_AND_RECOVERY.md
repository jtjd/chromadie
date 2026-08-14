# Chromadie 2.0 — Rollback and Recovery Boundaries

**Status:** Milestone 0 launch-safety runbook
**Last reviewed:** 2026-08-08
**Release/DB owner:** assign before production schema deployment

This runbook records the safe stop points for the current Cloudflare Pages and
Supabase deployment. It is intentionally conservative: gameplay, scoring,
roll eligibility, rewards, purchases, entitlements, RLS, and historical data
must remain server-authoritative and recoverable.

## Current deployment boundary

- The browser bundle is deployed separately from Supabase migrations and Edge
  Functions. Cloudflare Pages follows the release commit on `main`; the
  audited branch is `redesign/profile-first`.
- The linked Supabase project was read-only audited on 2026-08-08. Local and
  remote migration histories match through
  `20260805150000_profile_progression_rewards.sql`, and a linked public-schema
  diff reports no changes.
- The remote catalog contains the expected 97 active items plus 42 retained
  legacy items; catalog drift checks pass.
- Database alignment does not certify the public launch. The Pages maintenance
  gate, Cloudflare/domain ownership, Auth callback configuration, email
  templates, full browser matrix, performance budget, and named recovery owner
  remain release gates.

Launch status remains **NO-GO**, but no database or catalog fallback is needed.

## Pre-deployment checklist

An authorized release/DB owner must complete each item and retain the output
with the release record:

1. Confirm the target Supabase project and branch; never infer the target from
   an unreviewed `.env` file.
2. Confirm a current Supabase backup or point-in-time recovery window and the
   restore owner before applying schema changes.
3. Review the migration files in timestamp order, including RLS, grants,
   fixed `search_path`, account-deletion cascades, and catalog changes.
4. Run `supabase migration list --linked` and verify the expected last remote
   migration. Stop if the migration history does not match the reviewed
   baseline.
5. Run the local schema/security checks and record the results:
   `supabase db lint --local --level warning --fail-on warning`,
   `npm run db:reset`, `npm run check:db-security`, and
   `npm run check:scoring-parity`.
6. Obtain explicit deployment approval for the ordered migration push. Do not
   run `supabase db push` until the migration list, backup/PITR owner, and
   rollback decision are recorded.
7. After the push, re-run the migration list and read-only RPC/catalog checks.
   Confirm all new public RPCs exist before deploying a bundle that calls them.
8. Deploy matching Edge Functions and the Pages bundle, then smoke-test direct
   profile refresh, discovery, privacy, shop lock/owner behavior, guest roll,
   authenticated owner roll, and metadata/cache headers.

## Frontend rollback

If the Pages bundle fails after deployment, revert Cloudflare Pages to the last
known-good deployment or release commit. Preserve the canonical `/u/<username>`
URLs, metadata, redirects, CSP, and cache boundaries while reverting. Do not
delete routes or rewrite profile data as part of a frontend rollback.

If a new bundle calls RPCs that are not yet present remotely, immediately
restore the compatible prior bundle. The recovery action is a deployment
rollback, not a client-side bypass of server-authoritative profile, discovery,
shop, or gameplay contracts.

## Database migration rollback

### Lean alpha cosmetic reset recovery

The lean reset is destructive to obsolete cosmetic catalog and inventory rows,
so take a verified backup before deployment. The authorized DB owner can use:

```bash
supabase db dump --linked --data-only --schema public > backups/chromadie-pre-lean-reset-$(date +%Y%m%d%H%M%S).sql
```

Deploy the reduced-slot-compatible client before applying
`20260802110000_lean_cosmetic_catalog_reset.sql`. Then invalidate the shop
cache, verify 64 modern Name rows plus nine Profile Border rows, test one Name
and one Border purchase/equip, and confirm an obsolete equipped profile falls
back to safe defaults. There is no automatic refund and no destructive down
migration; recovery is a verified database restore followed by the normal
local/security/catalog checks.

### Phase D2 composable Name recovery

Phase D2 has no destructive down migration. If the client or catalog activation
must be stopped after deployment, restore the previous compatible client and
use a reviewed service-side SQL change to set the 64 new `name_font`,
`name_material`, and `name_motion` rows to `retired` (or another explicitly
approved non-purchasable status). Do not delete those rows, inventory records,
or equipped JSON; do not grant replacement products. Existing 29 legacy Name
rows remain usable by owners. After recovery, verify `purchase_item`,
`equip_item`, `get_shop_catalog`, cache versioning, and the database-security
audit before reopening traffic.

- Do not run `supabase db reset` against a remote project. It is a local
  development/reproducibility operation and can destroy data when pointed at a
  remote target.
- Do not run `supabase db push` until the migration list, backup/PITR owner, and
  rollback decision are approved.
- Do not create an ad hoc down migration or replay the migration chain against
  a populated project. The migration history contains a historical launch
  reset; `supabase/MIGRATIONS.md` requires checking the linked history first.
- The Phase 4–8 changes are intended to be additive. If a migration fails,
  stop, preserve the error and migration-list output, and restore the
  compatible frontend if necessary. Do not mark a migration applied manually.
- If a deployed schema needs correction, use a reviewed additive corrective
  migration. Use Supabase point-in-time recovery only through the authorized
  database owner and documented incident process; do not attempt destructive
  table/function recreation from the browser.

## Data recovery boundaries

Account deletion remains an irreversible product operation. A backup or
point-in-time restore is an infrastructure recovery mechanism, not a way to
undo an individual user's confirmed deletion without a privacy/legal review.
Local `npm run db:reset` data is disposable and is not a production backup.

When a recovery is required, record the incident time window, target project,
last known-good migration, release commit, affected RPCs/tables, backup/PITR
restore point, validation commands, and the owner who approved the restore.
After recovery, verify RLS/grants and server-authoritative roll/purchase
semantics before reopening traffic.

## Read-only incident diagnostics

These checks do not deploy or mutate application data:

```bash
supabase migration list --linked
SUPABASE_URL="$VITE_SUPABASE_URL" VITE_SUPABASE_PUBLISHABLE_KEY="$VITE_SUPABASE_PUBLISHABLE_KEY" npm run check:catalog-drift
supabase db diff --linked --schema public
```

Treat any generated diff containing unexpected drops, missing RPCs, missing
catalog rows, or changed grants as a stop condition. Do not paste Supabase
keys or bearer tokens into release notes, tickets, or logs.

## Recovery acceptance

Recovery is complete only after the release owner records:

- the remote migration list matches the reviewed release;
- required RPCs and catalog rows are present;
- `npm run check:db-security` and scoring parity remain green locally;
- direct-refresh metadata, public-profile cache policy, discovery, guest roll,
  authenticated owner roll, shop access, and privacy controls pass smoke tests;
- the prior release remains identified and reversible.
