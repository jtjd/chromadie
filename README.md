# Chromadie

Chromadie is a Svelte 5 single-page application built with Vite, Supabase, and Cloudflare Turnstile. It supports guest play, authenticated accounts, cosmetics, leaderboards, profiles, rivals, and daily roll gameplay. It is not a SvelteKit application; Cloudflare Pages Functions provide route-aware metadata around the static SPA.

## Current State

- Guest mode is local-only and must not be treated as authenticated.
- Real auth uses Supabase session state plus profile hydration.
- Gameplay mutations are intended to be server-authoritative through Supabase RPCs.
- The remote Supabase staging project is the authoritative live test target right now.
- Cloudflare Pages deploys production automatically from the GitHub `main` branch.
- The canonical production site is `https://chromadie.com`.
- Cloudflare Pages may remain the hosting provider, but public links, metadata, and share cards should use `https://chromadie.com`.

## Key Commands

```bash
npm run dev
npm run build
npm run check:csp
npm run check
npx eslint src/
npm test
npm audit --audit-level=high
npm run check:links
npm run check:balance-drift
npm run check:catalog-drift
npm run check:db-security
npm run check:scoring-parity
npm run simulate:balance
npm run db:push
npm run db:reset
supabase db lint --local --level warning --fail-on warning
```

## Environment Variables

Use `.env` or the deployment environment:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_KEY`
- `VITE_CLOUDFLARE_SITE_KEY`
- `VITE_SITE_URL`

Do not commit secrets.

## Production Deployment

- Cloudflare Pages source: GitHub `main`
- Build command: `npm run build`
- Build output directory: `dist`
- SPA routing and production security headers are defined in `public/_redirects` and
  `public/_headers`.
- Configure all four `VITE_` variables above in the Cloudflare Pages production environment.
- Deploy both Supabase Edge Functions before the Pages deployment:

```bash
supabase functions deploy challenge-link --no-verify-jwt
supabase functions deploy delete-account --no-verify-jwt
```

Both functions perform their own token validation. Hosted Supabase supplies `SUPABASE_URL`,
`SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`; confirm all three are visible to the
function runtime without printing their values.

- In Supabase Auth URL Configuration, set `https://chromadie.com` as the Site URL and allow exactly:
  - `https://chromadie.com/auth/callback`
  - `https://chromadie.com/reset-password`
- Enable email confirmations, secure password changes, and Cloudflare Turnstile in Supabase Auth.
  Store the Turnstile secret only in Supabase/Cloudflare settings; never use a `VITE_` name for it.
- Install the versioned templates from `docs/email-*-template.html` in the matching Supabase Auth
  email-template slots.

After pushing to `main`, verify the deployed asset bundle changed and smoke-test `/`, `/privacy`,
`/how-to-play`, `/auth/callback`, `/reset-password`, `/shop`, `/leaderboard`, `/u/<username>`,
`/c/<challenge-id>`, both SVG share-card endpoints, account deletion, and a direct refresh of every
route. Confirm CSP/HSTS headers on both static and Pages Function responses.

## Auth Flows

- Email/password signup
- Email verification
- Login/logout
- Forgot password
- Reset password
- Guest mode fallback

## What To Review

If you are auditing the project, start with:

1. `src/App.svelte`
2. `src/lib/stores.js`
3. `src/lib/Game.svelte`
4. `src/lib/Profile.svelte`
5. `src/lib/Leaderboard.svelte`
6. `supabase/migrations/`
7. `supabase/seed.sql`

## Supabase Notes

- The migration chain is the source of truth for schema history.
- Fresh resets should be playable using `supabase/seed.sql`.
- The app depends on RLS, RPCs, and restricted public reads for security.
- `npm run check:catalog-drift` always compares the catalog snapshot with the seed. When
  `SUPABASE_URL` and `SUPABASE_ANON_KEY` (or their `VITE_` equivalents) are set, it also
  verifies the live catalog.
- `supabase/config.toml` versions local Auth, database, redirect, and Edge Function behavior.
- Production cron readiness must be checked with:

```sql
select jobname, schedule, active from cron.job order by jobname;
select jobid, status, start_time, end_time from cron.job_run_details order by start_time desc limit 20;
```

## Balance Safety Checks

- `src/lib/balanceConfig.js` contains the current rarity and rank thresholds.
- `src/lib/scoringCandidate.js` is the current deterministic scoring model. The legacy scorer in
  `src/lib/scoring.js` is retained only for explicit historical comparisons.
- `npm test` locks current score examples, boundary behavior, rewards, and a seeded distribution.
- `npm run check:balance-drift` reads the base and final SQL scorer migrations and catches
  SQL/registry reward and rarity mismatches.
- `npm run check:scoring-parity` compares deterministic RGB samples against the local PostgreSQL
  scorer and must report zero differences.
- `npm run simulate:balance` runs the current seeded one-million-roll report. Use
  `-- --rolls=10000 --json` for a smaller machine-readable run, `--legacy` only for the retired
  model, and `--exhaustive` to evaluate all 16,777,216 RGB colors.

Balance changes must update the server formula, deterministic model, tests, and expected
simulation results together. Historical scores and lifetime EP are not recalculated.

## Launch Reward Window

The permanent `launch_edition` profile badge is granted by the database after an authenticated
roll inside the configured launch window. The UTC window is stored in `public.meta`:

- `official_launch_at`: `2026-07-11T00:00:00Z`
- `founder_window_ends_at`: `2026-08-11T00:00:00Z` (exclusive; retained for compatibility)

Changing these values affects future grants immediately. Existing Launch Edition badges are permanent
and are never removed when the window changes or expires.
