# Phase 13 Database Baseline

Date: 2026-07-29  
Branch: `redesign/profile-first-reconciliation`  
HEAD: current working tree (pre-existing Phase 10–12 changes retained)  
Status: **ALIGNED — Phase 13A reconciled; Phase 13 identity migration applied**

## Initial read-only baseline (2026-07-29)

The initial baseline was read-only. At that point no migration, repair, reset,
push, SQL write, or catalog mutation had been performed.

| Check | Result |
|---|---|
| Local migration inventory | 64 active SQL migrations, `20260708230000` through `20260725140000_decoration_entitlements.sql`; `_obsolete/` excluded |
| `supabase migration list --linked` | Completed; remote ends at `20260712200000_launch_audit_remediation`; five local migrations have no remote timestamp |
| `supabase db push --linked --dry-run` | Completed without writes; exactly the five `20260725...` migrations would be pushed, in timestamp order |
| `supabase db diff --linked --schema public` | Completed read-only; emitted drops for Phase 4–8 tables, constraints, policies, triggers, functions, indexes, and catalog columns when comparing full local state to remote |
| `node --env-file=.env scripts/check-catalog-drift.mjs` | **FAIL**: remote is missing `bg_prism_atmosphere` and `name_prism_atelier` |
| `supabase db dump --linked --schema public` | Completed read-only; remote schema dump inspected for tables, identity columns, functions, and grants; temporary dump removed |

Re-check performed after the request to continue (2026-07-29) produced the same
blocker state. `supabase migration list --linked` returned `Migrations listed`
with the five `20260725...` migrations still having an empty remote timestamp.
`node --env-file=.env scripts/check-catalog-drift.mjs` failed with exactly:

```text
Catalog drift detected: snapshot and remote shop_items differ:
  - missing from remote shop_items: bg_prism_atmosphere
  - missing from remote shop_items: name_prism_atelier
```

Local reconciliation rehearsal (2026-07-29) was completed without touching the
linked project. `supabase db reset` applied all 64 active migrations and the
seed successfully; local schema lint reported no errors; local catalog access
matched all 82 snapshot items; and the local security audit passed. The local
database contained all eight Phase 4–8 RPCs checked by the inventory query and
all ten Phase 4–8 tables had RLS enabled.

The linked project was also queried read-only for `public.username_blocklist`.
RLS is disabled there and locally, but both environments grant that table only
to `service_role`/`postgres`, with no `anon` or `authenticated` table grants
and no policies. No remediation was applied because enabling RLS without an
approved policy would risk breaking username validation; this is a separate
hardening decision, not a reason to mutate the migration history.

The linked command reported the common migration history through
`20260712200000_launch_audit_remediation`, followed by five local migrations
with no remote timestamp:

| Domain | Local migration | Linked status |
|---|---|---|
| Profile configuration | `20260725100000_profile_configuration.sql` | pending remotely |
| Profile story | `20260725110000_profile_story.sql` | pending remotely |
| Discovery | `20260725120000_public_discovery.sql` | pending remotely |
| Social layer | `20260725130000_social_layer.sql` | pending remotely |
| Decoration entitlements | `20260725140000_decoration_entitlements.sql` | pending remotely |

The dry-run push independently confirmed that this is the exact pending tail;
it did not propose older migrations or an unrelated migration. The `db diff`
output is not a production repair script: it reports local-only Phase 4–8
objects as drops when diffing the local migration state against the linked
remote state. Those drops must not be executed.

Operational review points for the pending tail:

- `20260725110000_profile_story.sql` backfills one public-safe event projection
  for every existing profile and score, so row counts and runtime must be
  checked before applying it.
- `20260725120000_public_discovery.sql` creates three ordinary indexes on
  `profiles` and `scores`; it is not using `CREATE INDEX CONCURRENTLY`, so a
  low-traffic window and lock monitoring are required.
- `20260725130000_social_layer.sql` verifies and rewrites existing public
  profile/discovery function definitions in a guarded `DO` block; it should be
  rehearsed against the exact remote function definitions.
- `20260725140000_decoration_entitlements.sql` upserts the two missing catalog
  keys and changes purchase/equip/account-cleanup functions. It has no explicit
  `BEGIN`/`COMMIT` in the file, so a release owner must confirm migration
  execution/rollback behavior and stop for inspection on any error.

