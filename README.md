# Chromadie

Chromadie is a Svelte 5 single-page application built with Vite, Supabase, and Cloudflare Turnstile. It supports guest play, authenticated accounts, cosmetics, leaderboards, profiles, rivals, and daily roll gameplay. It is not a SvelteKit application; Cloudflare Pages Functions provide route-aware metadata around the static SPA.

## Current State

- Guest mode is local-only and must not be treated as authenticated.
- Real auth uses Supabase session state plus profile hydration.
- Gameplay mutations are intended to be server-authoritative through Supabase RPCs.
- The gated remote Supabase project is the current live test target.
- Cloudflare Pages deploys production automatically from the GitHub `main` branch.
- The canonical production site is `https://chm.lol`.
- Cloudflare Pages may remain the hosting provider, but public links, metadata, and share cards use `https://chm.lol`.

## Key Commands

```bash
npm run dev
npm run build
npm run check:csp
npm run check:performance
npm run check
npx eslint src/
npm test
npm audit --audit-level=high
npm run check:links
npm run check:balance-drift
npm run check:catalog-drift
npm run check:db-security
npm run check:scoring-parity
npm run check:profile-certification
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
- `VITE_CHROMADIE_ROLLOUT_STAGE` (`staff`, `internal`, `cohort`, or `all`)
- `VITE_CHROMADIE_INTERNAL_IDS` and `VITE_CHROMADIE_COHORT_PERCENT`
- `VITE_CHROMADIE_FLAG_COMMERCE`
- `VITE_CHROMADIE_FLAG_RICH_MEDIA`
- `VITE_CHROMADIE_FLAG_PROFILE_CONFIGURATION_V2`
- `VITE_CHROMADIE_FLAG_EXPANDED_ANALYTICS`
- `VITE_CHROMADIE_FLAG_SOCIAL_DEPTH`

The rollout values are public build configuration and are safe to place in the
Pages environment. Do not commit secrets. The server remains authoritative for
entitlements, storage, analytics writes, social RPCs, and gameplay.

## Local Development

Use the local Supabase project for feature testing so the Vite app cannot write
to the linked project:

```bash
supabase start
supabase db reset
supabase status
npm run dev
```

Create an ignored `.env.local` with the local `API_URL` and `ANON_KEY` from
`supabase status`, plus `VITE_SITE_URL=http://localhost:5173`. Vite loads
`.env.local` after `.env`, so these values override any remote project values
during local development. Local auth bypasses Turnstile and disables email
confirmation only on localhost, so a test account is available immediately.
Stop the local services with `supabase stop` when finished.

## Production Deployment

- Cloudflare Pages source: GitHub `main`
- Build command: `npm run build`
- Build output directory: `dist`
- SPA routing and production security headers are defined in `public/_redirects` and
  `public/_headers`.
- Configure all four `VITE_` variables above in the Cloudflare Pages production environment.
- Deploy Supabase Edge Functions before the Pages deployment:

```bash
supabase functions deploy challenge-link --no-verify-jwt
supabase functions deploy delete-account --no-verify-jwt
supabase functions deploy create-premium-checkout --no-verify-jwt
supabase functions deploy restore-premium-checkout --no-verify-jwt
supabase functions deploy stripe-premium-webhook --no-verify-jwt
```

These functions perform their own token or signature validation. Hosted Supabase supplies `SUPABASE_URL`,
`SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`; confirm all three are visible to the
function runtime without printing their values.

Billing additionally requires Supabase secrets named `SITE_URL` (the canonical
origin), `STRIPE_SECRET_KEY`, and `STRIPE_WEBHOOK_SECRET`. Configure Stripe to
send `checkout.session.completed`, `charge.refunded`, `refund.created`, and
`charge.dispute.created` to the deployed webhook. Never expose these values
through `VITE_` variables.

- In Supabase Auth URL Configuration, set `https://chm.lol` as the Site URL and allow exactly these production transition URLs:
  - `https://chm.lol/auth/callback`
  - `https://chm.lol/reset-password`
- `https://chromadie.com/auth/callback`
- `https://chromadie.com/reset-password`
- Keep the legacy callback URLs only until the old host and existing email
  links have been verified; do not replace these entries with wildcards.
- Enable email confirmations, secure password changes, and Cloudflare Turnstile in Supabase Auth.
  Store the Turnstile secret only in Supabase/Cloudflare settings; never use a `VITE_` name for it.
- Install the versioned templates from `docs/email-*-template.html` in the matching Supabase Auth
  email-template slots.

After pushing to `main`, verify the deployed asset bundle changed and smoke-test `/`, `/privacy`,
`/how-to-play`, `/auth/callback`, `/reset-password`, `/shop`, `/leaderboard`, `/<username>`, `/u/<username>`,
`/c/<challenge-id>`, `/pricing`, `/pricing/success`, both SVG share-card endpoints, account deletion, and a direct refresh of every
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
