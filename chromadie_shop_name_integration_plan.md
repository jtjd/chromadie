# Chromadie Shop + Name Catalog Integration Plan

## Conclusion

Do **not** rebuild the shop from scratch.

The current project already has the correct architectural split:

- Shop Home
- Browse
- Collection
- Studio
- Product Detail
- server-authoritative purchase flow
- profile-settings equip flow
- temporary shop fitting room

The next milestone should focus on two things:

1. simplify the shop presentation so it matches the approved boutique/Name Lab direction;
2. replace the old single-slot CSS Name system with composable, code-owned rendering.

The current catalog has 92 rows, including 29 mutually exclusive `name_effect`
items. The target catalog has 64 paid Name products across Font, Material, and
Motion. Adding those 64 products to the existing `name_effect` slot would keep
the underlying problem and make the shop much harder to browse.

---

# 1. Keep versus replace

## Keep

Preserve these current files and responsibilities:

- `Shop.svelte` as the `/shop` orchestrator
- `ShopHome.svelte`
- `ShopBrowse.svelte`
- `ShopCollection.svelte`
- `ShopStudio.svelte`
- `ShopProductDetail.svelte`
- `shopCatalog.js`
- `purchase_item`
- inventory, wallet, entitlements, and cache behavior
- profile settings as the permanent equip surface
- temporary try-on in the shop
- current route and view-state behavior

The current shop architecture tests already protect the important purchase and
equip boundaries.

## Replace or heavily refactor

- `ShopItemPreview.svelte`
  - It is a generic CSS preview renderer and is the main reason Name cards cannot
    match the new prototype reliably.
- Name-related portions of `ShopStudioPreview.svelte`
- Name-related portions of `ProfileSettingsPreview.svelte`
- direct `getNameEffect()` DOM class/style rendering across profile, discovery,
  leaderboard, rivals, homepage examples, Studio, and the shop
- old Name CSS in `src/styles/cosmetics.css`, but only after legacy presets have
  been ported to the new renderer

---

# 2. Shop visual changes

## Shop Home

The current Home is structurally close, but it repeats too much.

Keep:

- heading and wallet
- category navigation
- Today’s Edit
- one curated product row

Remove or collapse:

- the duplicate profile/roll pathway row
- the three large Browse/Collection/Studio continuation cards
- repeated explanatory copy

Target order:

1. compact shop heading
2. category navigation
3. Today’s Edit
4. one curated row
5. small text links to Browse and Collection

This will make Home feel like a storefront rather than a dashboard.

## Browse

The current permanent left filter rail works, but it does not match the cleaner
catalog lab and becomes expensive when Name contains 66 visible entries.

Use:

- horizontal category navigation
- category-specific secondary tabs
- compact search and sort row
- a Filters button opening a popover/drawer for collection, rarity, ownership,
  and affordability
- sticky live preview on desktop for Name, Avatar, Cursor, and Layout categories

For Name:

```text
Fonts | Materials | Motion
```

The selected card should update the live preview without opening Product Detail.
Clicking the card title, price, or explicit detail affordance opens the drawer.

## Product cards

The current cards contain too much repeated UI:

- slot label
- ownership state
- access-tier label
- preview
- name
- collection
- rarity
- price
- description
- Buy/Manage button
- Try On button

Use the cleaner card structure:

```text
Name                         220K EP
[ animated preview ]
Rare                         Prism
One-line description
```

Add only small corner indicators when relevant:

- Owned
- Equipped
- Previewing
- Premium

Do not place two large action buttons on every card. Clicking previews selects
or previews. Purchasing and detailed state belong in Product Detail.

## Product Detail

Change the centered desktop modal to:

- right-side drawer on desktop
- bottom sheet on mobile

The drawer should use the same renderer as the card and live profile. Keep the
existing focus trap, Escape handling, confirmation logic, purchase RPC, and
related-item behavior.

## Studio

Keep the general Studio surface.

For Name, expose three independently selected layers:

```text
Font
Material
Motion
```

The center preview must use the exact same component as public profiles. Do not
create a Studio-only implementation.

---

# 3. New Name data model

Add three active cosmetic slots:

- `name_font`
- `name_material`
- `name_motion`

Keep `name_effect` temporarily as a legacy preset slot.

Resolution priority:

1. explicit new Name slots
2. legacy `name_effect` preset
3. platform default

A profile may not actively combine a legacy preset with new Name layers.

## Equip behavior

Update `equip_item` atomically:

- equipping `name_font`, `name_material`, or `name_motion` removes
  `name_effect`;
- equipping a legacy `name_effect` removes all three new Name slots;
- all existing inventory and entitlement validation remains unchanged.

Update `unequip_item`, slot constraints, client slot allowlists, filters, tests,
and preview loadout helpers.

## Catalog status

Add:

```sql
catalog_status text not null default 'active'
```

Allowed values:

- `active`
- `legacy`
- `retired`

Behavior:

- Browse and Shop Home show only `active`;
- Collection may show owned `legacy`;
- rendering can resolve active and legacy;
- `retired` is only for invalid items that should not render or be equipped.

Do not delete old catalog rows or inventory records.

## Renderer-backed rows

The current catalog requires `css_type` and `css_value`.

The clean migration is to permit:

```text
css_type = renderer
css_value = a code-owned effect key
```

Validation rules:

- `css_value` must match a bounded identifier pattern;
- every renderer key must exist in the code-owned catalog;
- arbitrary CSS, JavaScript, URLs, and user HTML remain forbidden.

---

# 4. Shared Name renderer

Create:

```text
src/lib/name/NameEffectCanvas.svelte
src/lib/name/nameRenderer.js
src/lib/name/nameCatalog.js
src/lib/name/nameFonts.js
src/lib/name/nameMaterials.js
src/lib/name/nameMotions.js
src/lib/name/nameLegacyPresets.js
src/lib/name/nameAnimationClock.js
```

