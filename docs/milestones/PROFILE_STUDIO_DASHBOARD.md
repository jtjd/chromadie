# Profile Studio Dashboard

Status: superseded presentation record; the current Studio implementation is
the clean reference-card replacement documented in `docs/DECISIONS.md` and
`docs/PROGRESS.md` (2026-08-14).

The historical implementation details below remain as a record of the
incremental dashboard work. They are not visual authorities for new Studio
changes.

The latest renderer follow-up also projects catalog CSS values at the preview
boundary, gives Motion its animated Name renderer, and explicitly resumes
Name, cursor, and atmosphere media when mounted editors return from a hidden
Customize tab.

The reference composition now reserves a real sticky preview rail at desktop
widths, stacks the editor and preview at narrower widths, and uses the preview
canvas's actual width to keep embedded identity cards readable. Mobile uses the
same top navigation and an explicit Preview control; no sidebar or drawer
presentation remains.

The Media workspace follow-up now gives the compact editor an explicit owner
for reference geometry. Background, Avatar, and Profile audio share one
aligned desktop row; Custom cursor and Background options share the row below;
tablet and mobile use bounded fallbacks. Active assets expose compact
Replace/Remove actions while retaining the existing child editor and server
mutation contracts.

The cursor recovery follow-up refreshes the owner library before upload
staging, clears expired staged assets, and safely repairs an orphaned active
cursor through the existing replacement RPC boundary. Compact avatar previews
also force uploaded media to fill their circular frame without changing stored
paths or public rendering.

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
currency. The stabilization adds normalized background-treatment fields and
two owner-authorized cursor-replacement RPCs; these preserve the existing
media quota, RLS, and storage authority and do not change authentication,
progression, economy, or public-profile authority. Old `#profile-*` and
short-form settings hashes map to Customize or Links as appropriate, and the
`/profile?legacy=1` escape hatch remains available.

## Architecture refactor follow-up

The dashboard is now an incremental component-owned architecture. The route
adapter retains navigation restoration, draft state, compatibility aliases,
before-unload handling, and the existing server mutation calls. The reference
shell, compact destination navigation, header/actions, destination workspace,
persistent Live preview, and dirty-state prompt each own their markup and
presentation boundaries. The obsolete sidebar shell and dashboard action
presentation were removed after import/reference checks.

The initial refactor established a dashboard contract and section registry to centralize destination/hash
normalization and editor ownership. A draft projection composes identity,
appearance, content, media, layout, and cosmetic drafts into the preview model.
Renderer contexts explicitly distinguish `live-profile`, `catalog`,
`effect-card`, and `name-control` geometry. Customize-specific layout rules now
live with the editor that owns the corresponding surface; standalone Links and
catalog rendering retain their existing contexts. The follow-up stabilization
is additive: it normalizes background treatment and adds owner-authorized
cursor replacement while leaving save, publish, upload, equip, account RPCs,
RLS, and public profile rendering contracts intact.

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
remains live and sticky at desktop widths, then stacks with the editor at
narrower widths. This is a presentation-only refinement: it reuses the existing
media library, entitlement gates, structured configuration, and owner RPCs.

The follow-up correction keeps the same destination but removes the remaining
nested interaction model. Customize is now one continuous workspace with direct
section headings. Active avatar/background media and Plus rich media (video,
banner, cursors, and audio) appear beside their upload/replace actions, with
saved assets immediately below for reuse. Repeated module headers are hidden in
this context. Color Customization now contains only renderer-backed color roles
and a Surface group containing its real depth controls, and
one dashboard Reset / Publish profile bar commits the assembled V2 draft across
Customize and Links. General Customization now gives Bio the full height of the
two right-side identity rows, keeps their gap compact, and places visibility
options below Bio while restoring ordinary flow on tablet and mobile. Profile
surface blur now samples the actual page background, one page-level uploaded
image/video layer, and atmosphere media behind the card, so high blur values
affect only the translucent card while the page outside it stays sharp.

## Validation

- `npm test`: 376 passing, including routing, draft aggregation, renderer
  context, dashboard ownership, shared profile-color role/HSV picker, and
  focused default-profile presentation, media lifecycle, and mobile preview
  coverage.
- `npm run build`, `npm run check`, `npx eslint src/`, links, CSP, username
  policy, balance, catalog, scoring parity, and database security: passing.
