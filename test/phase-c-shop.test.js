import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const ROOT = new URL('../', import.meta.url);

async function readProjectFile(path) {
  return readFile(new URL(path, ROOT), 'utf8');
}

test('Shop Home has the Phase C editorial order without redundant continuation cards', async () => {
  const source = await readProjectFile('src/lib/ShopHome.svelte');
  const order = [
    'ShopCategoryNav',
    'shop-todays-edit',
    'shop-curated-title',
    'shop-home-links'
  ].map(marker => source.indexOf(marker));

  assert.ok(order.every(index => index >= 0));
  assert.deepEqual([...order].sort((a, b) => a - b), order);
  assert.match(source, /todayEditItem/);
  assert.match(source, /ShopItemPreview/);
  assert.match(source, /currentRoll/);
  assert.match(source, /profileConfig/);
  assert.match(source, /curatedItems = featuredItems\.slice\(1\)/);
  assert.doesNotMatch(source, /shop-home-look-card|Profile and roll pathways/);
  assert.doesNotMatch(source, /<strong>Studio<\/strong>|Fit a temporary look/);
});

test('shop reference hierarchy uses live account metadata and real catalog counts', async () => {
  const shop = await readProjectFile('src/lib/Shop.svelte');
  const home = await readProjectFile('src/lib/ShopHome.svelte');
  const browse = await readProjectFile('src/lib/ShopBrowse.svelte');
  const studioPreview = await readProjectFile('src/lib/ShopStudioPreview.svelte');

  assert.match(shop, /Shop <span>your identity\.<\/span>/);
  assert.match(shop, /ownedCatalogCount/);
  assert.match(shop, /fittingRoom\.balance\.toLocaleString\(\)\} EP/);
  assert.doesNotMatch(shop, /Admin/);
  assert.match(home, /Today’s color, <span>made wearable\.<\/span>/);
  assert.match(home, /Recommended <span>for today\.<\/span>/);
  assert.match(home, /count: filterShopItems/);
  assert.match(home, /slice\(0, 5\)/);
  assert.match(browse, /More identity\. <span>Same renderer\.<\/span>/);
  assert.match(browse, /nameSubtypeSections/);
  assert.match(browse, /variant="subtype"/);
  assert.match(studioPreview, /account\.username/);
  assert.match(studioPreview, /account\.display_name/);
  assert.match(studioPreview, /username=\{accountUsername\}/);
  assert.match(studioPreview, /displayName=\{accountDisplayName\}/);
});

