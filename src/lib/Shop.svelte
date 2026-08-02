<script>
  import { onMount } from 'svelte';
  import ShopHome from './ShopHome.svelte';
  import ShopBrowse from './ShopBrowse.svelte';
  import ShopCollection from './ShopCollection.svelte';
  import ShopStudio from './ShopStudio.svelte';
  import ShopProductDetail from './ShopProductDetail.svelte';
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
    getCollectionItems,
    getShopAccessTier,
    getShopContextForSlot,
    hasShopEntitlement,
    isShopCosmetic,
    requiresPurchaseConfirmation,
    tryOnShopItem
  } from './shopCatalog.js';

  const SHOP_VIEWS = Object.freeze([
    { id: 'home', label: 'Shop' },
    { id: 'browse', label: 'Browse' },
    { id: 'collection', label: 'Collection' },
    { id: 'studio', label: 'Studio' }
  ]);
  const VIEW_STATE_NAMESPACE = 'shop';

  let activeView = 'home';
  let browseSection = 'overview';
  let selectedItem = null;
  let previewLoadout = {};
  let activeContext = 'profile';
  let currentRoll = null;
  let profileConfig = null;
  let loadingAction = null;
  let purchaseArmedKey = null;
  let shopNotice = 'Shop ready. Choose a piece to open its detail view.';
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
  $: catalogItems = Object.values($shopItems).filter(item => item.item_key !== 'title_founder' && item.slot !== 'title');
  $: selectedState = selectedItem ? getDisplayItemState(selectedItem) : null;
  $: relatedItems = selectedItem ? getCollectionItems(catalogItems, selectedItem.collection, selectedItem.item_key).slice(0, 3) : [];
  $: selectedOwnedCount = selectedItem ? fittingRoom.inventoryCounts?.[selectedItem.item_key] || 0 : 0;
  $: selectedHasAccess = Boolean(selectedItem && hasShopEntitlement(selectedItem, fittingRoom));
  $: selectedCanPurchase = Boolean(
    isSignedIn
      && selectedItem
      && getShopAccessTier(selectedItem) === 'earned'
      && selectedItem.cost > 0
      && fittingRoom.balance >= selectedItem.cost
      && (selectedItem.slot === 'consumable' || selectedOwnedCount === 0)
  );
  $: displayColor = currentRoll?.hex_code || $profile?.mood_color || '#8B7CF6';
  $: displayRarity = currentRoll?.rarity || '';

  onMount(() => {
    restoreShopViewState();
    previewLoadout = { ...($equippedItems || {}) };
    void loadPreviewData();
  });

  $: if (viewStateReady && currentShopScope !== restoredShopScope) restoreShopViewState();
  $: if (viewStateReady && currentShopScope === restoredShopScope) {
    writeViewState(VIEW_STATE_NAMESPACE, currentShopScope, { activeView, browseSection });
  }

  function restoreShopViewState() {
    const scope = currentShopScope;
    const savedState = readViewState(VIEW_STATE_NAMESPACE, scope, {});
    const validViews = new Set(SHOP_VIEWS.map(view => view.id));
    const validSections = new Set(SHOP_SECTIONS.map(section => section.id));
    activeView = validViews.has(savedState?.activeView) ? savedState.activeView : 'home';
    browseSection = validSections.has(savedState?.browseSection) ? savedState.browseSection : 'overview';
    restoredShopScope = scope;
    viewStateReady = true;
  }

  async function loadPreviewData() {
    const [rollResponse, configResponse] = await Promise.all([
      supabase.rpc('get_my_daily_roll'),
      supabase.rpc('get_my_profile_configuration')
    ]);
    if (!rollResponse.error && rollResponse.data) currentRoll = rollResponse.data;
    if (!configResponse.error && configResponse.data?.success !== false) profileConfig = configResponse.data;
  }

  function getDisplayItemState(item) {
    const ownedCount = fittingRoom.inventoryCounts?.[item.item_key] || 0;
    const accessTier = getShopAccessTier(item);
    if ($equippedItems[item.slot] === item.item_key) return { label: 'Equipped', tone: 'equipped', ownedCount };
    if (accessTier === 'free') return { label: 'Free baseline', tone: 'free', ownedCount };
    if (accessTier === 'premium') {
      return hasShopEntitlement(item, fittingRoom)
        ? { label: 'Premium unlocked', tone: 'premium', ownedCount }
        : { label: 'Premium expression', tone: 'premium-locked', ownedCount };
    }
    if (ownedCount > 0) return { label: item.slot === 'consumable' ? `${ownedCount} owned` : 'Owned', tone: 'owned', ownedCount };
    if (item.cost <= 0) return { label: 'Earned milestone', tone: 'milestone', ownedCount };
    if (fittingRoom.balance < item.cost) return { label: 'Not enough EP', tone: 'unaffordable', ownedCount };
    return { label: 'Available', tone: 'available', ownedCount };
  }

  function setView(view) {
    activeView = view;
    selectedItem = null;
    purchaseArmedKey = null;
    previewLoadout = { ...($equippedItems || {}) };
    shopNotice = view === 'home' ? 'Shop home ready.' : `Opened ${SHOP_VIEWS.find(item => item.id === view)?.label || view}.`;
  }

  function openBrowse(section = 'overview') {
    browseSection = section;
    activeView = 'browse';
    selectedItem = null;
  }

  function selectItem(item) {
    selectedItem = item;
    purchaseArmedKey = null;
    activeContext = getShopContextForSlot(item.slot) || 'profile';
    previewLoadout = isShopCosmetic(item) ? tryOnShopItem($equippedItems, item) : { ...($equippedItems || {}) };
    shopNotice = `${item.name} is previewing here. This does not change your equipped look.`;
  }

  function closeDetail() {
    selectedItem = null;
    purchaseArmedKey = null;
    activeContext = 'profile';
    previewLoadout = { ...($equippedItems || {}) };
    shopNotice = 'Preview reset to your equipped look.';
  }

  function tryOnSelected(item) {
    if (!item) return;
    activeContext = getShopContextForSlot(item.slot) || activeContext;
    previewLoadout = isShopCosmetic(item) ? tryOnShopItem($equippedItems, item) : { ...($equippedItems || {}) };
    shopNotice = `${item.name} is previewing here. This does not change your equipped look.`;
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
        ? `${item.name} purchased. Manage it from profile settings when you are ready.`
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

<main class="shop-page" aria-labelledby="shop-title">
  <header class="shop-header">
    <div class="shop-heading">
      <span class="shop-eyebrow">Profile atelier</span>
      <h1 id="shop-title">Make the profile yours.</h1>
      <p>Expression for the identity people see, the color you roll, and the story you keep.</p>
    </div>
    <div class="shop-header-actions">
      <div class="shop-wallet" aria-label={`Wallet balance: ${fittingRoom.balance.toLocaleString()} EP`}><span>EP balance</span><strong>{fittingRoom.balance.toLocaleString()}</strong></div>
      <a class="shop-profile-link" href="/profile/settings">Open profile editor <span aria-hidden="true">↗</span></a>
    </div>
  </header>

  <nav class="shop-navigation" aria-label="Shop surfaces">
    {#each SHOP_VIEWS as view (view.id)}
      <button type="button" class:active={activeView === view.id} aria-current={activeView === view.id ? 'page' : undefined} on:click={() => setView(view.id)}>{view.label}</button>
    {/each}
  </nav>

  {#if $shopItemsLoading}
    <div class="shop-status" role="status" aria-live="polite"><span>Loading catalog</span><strong>Preparing your live collection…</strong></div>
  {:else if $shopItemsError}
    <div class="shop-status shop-status--error" role="alert"><span>Catalog unavailable</span><strong>{$shopItemsError}</strong><button type="button" on:click={() => loadShopItems()}>Try again</button></div>
  {:else if activeView === 'home'}
    <ShopHome
      items={catalogItems}
      {fittingRoom}
      equippedItems={$equippedItems}
      profile={$profile}
      {profileConfig}
      {currentRoll}
      {loadingAction}
      {purchaseArmedKey}
      {isSignedIn}
      on:browse={event => openBrowse(event.detail?.section || 'overview')}
      on:collection={() => setView('collection')}
      on:studio={() => setView('studio')}
      on:select={event => selectItem(event.detail)}
      on:purchase={event => requestPurchase(event.detail)}
    />
  {:else if activeView === 'browse'}
    <ShopBrowse
      items={catalogItems}
      section={browseSection}
      {fittingRoom}
      equippedItems={$equippedItems}
      profile={$profile}
      {currentRoll}
      {loadingAction}
      {purchaseArmedKey}
      {isSignedIn}
      on:section={event => browseSection = event.detail}
      on:select={event => selectItem(event.detail)}
      on:purchase={event => requestPurchase(event.detail)}
    />
  {:else if activeView === 'collection'}
    <ShopCollection
      items={catalogItems}
      {fittingRoom}
      equippedItems={$equippedItems}
      profile={$profile}
      {currentRoll}
      {loadingAction}
      {purchaseArmedKey}
      {isSignedIn}
      on:browse={() => openBrowse('overview')}
      on:select={event => selectItem(event.detail)}
      on:purchase={event => requestPurchase(event.detail)}
    />
  {:else}
    <ShopStudio items={catalogItems} {fittingRoom} equippedItems={$equippedItems} profile={$profile} {profileConfig} {currentRoll} />
  {/if}

  <div class="shop-live-region visually-hidden" role="status" aria-live="polite">{shopNotice}</div>
</main>

{#if selectedItem}
  <ShopProductDetail
    item={selectedItem}
    loadout={previewLoadout}
    bind:activeContext
    profile={$profile}
    {profileConfig}
    displayColor={displayColor}
    rollRarity={displayRarity}
    rollScore={currentRoll?.score}
    state={selectedState}
    {relatedItems}
    {selectedHasAccess}
    {selectedCanPurchase}
    balance={fittingRoom.balance}
    loadingAction={Boolean(loadingAction?.endsWith(`:${selectedItem.item_key}`))}
    purchaseArmed={purchaseArmedKey === selectedItem.item_key}
    {isSignedIn}
    on:close={closeDetail}
    on:reset={closeDetail}
    on:tryon={event => tryOnSelected(event.detail)}
    on:select={event => selectItem(event.detail)}
    on:purchase={event => requestPurchase(event.detail)}
  />
{/if}

<style>
  .shop-page { --shop-line:#32353e; --shop-accent:#cdd2ff; width:min(1480px,calc(100% - 1.75rem)); margin:0 auto 5.5rem; color:#f2f0eb; }
  .shop-header { display:flex; align-items:end; justify-content:space-between; gap:2rem; padding:1.75rem 0 1.1rem; border-bottom:1px solid var(--shop-line); }
  .shop-heading h1 { max-width:52rem; margin:.65rem 0 .8rem; font:650 clamp(2.5rem,4vw,3.35rem)/.95 var(--font-display); letter-spacing:-.055em; }
  .shop-heading p { max-width:40rem; margin:0; color:#aaa8b0; font-size:1rem; line-height:1.55; }
  .shop-eyebrow { color:#858690; font:500 .7rem/1.3 var(--font-mono-stack); letter-spacing:.13em; text-transform:uppercase; }
  .shop-header-actions { display:flex; align-items:center; gap:.7rem; flex:0 0 auto; }
  .shop-wallet { min-width:8.5rem; padding:.65rem .8rem; border:1px solid #4a4d57; border-radius:5px; background:#121419; }
  .shop-wallet span, .shop-wallet strong { display:block; }
  .shop-wallet span { color:#858690; font:.65rem var(--font-mono-stack); letter-spacing:.08em; text-transform:uppercase; }
  .shop-wallet strong { margin-top:.25rem; color:#f2f0eb; font:650 1rem var(--font-mono-stack); }
  .shop-profile-link { min-height:2.7rem; display:inline-flex; align-items:center; gap:.45rem; padding:0 .8rem; border:1px solid #4a4d57; border-radius:5px; background:#16181e; color:#d9d7d2; text-decoration:none; font-size:.82rem; }
  .shop-profile-link:hover, .shop-profile-link:focus-visible { border-color:#777d8d; background:#1b1e25; color:#fff; }
  .shop-navigation { display:flex; gap:1.25rem; width:max-content; max-width:100%; margin:1rem 0 1.25rem; border-bottom:1px solid var(--shop-line); }
  .shop-navigation button { position:relative; min-height:2.45rem; padding:0 .05rem; border:0; background:transparent; color:#92949d; font:500 .72rem var(--font-mono-stack); letter-spacing:.03em; cursor:pointer; }
  .shop-navigation button:hover, .shop-navigation button:focus-visible { color:#fff; }
  .shop-navigation button.active { color:var(--shop-accent); }
  .shop-navigation button.active::after { position:absolute; right:0; bottom:-1px; left:0; height:2px; background:var(--shop-accent); content:""; }
  .shop-status { display:grid; gap:.45rem; min-height:14rem; align-content:center; padding:2rem; border:1px solid var(--shop-line); background:#0a0c10; }
  .shop-status span { color:#858690; font:.7rem var(--font-mono-stack); letter-spacing:.12em; text-transform:uppercase; }
  .shop-status strong { font-size:1.1rem; }
  .shop-status--error { border-color:#754d58; }
  .shop-status button { width:max-content; min-height:2.6rem; padding:0 .85rem; border:1px solid #4a4d57; border-radius:5px; background:#16181e; color:#f2f0eb; cursor:pointer; }
  .shop-live-region { position:absolute; width:1px; height:1px; overflow:hidden; clip:rect(0 0 0 0); white-space:nowrap; }
  @media (max-width: 760px) { .shop-page { width:min(100% - 1.25rem,1480px); } .shop-header { align-items:flex-start; flex-direction:column; gap:1.1rem; padding-top:1.25rem; } .shop-header-actions { width:100%; align-items:stretch; } .shop-wallet { flex:1; } .shop-profile-link { flex:1; justify-content:center; } .shop-navigation { width:100%; overflow:auto; } .shop-navigation button { flex:1 0 auto; } }
  @media (prefers-reduced-motion: reduce) { .shop-navigation button, .shop-profile-link { transition:none; } }
</style>
