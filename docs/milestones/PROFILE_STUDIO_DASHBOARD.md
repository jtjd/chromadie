# Profile Studio Dashboard

Status: implementation complete; validation complete with the repository performance budget exception noted below — 2026-08-05

## Scope

The authenticated profile-settings route is now the Profile Studio dashboard.
It opens on an Overview surface and keeps deeper editing surfaces behind the
same validated workspace:

- Overview — live identity, rank/EP progress, recent trace, and next actions.
- Identity — bio and presence.
- Expression — avatar, backdrop, and music.
- Collection — owned expression and server-authoritative equip actions.
- Layout & links — the public canvas configuration.
- Privacy & social — visitor and interaction controls.
- Progression — rolls, streaks, achievements, story collection, and history.

The primary authenticated header now exposes Studio instead of Shop. Shop is
still direct-refreshable at `/shop`, but it is not promoted through navigation
or dashboard calls-to-action. Catalog loading no longer blocks account
bootstrap; it begins only when Shop or Collection needs it.

## Authority boundary

This remains a presentation milestone. The dashboard projects existing
authoritative profile, story, achievement, inventory, and rank data. It does
not grant rewards, calculate scores, mutate inventory, or create a new
currency. Old `#appearance` and `#account` settings hashes map to Collection
and Progression, and the `/profile?legacy=1` escape hatch remains available.

## Next progression slice

The next backend change should extend the existing transactional roll path,
not create a parallel client progression engine. The current
`roll_die_impl(boolean)` already owns EP, streak rewards, achievements, and
inventory grants. The recommended next slice is:

1. Define a small allow-listed milestone reward manifest alongside existing
   achievement/catalog definitions.
2. Grant only from the locked roll/achievement transaction using unique
   `(user_id, milestone_key)` or an equivalent idempotent boundary.
3. Return canonical `new_milestones` with the roll response so the dashboard
   and post-roll UI render server results only.
4. Backfill or map existing achievement/streak history without duplicating
   rewards for older accounts.
5. Add owner/other/anon RLS and replay/idempotency tests before exposing new
   progression rewards in the UI.

Do not add a battle pass, loot box, payment flow, or a second progression
currency in that slice.

## Acceptance criteria

- Studio is the clear authenticated destination for profile work.
- Overview gives a meaningful next action on new, active, and mature accounts.
- Collection and Progression remain distinct but connected.
- Shop is hidden from primary discovery but remains recoverable and safe.
- Account hydration does not fail because the Shop catalog is unavailable.
- Desktop, mobile, keyboard, empty, partial-data, and reduced-motion states are
  covered.
- Existing route, RPC, RLS, scoring, catalog, and historical-data contracts
  remain intact.

## Validation

- `npm test`: 190 passing.
- `npm run check`, `npx eslint src/`, and `npm run build`: passing.
- Links, CSP, username policy, balance, catalog, scoring parity, database
  security, and direct `/profile/settings` + `/shop` route smoke checks:
  passing.
- `npm run check:performance`: repository budget exception remains for
  initial JavaScript, total JavaScript, and total CSS. The largest lazy asset
  remains below its configured limit; this milestone did not broaden the
  performance scope into a separate asset-budget refactor.