test('Browse uses category navigation, a contained filter panel, a grid, and one contextual preview', async () => {
  const source = await readProjectFile('src/lib/ShopBrowse.svelte');
  assert.match(source, /<ShopCategoryNav/);
  assert.match(source, /aria-expanded=\{filtersOpen\}/);
  assert.match(source, /id="shop-filter-panel"/);
  assert.match(source, /SHOP_OWNERSHIP_FILTERS/);
  assert.match(source, /selectedCollection/);
  assert.match(source, /selectedRarity/);
  assert.match(source, /affordableOnly/);
  assert.match(source, /SHOP_SORTS/);
  assert.match(source, /<ShopContextualPreview/);
  assert.match(source, /on:preview/);
  assert.doesNotMatch(source, /shop-browse-filters/);
  assert.match(source, /grid-template-columns:repeat\(3/);
  assert.match(source, /@media \(max-width: 520px\)/);
});

test('product cards keep product decisions in detail and expose a readable hierarchy', async () => {
  const source = await readProjectFile('src/lib/ShopItemCard.svelte');
  assert.ok(source.indexOf('item-card-heading') < source.indexOf('item-preview-button'));
  assert.match(source, /item-detail-button/);
  assert.match(source, /item-price/);
  assert.match(source, /item-rarity/);
  assert.match(source, /item-collection/);
  assert.match(source, /item-card-footer/);
  assert.match(source, /dispatch\('preview'/);
  assert.match(source, /dispatch\('purchase'/);
  assert.match(source, /item-buy-button/);
  assert.match(source, /Confirm purchase/);
  assert.doesNotMatch(source, /primary-item-action|secondary-item-action/);
  assert.match(source, /font:650 1rem\/1 var\(--font-mono-stack\)/);
});

test('card purchases reuse the existing confirmation and RPC boundary', async () => {
  const shop = await readProjectFile('src/lib/Shop.svelte');
  const home = await readProjectFile('src/lib/ShopHome.svelte');
  const browse = await readProjectFile('src/lib/ShopBrowse.svelte');
  const collection = await readProjectFile('src/lib/ShopCollection.svelte');
  assert.match(home, /on:purchase=\{event => dispatch\('purchase', event\.detail\)\}/);
  assert.match(browse, /on:purchase=\{event => dispatch\('purchase', event\.detail\)\}/);
  assert.match(collection, /on:purchase=\{event => dispatch\('purchase', event\.detail\)\}/);
  assert.match(shop, /on:purchase=\{event => requestPurchase\(event\.detail\)\}/);
  assert.match(shop, /requiresPurchaseConfirmation\(item\)/);
  assert.match(shop, /supabase\.rpc\('purchase_item'/);
});

test('Product Detail is a drawer/sheet with existing purchase and focus boundaries', async () => {
  const source = await readProjectFile('src/lib/ShopProductDetail.svelte');
  const shop = await readProjectFile('src/lib/Shop.svelte');
  assert.match(source, /<dialog/);
  assert.match(source, /aria-modal="true"/);
  assert.match(source, /previouslyFocusedElement/);
  assert.match(source, /event\.key === 'Escape'/);
  assert.match(source, /width:min\(44rem,100%\)/);
  assert.match(source, /max-height:94dvh/);
  assert.match(source, /on:tryon/);
  assert.match(shop, /supabase\.rpc\('purchase_item'/);
  assert.match(shop, /fetchInventoryState/);
  assert.match(shop, /fetchWalletBalance/);
  assert.match(shop, /fetchProfileEntitlements/);
  assert.match(shop, /tryOnShopItem/);
  assert.doesNotMatch(shop, /supabase\.rpc\('equip_item'/);
});

test('Collection and Studio retain real account state and temporary fitting semantics', async () => {
  const collection = await readProjectFile('src/lib/ShopCollection.svelte');
  const studio = await readProjectFile('src/lib/ShopStudio.svelte');
  assert.match(collection, /inventoryCounts/);
  assert.match(collection, /Consumables/);
  assert.match(collection, /shop-collection-search/);
  assert.match(collection, /shop-collection-tabs/);
  assert.match(collection, /equippedItems/);
  assert.doesNotMatch(collection, /favorites|saved sets|mock/i);
  assert.match(studio, /draftLoadout/);
  assert.match(studio, /Reset preview/);
  assert.match(studio, /profile\/settings/);
  assert.doesNotMatch(studio, /supabase\.rpc\('equip_item'/);
});

test('contextual shop preview delegates to the shared Studio and Name renderer path', async () => {
  const contextual = await readProjectFile('src/lib/ShopContextualPreview.svelte');
  const studio = await readProjectFile('src/lib/ShopStudioPreview.svelte');
  const itemPreview = await readProjectFile('src/lib/ShopItemPreview.svelte');
  const identity = await readProjectFile('src/lib/IdentityCard.svelte');
  assert.match(contextual, /<ShopStudioPreview/);
  assert.match(contextual, /Temporary preview/);
  assert.match(studio, /nameRendererLoadout/);
  assert.match(identity, /<NameEffectCanvas/);
  assert.match(itemPreview, /<NameEffectCanvas/);
  assert.match(itemPreview, /context="card"/);
});

test('shop layout includes explicit responsive targets and no masonry implementation', async () => {
  const sources = await Promise.all([
    readProjectFile('src/lib/ShopHome.svelte'),
    readProjectFile('src/lib/ShopBrowse.svelte'),
    readProjectFile('src/lib/ShopCollection.svelte'),
    readProjectFile('src/lib/ShopStudio.svelte'),
    readProjectFile('src/lib/ShopProductDetail.svelte')
  ]);
  const source = sources.join('\n');
  assert.match(source, /max-width: 1180px/);
  assert.match(source, /max-width: 960px/);
  assert.match(source, /max-width: 760px/);
  assert.match(source, /max-width: 520px/);
  assert.match(source, /max-width: 390px/);
  assert.doesNotMatch(source, /masonry|column-count|column-width/i);
});
