Supabase layout

- `migrations/20260708230000_rebaseline_live_schema.sql` is the new baseline migration generated from the live schema dump.
- `migrations/_obsolete/` contains historical migration files that no longer match the live database state.
Why this exists

The previous migration files drifted away from the live database and were causing review and onboarding confusion. The baseline migration restores a single canonical schema starting point for future database changes.

Important limitation

The live dump available in this repo is schema-only. It does not include canonical seed data for gameplay tables like `achievements`, `shop_items`, or `meta`. If you need reproducible fresh environments, add a separate `seed.sql` or equivalent seed workflow from the live project before relying on scratch rebuilds.

Recommended development loop

1. Make schema changes in a migration, not directly in the app code or Supabase dashboard.
2. If you do touch production directly, immediately capture the delta with `supabase db diff --linked` and commit the resulting migration.
3. Before shipping, run `supabase db reset` locally to confirm the migration chain still replays cleanly.
4. Push the reviewed migration with `supabase db push` so the linked database matches the repo again.
5. If you intentionally want to refresh the baseline from the linked database, use `supabase db pull` and review the generated schema change instead of editing the baseline file by hand.

Current launch hardening migrations also restore the `auth.users` signup trigger and remove the legacy public RPC surface that should never be callable from the browser app.
They also reconcile the `streamer_purple` achievement row so the code and live data use the same ID.
