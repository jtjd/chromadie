Migrations

Active baseline:

- `migrations/20260708230000_rebaseline_live_schema.sql`

Active forward fix:

- `migrations/20260708233000_hardening_and_leaderboard_fixes.sql`
- `migrations/20260708234500_schema_cleanup.sql`
- `migrations/20260709000000_profile_meta_compat.sql`
- `migrations/20260709002000_auth_bootstrap_and_hardening.sql`
- `migrations/20260709003000_fix_streamer_purple_achievement.sql`

Archived migrations:

- `migrations/_obsolete/`

Current source of truth:

- active schema history begins at `20260708230000_rebaseline_live_schema.sql`

Do not use the archived files for schema review, security review, or new database changes.

Known gap:

- This repo still needs canonical seed data for static gameplay tables if you want full scratch-environment reproducibility.
