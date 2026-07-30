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

- `migrations/20260710190000_snapshot_live_shop_catalog.sql` is the versioned live snapshot.
- `seed.sql` mirrors that snapshot for fresh reset reproducibility.
- `npm run check:catalog-drift` detects snapshot/seed drift and checks the remote catalog when
  Supabase credentials are available.

Phase 13.1 local pending migration:

- `migrations/20260730100000_username_reservation_policy.sql` adds the exact
  normalized `reserved_usernames` policy, authoritative availability and
  profile-write enforcement, grandfathered existing staff identity support,
  the owner-approved ChromaDie collision rename, and RLS on `username_blocklist`
  and `reserved_usernames`.
- The migration is additive and has passed a fresh local reset, schema lint,
  username-policy drift check, and database-security check. It is not recorded
  in the linked production history. Do not edit applied migrations, use
  migration repair, or push this migration until the Phase 13.1 release gates
  and the `Admin`/`ChromaDie` collision handling are reviewed.

Phase 14 local pending migration:

- `migrations/20260730110000_profile_expression_media.sql` adds the four
  bounded profile-expression columns, configures the `avatars` and
  `backgrounds` WebP-only Storage buckets and owner-path policies, adds the
  authenticated expression update RPC, and removes owned objects during the
  existing profile deletion boundary.
- `migrations/20260730120000_profile_media_size_limits.sql` tightens the
  stored-object limits to 256 KiB per avatar and 1 MiB per background. The
  browser processor and Storage bucket limits enforce the same budget.
- The migration has passed a fresh local reset, schema lint, database-security
  audit, and browser evidence pass. It has not been pushed to the linked
  production project. Do not edit applied migrations or introduce a separate
  media service for this phase.

Version-controlled cron schedule:

- `update_cotw()` runs every Monday at `00:00 UTC`.
- `cleanup_old_scores()` runs daily at `03:15 UTC`.
- `chromadie_cleanup_expired_challenges()` runs daily at `03:30 UTC`.

The launch-audit remediation adds durable roll totals, bounded best-roll candidates,
authoritative presentation fields, safe score projections, service-only staff operations,
idempotent deletion, and authoritative challenge provenance. Run both
`npm run check:db-security` and `npm run check:scoring-parity` after every database reset.
