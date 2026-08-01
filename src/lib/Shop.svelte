<script>
  import { onMount, tick } from 'svelte';
  import ShopFeaturedStrip from './ShopFeaturedStrip.svelte';
  import ShopItemCard from './ShopItemCard.svelte';
  import ShopSelectionPanel from './ShopSelectionPanel.svelte';
  import ShopStudioPreview from './ShopStudioPreview.svelte';
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
    SHOP_RARITIES,
    SHOP_SECTIONS,
    SHOP_SORTS,
    SHOP_SUBSECTIONS,
    createFittingRoom,
    filterShopItems,
    getCollectionItems,
    getShopContextForSlot,
    getShopAccessTier,
    hasShopEntitlement,
    isShopCosmetic,
    requiresPurchaseConfirmation,
    tryOnShopItem
  } from './shopCatalog';

  const SECTION_COPY = {
    overview: ['Discover', 'Browse featured collections and expression for every surface.'],
    profile: ['Profile', 'Cosmetics for the identity people see when they visit your profile.'],
    roll: ['Roll', 'Shapes, atmospheres, and reveals for your daily color.'],
    leaderboard: ['Leaderboard', 'Make your ranked appearances recognizable.'],
    utility: ['Utility', 'Practical items that protect your progress.'],
    owned: ['Owned', 'Review your cosmetics and choose what to manage next.']
  };

  let fittingRoomInitialized = false;
  let fittingRoom = createFittingRoom();
  let selectedItem = null;
  let selectedSection = 'overview';
  let selectedSubslot = 'all';
  let searchQuery = '';
  let selectedRarity = 'all';
  let affordableOnly = false;
  let sortMode = 'curated';
  let activeContext = 'profile';
  let previewLoadout = {};
  let shopNotice = 'Shop ready. Select an item to preview it before you buy.';
  let loadingAction = null;
  let purchaseArmedKey = null;
  let searchInput;
  let viewStateReady = false;
  let restoredShopScope = null;

  const VIEW_STATE_NAMESPACE = 'shop';

  function cloneFittingRoom(source) {
    return {
      ...source,
      inventoryCounts: { ...(source.inventoryCounts || {}) },
      loadout: { ...(source.loadout || {}) },
      entitlements: [...(source.entitlements || [])]
    };
  }

  function syncFittingRoomFromAccount() {
    fittingRoom = cloneFittingRoom(createFittingRoom({
      walletBalance: $walletBalance,
      userInventory: $userInventory,
      equippedItems: $equippedItems,
      rerollShards: $rerollShards,
      entitlements: $profileEntitlements
    }));
    fittingRoomInitialized = true;
  }

  function restoreShopViewState() {
    const scope = currentShopScope;
    if (restoredShopScope !== null && restoredShopScope !== scope) syncFittingRoomFromAccount();
    const savedState = readViewState(VIEW_STATE_NAMESPACE, scope, {});
    const sectionIds = new Set(SHOP_SECTIONS.map(section => section.id));
    const sortIds = new Set(SHOP_SORTS.map(sort => sort.id));
    const rarityValues = new Set(['all', ...SHOP_RARITIES]);
    selectedSection = sectionIds.has(savedState?.selectedSection) ? savedState.selectedSection : 'overview';
    const subslotIds = new Set(['all', ...(SHOP_SUBSECTIONS[selectedSection] || []).map(subslot => subslot.id)]);
    selectedSubslot = subslotIds.has(savedState?.selectedSubslot) ? savedState.selectedSubslot : 'all';
    searchQuery = typeof savedState?.searchQuery === 'string' ? savedState.searchQuery.slice(0, 80) : '';
    selectedRarity = rarityValues.has(savedState?.selectedRarity) ? savedState.selectedRarity : 'all';
    affordableOnly = savedState?.affordableOnly === true;
    sortMode = sortIds.has(savedState?.sortMode) ? savedState.sortMode : 'curated';
    restoredShopScope = scope;
    viewStateReady = true;
  }

  onMount(() => {
    syncFittingRoomFromAccount();
    restoreShopViewState();
  });

  $: currentShopScope = $session?.user?.id || 'guest';
  $: isSignedIn = Boolean($session?.user?.id);
  $: if (viewStateReady && currentShopScope !== restoredShopScope) restoreShopViewState();
  $: if (viewStateReady && currentShopScope === restoredShopScope) {
    writeViewState(VIEW_STATE_NAMESPACE, currentShopScope, {
      selectedSection,
      selectedSubslot,
      searchQuery: searchQuery.slice(0, 80),
      selectedRarity,
      affordableOnly,
      sortMode
    });
  }
  $: if (fittingRoomInitialized && !selectedItem) previewLoadout = { ...($equippedItems || {}) };
  $: catalogItems = Object.values($shopItems).filter(item => item.item_key !== 'title_founder' && item.slot !== 'title');
  $: filteredItems = filterShopItems(catalogItems, {
    section: selectedSection,
    subslot: selectedSubslot,
    query: searchQuery,
    rarity: selectedRarity,
    affordableOnly,
    sortMode
  }, fittingRoom);
  $: sectionSubsections = SHOP_SUBSECTIONS[selectedSection] || [];
  $: sectionCopy = SECTION_COPY[selectedSection] || SECTION_COPY.overview;
  $: featuredItems = getCollectionItems(catalogItems, 'Signal Garden');
  $: selectedState = selectedItem ? getDisplayItemState(selectedItem, $equippedItems, fittingRoom) : null;
  $: relatedItems = selectedItem ? getCollectionItems(catalogItems, selectedItem.collection, selectedItem.item_key).slice(0, 3) : [];
  $: selectedOwnedCount = selectedItem ? fittingRoom.inventoryCounts[selectedItem.item_key] || 0 : 0;
  $: selectedHasAccess = Boolean(selectedItem && hasShopEntitlement(selectedItem, fittingRoom));
  $: selectedCanPurchase = Boolean(
    isSignedIn
      && selectedItem
      && getShopAccessTier(selectedItem) === 'earned'
      && selectedItem.cost > 0
      && fittingRoom.balance >= selectedItem.cost
      && (selectedItem.slot === 'consumable' || selectedOwnedCount === 0)
  );

  function getDisplayItemState(item, accountEquippedSnapshot, fittingRoomSnapshot) {
    const ownedCount = fittingRoomSnapshot.inventoryCounts?.[item?.item_key] || 0;
    const actuallyEquipped = Boolean(item && accountEquippedSnapshot[item.slot] === item.item_key);
    const cost = Number(item?.cost) || 0;
    const accessTier = getShopAccessTier(item);
    if (actuallyEquipped) return { label: 'Equipped', tone: 'equipped', ownedCount };
    if (accessTier === 'free') return { label: 'Free baseline', tone: 'free', ownedCount };
    if (accessTier === 'premium') {
      return hasShopEntitlement(item, fittingRoomSnapshot)
        ? { label: 'Premium unlocked', tone: 'premium', ownedCount }
        : { label: 'Premium expression', tone: 'premium-locked', ownedCount };
    }
    if (ownedCount > 0) return { label: item?.slot === 'consumable' ? `${ownedCount} owned` : 'Owned', tone: 'owned', ownedCount };
    if (cost <= 0) return { label: 'Earned milestone', tone: 'milestone', ownedCount };
    if (fittingRoomSnapshot.balance < cost) return { label: 'Not enough EP', tone: 'unaffordable', ownedCount };
    return { label: 'Available', tone: 'available', ownedCount };
  }

  function setSection(section) {
    selectedSection = section;
    selectedSubslot = 'all';
  }

  function selectItem(item) {
    selectedItem = item;
    purchaseArmedKey = null;
    activeContext = getShopContextForSlot(item.slot) || 'profile';
    previewLoadout = isShopCosmetic(item) ? tryOnShopItem($equippedItems, item) : { ...($equippedItems || {}) };
    shopNotice = `${item.name} is previewing here. This does not change your equipped look.`;
  }

  function resetPreview() {
    selectedItem = null;
    purchaseArmedKey = null;
    activeContext = 'profile';
    previewLoadout = { ...($equippedItems || {}) };
    shopNotice = 'Preview reset to your equipped look.';
  }

  async function refreshLiveAccountState() {
    const userId = $session?.user?.id;
    if (!userId) throw new Error('Your signed-in session is no longer available.');
    await Promise.all([
      fetchInventoryState(userId),
      fetchWalletBalance(userId),
      fetchProfileEntitlements(userId)
    ]);
    syncFittingRoomFromAccount();
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
        : `${item.name} purchased. You now own ${fittingRoom.inventoryCounts[item.item_key] || 0}.`;
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

  async function exploreFeatured() {
    selectedSection = 'overview';
    selectedSubslot = 'all';
    searchQuery = 'Voidwalker';
    await tick();
    searchInput?.focus();
    searchInput?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
</script>

<div class="shop-page">
  <header class="shop-header">
    <div class="shop-heading">
      <span class="shop-kicker">Profile atelier</span>
      <h1>Build your look.</h1>
      <p>Preview profile, roll, and leaderboard cosmetics before you spend EP.</p>
    </div>
    <div class="shop-header-actions">
      <div class="shop-wallet" aria-label={`Wallet balance: ${fittingRoom.balance.toLocaleString()} EP`}>
        <span>EP balance</span>
        <strong>{fittingRoom.balance.toLocaleString()}</strong>
      </div>
      <a class="shop-profile-link" href="/profile/settings">Open profile editor <span aria-hidden="true">↗</span></a>
    </div>
  </header>

  {#if $shopItemsLoading}
    <div class="shop-status" role="status" aria-live="polite"><span>Loading catalog</span><strong>Preparing cosmetics and live previews…</strong></div>
  {:else if $shopItemsError}
    <div class="shop-status error" role="alert"><span>Catalog unavailable</span><strong>{$shopItemsError}</strong><button type="button" on:click={() => loadShopItems()}>Try again</button></div>
  {:else}
    <div class="atelier-layout">
      <main class="catalog-column">
        {#if selectedSection === 'overview' && !searchQuery}
          <ShopFeaturedStrip items={featuredItems} on:select={event => selectItem(event.detail)} on:explore={exploreFeatured} />
        {/if}

        <nav class="section-rail" aria-label="Shop departments">
          {#each SHOP_SECTIONS as section (section.id)}
            <button type="button" class:active={selectedSection === section.id} aria-pressed={selectedSection === section.id} on:click={() => setSection(section.id)}>
              {section.id === 'overview' ? 'Discover' : section.label}
              {#if section.id === 'owned'}<span>{Object.values(fittingRoom.inventoryCounts).filter(count => count > 0).length}</span>{/if}
            </button>
          {/each}
        </nav>

        {#if sectionSubsections.length}
          <div class="subsection-rail" role="group" aria-label={`${selectedSection} cosmetic types`}>
            {#each sectionSubsections as subsection (subsection.id)}
              <button type="button" class:active={selectedSubslot === subsection.id} aria-pressed={selectedSubslot === subsection.id} on:click={() => selectedSubslot = subsection.id}>{subsection.label}</button>
            {/each}
          </div>
        {/if}

        <section class="catalog-controls" aria-label="Catalog filters">
          <label class="search-field">
            <span class="search-icon" aria-hidden="true">⌕</span>
            <span class="visually-hidden">Search cosmetics</span>
            <input bind:this={searchInput} bind:value={searchQuery} type="search" placeholder="Search cosmetics or collections" />
            {#if searchQuery}<button type="button" aria-label="Clear search" on:click={() => searchQuery = ''}>×</button>{/if}
          </label>
          <div class="select-row">
            <label><span>Rarity</span><select bind:value={selectedRarity}><option value="all">All rarities</option>{#each SHOP_RARITIES as rarity (rarity)}<option value={rarity}>{rarity}</option>{/each}</select></label>
            <label><span>Sort</span><select bind:value={sortMode}>{#each SHOP_SORTS as sort (sort.id)}<option value={sort.id}>{sort.label}</option>{/each}</select></label>
            <label class="affordable-toggle"><input type="checkbox" bind:checked={affordableOnly} /><span>Affordable now</span></label>
          </div>
        </section>

        <div class="results-heading">
          <div><span>{sectionCopy[0]}</span><h2>{searchQuery ? `Results for “${searchQuery}”` : sectionCopy[1]}</h2></div>
          <strong>{filteredItems.length} item{filteredItems.length === 1 ? '' : 's'}</strong>
        </div>

        {#if filteredItems.length === 0}
          <div class="shop-empty"><span aria-hidden="true">◇</span><h3>No pieces match this search.</h3><p>Clear the search or reset a filter to see more cosmetics.</p><button type="button" on:click={() => { searchQuery = ''; selectedRarity = 'all'; affordableOnly = false; }}>Reset filters</button></div>
        {:else}
          <div class="shop-grid">
            {#each filteredItems as item (item.item_key)}
              {@const state = getDisplayItemState(item, $equippedItems, fittingRoom)}
              {@const ownedCount = fittingRoom.inventoryCounts[item.item_key] || 0}
              {@const actuallyEquipped = $equippedItems[item.slot] === item.item_key}
              {@const accessTier = getShopAccessTier(item)}
              {@const hasAccess = hasShopEntitlement(item, fittingRoom)}
              {@const canPurchase = isSignedIn && accessTier === 'earned' && item.cost > 0 && fittingRoom.balance >= item.cost && (item.slot === 'consumable' || ownedCount === 0)}
              {@const itemBusy = Boolean(loadingAction?.endsWith(`:${item.item_key}`))}
              <ShopItemCard
                {item}
                {state}
                {accessTier}
                {hasAccess}
                {canPurchase}
                isPreviewing={selectedItem?.item_key === item.item_key}
                {actuallyEquipped}
                {ownedCount}
                {itemBusy}
                purchaseArmed={purchaseArmedKey === item.item_key}
                {isSignedIn}
                on:select={event => selectItem(event.detail)}
                on:purchase={event => requestPurchase(event.detail)}
              />
            {/each}
          </div>
        {/if}
      </main>

      <aside class="shop-studio-column" aria-label="Live shop preview">
        <ShopStudioPreview
          bind:activeContext
          loadout={previewLoadout}
          selectedItem={selectedItem}
          username={$profile?.username || 'Your profile'}
          displayColor={$profile?.mood_color || '#8B7CF6'}
        />
        <ShopSelectionPanel
          item={selectedItem}
          state={selectedState}
          {relatedItems}
          {selectedHasAccess}
          {selectedCanPurchase}
          balance={fittingRoom.balance}
          loadingAction={selectedItem ? loadingAction?.endsWith(`:${selectedItem.item_key}`) : false}
          purchaseArmed={selectedItem ? purchaseArmedKey === selectedItem.item_key : false}
          {isSignedIn}
          on:purchase={event => requestPurchase(event.detail)}
          on:select={event => selectItem(event.detail)}
          on:reset={resetPreview}
        />
      </aside>
    </div>
  {/if}

  <div class="shop-live-region visually-hidden" role="status" aria-live="polite">{shopNotice}</div>
</div>

<style>
  .shop-page { width:min(1540px,calc(100% - 32px)); margin:28px auto 80px; color:var(--color-ink-strong); --shop-line:var(--color-line-subtle); --shop-muted:var(--color-ink-muted); --shop-purple:var(--color-accent); }
  .shop-header { display:flex; align-items:center; justify-content:space-between; gap:32px; padding:34px 4px 28px; }
  .shop-kicker { color:#a99cf5; font:700 .62rem/1 var(--font-mono-stack); letter-spacing:.13em; text-transform:uppercase; }
  .shop-heading h1 { max-width:760px; margin:10px 0; color:#f4f2f8; font:720 clamp(2.8rem,6vw,5.6rem)/.88 var(--font-display); letter-spacing:-.075em; }
  .shop-heading p { max-width:540px; margin:0; color:#8d8f9e; font-size:.9rem; line-height:1.5; }
  .shop-header-actions { display:flex; align-items:center; gap:12px; }
  .shop-wallet { min-width:164px; padding:13px 15px; border:1px solid var(--shop-line); border-radius:16px; background:radial-gradient(circle at 100% 0%,rgba(140,116,255,.18),transparent 45%),rgba(255,255,255,.025); }
  .shop-wallet span { display:block; color:#858797; font-size:.56rem; text-transform:uppercase; letter-spacing:.1em; }
  .shop-wallet strong { display:block; margin:5px 0 0; color:#f2effb; font:700 1.35rem/1 var(--font-display); }
  .shop-profile-link { display:inline-flex; align-items:center; gap:7px; min-height:42px; padding:0 12px; border:1px solid rgba(255,255,255,.1); border-radius:11px; color:#cbc6da; font-size:.66rem; font-weight:700; text-decoration:none; }
  .shop-profile-link:hover { border-color:rgba(202,187,255,.35); color:#fff; }
  .atelier-layout { display:grid; grid-template-columns:minmax(0,1fr) minmax(340px,430px); gap:22px; align-items:start; }
  .catalog-column { min-width:0; }
  .shop-studio-column { position:sticky; top:1rem; z-index:3; display:grid; gap:12px; min-width:0; }
  .shop-studio-column :global(.studio-preview) { border-radius:22px; padding:14px; }
  .shop-studio-column :global(.studio-preview-head) { display:none; }
  .shop-studio-column :global(.context-switcher) { margin:0 0 10px; }
  .shop-studio-column :global(.studio-stage) { min-height:300px; }
  .shop-studio-column :global(.studio-stage.context-profile) { min-height:250px; }
  .shop-studio-column :global(.studio-profile-card) { width:calc(100% - 24px); }
  .section-rail { display:flex; gap:4px; overflow-x:auto; margin:0 0 10px; padding:5px; border:1px solid var(--shop-line); border-radius:16px; background:rgba(255,255,255,.018); scrollbar-width:none; }
  .section-rail::-webkit-scrollbar { display:none; }
  .section-rail button { min-height:44px; display:inline-flex; align-items:center; justify-content:center; gap:7px; flex:1 0 auto; padding:0 13px; border:0; border-radius:11px; background:transparent; color:#7f8190; cursor:pointer; font:650 .76rem var(--font-display); white-space:nowrap; }
  .section-rail button:hover { color:#fff; }
  .section-rail button.active { color:#fff; background:rgba(255,255,255,.075); }
  .section-rail button span { min-width:20px; padding:2px 5px; border-radius:999px; background:rgba(143,119,255,.13); color:#c7bcff; font-size:.58rem; }
  .subsection-rail { display:flex; flex-wrap:wrap; gap:7px; margin-bottom:10px; }
  .subsection-rail button { min-height:40px; padding:0 12px; border:1px solid var(--shop-line); border-radius:999px; background:rgba(255,255,255,.02); color:#858797; cursor:pointer; font-size:.7rem; }
  .subsection-rail button.active { border-color:rgba(154,134,255,.3); background:rgba(130,105,255,.1); color:#ded8ff; }
  .catalog-controls { display:grid; gap:10px; padding:12px; border:1px solid var(--shop-line); border-radius:19px; background:rgba(255,255,255,.018); }
  .search-field { position:relative; display:flex; align-items:center; }
  .search-field input { width:100%; min-height:48px; padding:0 44px 0 42px; border:1px solid rgba(255,255,255,.085); border-radius:13px; background:rgba(5,6,9,.72); color:#fff; outline:none; }
  .search-field input:focus { border-color:var(--color-accent); box-shadow:0 0 0 3px color-mix(in srgb, var(--color-accent) 14%, transparent); }
  .search-field input::placeholder { color:#656776; }
  .search-icon { position:absolute; left:15px; z-index:1; color:#858797; font-size:1.1rem; }
  .search-field button { position:absolute; right:9px; width:32px; height:32px; border:0; border-radius:9px; background:rgba(255,255,255,.05); color:#999baa; cursor:pointer; }
  .select-row { display:flex; align-items:flex-end; gap:9px; flex-wrap:wrap; }
  .select-row > label:not(.affordable-toggle) { display:flex; flex-direction:column; gap:5px; flex:1 1 150px; }
  .select-row > label > span { color:#747685; font-size:.58rem; text-transform:uppercase; letter-spacing:.09em; }
  .select-row select { min-height:44px; padding:0 34px 0 11px; border:1px solid var(--shop-line); border-radius:11px; background:#101116; color:#d7d5df; }
  .affordable-toggle { min-height:44px; display:flex; align-items:center; gap:8px; flex:1 1 150px; padding:0 11px; border:1px solid var(--shop-line); border-radius:11px; cursor:pointer; }
  .affordable-toggle input { accent-color:var(--shop-purple); }
  .affordable-toggle span { color:#b9b8c3!important; text-transform:none!important; letter-spacing:0!important; font-size:.7rem!important; }
  .results-heading { display:flex; align-items:flex-end; justify-content:space-between; gap:20px; margin:22px 2px 12px; }
  .results-heading > div { min-width:0; }
  .results-heading > div > span { color:#9b96af; font:700 .62rem/1 var(--font-mono-stack); letter-spacing:.13em; text-transform:uppercase; }
  .results-heading h2 { max-width:680px; margin:7px 0 0; color:#aaaab5; font:500 .85rem/1.5 var(--font-display); }
  .results-heading > strong { color:#747685; font:600 .68rem var(--font-mono-stack); white-space:nowrap; }
  .shop-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(205px,1fr)); gap:11px; }
  .shop-empty { display:flex; flex-direction:column; align-items:center; padding:42px 20px; border:1px dashed rgba(255,255,255,.1); border-radius:22px; text-align:center; }
  .shop-empty > span { color:#8c7cff; font-size:1.8rem; }
  .shop-empty h3 { margin:12px 0 7px; font:700 1rem var(--font-display); }
  .shop-empty p { max-width:440px; margin:0; color:#858797; font-size:.78rem; line-height:1.5; }
  .shop-empty button { min-height:44px; margin-top:16px; padding:0 14px; border:1px solid var(--shop-line); border-radius:11px; background:rgba(255,255,255,.05); color:#fff; cursor:pointer; }
  .shop-status { display:grid; gap:8px; padding:36px; border:1px solid var(--shop-line); border-radius:24px; background:rgba(255,255,255,.025); }
  .shop-status span { color:var(--shop-muted); font-size:.72rem; text-transform:uppercase; letter-spacing:.1em; }
  .shop-status strong { font:700 1.15rem var(--font-display); }
  .shop-status button { justify-self:start; min-height:42px; padding:0 16px; border:0; border-radius:12px; cursor:pointer; }
  .shop-status.error { border-color:rgba(239,68,68,.3); }
  .visually-hidden { position:absolute!important; width:1px!important; height:1px!important; padding:0!important; margin:-1px!important; overflow:hidden!important; clip:rect(0,0,0,0)!important; white-space:nowrap!important; border:0!important; }
  @media (max-width:900px) { .atelier-layout { grid-template-columns:1fr; } .shop-studio-column { position:static; order:-1; } .shop-studio-column :global(.studio-preview) { width:100%; } }
  @media (max-width:720px) {
    .shop-page { width:min(100% - 20px,680px); margin-top:12px; padding-bottom:70px; }
    .shop-header { align-items:stretch; flex-direction:column; gap:16px; padding:24px 2px 20px; }
    .shop-heading h1 { font-size:clamp(2.7rem,14vw,4.2rem); }
    .shop-header-actions { align-items:stretch; flex-direction:column; }
    .shop-wallet { min-width:0; text-align:left; }
    .shop-profile-link { justify-content:center; }
    .subsection-rail { flex-wrap:nowrap; overflow-x:auto; padding-bottom:3px; scrollbar-width:none; }
    .shop-grid { grid-template-columns:1fr; }
    .results-heading { align-items:flex-start; flex-direction:column; gap:8px; }
    .shop-studio-column :global(.studio-stage) { min-height:270px; }
  }
  @media (prefers-reduced-motion:reduce) { .shop-page * { scroll-behavior:auto!important; } }
</style>
