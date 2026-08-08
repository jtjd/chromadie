Migrations

Active baseline:

- `migrations/20260708230000_rebaseline_live_schema.sql`

Active forward fix:

- `migrations/20260708233000_hardening_and_leaderboard_fixes.sql`
- `migrations/20260708234500_schema_cleanup.sql`
- `migrations/20260709000000_profile_meta_compat.sql`
- `migrations/20260709002000_auth_bootstrap_and_hardening.sql`
- `migrations/20260709003000_fix_streamer_purple_achievement.sql`
- `migrations/20260709010000_username_hardening_and_cron.sql`
- `migrations/20260709040000_lockdown_client_writes.sql`
- `migrations/20260709050000_atomic_gameplay_transactions.sql`
- `migrations/20260709060000_profile_read_lockdown.sql`
- `migrations/20260710010000_account_deletion_cleanup.sql`
- `migrations/20260710030000_challenge_links.sql`
- `migrations/20260710143000_fix_all_time_leaderboard.sql`
- `migrations/20260710144500_fix_all_time_leaderboard_permissions.sql`
- `migrations/20260710153000_refresh_nova_bloom_roll_effect.sql`
- `migrations/20260710160000_bump_shop_version_for_nova_bloom.sql`
- `migrations/20260710170000_public_profile_progression.sql`
- `migrations/20260710180000_security_hardening.sql`
- `migrations/20260710190000_snapshot_live_shop_catalog.sql`
- `migrations/20260710200000_candidate_score_model.sql` through
  `migrations/20260712180000_richer_roll_conditions.sql`
- `migrations/20260712200000_launch_audit_remediation.sql`

Archived migrations:

- `migrations/_obsolete/`

Current source of truth:

- active schema history begins at `20260708230000_rebaseline_live_schema.sql`

Do not use the archived files for schema review, security review, or new database changes.

`20260709223000_launch_reset.sql` is a historical destructive launch reset and is already recorded
in the linked production migration history. Never repair or bootstrap migration history on a
populated project by replaying the chain blindly: run `supabase migration list --linked` first and
stop if that migration is not marked remote-applied. Fresh projects are safe because no user data
exists when it runs.

Catalog source of truth:

- `migrations/20260710190000_snapshot_live_shop_catalog.sql` is the versioned live snapshot;
  additive catalog migrations are composed on top of it by the drift checker.
- `seed.sql` mirrors the snapshot and its additive catalog extensions for fresh reset reproducibility.
- `npm run check:catalog-drift` detects snapshot/seed drift and checks the remote catalog when
  Supabase credentials are available.

Provider widgets:

- `migrations/20260808150000_profile_provider_widgets.sql` adds the normalized
  JSONB provider-widget projection and section-scoped owner save/publish
  support. It keeps legacy Spotify fields readable, stores only bounded
  provider identifiers, and does not create an arbitrary media/embed table.

Lean alpha cosmetic reset:

- `migrations/20260802110000_lean_cosmetic_catalog_reset.sql` is the single
  forward-only cleanup migration. It preserves referential safety by deleting
  obsolete inventory before obsolete catalog rows, keeps the final Name and
  Profile Border rows, tightens the catalog/equip boundaries, and bumps
  `shop_version` to `2026-08-02T20:00:00Z`.
- The final active catalog is 64 modern Name rows, nine Profile Border rows,
  one consumable, and one title. Historical migrations remain unchanged for
  reproducibility; they are not the current catalog source of truth.
- Production order: create a verified backup, deploy a client compatible with
  the reduced slot set, apply the migration, invalidate caches, verify counts
  and RLS/RPC behavior, then smoke-test one Name and one Border purchase/equip.
  A backup restore is the recovery path; do not refund automatically or create
  a destructive down migration.

Atmosphere quality curation:

- `migrations/20260804223000_curate_atmosphere_catalog.sql` removes the seven
  procedural atmosphere presets that did not meet the visual quality bar,
  clears any equipped references and inventory for those keys, and keeps the
  five authored looping video plates.
- The migration is intentionally forward-only and destructive for retired
  atmosphere records per the release decision. It tightens the renderer
  allowlist and bumps `shop_version` to `2026-08-04T22:30:00Z`; the final active
  catalog is 119 rows with five `profile_atmosphere` rows.

Authored atmosphere replacements:

- `migrations/20260804230000_authored_atmosphere_replacements.sql` adds seven
  Pexels-sourced video atmospheres: `silk-folds`, `glass-caustics`,
  `cinder-drift`, `night-pollen`, `paper-shadow`, `smoke-spiral`, and
  `lumen-flare`.
