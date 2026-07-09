# Chromadie

Chromadie is a Svelte/SvelteKit-style SPA built with Vite, Supabase, and Cloudflare Turnstile. It supports guest play, authenticated accounts, cosmetics, leaderboards, profiles, rivals, and daily roll gameplay.

## Current State

- Guest mode is local-only and must not be treated as authenticated.
- Real auth uses Supabase session state plus profile hydration.
- Gameplay mutations are intended to be server-authoritative through Supabase RPCs.
- The remote Supabase staging project is the authoritative live test target right now.
- Cloudflare Pages is the future hosting target, but the project is not deployed there yet.

## Key Commands

```bash
npm run dev
npm run build
npx eslint src/
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