The complete active local inventory, in timestamp order, is:

```text
20260708230000_rebaseline_live_schema.sql
20260708233000_hardening_and_leaderboard_fixes.sql
20260708234500_schema_cleanup.sql
20260708300000_remove_profile_bio.sql
20260709000000_profile_meta_compat.sql
20260709002000_auth_bootstrap_and_hardening.sql
20260709003000_fix_streamer_purple_achievement.sql
20260709010000_username_hardening_and_cron.sql
20260709020000_fix_get_rivals_scores.sql
20260709030000_restrict_profiles_anon.sql
20260709040000_lockdown_client_writes.sql
20260709050000_atomic_gameplay_transactions.sql
20260709060000_profile_read_lockdown.sql
20260709070000_reserve_guest_username.sql
20260709080000_self_heal_missing_profiles.sql
20260709120000_reroll_transaction_lock.sql
20260709130000_harden_purchase_balance.sql
20260709140000_remove_stale_profile_meta_wrapper.sql
20260709150000_shop_content_pass.sql
20260709210000_strengthen_frosted_row.sql
20260709211500_fix_live_frosted_row_key.sql
20260709213000_redesign_streak_frames.sql
20260709220000_refresh_frames_and_name_effects.sql
20260709223000_launch_reset.sql
20260710000000_allow_streak_freeze_stacking.sql
20260710001000_stackable_inventory_model.sql
20260710010000_account_deletion_cleanup.sql
20260710030000_challenge_links.sql
20260710143000_fix_all_time_leaderboard.sql
20260710144500_fix_all_time_leaderboard_permissions.sql
20260710153000_refresh_nova_bloom_roll_effect.sql
20260710160000_bump_shop_version_for_nova_bloom.sql
20260710170000_public_profile_progression.sql
20260710180000_security_hardening.sql
20260710190000_snapshot_live_shop_catalog.sql
20260710200000_candidate_score_model.sql
20260710201000_lean_score_history.sql
20260710202000_roll_v2_transaction.sql
20260710203000_reprice_shop_catalog.sql
20260711120000_shop_visual_hierarchy.sql
20260711123000_fix_profile_background_patterns.sql
20260711130000_upgrade_orb_catalog.sql
20260711133000_replace_cyber_tile.sql
20260711140000_upgrade_roll_effects.sql
20260711143000_upgrade_border_descriptions.sql
20260711150000_thematic_condition_scores.sql
20260711160000_founder_launch_reward.sql
20260711170000_launch_edition_badge.sql
20260711180000_hide_founder_from_shop.sql
20260711190000_lock_account_cleanup.sql
20260712010000_username_moderation.sql
20260712011000_username_moderation_match_fix.sql
20260712012000_reclaim_pending_usernames.sql
20260712013000_repair_confirmed_usernames.sql
20260712150000_staff_test_wallet.sql
20260712160000_case_insensitive_usernames.sql
20260712170000_update_deep_space_motion.sql
20260712180000_richer_roll_conditions.sql
20260712200000_launch_audit_remediation.sql
20260725100000_profile_configuration.sql
20260725110000_profile_story.sql
20260725120000_public_discovery.sql
20260725130000_social_layer.sql
20260725140000_decoration_entitlements.sql
```

The local snapshot and seed agree at 82 catalog items. The linked remote
comparison is not equivalent: it lacks these two rows introduced by the local
decoration/entitlement boundary:

- `bg_prism_atmosphere`
- `name_prism_atelier`

## Remote RPC and identity findings

The remote schema dump shows `profiles` contains `username` and existing game
fields, but no `display_name` or `bio`. It also shows the old one-argument
`update_profile_meta(p_mood_color text)` remains remotely; the removed local
two-field implementation is not a safe identity boundary.

RPCs called by the current profile/profile-editor/profile-social/store seams
were checked against the remote function dump:

| Current RPC | Remote status |
|---|---|
| `get_my_profile` | present |
| `get_public_profile_scores` | present |
| `get_my_daily_roll` | present |
| `get_score_percentile` | present |
| `get_wallet_balance` | present |
| `toggle_follow` | present |
| `get_public_profile_social` | **missing** |
| `get_my_profile_social_settings` | **missing** |
| `get_public_profile_story` | **missing** |
| `get_my_profile_configuration` | **missing** |
| `get_public_profile_configuration` | **missing** |
| `get_my_profile_entitlements` | **missing** |
| `save_profile_configuration` | **missing** |
| `publish_profile_configuration` | **missing** |

