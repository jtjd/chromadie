<script>
  import { onMount } from 'svelte';
  import ShopBrowse from './ShopBrowse.svelte';
  import ShopCollection from './ShopCollection.svelte';
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
  import {
    SHOP_SECTIONS,
    createFittingRoom,
    getCatalogStatus,
    hasShopEntitlement,
    isShopCosmetic,
    requiresPurchaseConfirmation
  } from './shopCatalog.js';

  const SHOP_VIEWS = Object.freeze([
    { id: 'browse', label: 'Catalog' },
    { id: 'collection', label: 'Collection' },
  ]);
  const SHOP_ACCENT = '#C7B4FF';
  const VIEW_STATE_NAMESPACE = 'shop';

  let activeView = 'browse';
  let browseSection = 'overview';
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
  $: ownedCatalogCount = catalogItems.filter(item => {
    if (item.slot === 'consumable') return false;
    const owned = (fittingRoom.inventoryCounts?.[item.item_key] || 0) > 0;
    const equipped = $equippedItems?.[item.slot] === item.item_key;
    return owned || equipped || hasShopEntitlement(item, fittingRoom);
  }).length;

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
      if (!rollResponse.error && rollResponse.data) currentRoll = rollResponse.data;
      if (!configResponse.error && configResponse.data?.success !== false) profileConfig = configResponse.data;
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
    shopNotice = activeView === 'collection' ? 'Collection opened.' : 'Catalog opened.';
  }

  function openBrowse(section = 'overview') {
    browseSection = section;
    activeView = 'browse';
    selectedItem = null;
  }

  function selectItem(item) {
    if (!item) return;
    selectedItem = item;
    purchaseArmedKey = null;
    activeView = 'browse';
    browseSection = item.slot === 'profile_border'
      ? 'borders'
      : ['name_font', 'name_material', 'name_motion'].includes(item.slot)
        ? 'names'
        : item.slot === 'consumable'
          ? 'utility'
          : 'overview';
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
      <div class="shop-wallet" aria-label={`Wallet balance: ${fittingRoom.balance.toLocaleString()} EP`}><span>Balance</span><strong>{fittingRoom.balance.toLocaleString()} EP</strong></div>
      <div class="shop-owned" aria-label={`${ownedCatalogCount} owned catalog items`}><span>Owned</span><strong>{ownedCatalogCount}</strong></div>
      <a class="shop-profile-link" href="/profile/settings" aria-label="Open profile settings">Profile settings <span aria-hidden="true">↗</span></a>
    </div>
  </header>

  <nav class="shop-navigation" aria-label="Studio surfaces">
    {#each SHOP_VIEWS as view (view.id)}
      <button type="button" class:active={activeView === view.id} aria-current={activeView === view.id ? 'page' : undefined} on:click={() => setView(view.id)}>{view.label}</button>
    {/each}
  </nav>

  {#if $shopItemsLoading}
    <div class="shop-status" role="status" aria-live="polite"><span>Loading catalog</span><strong>Preparing your live collection…</strong></div>
  {:else if $shopItemsError}
    <div class="shop-status shop-status--error" role="alert"><span>Catalog unavailable</span><strong>{$shopItemsError}</strong><button type="button" on:click={() => loadShopItems()}>Try again</button></div>
  {:else if activeView === 'browse'}
    <ShopBrowse
      items={catalogItems}
      section={browseSection}
      selectedItem={selectedItem}
      {fittingRoom}
      equippedItems={$equippedItems}
      profile={$profile}
      {profileConfig}
      {currentRoll}
      {isSignedIn}
      {previewDataLoading}
      {previewDataError}
      {purchaseArmedKey}
      {loadingAction}
      on:section={event => browseSection = event.detail}
      on:select={event => selectItem(event.detail)}
      on:reset={() => { selectedItem = null; shopNotice = 'Preview reset to your equipped look.'; }}
      on:purchase={event => requestPurchase(event.detail)}
    />
  {:else}
    <ShopCollection
      items={catalogItems}
      {fittingRoom}
      equippedItems={$equippedItems}
      profile={$profile}
      {currentRoll}
      {isSignedIn}
      {purchaseArmedKey}
      {loadingAction}
      on:browse={() => openBrowse('overview')}
      on:select={event => selectItem(event.detail)}
      on:purchase={event => requestPurchase(event.detail)}
    />
  {/if}

  <div class="shop-live-region visually-hidden" role="status" aria-live="polite">{shopNotice}</div>
</main>

<style>
  .shop-page { --shop-canvas:#0d0f13; --shop-deep:#090a0d; --shop-raised:#111319; --shop-line:rgba(255,255,255,.075); --shop-line-strong:rgba(255,255,255,.15); --shop-ink:#f2f0eb; --shop-muted:#aaa8b0; --shop-faint:#858690; --shop-accent:#CDD2FF; --shop-font:var(--font-body-stack); --shop-display:var(--font-display-stack); --shop-mono:var(--font-mono-stack); width:min(86.25rem,calc(100% - 2.5rem)); margin:0 auto 5.5rem; color:var(--shop-ink); font-family:var(--shop-font); }
  :global(.app-main--site) .shop-page { width:min(86.25rem,calc(100% - 2.5rem)); margin-top:clamp(.8rem,2.5vh,1.8rem); padding:0 0 4rem; }
  .shop-header { display:flex; align-items:flex-end; justify-content:space-between; gap:2rem; padding:0 0 1rem; border-bottom:1px solid var(--shop-line); }
  .shop-heading h1 { max-width:52rem; margin:.55rem 0 .05rem; font:650 clamp(2.35rem,4.4vw,3.8rem)/.92 var(--shop-display); letter-spacing:-.055em; }
  :global(.app-main--site) .shop-heading h1 { max-width:52rem; margin:.55rem 0 .05rem; font:650 clamp(2.35rem,4.4vw,3.8rem)/.92 var(--shop-display); letter-spacing:-.055em; }
  .shop-heading h1 span { color:var(--shop-accent); }
  .shop-header-intro { margin:.5rem 0 0; color:var(--shop-muted); font-size:.9rem; line-height:1.45; }
  .shop-eyebrow { color:var(--shop-faint); font:600 .72rem/1.3 var(--shop-mono); letter-spacing:.13em; text-transform:uppercase; }
  .shop-header-actions { display:flex; align-items:stretch; gap:.55rem; flex:0 0 auto; }
  .shop-wallet, .shop-owned { min-width:8.25rem; padding:.7rem .85rem; border:1px solid var(--shop-line-strong); border-radius:var(--radius-sm); background:var(--shop-raised); }
  .shop-wallet span, .shop-wallet strong { display:block; }
  .shop-wallet span, .shop-owned span { display:block; color:var(--shop-faint); font:.64rem var(--shop-mono); letter-spacing:.1em; text-transform:uppercase; }
  .shop-wallet strong, .shop-owned strong { display:block; margin-top:.3rem; color:var(--shop-ink); font:650 1rem var(--shop-mono); white-space:nowrap; }
  .shop-owned { min-width:6.25rem; }
  .shop-profile-link { min-height:2.9rem; display:inline-flex; align-items:center; gap:.45rem; padding:0 .9rem; border:1px solid var(--shop-line-strong); border-radius:var(--radius-sm); background:var(--shop-raised); color:#d9d7d2; text-decoration:none; font:.78rem var(--shop-mono); }
  .shop-profile-link:hover, .shop-profile-link:focus-visible { border-color:#777d8d; background:#1b1e25; color:#fff; }
  .shop-navigation { display:flex; gap:.25rem; width:max-content; max-width:100%; margin:.85rem 0 1rem; padding:.25rem; border:1px solid var(--shop-line); border-radius:var(--radius-pill); background:var(--shop-raised); }
  .shop-navigation button { position:relative; min-height:2.65rem; padding:0 1.1rem; border:0; border-radius:var(--radius-pill); background:transparent; color:#92949d; font:600 .78rem var(--shop-mono); letter-spacing:.03em; cursor:pointer; }
  .shop-navigation button:hover, .shop-navigation button:focus-visible { color:#fff; }
  .shop-navigation button.active { background:color-mix(in srgb,var(--shop-accent) 16%,transparent); color:var(--shop-ink); }
  .shop-navigation button.active::after { display:none; }
  .shop-status { display:grid; gap:.55rem; min-height:12rem; align-content:center; padding:2rem; border:1px solid var(--shop-line); background:var(--shop-deep); }
  .shop-status span { color:#858690; font:.7rem var(--font-mono-stack); letter-spacing:.12em; text-transform:uppercase; }
  .shop-status strong { font-size:1.1rem; }
  .shop-status--error { border-color:#754d58; }
  .shop-status button { width:max-content; min-height:2.6rem; padding:0 .85rem; border:1px solid #4a4d57; border-radius:5px; background:#16181e; color:#f2f0eb; cursor:pointer; }
  .shop-live-region { position:absolute; width:1px; height:1px; overflow:hidden; clip:rect(0 0 0 0); white-space:nowrap; }
  @media (max-width: 760px) { .shop-page, :global(.app-main--site) .shop-page { width:min(100% - 1.25rem,86.25rem); margin-top:.8rem; padding-top:0; } .shop-header { align-items:flex-start; flex-direction:column; gap:1rem; } .shop-header-actions { width:100%; align-items:stretch; } .shop-wallet, .shop-owned, .shop-profile-link { flex:1; } .shop-profile-link { justify-content:center; } .shop-navigation { width:100%; overflow:auto; } .shop-navigation button { flex:1 0 auto; } }
  @media (prefers-reduced-motion: reduce) { .shop-navigation button, .shop-profile-link { transition:none; } }
</style>
