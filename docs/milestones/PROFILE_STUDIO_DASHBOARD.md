# Profile Studio Dashboard

Status: implementation complete; workspace usability, Catppuccin Mocha contrast, and Profile Studio typography refinement implemented 2026-08-09

## Scope

The authenticated profile-settings route is the Profile Studio dashboard. It
opens on an aggregate expression workspace and keeps account surfaces separate:

- Customize — identity, appearance, rich media, About, widgets, collection,
  templates, and public composition controls.
- Links — public links, aliases, sharing metadata, and QR actions.
- Premium — Plus status and a read-only path to the existing pricing flow.
- Account — overview, analytics, notifications, privacy/social, progression,
  and account settings.

The primary authenticated header now exposes Studio instead of Shop. Shop is
still direct-refreshable at `/shop`, but it is not promoted through navigation
or dashboard calls-to-action. Catalog loading no longer blocks account
bootstrap; it begins only when Shop or Collection needs it.

## Authority boundary

This remains a presentation milestone. The dashboard projects existing
authoritative profile, story, achievement, inventory, and rank data. It does
not grant rewards, calculate scores, mutate inventory, or create a new
currency. Old `#profile-*` and short-form settings hashes map to Customize or
Links as appropriate, and the `/profile?legacy=1` escape hatch remains
available.

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

## Workspace usability refinement

Customize now opens with five direct asset-management entries and a persistent
seven-category switcher. Editors stay mounted to retain local drafts, but only
the selected category and its section-scoped action bar are displayed. Preview
is user-controlled and responsive instead of permanently reducing the editor
width. This is a presentation-only refinement: it reuses the existing media
library, entitlement gates, structured configuration, and owner RPCs.

The follow-up correction keeps the same destination but removes the remaining
nested interaction model. Customize is now one continuous workspace with direct
section headings. Active avatar/background media and Plus rich media (video,
banner, cursors, and audio) appear beside their upload/replace actions, with
saved assets immediately below for reuse. Repeated module headers are hidden in
this context. Color Customization now contains only the six palette colors and a
Surface group containing the Profile Surface color plus its depth controls, and
one dashboard Reset / Publish profile bar commits the assembled V2 draft across
Customize and Links. General Customization now gives Bio the full height of the
two right-side identity rows, keeps their gap compact, and places visibility
options below Bio while restoring ordinary flow on tablet and mobile. Profile
surface blur now samples the actual uploaded image, video, and atmosphere media
behind the card, so high blur values affect only the translucent card while the
page outside it stays sharp.

## Validation

- `npm test`: 253 passing.
- `npm run build`, `npm run check`, `npx eslint src/`, links, CSP, username
  policy, balance, catalog, scoring parity, and database security: passing.
- `npm run check:performance`: all blocking route and asset budgets pass;
  aggregate JavaScript and CSS catalogs remain advisory overages.
- `npm run test:browser`: passing for authenticated Studio refresh, aliases,
  collapsed/open/closed preview, draft-only appearance updates, balanced
  General Customization geometry, maximum surface blur, mobile
  drawer, reduced motion, and canonical public profile refresh.
