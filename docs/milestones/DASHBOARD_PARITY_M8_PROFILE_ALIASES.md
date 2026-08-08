# Dashboard Parity Milestone 8 — Profile aliases

Status: complete locally; additive migration deployed to the linked database on
2026-08-08. The temporary Pages password/maintenance gate remains active.

## Goal

Make profile sharing more personal and memorable without creating a second
profile renderer, a second canonical URL, or a new public-data surface.

## Delivered

- Added an owner-only Profile Studio Aliases section.
- Added a database-owned `profile_aliases` table with RLS enabled, no browser
  table grants, profile-delete cascade cleanup, and a hard limit of three
  aliases per profile.
- Added owner RPCs for listing, creating, and deleting aliases, plus a bounded
  anonymous/authenticated resolver that returns only the alias and canonical
  username.
- Reused the authoritative username shape and reservation checks. Canonical
  username claims and aliases are protected from colliding in either direction.
- Added `/a/<alias>` as an explicit compatibility route. Cloudflare Pages
  returns a `307` to `/<username>`; local SPA routing resolves the alias and
  replaces the URL before loading the existing profile shell.
- Preserved query parameters for campaign/share attribution while keeping
  alias redirects `no-store`.

## Explicitly out of scope

Custom domains, API keys, external domain cutover, password-gate removal,
profile renderer changes, gameplay, scoring, rewards, purchases, and prestige
authority.

## Acceptance evidence

- `npm run build`
- `npm run check`
- `npx eslint src/`
- `npm test`
- `npm run check:links`
- `npm run check:csp`
- `npm run check:performance`
- `npm run check:username-policy-drift`
- `npm run check:balance-drift`
- `npm run check:catalog-drift`
- `npm run check:scoring-parity`
- `npm run check:db-security`
- `supabase db lint --local --level warning --fail-on warning`
- `npm run db:reset`