## Required properties

`NameEffectCanvas` should accept:

- text
- loadout or resolved Font/Material/Motion keys
- today’s color
- recent color history
- compact/full context
- animated/static mode
- size
- accessible heading or link behavior

## Rendering policy

- one shared animation clock
- visible card previews capped near 30 FPS
- public full-profile preview up to 60 FPS
- offscreen renderers paused
- compact discovery and leaderboard contexts use a static signature frame or a
  restricted low-motion mode
- device-pixel ratio capped
- deterministic seeded noise
- deliberate reduced-motion frame
- no surface-specific effect reimplementation

## Accessibility

Canvas must not replace the semantic username.

Keep a real text heading or link available to:

- screen readers
- keyboard users
- search engines
- copy/select behavior

The canvas is the visual layer. The semantic text remains the source of truth.

## Font loading

Do not use remote Google Fonts in production.

Use legally compatible self-hosted packages/assets and load cosmetic fonts on
demand. Cache `document.fonts.load()` results and redraw after the font is
available.

---

# 5. Legacy cleanup

There are 29 current Name effects.

Initial policy:

- mark them `legacy`;
- remove them from new sales;
- keep them visible in an owner’s Collection;
- preserve existing equipped profiles;
- port their visual behavior into `nameLegacyPresets.js`;
- do not automatically grant replacement items in the first migration.

The accompanying JSON proposes a modern equivalent for each legacy item. Those
equivalents can later support:

- a “Build a modern version” suggestion;
- an optional owner conversion flow;
- collection merchandising;
- compensation decisions after economy review.

Do not silently replace a purchased item with a different product.

Once all 29 legacy keys render through the canvas bridge and no Name surface
uses their CSS classes, remove the obsolete Name CSS and keyframes from
`cosmetics.css`.

---

# 6. Catalog insertion

Insert:

- 18 paid Font products
- 22 paid Material products
- 24 paid Motion products
- Plain and Still baselines as free/included rows only if the UI needs them as
  explicit selectable inventory entries

Use namespaced stable keys:

```text
name_font_editorial_serif
name_material_polished_chrome
name_motion_velvet_sweep
```

The prototype prices are provisional. Run the balance simulation before
shipping the migration.

The 64-item JSON and interactive catalog remain the visual and content
reference, not production code.

---

# 7. Exact implementation phases

## Phase A — Renderer foundation

No database or shop-layout changes.

- build the shared Name renderer modules;
- add the accessible Svelte wrapper;
- port all 29 legacy effects into code-owned legacy presets;
- replace Name rendering in one internal preview;
- add deterministic frame tests.

Acceptance:

- old profiles look intentional;
- card and live preview use one component;
- reduced motion works;
- no catalog changes yet.

## Phase B — Replace Name rendering everywhere

Update:

- `IdentityCard.svelte`
- `Profile.svelte`
- `ProfileShell.svelte`
- `DiscoveryCard.svelte`
- `HomepageProfilePreview.svelte`
- `ProfileSettingsPreview.svelte`
- `ShopStudioPreview.svelte`
- `ShopItemPreview.svelte`

Acceptance:

- no Name effect uses direct CSS class/style rendering;
- semantic names remain real text;
- compact surfaces stay performant.

## Phase C — Shop presentation refinement

- simplify Shop Home;
- replace noisy card hierarchy;
- add Name layer tabs;
- add sticky live preview;
- move secondary filters into a drawer/popover;
- convert Product Detail to a right drawer/bottom sheet;
- keep purchases and equipping unchanged.

Acceptance:

- the shop visually matches the 64-item catalog lab;
- no fake data;
- no purchase/equip regression.

## Phase D — Schema and catalog migration

- add new slots;
- add `catalog_status`;
- allow renderer-backed catalog rows;
- update equip/unequip conflict behavior;
- insert the new Name catalog;
- mark old Name rows legacy;
- bump `shop_version`;
- update seed and drift checks.

Acceptance:

- existing inventories and profiles remain valid;
- new products can be purchased and equipped;
- legacy products remain usable by owners;
- remote/local catalog parity can be verified.

## Phase E — Legacy CSS removal

Only after all legacy presets pass visual tests:

- delete obsolete Name classes and keyframes;
- keep non-Name cosmetic CSS;
- verify no catalog row references removed CSS;
- verify old equipped profiles through fixture coverage.

---

# 8. Tests to add

- every new item key resolves to exactly one renderer definition;
- all 64 paid products appear in the intended slot;
- old 29 legacy keys resolve;
- active catalog excludes legacy Name rows;
- Collection includes owned legacy rows;
- new Name slot equip clears `name_effect`;
- legacy equip clears all three new slots;
- purchase authority remains server-side;
- deterministic frame comparison for every motion in card and live contexts;
- reduced-motion static frames;
- long names and 3-character names;
- light and dark daily colors;
- font-load fallback and redraw;
- renderer lifecycle does not leak when filters/tabs change;
- compact leaderboard/discovery rendering stays inside performance budget.

---

# 9. Validation note

Static catalog and shop tests can run from the uploaded project, and the local
catalog drift check reports 92 matching rows.

A full dependency install could not be completed in this environment because
the internal package mirror did not contain `zimmerframe@1.1.4`. The live
project should still run the complete validation list from `AGENTS.md` before
the milestone is accepted.

---

# Recommended immediate task

Start with **Phase A only**.

Do not combine the renderer foundation, shop redesign, schema migration, 64 new
rows, and old-effect removal into one Codex pass. That would be difficult to
review and would create too many ways to break existing profiles.

Once the shared renderer can reproduce every current legacy Name key, the rest
of the migration becomes controlled rather than risky.
