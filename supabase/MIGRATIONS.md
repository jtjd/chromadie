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

Archived migrations:

- `migrations/_obsolete/`

Current source of truth:

- active schema history begins at `20260708230000_rebaseline_live_schema.sql`

Do not use the archived files for schema review, security review, or new database changes.

Known gap:

- Canonical seed data now lives in `supabase/seed.sql` for fresh reset reproducibility.

Version-controlled cron schedule:

- `update_cotw()` runs every Monday at `00:00 UTC`.
- `cleanup_old_scores()` runs daily at `03:15 UTC`.