The remote dump includes no Phase 4–8 profile configuration, story, discovery,
social, or entitlement functions. The Phase 9–12 launch-hardening baseline
through `20260712200000_launch_audit_remediation` is present; the later
Phase 10–12 presentation changes do not add a database migration.

## Identity schema finding

The branch's authoritative launch-hardening migration intentionally removed
the old `profiles.bio` column and the two-argument `update_profile_meta`
implementation. The current profile table therefore has no `display_name` or
`bio` contract. The browser-safe public profile select list contains username
and existing presentation/progression fields only. Phase 13 must add a new
versioned identity boundary; it must not restore the removed implementation.

## Why Phase 13 is held

The current frontend already calls Phase 4–8 RPCs for configuration, story,
discovery, social, and entitlements, but those functions are absent from the
linked project according to the prior remote audit and the migration list.
The linked project is behind and schema-drifted. The schema diff's generated
drop statements are especially important: applying that diff would remove
local-only Phase 4–8 objects. A Phase 13 identity migration must not be
stacked onto this state, and no previously applied migration may be edited or
repaired in place.

No Phase 13 migration or schema-dependent identity code was added.

## Exact safe reconciliation sequence

This sequence requires an authorized release/DB owner. It is documentation,
not an instruction that was executed by this run.

1. Confirm the linked Supabase project ref, backup/PITR ownership, restore
   point, and a maintenance/rollback contact. Do not edit or delete any
   already-applied migration.
2. From the exact release checkout, run the read-only checks again:

   ```bash
   supabase migration list --linked
   supabase db diff --linked --schema public
   ```

   The expected pending set is exactly the five migrations listed above. The
   current diff contains expected reverse operations because the remote lacks
   those objects, but it must not be executed as a generated destructive diff.
   If the migration list, object inventory, or catalog differs from this
   report, stop and have the DB owner reconcile the project manually.
3. Capture the approved database backup/PITR point before applying anything.
   Do not run the historical `20260709223000_launch_reset.sql`, replay the
   rebaseline chain, run `supabase migration repair`, or use `supabase db
   reset` against the linked project.
4. Apply the pending migrations in timestamp order through the reviewed
   Supabase migration workflow. With the baseline observed here, the safe
   ordered set is:

   ```text
   20260725100000_profile_configuration.sql
   20260725110000_profile_story.sql
   20260725120000_public_discovery.sql
   20260725130000_social_layer.sql
   20260725140000_decoration_entitlements.sql
   ```

   A release owner may use `supabase db push --linked` only after the expected
   set, backup, and diff review are confirmed; the CLI must apply the files in
   timestamp order. Stop immediately on the first migration error. Do not
   bypass it with manual SQL or migration repair.
5. Verify the remote history again and verify the catalog using the linked
   production URL/key without printing credentials:

   ```bash
   supabase migration list --linked
   npm run check:catalog-drift
   npm run check:db-security
   ```

   The catalog check must report the remote 82-item snapshot as matching,
   including both missing keys above. Verify the Phase 4–8 RPCs, browser-role
   grants, RLS, fixed search paths, and account-deletion cascades against the
   migration/security contracts.
6. Deploy the matching Pages Functions and frontend bundle only after the
   remote schema/catalog verification passes. Repeat direct-refresh, public
   profile, discovery, social, shop/entitlement, owner configuration, guest
   roll, and authenticated roll smoke checks.
7. Only after steps 1–6 are green, create the additive Phase 13 identity
   migration as the next timestamp. Run local `supabase db lint --local
   --level warning --fail-on warning`, `npm run db:reset`, security tests, and
   the identity test matrix before any production identity deployment.

## Current reconciled state

Phase 13A completed the safe timestamp-ordered reconciliation after explicit
owner acceptance of the Supabase Free-plan recovery limitation. The linked
project now records all five Phase 4–8 migrations, contains exactly 82 catalog
items including `bg_prism_atmosphere` and `name_prism_atelier`, and has the
verified story backfill, RPC/search-path/grant checks, RLS, and deletion
cascades described in the release addendum below.

