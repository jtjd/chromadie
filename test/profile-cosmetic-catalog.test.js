import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('the retired Shop surface has no runtime route or presentation files', async () => {
  const [routes, loaders, app, game] = await Promise.all([
    read('src/lib/routes.js'),
    read('src/lib/routeLoaders.js'),
    read('src/App.svelte'),
    read('src/lib/Game.svelte')
  ]);

  assert.doesNotMatch(routes, /'shop'/);
  assert.doesNotMatch(loaders, /Shop\.svelte|shop:/);
  assert.match(routes, /pathname === '\/shop'\) return 'profile-settings'/);
  assert.match(app, /window\.location\.pathname === '\/shop'/);
  assert.doesNotMatch(game, /Open Shop|Spend EP in the Shop/);

  for (const path of [
    'src/lib/Shop.svelte',
    'src/lib/ShopBrowse.svelte',
    'src/lib/ShopCollection.svelte',
    'src/lib/ShopContextualPreview.svelte',
    'src/lib/ShopItemCard.svelte',
    'src/lib/ShopRail.svelte',
    'src/lib/ShopStudioPreview.svelte'
  ]) {
    await assert.rejects(access(new URL(`../${path}`, import.meta.url)));
  }
});

test('Customize exposes active cosmetics with server-owned acquisition states', async () => {
  const [cosmetics, stores, catalogState, analytics] = await Promise.all([
    read('src/lib/ProfileCosmeticsEditor.svelte'),
    read('src/lib/stores.js'),
    read('src/lib/catalogState.js'),
    read('src/lib/productAnalytics.js')
  ]);

  assert.match(cosmetics, /availableCosmetics/);
  assert.match(cosmetics, /item\.catalog_status === 'active'/);
  assert.match(cosmetics, /hasShopEntitlement/);
  assert.match(cosmetics, /getShopAccessLabel/);
  assert.doesNotMatch(cosmetics, /ownedCosmetics|purchase_item/);
  assert.match(cosmetics, /equip_item/);
  assert.match(cosmetics, /unequip_item/);
  assert.match(cosmetics, /loadCosmeticCatalog/);
  assert.match(stores, /from '\.\/catalogState\.js'/);
  assert.match(catalogState, /export const cosmeticCatalogItems/);
  assert.match(catalogState, /export function loadCosmeticCatalog/);
  assert.match(catalogState, /cosmetic_catalog:v6/);
  assert.match(analytics, /cosmetic_preview/);
  assert.match(analytics, /cosmetic_equip/);
  assert.doesNotMatch(analytics, /shop_try_on|shop_equip/);
});

test('the catalog keeps a free cosmetic baseline and reserves journey rewards', async () => {
  const [migration, seed, drift] = await Promise.all([
    read('supabase/migrations/20260815150000_profile_expression_catalog_free.sql'),
    read('supabase/seed.sql'),
    read('scripts/check-catalog-drift.mjs')
  ]);
  assert.match(migration, /access_tier = 'free'/);
  assert.match(migration, /cost = 0/);
  assert.match(migration, /profile_motion_perspective_tilt/);
  assert.match(migration, /profile_layout_full_bleed/);
  assert.match(migration, /equipped_cosmetics - 'profile_border'/);
  assert.match(migration, /item\.catalog_status = 'active'/);
  assert.doesNotMatch(migration, /DELETE FROM public\.profiles/);
  assert.match(seed, /Customize is the active profile-expression surface/);
  assert.match(seed, /SET access_tier = 'free'/);
  assert.match(seed, /progression_milestones AS milestone/);
  assert.match(seed, /SET access_tier = 'earned'/);
  assert.match(seed, /name_prism_atelier/);
  assert.match(seed, /A centered glass profile card that leaves the user background in charge/);
  assert.match(drift, /applyProfileExpressionFreeUpdates/);
});

test('layout publishing keeps the template and variant markers paired', async () => {
  const [editor, draftModel, config, migration] = await Promise.all([
    read('src/lib/ProfileReferenceLayoutEditor.svelte'),
    read('src/lib/profile-studio/draftModel.js'),
    read('src/lib/profileConfig.js'),
    read('supabase/migrations/20260815151000_profile_layout_publish_pair.sql')
  ]);

  assert.match(editor, /createProfileLayoutPatch/);
  assert.match(editor, /emitPatch\(layoutPatch\)/);
  assert.match(draftModel, /templateKey: normalizedBase\.layoutVariant/);
  assert.match(config, /templateKey: normalizedLayoutVariant/);
  assert.match(migration, /'layoutVariant', v_layout/);
  assert.match(migration, /'templateKey', v_layout/);
});

test('the profile card has a neutral no-border edge while valid border effects remain delegated', async () => {
  const [card, renderer, border] = await Promise.all([
    read('src/lib/ProfileReferenceCard.svelte'),
    read('src/lib/profileRenderModel.js'),
    read('src/lib/profile-border/ProfileBorderEffect.svelte')
  ]);

  assert.match(card, /profile-border-effect--content/);
  assert.match(card, /color-mix\(in srgb, #ffffff/);
  assert.match(renderer, /isProfileBorderKey\(cosmetics\.profile_border\)/);
  assert.match(border, /profile-border-effect--none/);
  assert.match(border, /profile-border-effect--chroma/);
  assert.match(border, /profile-border-effect--glitch/);
  assert.match(border, /profile-border-effect--shimmer-track/);
  assert.match(border, /ProfileShimmerFrameEffect/);
});