- The migration is additive for the retained catalog and does not reuse retired
  product keys or restore retired inventory. It extends both renderer checks,
  synchronizes `shop_version` to `2026-08-04T23:00:00Z`, and verifies 126 active
  catalog rows with 12 active `profile_atmosphere` rows.
- Deploy the client media and renderer with the migration, then verify catalog
  counts, renderer resolution, and profile rendering before invalidating cached
  shop data.

Recommended pre-migration backup command (run only by the authorized DB owner):

```bash
supabase db dump --linked --data-only --schema public > backups/chromadie-pre-lean-reset-$(date +%Y%m%d%H%M%S).sql
```

Historical Phase D2 composable Name activation:

- `migrations/20260802100000_composable_name_catalog_activation.sql` adds the
  additive `catalog_status` lifecycle, validates renderer-backed Name rows,
  marks the 29 legacy Name keys as `legacy`, inserts the 64 active paid rows,
  updates the server purchase/equip boundaries, and bumps `shop_version`.
- The migration is forward-only and preserves old keys, inventory, equipped
  JSON, prices, entitlements, and legacy CSS. The D2 client reads
  `get_shop_catalog()`; the temporary direct-table RLS policy hides only the
  new slots from old clients so a client-first deployment cannot reject the
  expanded catalog shape.
- Deploy in this order: apply the migration, verify `catalog_status`, slot
  counts, RPC grants and an end-to-end local purchase/equip flow, deploy the
  matching client, then repeat read-only catalog and cache checks. Recovery is
  non-destructive: set the 64 rows to `retired`/non-purchasable status without
  deleting rows or ownership, restore the prior compatible client, and use a
  reviewed corrective migration if a schema issue is found. Never reset a
  remote project or manually mark the migration applied.

Phase 13.1 reservation migration:

- `migrations/20260730100000_username_reservation_policy.sql` adds the exact
  normalized `reserved_usernames` policy, authoritative availability and
  profile-write enforcement, grandfathered existing staff identity support,
  the owner-approved ChromaDie collision rename, and RLS on `username_blocklist`
  and `reserved_usernames`.
- The migration is additive, has passed a fresh local reset, schema lint,
  username-policy drift check, and database-security check, and is recorded in
  the linked production history. The 2026-08-08 read-only baseline verified all
  171 reservations, the grandfathered `Admin` row, and RLS. Do not edit this
  applied migration, use migration repair, or replay it manually.

Phase 14 migrations:

- `migrations/20260730110000_profile_expression_media.sql` adds the four
  bounded profile-expression columns, configures the `avatars` and
  `backgrounds` WebP-only Storage buckets and owner-path policies, adds the
  authenticated expression update RPC, and removes owned objects during the
  existing profile deletion boundary.
- `migrations/20260730120000_profile_media_size_limits.sql` tightens the
  stored-object limits to 256 KiB per avatar and 1 MiB per background. The
  later `migrations/20260801150000_increase_profile_background_quality.sql`
  raises only the background limit to 4 MiB; the browser processor and
  Storage bucket limits enforce the current budget.
- These migrations have passed a fresh local reset, schema lint,
  database-security audit, and browser evidence pass, and are recorded in the
  linked project. Do not edit applied migrations or introduce a separate media
  service for this phase.

Staff audio alpha migration:

- `migrations/20260730150000_staff_profile_audio.sql` adds the bounded
  `audio_path` field, the public `profile_audio` bucket, exact staff-only
  upload/replace/delete policies, the authenticated `update_my_profile_audio`
  RPC, staff-only public projection, and account-deletion cleanup. It is an
  alpha-only hosted MP3 path intended for future paid expression access; it
  does not alter Spotify or image contracts.
- `migrations/20260730160000_increase_staff_profile_audio_limit.sql` increases
  the staff-alpha MP3 bucket allowance to 5 MiB without changing its path,
  MIME-type, ownership, or staff-only RPC boundary.

Homepage profile collection:

- `migrations/20260801120000_signal_garden_catalog.sql` adds the catalog-backed
  Signal Garden background, border, frame, name, orb, and roll effect used by
  the homepage profile specimen. It only upserts catalog metadata and does not
  change inventory, entitlements, equipped loadouts, or gameplay authority.

Version-controlled cron schedule:

- `update_cotw()` runs every Monday at `00:00 UTC`.
- `cleanup_old_scores()` runs daily at `03:15 UTC`.
- `chromadie_cleanup_expired_challenges()` runs daily at `03:30 UTC`.

The launch-audit remediation adds durable roll totals, bounded best-roll candidates,
authoritative presentation fields, safe score projections, service-only staff operations,
idempotent deletion, and authoritative challenge provenance. Run both
`npm run check:db-security` and `npm run check:scoring-parity` after every database reset.