- `npm run check:profile-media-cutover`: passing with no runtime findings;
  this presentation milestone made no schema or media-infrastructure changes.
- `npm run check:performance`: all blocking route and asset budgets pass;
  dashboard JavaScript is 522.23 kB/528.00 kB; aggregate JavaScript and CSS
  catalogs remain advisory overages.
- `npm run test:browser:production`: the production build passed and the smoke
  passed homepage, auth, direct Studio refresh, stale-session protection,
  aliases, and live-preview open/close before stopping at the pre-existing
  persisted-upload fixture (`Timed out waiting for persisted uploaded
  background`) in the local R2 setup. Dev-mode retries also encountered
  intermittent headless Chromium `ERR_INSUFFICIENT_RESOURCES` failures before
  Studio assertions. The focused static/browser-selector coverage remains
  green.

The latest stabilization remains additive. The picker marker is derived from
the same selected-role HSV value as its controls, and
the public shell applies the blue default only to untouched Signal defaults;
authored media, backgrounds, atmospheres, links, content, and saved layouts
continue to win.

Background treatment is now a normalized, renderer-backed draft with blur,
image opacity, and overlay controls. Cursor replacement uses two
owner-authorized transactional RPCs so an occupied cursor slot can be
replaced without weakening quota, RLS, storage, or authenticated ownership
boundaries.

The Customize audit removes controls that had no configuration, persistence,
or renderer consumer while preserving old normalized fields for compatibility.
Mounted editors now project one composed draft into Live preview: identity and
bio input, appearance colors and depth, structured content/widgets/layout,
media selections, and temporary cosmetic loadouts update immediately without
changing the existing save, publish, upload, equip, RLS, or RPC authority
boundaries.

Customize now presents three tabs: Appearance, Media, and Layout. Appearance
contains identity, renderer-backed colors and surface depth, and the existing
visual-effect fitting room. The old Effects tab and its hashes remain routing
aliases to Appearance; cosmetic preview, entitlement checks, and equip RPCs
retain their existing authority boundaries.

Profile surface color now sits with opacity and blur because those three
values feed the same normalized identity-card surface. Its color input remains
connected to the shared HSV picker and immediate Live preview. Cosmetic font,
material, motion, avatar, border, cursor, and atmosphere selection continues
to project a temporary fitting-room loadout into the persistent production
profile preview; only Apply changes invokes the existing equip RPCs.

Cosmetic cards now use the same finite production preview renderers as the
catalog instead of CSS stand-ins. The temporary loadout is forwarded to the
persistent ProfileShell immediately, including on untouched default profiles;
paid layouts remain exclusively in the Layout surface.

The Effects fitting room is now compact by construction: its four visual cards
override the catalog preview stage's intrinsic aspect ratio and clip the
renderer into a short, reference-sized viewport. The editor no longer renders
the “Preview only. Apply the change” helper paragraph; Apply changes remains
the single inline commit affordance, with failures announced as alerts and
successful changes reported through the existing toast system.

Collection cosmetic events now flow through the Customize shell into the
persistent preview, including atmosphere drafts. AtmosphereLayer keys its
finite media plate by the validated scene key so selecting a different scene
updates both the fitting-room card and Live preview. Name-effect samples use a
compact, right-aligned control-side treatment with terse Font/Material/Motion
labels and fixed row geometry matching the supplied fitting-room reference.

## Reference shell replacement — 2026-08-14

Profile Studio now uses the approved dark reference presentation as its single
authenticated shell. Overview, Customize, Links, and Premium are direct
destinations; Analytics, Notifications, Privacy & social, Badges & progression,
and Settings are grouped under an accessible More menu. Customize keeps the
Appearance, Media, and Layout tabs and the real persistent ProfileShell preview
in a sticky right-hand rail on desktop. The route adapter, editor contracts,
draft/publish state, media lifecycle, auth, and destination behavior remain
unchanged.

The previous sidebar, mobile drawer, owner-card presentation, duplicate
dashboard action bar, and preview promotion panel were removed rather than
retained as compatibility branches. Browser smoke now checks the compact More
menu, mobile Preview control, bounded editor/preview geometry, all destination
routes, and the existing dirty/publish flows across phone, tablet, and desktop
widths.
