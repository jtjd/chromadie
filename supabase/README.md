Supabase layout

- `migrations/20260708230000_rebaseline_live_schema.sql` is the new baseline migration generated from the live schema dump.
- `migrations/_obsolete/` contains historical migration files that no longer match the live database state.
Why this exists

The previous migration files drifted away from the live database and were causing review and onboarding confusion. The baseline migration restores a single canonical schema starting point for future database changes.

Important limitation

The repo now includes canonical seed data in `supabase/seed.sql` for the static gameplay tables the app needs on first boot:

- `achievements`
- `shop_items`
- `meta`

Fresh Supabase resets should be playable without any manual dashboard inserts.

Hosted setup also requires the non-database steps in the root README: deploy both Edge Functions,
configure exact Auth redirect URLs, install the versioned email templates, enable Turnstile with a
server-side secret, and verify the three `cron.job` entries have successful runs. These steps cannot
be created by SQL migrations on a hosted project.

Recommended development loop

1. Make schema changes in a migration, not directly in the app code or Supabase dashboard.
2. If you do touch production directly, immediately capture the delta with `supabase db diff --linked` and commit the resulting migration.
3. Before shipping, run `supabase db reset` locally to confirm the migration chain still replays cleanly.
4. Push the reviewed migration with `supabase db push` so the linked database matches the repo again.
5. If you intentionally want to refresh the baseline from the linked database, use `supabase db pull` and review the generated schema change instead of editing the baseline file by hand.

Current launch hardening migrations also restore the `auth.users` signup trigger and remove the legacy public RPC surface that should never be callable from the browser app.
They also reconcile the `streamer_purple` achievement row so the code and live data use the same ID.
