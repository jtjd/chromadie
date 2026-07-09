# Production Launch Checklist

This project is a static Vite SPA backed by Supabase and Cloudflare Turnstile.

## Cloudflare Pages

- Build command: `npm run build`
- Build output directory: `dist`
- Static routing fallback: `public/_redirects`
- Security headers: `public/_headers`

Required production environment variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_KEY`
- `VITE_CLOUDFLARE_SITE_KEY`
- `VITE_SITE_URL` (recommended once a real deployment URL exists)

Notes:

- Use the public Supabase anon key in `VITE_SUPABASE_KEY`, not the service role key.
- `VITE_SUPABASE_URL` must be the HTTPS project URL.
- `VITE_CLOUDFLARE_SITE_KEY` must match the Turnstile widget configured in Cloudflare.
- `VITE_SITE_URL` should point at `http://localhost:5173` during local development.
- After Cloudflare Pages deployment, update `VITE_SITE_URL` to the deployed origin and add it to Supabase Auth redirect allow lists.
- Until beta launch on Cloudflare, keep Supabase's built-in auth email delivery enabled and defer Resend SMTP.

## Auth Redirect Paths

Keep these routes available through the SPA fallback:

- `/auth/callback`
- `/reset-password`

Local Supabase Auth redirect allow list:

- `http://localhost:5173/**`
- `http://localhost:5173/auth/callback`
- `http://localhost:5173/reset-password`

Staging / beta allow list to add later:

- `https://YOUR-CLOUDFLARE-PAGES-SUBDOMAIN.pages.dev/**`
- `https://YOUR-CLOUDFLARE-PAGES-SUBDOMAIN.pages.dev/auth/callback`
- `https://YOUR-CLOUDFLARE-PAGES-SUBDOMAIN.pages.dev/reset-password`
- `https://YOUR-CUSTOM-DOMAIN/**`
- `https://YOUR-CUSTOM-DOMAIN/auth/callback`
- `https://YOUR-CUSTOM-DOMAIN/reset-password`

## Supabase

Before launch, verify the linked database is running the committed migrations and seed:

- `npm run db:reset`

Then confirm the schema replays cleanly and the seed data is present for:

- `achievements`
- `shop_items`
- `meta`

Useful commands:

- `npm run db:diff`
- `npm run db:push`

## Prelaunch Checks

- Run `npx eslint src/`
- Run `npm run build`
- Run `npm run db:reset`
- Confirm login/signup works with Turnstile enabled
- Confirm email verification opens the callback route and completes sign-in
- Confirm forgot password sends a reset email and the reset page updates the password
- Confirm guest mode still works
- Confirm rolling, shop purchase, leaderboard, profile, and rivals flows all load
- Confirm Cloudflare Pages serves deep links through the SPA fallback

## Security Assumptions

- Clients must only mutate gameplay through Supabase RPCs.
- Public profile reads are intentionally limited to safe fields.
- Private profile fields are available only through `get_my_profile()`.
- `public/_headers` and `public/_redirects` are part of the deploy surface and must be committed.
