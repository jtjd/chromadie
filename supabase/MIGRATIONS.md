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

Version-controlled cron schedule:

- `update_cotw()` runs every Monday at `00:00 UTC`.
- `cleanup_old_scores()` runs daily at `03:15 UTC`.
- `chromadie_cleanup_expired_challenges()` runs daily at `03:30 UTC`.

The launch-audit remediation adds durable roll totals, bounded best-roll candidates,
authoritative presentation fields, safe score projections, service-only staff operations,
idempotent deletion, and authoritative challenge provenance. Run both
`npm run check:db-security` and `npm run check:scoring-parity` after every database reset.