The additive Phase 13 identity migration
`20260725150000_profile_identity.sql` was subsequently applied as the next
timestamp. It added nullable identity fields and bounded public RPCs without
backfilling or deleting historical data. Phase 13 identity work may proceed;
external domain cutover remains a separate checklist.

## Phase 13A reconciliation addendum — 2026-07-29

The owner approved the reviewed reconciliation, but the approval did not
change the production database. A second read-only audit confirmed the linked
project reference `auuoibdmjylrnekqquku`, the shared remote history through
`20260712200000`, and exactly the five pending `20260725...` migrations. No
other migration was pending.

At the time of this original addendum the credentialed database checks were
still unavailable, so the release was **DRIFTED AND REQUIRING RECONCILIATION /
NO-GO**. The later credentialed follow-up below completed the database checks
and exact counts. Backup/PITR availability and restore point remain
unverified, no named rollback owner is recorded, and the low-traffic window is
not confirmed. The read-only REST checks still show the two missing catalog
keys `bg_prism_atmosphere` and `name_prism_atelier`.

The earlier uncredentialed dry-run attempt stopped before planning because the
temporary database role could not authenticate. The later credentialed dry run
completed successfully, but no production write was made. The complete
current finding and exact object inventory are in
`docs/PHASE_13A_RECONCILIATION_REPORT.md`.

No production write, migration repair, reset, generated destructive diff, or
manual bypass was performed.

## Phase 13A credentialed preflight follow-up — 2026-07-29

The owner subsequently ran the linked read-only checks successfully. The
password was accepted by the CLI, the migration list still showed exactly the
five pending Phase 4–8 migrations, and the dry run listed only those five.
The linked schema diff completed but emitted the expected broad reverse
operations for local Phase 4–8 objects absent remotely; those generated drops
remain prohibited and were not executed.

Linked table statistics followed by an exact count query confirmed 10 profiles,
71 scores, 80 shop items, and 5 meta rows. The lock inspection showed only its
own zero-age inspection query with no relation, and the blocking inspection
returned no rows. Backup/PITR, rollback ownership, and the low-traffic window
remain release gates.

The owner confirmed the linked project is on the Supabase Free plan, so a
managed backup/PITR restore point is unavailable. A private manual public-
schema dump is an optional fallback, but it is not equivalent to PITR and the
release remains NO-GO unless the owner explicitly changes the approved safety
boundary after reviewing that limitation.

## Phase 13A release completion — 2026-07-29

The owner explicitly accepted the absence of managed recovery and approved the
live reconciliation while the site was protected by the Pages password gate.
The first push applied the profile-configuration migration and stopped on the
profile-story migration because the linked project requires the qualified
`extensions.uuid_generate_v4()` function. The failed migration was not
recorded, and no migration repair or bypass was used.

The UUID defaults in the two still-unapplied migrations were corrected,
verified through a fresh local reset and schema lint, and the remaining four
migrations were then applied successfully. Remote verification confirmed all
five timestamps, 82 catalog items, both previously missing catalog entries,
81 profile-story backfill events, expected RPCs/search paths/grants, RLS on
all ten new tables, and the designed deletion cascades.

Production is now **ALIGNED** with the corrected Phase 4–8 baseline. The
database write changed production; no identity, avatar, music, or root-routing
work was started by this reconciliation. Phase 13 may resume after the gated
owner browser smoke checks.

## Phase 13.1 database addendum — 2026-07-30

The Phase 13A result above remains the production baseline: the linked project
is aligned through the Phase 13 identity migration. Phase 13.1 introduces the
new additive `20260730100000_username_reservation_policy.sql` migration, but it
has not been pushed to production. No production database write was performed
for this milestone.

The read-only collision audit found one exact normalized collision: the
confirmed, active staff profile `Admin` owns the key `admin`. The owner
approved grandfathering this account. The local migration stores its profile
identity on the reservation row, preserving the historical profile and URL;
all other inserts and updates using `admin` are rejected. No existing username
was renamed and no historical data was deleted.

The local rehearsal has RLS enabled on `reserved_usernames` and
`username_blocklist`, browser table grants removed, fixed-search-path helpers,
and trigger enforcement. Production reservation-table parity is intentionally
**unverified/not yet applicable** until the reviewed migration is released.
