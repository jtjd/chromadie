# Chromadie

Chromadie is a Svelte/SvelteKit-style SPA built with Vite, Supabase, and Cloudflare Turnstile. It supports guest play, authenticated accounts, cosmetics, leaderboards, profiles, rivals, and daily roll gameplay.

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
npx eslint src/
npm test
npm run check:balance-drift
npm run check:catalog-drift
npm run simulate:balance
npm run db:push
npm run db:reset
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

After pushing to `main`, verify the deployed asset bundle changed and smoke-test `/`,
`/auth/callback`, `/reset-password`, `/shop`, `/leaderboard`, and `/profile`.

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

## Balance Safety Checks

- `src/lib/balanceConfig.js` contains the current rarity and rank thresholds.
- `src/lib/scoring.js` is a deterministic mirror of the server-authoritative score formula for
  tests and simulations; gameplay continues to use the Supabase `roll_die` RPC.
- `npm test` locks current score examples, boundary behavior, rewards, and a seeded distribution.
- `npm run check:balance-drift` catches SQL/registry reward and rarity mismatches.
- `npm run simulate:balance` runs the standard seeded one-million-roll report. Use
  `-- --rolls=10000 --json` for a smaller machine-readable run. Add `--candidate` for the
  pre-launch rebalance model and `--exhaustive` to evaluate all 16,777,216 RGB colors.

Balance changes must update the server formula, deterministic model, tests, and expected
simulation results together. Historical scores and lifetime EP are not recalculated.

## Launch Reward Window

The permanent `launch_edition` profile badge is granted by the database after an authenticated
roll inside the configured launch window. The UTC window is stored in `public.meta`:

- `official_launch_at`: `2026-07-11T00:00:00Z`
- `founder_window_ends_at`: `2026-08-11T00:00:00Z` (exclusive; retained for compatibility)

Changing these values affects future grants immediately. Existing Launch Edition badges are permanent
and is never removed when the window changes or expires.
