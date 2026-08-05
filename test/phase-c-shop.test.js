import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';

const ROOT = new URL('../', import.meta.url);

async function readProjectFile(path) {
  return readFile(new URL(path, ROOT), 'utf8');
}

async function projectFileExists(path) {
  try {
    await access(new URL(path, ROOT));
    return true;
  } catch (error) {
    if (error?.code === 'ENOENT') return false;
    throw error;
  }
}

test('retired Shop sources are absent from the production tree', async () => {
  const retired = [
    'src/lib/ShopHome.svelte',
    'src/lib/ShopProductDetail.svelte',
    'src/lib/ShopStudio.svelte',
    'src/lib/ShopFeaturedStrip.svelte',
    'src/lib/ShopCategoryNav.svelte',
    'src/lib/ShopSelectionPanel.svelte'
  ];
  for (const path of retired) assert.equal(await projectFileExists(path), false, path);
});

test('shop shell is one profile studio with Catalog and Owned surfaces', async () => {
  const shop = await readProjectFile('src/lib/Shop.svelte');
  const rail = await readProjectFile('src/lib/ShopRail.svelte');
  const app = await readProjectFile('src/App.svelte');

  assert.match(shop, /Cosmetic shop/);
  assert.match(shop, /Profile <span>cosmetics\.<\/span>/);
  assert.match(shop, /<ShopRail/);
  assert.match(shop, /<ShopContextualPreview/);
  assert.match(shop, /walletBalance=\{fittingRoom\.balance\}/);
  assert.match(shop, /getProfileMediaUrl/);
  assert.match(shop, /avatarSrc=\{previewAvatarSrc\}/);
  assert.match(shop, /font:600 \.8rem var\(--shop-font\)/);
  assert.match(rail, /\{ id: 'browse', number: '01', label: 'Catalog'/);
  assert.match(rail, /\{ id: 'collection', number: '02', label: 'Owned'/);
  assert.match(shop, /\{ id: 'featured', label: 'Featured'/);
  assert.match(shop, /activeRarity=\{browseRarity\}/);
  assert.match(rail, /Filter cosmetics/);
  assert.match(rail, /shop-rail__rarity-swatch/);
  assert.doesNotMatch(rail, /<small>/);
  assert.doesNotMatch(shop, /ShopHome|ShopStudio/);
  assert.doesNotMatch(shop, /activeView === 'home'/);
  assert.match(shop, /previewDataLoading/);
  assert.match(shop, /shop-daily-color/);
  assert.match(app, /view !== 'shop'/);
});

test('catalog removes redundant context, bounds results, and keeps one profile preview', async () => {
  const source = await readProjectFile('src/lib/ShopBrowse.svelte');
  const rail = await readProjectFile('src/lib/ShopRail.svelte');

  assert.doesNotMatch(source, /shop-browse-context|Find your next piece|Today’s color/);
  assert.doesNotMatch(source, /previewDataLoading|previewDataError/);
  assert.doesNotMatch(source, /<ShopCategoryNav/);
  assert.doesNotMatch(source, /<ShopContextualPreview/);
  assert.match(source, /id="shop-filter-panel"/);
  assert.match(source, /SHOP_OWNERSHIP_FILTERS/);
  assert.match(source, /INITIAL_VISIBLE_ITEMS = 18/);
  assert.match(source, /displayedItems = showAllItems/);
  assert.match(source, /Load more cosmetics/);
  assert.doesNotMatch(source, /Choose a <span>piece\.|shop-browse-heading-side/);
  assert.doesNotMatch(source, /shop-result-count/);
  assert.match(source, /grid-template-columns:repeat\(3/);
  assert.match(source, /shop-quick-filters/);
  assert.match(source, /selectedSubslot/);
  assert.match(source, /font:600 \.84rem var\(--shop-font\)/);
  assert.match(rail, /Name layers/);
  assert.match(rail, /Name effect layers/);
  assert.match(rail, /Filter by layer|Choose a layer/);
  assert.doesNotMatch(source, /Build your name\.|Choose a font, material, or motion layer and see it on your profile\./);
  assert.match(source, /@media \(max-width: 520px\)/);
});

test('product cards use compact visual previews with explicit selection actions', async () => {
  const source = await readProjectFile('src/lib/ShopItemCard.svelte');

  assert.match(source, /class="item-select-button"/);
  assert.match(source, /aria-pressed=\{isPreviewing\}/);
  assert.match(source, /class="item-preview-action"/);
  assert.match(source, /Previewing/);
  assert.doesNotMatch(source, /item-preview-button|item-product-button/);
  assert.doesNotMatch(source, /item-detail-link|>Details<|>Manage<|Need more EP/);
  assert.match(source, /aspect-ratio:1\.82 \/ 1/);
  assert.match(source, /:global\(\.app-main--site\) \.shop-item \{ padding:0; border:1px/);
  assert.match(source, /@media \(max-width: 420px\)/);
  assert.match(source, /avatarSrc/);
  assert.doesNotMatch(source, /border specimen/);
});

test('inspector purchases reuse the existing confirmation and RPC boundary', async () => {
  const shop = await readProjectFile('src/lib/Shop.svelte');
  const browse = await readProjectFile('src/lib/ShopBrowse.svelte');
  const collection = await readProjectFile('src/lib/ShopCollection.svelte');

  const contextual = await readProjectFile('src/lib/ShopContextualPreview.svelte');

  assert.doesNotMatch(browse, /on:purchase/);
  assert.doesNotMatch(collection, /on:purchase/);
  assert.match(contextual, /dispatch\('purchase', selectedItem\)/);
  assert.match(shop, /on:purchase=\{event => requestPurchase\(event\.detail\)\}/);
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
  assert.match(shop, /tryOnShopItem\(\$equippedItems, selectedItem\)/);
  assert.match(shop, /getNameItemPreviewLoadout\(selectedItem/);
  assert.match(shop, /<ShopContextualPreview/);
  assert.match(shop, /walletBalance=\{fittingRoom\.balance\}/);
  assert.doesNotMatch(shop, /class="shop-wallet"/);
  assert.match(contextual, /<ShopStudioPreview/);
  assert.match(contextual, /Live profile/);
  assert.match(contextual, /previewKey/);
  assert.match(contextual, /\{#key previewKey\}/);
  assert.match(contextual, /Temporary preview/);
  assert.match(contextual, /EP balance/);
  assert.match(contextual, /shop-contextual-preview__selection/);
  assert.match(contextual, /shop-selection-buy/);
  assert.match(contextual, /Buy for/);
  assert.match(contextual, /previewLinks/);
  assert.doesNotMatch(contextual, /Page sections/);
  assert.match(contextual, />Clear<\/button>/);
  assert.doesNotMatch(contextual, /Try it on|Applied to the preview|shop-preview-selection/);
  assert.doesNotMatch(contextual, /ShopItemPreview|shop-preview-mode/);
});

test('collection keeps ownership categories concise and the empty state actionable', async () => {
  const collection = await readProjectFile('src/lib/ShopCollection.svelte');
  const rail = await readProjectFile('src/lib/ShopRail.svelte');
  const shop = await readProjectFile('src/lib/Shop.svelte');

  assert.match(collection, /Your cosmetics\./);
  assert.match(shop, /label: 'All cosmetics'/);
  assert.match(rail, /Owned categories/);
  assert.match(collection, /section = 'all'/);
  assert.match(collection, /Search your cosmetics/);
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
  assert.match(contextual, /nameRendererMode="animated"/);
  assert.doesNotMatch(contextual, /Replay|Pause|aria-pressed=\{paused\}|replayKey|replayPreview|let paused/);
  assert.doesNotMatch(contextual, /Try it on|Applied to the preview/);
  assert.match(itemPreview, /COLLECTION_TONES/);
  assert.match(itemPreview, /PREVIEW_SURFACE = '#090C11'/);
  assert.doesNotMatch(itemPreview, /SLOT_TONES/);
  assert.match(itemPreview, /previewClasses = `shop-preview-area shop-preview-area--\$\{previewType\}`/);
  assert.match(itemPreview, /mode="preview" active=\{active \|\| hovered\} animated=\{active \|\| hovered\}/);
  assert.match(itemPreview, /avatarSrc/);
  assert.doesNotMatch(itemPreview, /mara-dog-v1/);
  assert.match(itemPreview, /shop-avatar-preview__fallback/);
  assert.match(itemPreview, /shop-cursor-preview__pointer/);
  assert.match(itemPreview, /shop-cursor-preview__trail--near/);
  assert.match(itemPreview, /filter:none !important/);
  assert.doesNotMatch(itemPreview, /profile atmosphere/);
  assert.match(itemPreview, /background: var\(--preview-surface/);
  assert.doesNotMatch(itemPreview, /\.shop-preview-area \{[^}]*border: 1px/);
  assert.doesNotMatch(itemPreview, /\.shop-preview-area::after/);
  assert.doesNotMatch(itemPreview, /preview-profile-card|shop-atmosphere-preview__card/);
  assert.match(studio, /nameRendererLoadout/);
  assert.match(studio, /export let links = \[\]/);
  assert.match(studio, /\{links\}/);
  assert.match(studio, /profile-border-effect__content/);
  assert.doesNotMatch(studio, /studio-layout-badge|getProfileLayoutLabel/);
  assert.match(identity, /<NameEffectCanvas/);
  assert.match(itemPreview, /<NameEffectCanvas/);
});

test('shop layout includes desktop, tablet, mobile, and reduced-motion targets', async () => {
  const sources = await Promise.all([
    readProjectFile('src/lib/Shop.svelte'),
    readProjectFile('src/lib/ShopBrowse.svelte'),
    readProjectFile('src/lib/ShopCollection.svelte'),
    readProjectFile('src/lib/ShopItemCard.svelte'),
    readProjectFile('src/lib/ShopRail.svelte')
  ]);
  const source = sources.join('\n');

  assert.match(source, /max-width: 1200px/);
  assert.match(source, /max-width: 760px/);
  assert.match(source, /max-width: 520px/);
  assert.match(source, /prefers-reduced-motion/);
  assert.doesNotMatch(source, /masonry|column-count|column-width/i);
});
