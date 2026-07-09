# Project Status

This file is the short operational snapshot of the codebase for review and audit.

## Trust Boundary

- Client code may read public data.
- Client code must not directly mutate gameplay state.
- Gameplay mutations should go through Supabase RPCs with server-side validation.
- RLS should prevent direct client writes to protected tables.

## Auth Model

- `authUser`: real Supabase auth identity
- `profile`: hydrated database profile for signed-in users
- `isAuthenticated`: real authenticated user with a loaded profile
- `isGuest`: no Supabase session
- Guest users should be playable, but local-only

## Current Gameplay State

- Daily roll is authoritative on the server.
- Rerolls are intended to be locked to the server-side rules.
- Leaderboards come from database views / RPCs.
- Cosmetics are mapped from shop metadata and equipped profile state.

## Current UI State

- Header has responsive desktop and mobile variants.
- Mobile username chip is visible in the header for authenticated users.
- Guest mode should never show account-loading language.
- Shop, profile, leaderboard, and game screens are responsive and polished for mobile.

## Current Supabase State

- The linked remote Supabase staging project is authoritative for testing.
- The migration chain is committed and should be replayable on a clean database.
- `supabase/seed.sql` contains the lookup rows needed for a fresh boot.

## Known Review Focus Areas

- Auth/session bootstrap timing
- Guest vs authenticated state separation
- RLS and RPC enforcement
- Reroll concurrency and replay resistance
- Mobile layout edge cases
- Cloudflare Pages static routing compatibility

