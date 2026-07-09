# Audit Brief

This repository is being shared temporarily for external review.

## What To Assume

- The current migration chain is authoritative unless a newer migration says otherwise.
- The remote Supabase staging database is the live test target.
- Guest mode is local-only and must not have server authority.
- Login state must come from Supabase session data, not from placeholder usernames or cached guest state.

## Highest-Risk Areas

1. Supabase RLS and RPC security
2. Gameplay integrity for daily rolls, rerolls, purchases, inventory, rivals, and profile updates
3. Auth / guest-state separation
4. Redirects, callbacks, and password reset flows
5. Mobile responsiveness and header/profile rendering

## Files To Inspect First

- `src/App.svelte`
- `src/lib/stores.js`
- `src/lib/Game.svelte`
- `src/lib/Profile.svelte`
- `src/lib/Leaderboard.svelte`
- `src/lib/Shop.svelte`
- `supabase/migrations/`
- `supabase/seed.sql`

## What A Good Audit Should Verify

- No client can directly mutate gameplay tables.
- Rerolls cannot be replayed or duplicated by refresh / multi-tab / concurrency.
- Guests cannot be mistaken for authenticated users.
- Authenticated users see their real username and cosmetics on mobile.
- Fresh Supabase reset is playable with committed seed data only.
- Cloudflare Pages static hosting requirements are met.

