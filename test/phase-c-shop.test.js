import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const ROOT = new URL('../', import.meta.url);

async function readProjectFile(path) {
  return readFile(new URL(path, ROOT), 'utf8');
}

test('shop shell is one profile studio with Catalog and Collection surfaces', async () => {
  const shop = await readProjectFile('src/lib/Shop.svelte');
  const app = await readProjectFile('src/App.svelte');

  assert.match(shop, /Profile studio/);
  assert.match(shop, /Shape <span>your identity\.<\/span>/);
  assert.match(shop, /\{ id: 'browse', label: 'Catalog' \}/);
  assert.match(shop, /\{ id: 'collection', label: 'Collection' \}/);
  assert.doesNotMatch(shop, /ShopHome|ShopStudio/);
  assert.doesNotMatch(shop, /activeView === 'home'/);
  assert.match(shop, /previewDataLoading/);
  assert.match(app, /view !== 'shop'/);
});

test('catalog uses one category rail, compact context, bounded results, and one profile preview', async () => {
  const source = await readProjectFile('src/lib/ShopBrowse.svelte');

  assert.match(source, /const CATALOG_SECTIONS/);
  assert.match(source, /label: 'All'/);
  assert.match(source, /Today’s color/);
  assert.match(source, /previewDataLoading/);
  assert.match(source, /<ShopCategoryNav/);
  assert.match(source, /id="shop-filter-panel"/);
  assert.match(source, /SHOP_OWNERSHIP_FILTERS/);
  assert.match(source, /INITIAL_VISIBLE_ITEMS = 18/);
  assert.match(source, /displayedItems = showAllItems/);
  assert.match(source, /Load more pieces/);
  assert.match(source, /<ShopContextualPreview/);
  assert.match(source, /selectedItem=\{selectedItem\}/);
  assert.doesNotMatch(source, /Choose a <span>piece\.|shop-browse-heading-side/);
  assert.doesNotMatch(source, /shop-result-count/);
  assert.match(source, /grid-template-columns:repeat\(3/);
  assert.match(source, /Name layers/);
  assert.match(source, /Choose what to change\./);
  assert.match(source, /Name effect layers/);
  assert.match(source, /Typeface and structure/);
  assert.match(source, /Surface and finish/);
  assert.match(source, /Movement and reveal/);
  assert.match(source, /@media \(max-width: 960px\)/);
  assert.match(source, /@media \(max-width: 520px\)/);
});

test('product cards use one selection surface and readable purchase states', async () => {
  const source = await readProjectFile('src/lib/ShopItemCard.svelte');

  assert.match(source, /class="item-select-button"/);
  assert.match(source, /aria-pressed=\{isPreviewing\}/);
  assert.match(source, /walletBalance/);
  assert.match(source, /Earn .* more EP/);
  assert.match(source, /item-buy-price/);
  assert.match(source, /item-buy-button--locked/);
  assert.match(source, /stateLabel/);
  assert.doesNotMatch(source, /item-preview-button|item-product-button/);
  assert.doesNotMatch(source, /item-detail-link|>Details<|>Manage<|Need more EP/);
  assert.match(source, /height:138px/);
  assert.match(source, /@media \(max-width: 420px\)/);
});

test('card purchases reuse the existing confirmation and RPC boundary', async () => {
  const shop = await readProjectFile('src/lib/Shop.svelte');
  const browse = await readProjectFile('src/lib/ShopBrowse.svelte');
  const collection = await readProjectFile('src/lib/ShopCollection.svelte');

  assert.match(browse, /on:purchase=\{event => dispatch\('purchase', event\.detail\)\}/);
  assert.match(collection, /on:purchase=\{event => dispatch\('purchase', event\.detail\)\}/);
  assert.match(shop, /requiresPurchaseConfirmation\(item\)/);
  assert.match(shop, /supabase\.rpc\('purchase_item'/);
  assert.match(shop, /fetchInventoryState/);
  assert.match(shop, /fetchWalletBalance/);
  assert.match(shop, /fetchProfileEntitlements/);
  assert.doesNotMatch(shop, /supabase\.rpc\('equip_item'/);
});

test('selection stays in the persistent profile preview without a replacement detail view', async () => {
  const shop = await readProjectFile('src/lib/Shop.svelte');
  const browse = await readProjectFile('src/lib/ShopBrowse.svelte');
  const contextual = await readProjectFile('src/lib/ShopContextualPreview.svelte');

  assert.match(shop, /selectedItem=\{selectedItem\}/);
  assert.match(shop, /is previewing on your profile/);
  assert.match(browse, /tryOnShopItem\(equippedItems, selectedItem\)/);
  assert.match(browse, /getNameItemPreviewLoadout\(selectedItem/);
  assert.match(contextual, /<ShopStudioPreview/);
  assert.match(contextual, /Live profile/);
  assert.match(contextual, /Previewing \$\{selectedItem\.name\}/);
  assert.match(contextual, />Clear<\/button>/);
  assert.doesNotMatch(contextual, /Try it on|Applied to the preview|shop-preview-selection/);
  assert.doesNotMatch(contextual, /ShopItemPreview|shop-preview-mode/);
});

test('collection keeps ownership categories concise and the empty state actionable', async () => {
  const collection = await readProjectFile('src/lib/ShopCollection.svelte');

  assert.match(collection, /Pieces you own\./);
  assert.match(collection, /All pieces/);
  assert.match(collection, /Search your pieces/);
  assert.match(collection, /Browse catalog/);
  assert.match(collection, /inventoryCounts/);
  assert.match(collection, /equippedItems/);
  assert.doesNotMatch(collection, /Customize your profile ↗/);
  assert.doesNotMatch(collection, /name_font.*Fonts|name_material.*Materials|name_motion.*Motion/);
});

test('contextual preview delegates to the shared production profile renderer', async () => {
  const contextual = await readProjectFile('src/lib/ShopContextualPreview.svelte');
  const studio = await readProjectFile('src/lib/ShopStudioPreview.svelte');
  const itemPreview = await readProjectFile('src/lib/ShopItemPreview.svelte');
  const identity = await readProjectFile('src/lib/IdentityCard.svelte');

  assert.match(contextual, /<ShopStudioPreview/);
  assert.match(contextual, /Live profile/);
  assert.match(contextual, /aria-pressed=\{paused\}/);
  assert.doesNotMatch(contextual, /Try it on|Applied to the preview/);
  assert.match(studio, /nameRendererLoadout/);
  assert.match(studio, /links=\{\[\]\}/);
  assert.match(studio, /profile-border-effect__content/);
  assert.match(identity, /<NameEffectCanvas/);
  assert.match(itemPreview, /<NameEffectCanvas/);
});

test('shop layout includes desktop, tablet, mobile, and reduced-motion targets', async () => {
  const sources = await Promise.all([
    readProjectFile('src/lib/Shop.svelte'),
    readProjectFile('src/lib/ShopBrowse.svelte'),
    readProjectFile('src/lib/ShopCollection.svelte'),
    readProjectFile('src/lib/ShopItemCard.svelte')
  ]);
  const source = sources.join('\n');

  assert.match(source, /max-width: 1180px/);
  assert.match(source, /max-width: 960px/);
  assert.match(source, /max-width: 760px/);
  assert.match(source, /max-width: 520px/);
  assert.match(source, /prefers-reduced-motion/);
  assert.doesNotMatch(source, /masonry|column-count|column-width/i);
});
