<script>
  import { onMount } from 'svelte';
  import ShopBrowse from './ShopBrowse.svelte';
  import ShopCollection from './ShopCollection.svelte';
  import ShopRail from './ShopRail.svelte';
  import ShopContextualPreview from './ShopContextualPreview.svelte';
  import {
    shopItems,
    shopItemsLoading,
    shopItemsError,
    loadShopItems,
    userInventory,
    equippedItems,
    walletBalance,
    profile,
    profileEntitlements,
    rerollShards,
    session,
    addToast,
    fetchInventoryState,
    fetchWalletBalance,
    fetchProfileEntitlements
  } from './stores';
  import { supabase } from './supabase';
  import { readViewState, writeViewState } from './viewState.js';
  import { getNameItemPreviewLoadout } from './name/nameLoadout.js';
  import {
    SHOP_SECTIONS,
    SHOP_NAME_SUBTYPES,
    createFittingRoom,
    filterShopItems,
    getCatalogStatus,
    getShopAccessTier,
    getShopItemState,
    hasShopEntitlement,
    isShopCosmetic,
    requiresPurchaseConfirmation,
    tryOnShopItem
  } from './shopCatalog.js';
  import { normalizeHexColor } from './utils.js';

  const SHOP_ACCENT = '#C7B4FF';
  const VIEW_STATE_NAMESPACE = 'shop';

  let activeView = 'browse';
  let browseSection = 'overview';
  let activeNameLayer = 'all';
  let ownedSection = 'all';
  let selectedItem = null;
  let currentRoll = null;
  let profileConfig = null;
  let loadingAction = null;
  let purchaseArmedKey = null;
  let shopNotice = 'Catalog ready. Choose a piece to preview it on your profile.';
  let previewDataLoading = true;
  let previewDataError = null;
  let viewStateReady = false;
  let restoredShopScope = null;

  $: currentShopScope = $session?.user?.id || 'guest';
  $: isSignedIn = Boolean($session?.user?.id);
  $: fittingRoom = createFittingRoom({
    walletBalance: $walletBalance,
    userInventory: $userInventory,
    equippedItems: $equippedItems,
    rerollShards: $rerollShards,
    entitlements: $profileEntitlements
  });
  // Reserved founder titles remain outside the public catalog, matching the existing cosmetic boundary.
  $: catalogItems = Object.values($shopItems).filter(item => item.item_key !== 'title_founder' && item.slot !== 'title' && getCatalogStatus(item) !== 'retired');
  // The catalog has its own quiet brand accent. Today’s color is shown as
  // compact context and in the real profile preview, not on every product.
  const shopAccent = SHOP_ACCENT;
  const CATALOG_NAV = Object.freeze([
    { id: 'overview', label: 'All', description: 'Every shop piece' },
    { id: 'names', label: 'Names', description: 'Name expression' },
    { id: 'borders', label: 'Borders', description: 'Profile edges' },
    { id: 'avatar', label: 'Avatar', description: 'Portrait effects' },
    { id: 'atmosphere', label: 'Atmosphere', description: 'Authored profile scenes' },
    { id: 'cursor', label: 'Cursor', description: 'Pointer trails' },
    { id: 'layouts', label: 'Layouts', description: 'Profile compositions' },
    { id: 'utility', label: 'Utility', description: 'Consumables' }
  ]);
  const NAME_LAYER_NAV = Object.freeze([
    { id: 'all', label: 'All layers', description: 'Every name effect' },
    { id: 'name_font', label: 'Font', description: 'Typeface and structure' },
    { id: 'name_material', label: 'Material', description: 'Surface and finish' },
    { id: 'name_motion', label: 'Motion', description: 'Movement and reveal' }
  ]);
  const OWNED_NAV = Object.freeze([
    { id: 'all', label: 'All pieces', description: 'Everything you own' },
    { id: 'names', label: 'Names', description: 'Name expression' },
    { id: 'profile_border', label: 'Borders', description: 'Profile edges' },
    { id: 'avatar', label: 'Avatar', description: 'Portrait effects' },
    { id: 'atmosphere', label: 'Atmosphere', description: 'Authored profile scenes' },
    { id: 'cursor', label: 'Cursor', description: 'Pointer trails' },
    { id: 'layouts', label: 'Layouts', description: 'Profile compositions' },
    { id: 'utility', label: 'Utility', description: 'Consumables' }
  ]);
  $: ownedCatalogCount = catalogItems.filter(item => {
    if (item.slot === 'consumable') return false;
    const owned = (fittingRoom.inventoryCounts?.[item.item_key] || 0) > 0;
    const equipped = $equippedItems?.[item.slot] === item.item_key;
    return owned || equipped || hasShopEntitlement(item, fittingRoom);
  }).length;
  $: catalogSections = CATALOG_NAV.map(section => ({
    ...section,
    count: filterShopItems(catalogItems, { section: section.id }, fittingRoom).length
  }));
  $: nameLayers = NAME_LAYER_NAV.map(layer => ({
    ...layer,
    count: layer.id === 'all'
      ? catalogItems.filter(item => SHOP_NAME_SUBTYPES.some(subtype => subtype.id === item.slot)).length
      : catalogItems.filter(item => item.slot === layer.id).length
  }));
  $: previewUsername = $profile?.display_name || $profile?.username || 'You';
  $: previewColor = normalizeHexColor(currentRoll?.hex_code || $profile?.mood_color, '#8B7CF6');
  $: previewLoadout = selectedItem?.slot
    ? ['name_font', 'name_material', 'name_motion'].includes(selectedItem.slot)
      ? getNameItemPreviewLoadout(selectedItem, $equippedItems)
      : tryOnShopItem($equippedItems, selectedItem)
    : { ...($equippedItems || {}) };
  $: selectedState = selectedItem ? getShopItemState(selectedItem, $equippedItems, fittingRoom) : null;
  $: selectedAccessTier = selectedItem ? getShopAccessTier(selectedItem) : 'earned';
  $: dailyColor = normalizeHexColor(currentRoll?.hex_code, '');

  onMount(() => {
    restoreShopViewState();
    void loadPreviewData();
  });

  $: if (viewStateReady && currentShopScope !== restoredShopScope) restoreShopViewState();
  $: if (viewStateReady && currentShopScope === restoredShopScope) {
    writeViewState(VIEW_STATE_NAMESPACE, currentShopScope, { activeView, browseSection });
  }

  function restoreShopViewState() {
    const scope = currentShopScope;
    const savedState = readViewState(VIEW_STATE_NAMESPACE, scope, {});
    const validSections = new Set(SHOP_SECTIONS.filter(section => section.id !== 'owned').map(section => section.id));
    // Older sessions may have saved Home, Browse, or Studio. Keep those
    // states compatible, but bring them into the unified Catalog surface.
    activeView = savedState?.activeView === 'collection' ? 'collection' : 'browse';
    browseSection = validSections.has(savedState?.browseSection) ? savedState.browseSection : 'overview';
    restoredShopScope = scope;
    viewStateReady = true;
  }

  async function loadPreviewData() {
    previewDataLoading = true;
    previewDataError = null;
    try {
      const [rollResponse, configResponse] = await Promise.all([
        supabase.rpc('get_my_daily_roll'),
        supabase.rpc('get_my_profile_configuration')
      ]);
      if (rollResponse.error) previewDataError = rollResponse.error.message || 'Today’s color is unavailable.';
      else if (rollResponse.data) currentRoll = rollResponse.data;
      if (configResponse.error && !previewDataError) previewDataError = configResponse.error.message || 'Profile preview is unavailable.';
      else if (configResponse.data?.success !== false) profileConfig = configResponse.data;
    } catch (error) {
      previewDataError = error instanceof Error ? error.message : 'Preview data is unavailable.';
    } finally {
      previewDataLoading = false;
    }
  }

  function setView(view) {
    activeView = view === 'collection' ? 'collection' : 'browse';
    selectedItem = null;
    purchaseArmedKey = null;
    shopNotice = activeView === 'collection' ? 'Owned opened.' : 'Catalog opened.';
  }

  function setBrowseSection(section) {
    browseSection = CATALOG_NAV.some(item => item.id === section) ? section : 'overview';
    activeNameLayer = 'all';
    selectedItem = null;
    purchaseArmedKey = null;
    shopNotice = `${CATALOG_NAV.find(item => item.id === browseSection)?.label || 'Catalog'} opened.`;
  }

  function setNameLayer(layer) {
    activeNameLayer = NAME_LAYER_NAV.some(item => item.id === layer) ? layer : 'all';
    selectedItem = null;
    purchaseArmedKey = null;
  }

  function selectItem(item, sourceView = activeView) {
    if (!item) return;
    selectedItem = item;
    purchaseArmedKey = null;
    activeView = sourceView === 'collection' ? 'collection' : 'browse';
    browseSection = item.slot === 'profile_border'
      ? 'borders'
      : ['name_font', 'name_material', 'name_motion'].includes(item.slot)
        ? 'names'
        : item.slot === 'avatar_effect'
          ? 'avatar'
          : item.slot === 'profile_atmosphere'
            ? 'atmosphere'
          : item.slot === 'cursor_trail'
            ? 'cursor'
            : item.slot === 'profile_layout'
              ? 'layouts'
        : item.slot === 'consumable'
          ? 'utility'
          : 'overview';
    activeNameLayer = ['name_font', 'name_material', 'name_motion'].includes(item.slot) ? item.slot : 'all';
    shopNotice = `${item.name} is previewing on your profile. Nothing is saved.`;
  }

  async function refreshLiveAccountState() {
    const userId = $session?.user?.id;
    if (!userId) throw new Error('Your signed-in session is no longer available.');
    await Promise.all([
      fetchInventoryState(userId),
      fetchWalletBalance(userId),
      fetchProfileEntitlements(userId)
    ]);
  }

  async function runPurchase(item) {
    if (!isSignedIn || loadingAction) return;
    loadingAction = `buy:${item.item_key}`;
    purchaseArmedKey = null;
    try {
      const { data, error } = await supabase.rpc('purchase_item', { p_item_key: item.item_key });
      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || 'The purchase could not be completed.');
      await refreshLiveAccountState();
      shopNotice = isShopCosmetic(item)
        ? `${item.name} purchased. Open profile settings when you are ready to equip it.`
        : `${item.name} purchased. Inventory refreshed.`;
      addToast(`${item.name} purchased.`, 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'The shop request failed.';
      shopNotice = message;
      addToast(`Shop error: ${message}`, 'error');
    } finally {
      loadingAction = null;
    }
  }

  function requestPurchase(item) {
    if (!isSignedIn) {
      shopNotice = 'Sign in to purchase cosmetics with EP.';
      addToast('Sign in to purchase cosmetics.', 'error');
      return;
    }
    if (requiresPurchaseConfirmation(item) && purchaseArmedKey !== item.item_key) {
      purchaseArmedKey = item.item_key;
      shopNotice = `Review the ${item.cost.toLocaleString()} EP purchase, then confirm once more.`;
      return;
    }
    void runPurchase(item);
  }
</script>

<main class="shop-page" style={`--shop-accent:${shopAccent};`} aria-labelledby="shop-title">
  <header class="shop-header">
    <div class="shop-heading">
      <span class="shop-eyebrow">Profile studio</span>
      <h1 id="shop-title">Shape <span>your identity.</span></h1>
      <p class="shop-header-intro">Preview a piece on your profile before you commit.</p>
    </div>
    <div class="shop-header-actions">
      <div class="shop-daily-color" aria-live="polite" aria-label="Today’s color">
        <span>Today’s color</span>
        {#if dailyColor}
          <strong><i style={`--shop-daily-color:${dailyColor}`}></i>{dailyColor}</strong>
          <small>{currentRoll?.rarity || 'Daily roll'}</small>
        {:else if previewDataLoading}
          <strong class="shop-daily-color__status">Loading</strong>
        {:else if previewDataError}
          <strong class="shop-daily-color__status">Unavailable</strong>
        {:else}
          <strong class="shop-daily-color__status">Not rolled</strong>
        {/if}
      </div>
      <div class="shop-owned" aria-label={`${ownedCatalogCount} owned catalog items`}><span>Owned</span><strong>{ownedCatalogCount}</strong></div>
      <a class="shop-profile-link" href="/profile/settings" aria-label="Open profile settings">Profile settings <span aria-hidden="true">↗</span></a>
    </div>
  </header>

  <div class="shop-workspace">
    <ShopRail
      {activeView}
      activeSection={browseSection}
      {activeNameLayer}
      {ownedSection}
      catalogSections={catalogSections}
      nameLayers={nameLayers}
      ownedSections={[...OWNED_NAV]}
      on:view={event => setView(event.detail)}
      on:section={event => setBrowseSection(event.detail)}
      on:nameLayer={event => setNameLayer(event.detail)}
      on:ownedSection={event => ownedSection = event.detail}
    />

    <section class="shop-workspace-main" aria-label={activeView === 'browse' ? 'Shop catalog' : 'Owned shop pieces'}>
      {#if $shopItemsLoading}
        <div class="shop-status" role="status" aria-live="polite"><span>Loading catalog</span><strong>Preparing your live collection…</strong></div>
      {:else if $shopItemsError}
        <div class="shop-status shop-status--error" role="alert"><span>Catalog unavailable</span><strong>{$shopItemsError}</strong><button type="button" on:click={() => loadShopItems()}>Try again</button></div>
      {:else if activeView === 'browse'}
        <ShopBrowse
          items={catalogItems}
          section={browseSection}
          selectedItem={selectedItem}
          selectedSubslot={activeNameLayer}
          username={previewUsername}
          displayColor={previewColor}
          {fittingRoom}
          equippedItems={$equippedItems}
          on:select={event => selectItem(event.detail, 'browse')}
          on:reset={() => { selectedItem = null; shopNotice = 'Preview reset to your equipped look.'; }}
        />
      {:else}
        <ShopCollection
          items={catalogItems}
          section={ownedSection}
          {fittingRoom}
          equippedItems={$equippedItems}
          profile={$profile}
          {currentRoll}
          on:browse={() => { setView('browse'); setBrowseSection('overview'); }}
          on:select={event => selectItem(event.detail, 'collection')}
        />
      {/if}
    </section>

    <ShopContextualPreview
      loadout={previewLoadout}
      selectedItem={selectedItem}
      username={previewUsername}
      displayColor={previewColor}
      accountProfile={$profile}
      walletBalance={fittingRoom.balance}
      state={selectedState}
      accessTier={selectedAccessTier}
      {isSignedIn}
      purchaseArmed={purchaseArmedKey === selectedItem?.item_key}
      purchaseLoading={loadingAction === `buy:${selectedItem?.item_key}`}
      {profileConfig}
      on:reset={() => { selectedItem = null; shopNotice = 'Preview reset to your equipped look.'; }}
      on:purchase={event => requestPurchase(event.detail)}
    />
  </div>

  <div class="shop-live-region visually-hidden" role="status" aria-live="polite">{shopNotice}</div>
</main>

<style>
  .shop-page { --shop-canvas:#0d0f13; --shop-deep:#090a0d; --shop-raised:#111319; --shop-line:rgba(255,255,255,.075); --shop-line-strong:rgba(255,255,255,.15); --shop-ink:#f2f0eb; --shop-muted:#aaa8b0; --shop-faint:#858690; --shop-accent:#CDD2FF; --shop-font:var(--font-body-stack); --shop-display:var(--font-display-stack); --shop-mono:var(--font-mono-stack); width:min(100rem,calc(100% - 3rem)); margin:0 auto 5.5rem; color:var(--shop-ink); font-family:var(--shop-font); }
  :global(.app-main--site) .shop-page { width:min(100rem,calc(100% - 3rem)); margin-top:clamp(.8rem,2.5vh,1.8rem); padding:0 0 4rem; }
  .shop-header { position:relative; isolation:isolate; display:flex; align-items:flex-end; justify-content:space-between; gap:1.15rem; padding:0 0 1rem; border-bottom:1px solid var(--shop-line); }
  .shop-header::before { position:absolute; z-index:-1; top:-4rem; left:-4rem; width:min(42rem,70%); height:13rem; border-radius:50%; background:radial-gradient(ellipse at 42% 50%,color-mix(in srgb,var(--shop-accent) 13%,transparent),transparent 70%); content:''; pointer-events:none; }
  .shop-heading h1 { max-width:52rem; margin:.55rem 0 .05rem; font:650 clamp(2.65rem,4.2vw,4.25rem)/.92 var(--shop-display); letter-spacing:-.055em; }
  :global(.app-main--site) .shop-heading h1 { max-width:52rem; margin:.55rem 0 .05rem; font:650 clamp(2.65rem,4.2vw,4.25rem)/.92 var(--shop-display); letter-spacing:-.055em; }
  .shop-heading h1 span { background:linear-gradient(105deg,#d9d1ff 0%,#b9a8ff 46%,#7f93ff 100%); -webkit-background-clip:text; background-clip:text; color:transparent; text-shadow:0 0 1.5rem color-mix(in srgb,var(--shop-accent) 16%,transparent); }
  .shop-header-intro { margin:.5rem 0 0; color:var(--shop-muted); font-size:.98rem; line-height:1.45; }
  .shop-eyebrow { color:var(--shop-faint); font:600 .76rem/1.3 var(--shop-mono); letter-spacing:.13em; text-transform:uppercase; }
  .shop-header-actions { display:flex; align-items:stretch; justify-content:flex-end; flex-wrap:wrap; gap:.55rem; max-width:100%; flex:0 0 auto; }
  .shop-owned { padding:.7rem .85rem; border:1px solid var(--shop-line-strong); border-radius:var(--radius-sm); background:var(--shop-raised); }
  .shop-owned span { display:block; color:var(--shop-faint); font:.7rem var(--shop-mono); letter-spacing:.1em; text-transform:uppercase; }
  .shop-owned strong { display:block; margin-top:.3rem; color:var(--shop-ink); font:650 1rem var(--shop-mono); white-space:nowrap; }
  .shop-owned { min-width:5.25rem; }
  .shop-daily-color { display:grid; align-content:center; min-width:9rem; padding:.6rem .7rem; border:1px solid var(--shop-line-strong); border-radius:var(--radius-sm); background:var(--shop-raised); }
  .shop-daily-color > span { color:var(--shop-faint); font:.7rem var(--shop-mono); letter-spacing:.1em; text-transform:uppercase; }
  .shop-daily-color strong { display:flex; align-items:center; gap:.45rem; margin-top:.3rem; color:var(--shop-ink); font:650 .88rem var(--shop-mono); white-space:nowrap; }
  .shop-daily-color strong i { display:block; flex:0 0 1rem; width:1rem; height:1rem; border:1px solid rgba(255,255,255,.24); border-radius:3px; background:var(--shop-daily-color,#292d37); box-shadow:0 0 .8rem color-mix(in srgb,var(--shop-daily-color,#292d37) 24%,transparent); }
  .shop-daily-color small { margin-top:.18rem; color:var(--shop-muted); font-size:.74rem; }
  .shop-daily-color__status { color:var(--shop-muted)!important; }
  .shop-profile-link { min-height:2.9rem; display:inline-flex; align-items:center; gap:.45rem; padding:0 .75rem; border:1px solid var(--shop-line-strong); border-radius:var(--radius-sm); background:var(--shop-raised); color:#d9d7d2; text-decoration:none; font:600 .8rem var(--shop-font); }
  .shop-profile-link:hover, .shop-profile-link:focus-visible { border-color:#777d8d; background:#1b1e25; color:#fff; }
  .shop-workspace { display:grid; grid-template-columns:minmax(12rem,14rem) minmax(0,1fr) minmax(21rem,24rem); gap:0; align-items:stretch; border:1px solid var(--shop-line); border-radius:var(--radius-md); background:rgba(11,13,18,.72); box-shadow:0 1.5rem 4rem rgba(0,0,0,.18); overflow:clip; }
  .shop-workspace-main { min-width:0; padding:1rem; border-inline:1px solid var(--shop-line); }
  .shop-status { display:grid; gap:.55rem; min-height:12rem; align-content:center; padding:2rem; border:1px solid var(--shop-line); background:var(--shop-deep); }
  .shop-status span { color:#858690; font:.7rem var(--font-mono-stack); letter-spacing:.12em; text-transform:uppercase; }
  .shop-status strong { font-size:1.1rem; }
  .shop-status--error { border-color:#754d58; }
  .shop-status button { width:max-content; min-height:2.6rem; padding:0 .85rem; border:1px solid #4a4d57; border-radius:5px; background:#16181e; color:#f2f0eb; cursor:pointer; }
  .shop-live-region { position:absolute; width:1px; height:1px; overflow:hidden; clip:rect(0 0 0 0); white-space:nowrap; }
  @media (max-width: 1200px) { .shop-workspace { grid-template-columns:minmax(12rem,14rem) minmax(0,1fr); } .shop-workspace-main { border-right:0; } .shop-workspace > :global(.shop-contextual-preview) { grid-column:1 / -1; position:static; border-top:1px solid var(--shop-line); border-left:0; } }
  @media (max-width: 1000px) { .shop-header { align-items:flex-start; flex-direction:column; gap:1rem; } .shop-header-actions { width:100%; } }
  @media (max-width: 760px) { .shop-page, :global(.app-main--site) .shop-page { width:min(100% - 1.25rem,100rem); margin-top:.8rem; padding-top:0; } .shop-header-actions { display:grid; grid-template-columns:minmax(0,1.25fr) minmax(0,.75fr); align-items:stretch; } .shop-profile-link { grid-column:1 / -1; min-width:0; } .shop-daily-color, .shop-owned { min-width:0; } .shop-profile-link { justify-content:center; } }
  @media (max-width: 620px) { .shop-workspace { grid-template-columns:1fr; overflow:visible; } .shop-workspace-main { border-inline:0; } .shop-workspace > :global(.shop-contextual-preview) { grid-column:auto; border-top:1px solid var(--shop-line); } }
  @media (prefers-reduced-motion: reduce) { .shop-profile-link { transition:none; } }
</style>
