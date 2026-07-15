<script>
  import { onDestroy, onMount, tick } from 'svelte';
  import ShopItemPreview from './ShopItemPreview.svelte';
  import ShopStudioPreview from './ShopStudioPreview.svelte';
  import {
    shopItems,
    shopItemsLoading,
    shopItemsError,
    loadShopItems,
    userInventory,
    equippedItems,
    walletBalance,
    rerollShards,
    profile,
    authUser,
    session,
    addToast,
    fetchInventoryState,
    fetchWalletBalance,
    refreshProfileState
  } from './stores';
  import { supabase } from './supabase';
  import { focusFirstElement, restoreFocus, trapFocus } from './a11y';
  import {
    SHOP_RARITIES,
    SHOP_SECTIONS,
    SHOP_SLOT_LABELS,
    SHOP_SORTS,
    SHOP_SUBSECTIONS,
    clearShopSlot,
    createFittingRoom,
    filterShopItems,
    getCollectionItems,
    getShopContextForSlot,
    isShopCosmetic,
    requiresPurchaseConfirmation,
    tryOnShopItem
  } from './shopCatalog';

  const LOADOUT_SLOTS = [
    'name_effect',
    'frame',
    'profile_border',
    'profile_bg',
    'orb_shape',
    'roll_effect',
    'lb_theme'
  ];

  const SECTION_COPY = {
    overview: ['Curated cosmetics', 'Start with a collection or browse the strongest pieces across every surface.'],
    profile: ['Profile studio', 'Shape the identity people see when they visit your profile.'],
    roll: ['Roll studio', 'Change the silhouette, atmosphere, and reveal of your daily color.'],
    leaderboard: ['Leaderboard presence', 'Make every ranked appearance unmistakably yours.'],
    utility: ['Utility shelf', 'Protect progress with practical items that stack in your inventory.'],
    owned: ['Your collection', 'Revisit everything you own and assemble a new look without spending EP.']
  };

  let fittingRoomInitialized = false;
  let fittingRoom = createFittingRoom();
  let activeContext = 'profile';
  let previewedItem = null;
  let selectedItem = null;
  let selectedSection = 'overview';
  let selectedSubslot = 'all';
  let searchQuery = '';
  let selectedRarity = 'all';
  let affordableOnly = false;
  let sortMode = 'curated';
  let shopNotice = 'Shop ready. Trying on cosmetics does not change your equipped items.';
  let loadingAction = null;
  let purchaseArmedKey = null;
  let searchInput = null;
  let detailDialog = null;
  let detailOpener = null;
  let loadoutDialog = null;
  let loadoutOpener = null;
  let loadoutSheetOpen = false;

  function cloneFittingRoom(source) {
    return {
      ...source,
      inventoryCounts: { ...(source.inventoryCounts || {}) },
      loadout: { ...(source.loadout || {}) }
    };
  }

  function initializeFittingRoom() {
    if (fittingRoomInitialized) return;
    const created = createFittingRoom({
      walletBalance: $walletBalance,
      userInventory: $userInventory,
      equippedItems: $equippedItems,
      rerollShards: $rerollShards
    });
    fittingRoom = cloneFittingRoom(created);
    fittingRoomInitialized = true;
  }

  function syncFittingRoomFromAccount() {
    const created = createFittingRoom({
      walletBalance: $walletBalance,
      userInventory: $userInventory,
      equippedItems: $equippedItems,
      rerollShards: $rerollShards
    });
    fittingRoom = cloneFittingRoom(created);
    fittingRoomInitialized = true;
  }

  onMount(initializeFittingRoom);
  $: username = $profile?.username || $authUser?.user_metadata?.username || $authUser?.email?.split('@')[0] || 'Chromanaut';
  $: displayColor = $profile?.mood_color || '#7B5CFF';
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
  $: voidwalkerItems = getCollectionItems(catalogItems, 'Voidwalker');
  $: selectedState = selectedItem
    ? getDisplayItemState(selectedItem, $equippedItems, fittingRoom)
    : null;
  $: relatedItems = selectedItem ? getCollectionItems(catalogItems, selectedItem.collection, selectedItem.item_key).slice(0, 4) : [];
  $: selectedOwnedCount = selectedItem ? (fittingRoom.inventoryCounts[selectedItem.item_key] || 0) : 0;
  $: selectedActuallyEquipped = Boolean(selectedItem && $equippedItems[selectedItem.slot] === selectedItem.item_key);
  $: selectedCanPurchase = Boolean(selectedItem && selectedItem.cost > 0 && fittingRoom.balance >= selectedItem.cost && (selectedItem.slot === 'consumable' || selectedOwnedCount === 0));
  $: loadoutEntries = LOADOUT_SLOTS.map(slot => ({ slot, item: $shopItems[fittingRoom.loadout[slot]] || null }));
  $: equippedSlotCount = loadoutEntries.filter(entry => entry.item).length;

  function setSection(section) {
    selectedSection = section;
    selectedSubslot = 'all';
  }

  function getDisplayItemState(item, accountEquippedSnapshot, fittingRoomSnapshot) {
    const ownedCount = fittingRoomSnapshot.inventoryCounts?.[item?.item_key] || 0;
    const actuallyEquipped = Boolean(item && accountEquippedSnapshot[item.slot] === item.item_key);
    const previewing = Boolean(item && fittingRoomSnapshot.loadout[item.slot] === item.item_key);
    const cost = Number(item?.cost) || 0;

    if (actuallyEquipped) return { label: 'Equipped', tone: 'equipped', ownedCount };
    if (previewing) return { label: 'Previewing', tone: 'previewing', ownedCount };
    if (ownedCount > 0) {
      return {
        label: item?.slot === 'consumable' ? `${ownedCount} owned` : 'Owned',
        tone: 'owned',
        ownedCount
      };
    }
    if (cost <= 0) return { label: 'Milestone reward', tone: 'milestone', ownedCount };
    if (fittingRoomSnapshot.balance < cost) return { label: 'Not enough EP', tone: 'unaffordable', ownedCount };
    return { label: 'Available', tone: 'available', ownedCount };
  }

  function tryOnItem(item, message = null) {
    if (!isShopCosmetic(item)) return;
    fittingRoom = { ...fittingRoom, loadout: tryOnShopItem(fittingRoom.loadout, item) };
    activeContext = getShopContextForSlot(item.slot) || activeContext;
    previewedItem = item;
    shopNotice = message || `${item.name} is now previewing in your ${SHOP_SLOT_LABELS[item.slot].toLowerCase()} slot.`;
  }

  function clearSlot(slot) {
    const previousItem = $shopItems[fittingRoom.loadout[slot]];
    fittingRoom = { ...fittingRoom, loadout: clearShopSlot(fittingRoom.loadout, slot) };
    if (previousItem?.item_key === previewedItem?.item_key) previewedItem = null;
    shopNotice = `${SHOP_SLOT_LABELS[slot]} cleared from the fitting room.`;
  }

  function resetFittingRoom() {
    syncFittingRoomFromAccount();
    previewedItem = null;
    activeContext = 'profile';
    shopNotice = 'Fitting room reset to your currently equipped cosmetics.';
  }

  async function refreshLiveAccountState() {
    const userId = $session?.user?.id;
    if (!userId) throw new Error('Your signed-in session is no longer available.');
    await Promise.all([
      refreshProfileState(userId),
      fetchInventoryState(userId),
      fetchWalletBalance(userId)
    ]);
    syncFittingRoomFromAccount();
  }

  async function runLiveAction(item, action) {
    if (loadingAction) return;
    loadingAction = `${action}:${item.item_key}`;
    purchaseArmedKey = null;

    try {
      if (action === 'buy') {
        const { data, error } = await supabase.rpc('purchase_item', { p_item_key: item.item_key });
        if (error) throw new Error(error.message);
        if (!data?.success) throw new Error(data?.error || 'The purchase could not be completed.');

        let equipWarning = null;
        if (isShopCosmetic(item)) {
          const { data: equipData, error: equipError } = await supabase.rpc('equip_item', { p_item_key: item.item_key });
          if (equipError || !equipData?.success) {
            equipWarning = equipError?.message || equipData?.error || 'The item could not be equipped automatically.';
          }
        }

        await refreshLiveAccountState();
        if (equipWarning && isShopCosmetic(item)) {
          fittingRoom = { ...fittingRoom, loadout: tryOnShopItem(fittingRoom.loadout, item) };
        }
        previewedItem = isShopCosmetic(item) ? item : previewedItem;
        activeContext = getShopContextForSlot(item.slot) || activeContext;
        shopNotice = isShopCosmetic(item)
          ? `${item.name} purchased${equipWarning ? '' : ' and equipped'}.`
          : `${item.name} purchased. You now own ${fittingRoom.inventoryCounts[item.item_key] || 0}.`;
        addToast(`${item.name} purchased.`, 'success');
        if (equipWarning) addToast(`Purchased, but not equipped: ${equipWarning}`, 'error');
      } else if (action === 'equip') {
        const { data, error } = await supabase.rpc('equip_item', { p_item_key: item.item_key });
        if (error) throw new Error(error.message);
        if (!data?.success) throw new Error(data?.error || 'The item could not be equipped.');
        await refreshLiveAccountState();
        previewedItem = item;
        activeContext = getShopContextForSlot(item.slot) || activeContext;
        shopNotice = `${item.name} equipped to your account.`;
        addToast(`${item.name} equipped.`, 'success');
      } else if (action === 'unequip') {
        const { data, error } = await supabase.rpc('unequip_item', { p_slot: item.slot });
        if (error) throw new Error(error.message);
        if (!data?.success) throw new Error(data?.error || 'The item could not be unequipped.');
        await refreshLiveAccountState();
        previewedItem = null;
        shopNotice = `${item.name} unequipped from your account.`;
        addToast(`${item.name} unequipped.`, 'success');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'The shop request failed.';
      shopNotice = message;
      addToast(`Shop error: ${message}`, 'error');
    } finally {
      loadingAction = null;
    }
  }

  function requestPurchase(item) {
    if (requiresPurchaseConfirmation(item) && purchaseArmedKey !== item.item_key) {
      purchaseArmedKey = item.item_key;
      shopNotice = `Review the ${item.cost.toLocaleString()} EP purchase, then confirm once more.`;
      return;
    }

    void runLiveAction(item, 'buy');
  }

  function tryVoidwalkerCollection() {
    let nextLoadout = { ...fittingRoom.loadout };
    for (const item of voidwalkerItems) {
      nextLoadout = tryOnShopItem(nextLoadout, item);
    }
    fittingRoom = { ...fittingRoom, loadout: nextLoadout };
    previewedItem = voidwalkerItems.find(item => item.item_key === 'bg_void') || voidwalkerItems[0] || null;
    activeContext = 'profile';
    shopNotice = 'The full Voidwalker collection is previewing across your available slots.';
  }

  async function exploreVoidwalker() {
    selectedSection = 'overview';
    selectedSubslot = 'all';
    searchQuery = 'Voidwalker';
    await tick();
    searchInput?.focus();
    searchInput?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function selectRelatedItem(item) {
    selectedItem = item;
    purchaseArmedKey = null;
  }

  async function openItemDetails(item) {
    detailOpener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    selectedItem = item;
    purchaseArmedKey = null;
    document.body.style.overflow = 'hidden';
    await tick();
    focusFirstElement(detailDialog) || detailDialog?.focus();
  }

  async function closeItemDetails() {
    if (!selectedItem) return;
    selectedItem = null;
    purchaseArmedKey = null;
    if (!loadoutSheetOpen) document.body.style.overflow = '';
    await tick();
    restoreFocus(detailOpener);
    detailOpener = null;
  }

  function handleDetailKeydown(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      void closeItemDetails();
      return;
    }
    trapFocus(event, detailDialog);
  }

  async function openLoadoutSheet() {
    loadoutOpener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    loadoutSheetOpen = true;
    document.body.style.overflow = 'hidden';
    await tick();
    focusFirstElement(loadoutDialog) || loadoutDialog?.focus();
  }

  async function closeLoadoutSheet() {
    if (!loadoutSheetOpen) return;
    loadoutSheetOpen = false;
    if (!selectedItem) document.body.style.overflow = '';
    await tick();
    restoreFocus(loadoutOpener);
    loadoutOpener = null;
  }

  function handleLoadoutKeydown(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      void closeLoadoutSheet();
      return;
    }
    trapFocus(event, loadoutDialog);
  }

  function getPriceLabel(item) {
    return item.cost > 0 ? `${item.cost.toLocaleString()} EP` : 'Earned';
  }

  onDestroy(() => {
    if (typeof document !== 'undefined') document.body.style.overflow = '';
  });
</script>

<div class="shop-page">
  <div class="shop-info-banner" role="note">
    <span class="shop-info-dot" aria-hidden="true"></span>
    <div>
      <strong>Permanent unlocks</strong>
      <span>Try on any cosmetic before spending EP. Purchases and equipped choices save instantly.</span>
    </div>
    <a href="/how-to-play">How EP works</a>
  </div>

  <header class="shop-header">
    <div class="shop-heading">
      <span class="shop-kicker">ChromaDie</span>
      <h1>Cosmetic Shop</h1>
      <p>Preview cosmetics, unlock favorites with EP, and equip them to your account.</p>
    </div>
    <div class="shop-wallet" aria-label={`Wallet balance: ${fittingRoom.balance.toLocaleString()} EP`}>
      <span>Your wallet</span>
      <strong>{fittingRoom.balance.toLocaleString()}</strong>
      <small>EP available</small>
    </div>
  </header>

  {#if $shopItemsLoading}
    <div class="shop-status" role="status" aria-live="polite">
      <span>Preparing the atelier</span>
      <strong>Loading cosmetics and live previews…</strong>
    </div>
  {:else if $shopItemsError}
    <div class="shop-status error" role="alert">
      <span>Catalog unavailable</span>
      <strong>{$shopItemsError}</strong>
      <button type="button" on:click={() => loadShopItems()}>Try again</button>
    </div>
  {:else}
    <div class="atelier-layout">
      <aside class="studio-column">
        <div class="studio-sticky">
          <ShopStudioPreview
            bind:activeContext
            loadout={fittingRoom.loadout}
            {username}
            {displayColor}
            selectedItem={previewedItem}
          />

          <div class="loadout-panel">
            <div class="loadout-panel-head">
              <div>
                <span>Fitting room</span>
                <strong>{equippedSlotCount} of {LOADOUT_SLOTS.length} slots</strong>
              </div>
              <button type="button" on:click={resetFittingRoom}>Reset fitting</button>
            </div>
            <div class="loadout-list">
              {#each loadoutEntries as entry (entry.slot)}
                <div class:filled={entry.item}>
                  <span>{SHOP_SLOT_LABELS[entry.slot]}</span>
                  <strong>{entry.item?.name || 'Empty slot'}</strong>
                  {#if entry.item}
                    <button type="button" aria-label={`Clear ${SHOP_SLOT_LABELS[entry.slot]} slot`} on:click={() => clearSlot(entry.slot)}>×</button>
                  {/if}
                </div>
              {/each}
            </div>
          </div>
        </div>
      </aside>

      <main class="catalog-column">
        {#if selectedSection === 'overview' && !searchQuery}
          <section class="collection-hero" aria-labelledby="voidwalker-title">
            <div class="collection-glow" aria-hidden="true"></div>
            <div class="collection-copy">
              <span class="collection-number">Collection 01 · Voidwalker</span>
              <h2 id="voidwalker-title">Bend the light.</h2>
              <p>A complete identity system cut from cold violet horizons, black cores, and impossible gravity.</p>
              <div class="collection-actions">
                <button type="button" class="primary-action" on:click={tryVoidwalkerCollection}>Try the full look</button>
                <button type="button" class="quiet-action" on:click={exploreVoidwalker}>Explore {voidwalkerItems.length} pieces</button>
              </div>
            </div>
            <div class="collection-orbit" aria-hidden="true">
              <span class="orbit orbit-one"></span>
              <span class="orbit orbit-two"></span>
              <span class="orbit-core"></span>
            </div>
          </section>
        {/if}

        <nav class="section-rail" aria-label="Shop departments">
          {#each SHOP_SECTIONS as section (section.id)}
            <button
              type="button"
              class:active={selectedSection === section.id}
              aria-pressed={selectedSection === section.id}
              on:click={() => setSection(section.id)}
            >
              {section.label}
              {#if section.id === 'owned'}<span>{Object.values(fittingRoom.inventoryCounts).filter(count => count > 0).length}</span>{/if}
            </button>
          {/each}
        </nav>

        {#if sectionSubsections.length}
          <div class="subsection-rail" role="group" aria-label={`${selectedSection} cosmetic types`}>
            {#each sectionSubsections as subsection (subsection.id)}
              <button
                type="button"
                class:active={selectedSubslot === subsection.id}
                aria-pressed={selectedSubslot === subsection.id}
                on:click={() => selectedSubslot = subsection.id}
              >{subsection.label}</button>
            {/each}
          </div>
        {/if}

        <section class="catalog-controls" aria-label="Catalog filters">
          <label class="search-field">
            <span class="search-icon" aria-hidden="true">⌕</span>
            <span class="visually-hidden">Search cosmetics</span>
            <input bind:this={searchInput} bind:value={searchQuery} type="search" placeholder="Search cosmetics or collections" />
            {#if searchQuery}
              <button type="button" aria-label="Clear search" on:click={() => searchQuery = ''}>×</button>
            {/if}
          </label>

          <div class="select-row">
            <label>
              <span>Rarity</span>
              <select bind:value={selectedRarity}>
                <option value="all">All rarities</option>
                {#each SHOP_RARITIES as rarity (rarity)}<option value={rarity}>{rarity}</option>{/each}
              </select>
            </label>
            <label>
              <span>Sort</span>
              <select bind:value={sortMode}>
                {#each SHOP_SORTS as sort (sort.id)}<option value={sort.id}>{sort.label}</option>{/each}
              </select>
            </label>
            <label class="affordable-toggle">
              <input type="checkbox" bind:checked={affordableOnly} />
              <span>Affordable now</span>
            </label>
          </div>
        </section>

        <div class="results-heading">
          <div>
            <span>{sectionCopy[0]}</span>
            <h2>{searchQuery ? `Results for “${searchQuery}”` : sectionCopy[1]}</h2>
          </div>
          <strong>{filteredItems.length} item{filteredItems.length === 1 ? '' : 's'}</strong>
        </div>

        {#if filteredItems.length === 0}
          <div class="shop-empty">
            <span aria-hidden="true">◇</span>
            <h3>No pieces match this edit.</h3>
            <p>Clear the search or loosen a filter to bring more cosmetics back into view.</p>
            <button type="button" on:click={() => { searchQuery = ''; selectedRarity = 'all'; affordableOnly = false; }}>Reset filters</button>
          </div>
        {:else}
          <div class="shop-grid">
            {#each filteredItems as item (item.item_key)}
              {@const state = getDisplayItemState(item, $equippedItems, fittingRoom)}
              {@const isWearing = fittingRoom.loadout[item.slot] === item.item_key}
              {@const ownedCount = fittingRoom.inventoryCounts[item.item_key] || 0}
              {@const actuallyEquipped = $equippedItems[item.slot] === item.item_key}
              {@const canPurchase = item.cost > 0 && fittingRoom.balance >= item.cost && (item.slot === 'consumable' || ownedCount === 0)}
              {@const itemBusy = Boolean(loadingAction?.endsWith(`:${item.item_key}`))}
              <article class="shop-item rarity-{item.rarity || 'Common'}" class:is-wearing={isWearing}>
                <div class="item-topline">
                  <span>{SHOP_SLOT_LABELS[item.slot] || item.slot}</span>
                  <span class="item-state tone-{state.tone}">{state.label}</span>
                </div>

                <button class="item-preview-button" type="button" aria-label={`View details for ${item.name}`} on:click={() => openItemDetails(item)}>
                  <ShopItemPreview {item} />
                  <span class="preview-cue">View details <i aria-hidden="true">↗</i></span>
                </button>

                <div class="item-copy">
                  <div>
                    <h3>{item.name}</h3>
                    <span>{item.collection || item.rarity || 'Core collection'}</span>
                  </div>
                  <strong>{getPriceLabel(item)}</strong>
                </div>
                <p>{item.description}</p>

                <div class="item-actions">
                  {#if isShopCosmetic(item)}
                    <button type="button" class="try-button" class:active={isWearing} disabled={!!loadingAction} on:click={() => tryOnItem(item)}>
                      {isWearing ? (actuallyEquipped ? 'Equipped' : 'Previewing') : 'Try on'}
                    </button>
                  {/if}

                  {#if isShopCosmetic(item) && ownedCount > 0}
                    <button
                      type="button"
                      class="primary-item-action"
                      disabled={!!loadingAction}
                      on:click={() => runLiveAction(item, actuallyEquipped ? 'unequip' : 'equip')}
                    >
                      {itemBusy ? (actuallyEquipped ? 'Unequipping…' : 'Equipping…') : (actuallyEquipped ? 'Unequip' : 'Equip')}
                    </button>
                  {:else if item.cost <= 0}
                    <button type="button" class="primary-item-action" disabled>Milestone reward</button>
                  {:else}
                    <button
                      type="button"
                      class="primary-item-action"
                      disabled={!canPurchase || !!loadingAction}
                      on:click={() => requestPurchase(item)}
                    >
                      {itemBusy
                        ? 'Purchasing…'
                        : canPurchase
                          ? purchaseArmedKey === item.item_key
                            ? `Confirm · ${item.cost.toLocaleString()} EP`
                            : `${ownedCount > 0 ? 'Buy another' : 'Buy'} · ${item.cost.toLocaleString()} EP`
                          : `Need ${(item.cost - fittingRoom.balance).toLocaleString()} more EP`}
                    </button>
                  {/if}

                  <button type="button" class="detail-button" aria-label={`Open ${item.name} details`} on:click={() => openItemDetails(item)}>Details</button>
                </div>
              </article>
            {/each}
          </div>
        {/if}
      </main>
    </div>
  {/if}

  <div class="shop-live-region visually-hidden" role="status" aria-live="polite">{shopNotice}</div>

  <button type="button" class="mobile-look-tray" on:click={openLoadoutSheet}>
    <span><i aria-hidden="true"></i> Your look</span>
    <strong>{equippedSlotCount}/{LOADOUT_SLOTS.length} slots</strong>
    <span aria-hidden="true">↑</span>
  </button>
</div>

{#if selectedItem}
  <div class="shop-overlay detail-overlay" role="presentation" on:click|self={closeItemDetails}>
    <div
      class="detail-drawer"
      bind:this={detailDialog}
      role="dialog"
      aria-modal="true"
      aria-labelledby="shop-detail-title"
      tabindex="-1"
      on:keydown={handleDetailKeydown}
    >
      <div class="drawer-head">
        <span>Atelier fitting</span>
        <button type="button" aria-label="Close item details" on:click={closeItemDetails}>×</button>
      </div>

      <div class="drawer-preview"><ShopItemPreview item={selectedItem} /></div>

      <div class="drawer-title-row">
        <div>
          <span>{selectedItem.collection || `${selectedItem.rarity} cosmetic`}</span>
          <h2 id="shop-detail-title">{selectedItem.name}</h2>
        </div>
        <span class="drawer-rarity">{selectedItem.rarity || 'Common'}</span>
      </div>
      <p class="drawer-description">{selectedItem.description}</p>

      <div class="drawer-stats">
        <div><span>Price</span><strong>{getPriceLabel(selectedItem)}</strong></div>
        <div><span>Your balance</span><strong>{fittingRoom.balance.toLocaleString()} EP</strong></div>
        <div><span>Status</span><strong>{selectedState?.label}</strong></div>
      </div>

      {#if relatedItems.length}
        <div class="related-section">
          <div class="related-head"><span>Complete the collection</span><strong>{selectedItem.collection}</strong></div>
          <div class="related-list">
            {#each relatedItems as related (related.item_key)}
              <button type="button" on:click={() => selectRelatedItem(related)}>
                <span>{SHOP_SLOT_LABELS[related.slot]}</span>
                <strong>{related.name}</strong>
              </button>
            {/each}
          </div>
        </div>
      {/if}

      <div class="drawer-actions">
        {#if isShopCosmetic(selectedItem)}
          <button type="button" class="drawer-try" on:click={() => tryOnItem(selectedItem)}>Try on this piece</button>
        {/if}

        {#if isShopCosmetic(selectedItem) && selectedOwnedCount > 0}
          <button
            type="button"
            class="drawer-buy"
            disabled={!!loadingAction}
            on:click={() => runLiveAction(selectedItem, selectedActuallyEquipped ? 'unequip' : 'equip')}
          >
            {loadingAction
              ? (selectedActuallyEquipped ? 'Unequipping…' : 'Equipping…')
              : (selectedActuallyEquipped ? 'Unequip from account' : 'Equip to account')}
          </button>
        {:else if selectedItem.cost <= 0}
          <button type="button" class="drawer-buy" disabled>Milestone reward · Preview only</button>
        {:else}
          <button type="button" class="drawer-buy" disabled={!selectedCanPurchase || !!loadingAction} on:click={() => requestPurchase(selectedItem)}>
            {loadingAction
              ? 'Completing purchase…'
              : selectedCanPurchase
                ? purchaseArmedKey === selectedItem.item_key
                  ? `Confirm purchase · ${selectedItem.cost.toLocaleString()} EP`
                  : `Buy now · ${selectedItem.cost.toLocaleString()} EP`
              : `Need ${(selectedItem.cost - fittingRoom.balance).toLocaleString()} more EP`}
          </button>
        {/if}
      </div>
      {#if purchaseArmedKey === selectedItem.item_key}
        <div class="purchase-confirmation" role="status">
          <span>Balance after purchase</span>
          <strong>{Math.max(0, fittingRoom.balance - selectedItem.cost).toLocaleString()} EP</strong>
        </div>
      {/if}
      <p class="drawer-safety">Trying on is temporary until you equip or purchase an item.</p>
    </div>
  </div>
{/if}

{#if loadoutSheetOpen}
  <div class="shop-overlay loadout-overlay" role="presentation" on:click|self={closeLoadoutSheet}>
    <div
      class="loadout-sheet"
      bind:this={loadoutDialog}
      role="dialog"
      aria-modal="true"
      aria-label="Your fitting room"
      tabindex="-1"
      on:keydown={handleLoadoutKeydown}
    >
      <div class="drawer-head">
        <span>Your fitting room</span>
        <button type="button" aria-label="Close your look" on:click={closeLoadoutSheet}>×</button>
      </div>
      <ShopStudioPreview bind:activeContext loadout={fittingRoom.loadout} {username} {displayColor} selectedItem={previewedItem} />
      <div class="sheet-slots">
        {#each loadoutEntries as entry (entry.slot)}
          <div>
            <span>{SHOP_SLOT_LABELS[entry.slot]}</span>
            <strong>{entry.item?.name || 'Empty'}</strong>
            {#if entry.item}<button type="button" aria-label={`Clear ${SHOP_SLOT_LABELS[entry.slot]}`} on:click={() => clearSlot(entry.slot)}>Clear</button>{/if}
          </div>
        {/each}
      </div>
      <button type="button" class="sheet-reset" on:click={resetFittingRoom}>Reset to equipped items</button>
    </div>
  </div>
{/if}

<style>
  .shop-page {
    width: min(1440px, calc(100% - 32px));
    margin: clamp(28px, 5vw, 64px) auto 80px;
    color: #f4f3f8;
    --shop-line: rgba(255,255,255,0.085);
    --shop-muted: #888a99;
    --shop-panel: #101116;
    --shop-purple: #8b7cf6;
  }

  .shop-info-banner {
    display: flex;
    align-items: center;
    gap: 12px;
    min-height: 58px;
    padding: 10px 14px;
    border: 1px solid rgba(167,151,255,0.18);
    border-radius: 16px;
    background: linear-gradient(90deg, rgba(116,91,255,0.1), rgba(255,255,255,0.025));
  }

  .shop-info-dot {
    width: 9px;
    height: 9px;
    flex: 0 0 auto;
    border-radius: 50%;
    background: #a899ff;
    box-shadow: 0 0 18px rgba(168,153,255,0.9);
  }

  .shop-info-banner div { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .shop-info-banner strong { font: 700 0.76rem var(--font-display); }
  .shop-info-banner div span { color: #9495a3; font-size: 0.72rem; }
  .shop-info-banner a {
    margin-left: auto;
    color: #d9d3ff;
    font-size: 0.74rem;
    font-weight: 650;
    text-decoration: none;
    white-space: nowrap;
  }

  .shop-header {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 32px;
    padding: clamp(44px, 7vw, 88px) clamp(4px, 2vw, 20px) clamp(34px, 5vw, 64px);
  }

  .shop-kicker,
  .collection-number,
  .results-heading > div > span {
    color: #9b96af;
    font: 700 0.66rem/1 'JetBrains Mono', monospace;
    letter-spacing: 0.13em;
    text-transform: uppercase;
  }

  .shop-heading h1 {
    max-width: 760px;
    margin: 14px 0 18px;
    font: 720 clamp(2.85rem, 7vw, 6.2rem)/0.88 var(--font-display);
    letter-spacing: -0.075em;
  }
  .shop-heading p { max-width: 610px; margin: 0; color: #8d8f9e; font-size: 1rem; line-height: 1.65; }

  .shop-wallet {
    min-width: 210px;
    padding: 17px 18px;
    border: 1px solid var(--shop-line);
    border-radius: 20px;
    background: radial-gradient(circle at 100% 0%, rgba(140,116,255,0.18), transparent 45%), rgba(255,255,255,0.025);
    text-align: right;
  }
  .shop-wallet span,
  .shop-wallet small { display: block; color: #858797; font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.1em; }
  .shop-wallet strong { display: block; margin: 5px 0 3px; font: 700 1.8rem/1 var(--font-display); }

  .shop-status {
    display: grid;
    gap: 8px;
    padding: 36px;
    border: 1px solid var(--shop-line);
    border-radius: 24px;
    background: rgba(255,255,255,0.025);
  }
  .shop-status span { color: var(--shop-muted); font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.1em; }
  .shop-status strong { font: 700 1.15rem var(--font-display); }
  .shop-status button { justify-self: start; min-height: 42px; padding: 0 16px; border: 0; border-radius: 12px; cursor: pointer; }
  .shop-status.error { border-color: rgba(239,68,68,0.3); }

  .atelier-layout {
    display: grid;
    grid-template-columns: minmax(340px, 430px) minmax(0, 1fr);
    gap: clamp(24px, 3vw, 42px);
    align-items: start;
  }

  .studio-sticky { position: sticky; top: 92px; display: grid; gap: 14px; }

  .loadout-panel {
    padding: 16px;
    border: 1px solid var(--shop-line);
    border-radius: 22px;
    background: rgba(14,15,20,0.88);
  }
  .loadout-panel-head { display: flex; align-items: center; justify-content: space-between; gap: 14px; margin-bottom: 12px; }
  .loadout-panel-head div { display: flex; flex-direction: column; gap: 3px; }
  .loadout-panel-head span { color: #77798a; font-size: 0.62rem; letter-spacing: 0.08em; text-transform: uppercase; }
  .loadout-panel-head strong { font: 650 0.82rem var(--font-display); }
  .loadout-panel-head button,
  .sheet-reset {
    min-height: 44px;
    padding: 0 12px;
    border: 1px solid var(--shop-line);
    border-radius: 10px;
    background: rgba(255,255,255,0.035);
    color: #d2d0dc;
    cursor: pointer;
    font-size: 0.7rem;
  }

  .loadout-list { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 7px; }
  .loadout-list > div {
    position: relative;
    min-width: 0;
    min-height: 53px;
    padding: 9px 42px 9px 10px;
    border: 1px dashed rgba(255,255,255,0.075);
    border-radius: 11px;
    background: rgba(0,0,0,0.13);
  }
  .loadout-list > div.filled { border-style: solid; border-color: rgba(153,133,255,0.16); background: rgba(135,111,255,0.045); }
  .loadout-list span,
  .loadout-list strong { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .loadout-list span { color: #737585; font-size: 0.55rem; text-transform: uppercase; letter-spacing: 0.06em; }
  .loadout-list strong { margin-top: 4px; color: #d8d6e0; font-size: 0.68rem; }
  .loadout-list button {
    position: absolute;
    top: 50%; right: 3px;
    width: 36px; height: 36px;
    transform: translateY(-50%);
    border: 0; border-radius: 7px;
    background: rgba(255,255,255,0.05); color: #8e909f; cursor: pointer;
  }

  .catalog-column { min-width: 0; }

  .collection-hero {
    position: relative;
    min-height: 330px;
    display: flex;
    align-items: center;
    overflow: hidden;
    padding: clamp(28px, 5vw, 56px);
    border: 1px solid rgba(174,153,255,0.16);
    border-radius: 30px;
    background:
      radial-gradient(circle at 78% 44%, rgba(87,48,159,0.38), transparent 25%),
      linear-gradient(135deg, #0c0911, #11101a 55%, #090a0f);
    box-shadow: 0 28px 80px rgba(0,0,0,0.28);
  }
  .collection-glow {
    position: absolute;
    inset: 0;
    background: radial-gradient(ellipse at 72% 50%, rgba(166,119,255,0.12), transparent 42%);
    pointer-events: none;
  }
  .collection-copy { position: relative; z-index: 2; width: min(62%, 560px); }
  .collection-copy h2 { margin: 13px 0 12px; font: 720 clamp(2rem, 4vw, 3.8rem)/0.95 var(--font-display); letter-spacing: -0.055em; }
  .collection-copy p { max-width: 500px; margin: 0; color: #9b99a9; font-size: 0.9rem; line-height: 1.6; }
  .collection-actions { display: flex; flex-wrap: wrap; gap: 9px; margin-top: 22px; }
  .collection-actions button {
    min-height: 44px;
    padding: 0 16px;
    border-radius: 12px;
    cursor: pointer;
    font-weight: 700;
  }
  .primary-action { border: 0; background: #f1eefb; color: #111117; }
  .quiet-action { border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.04); color: #e2dff0; }

  .collection-orbit { position: absolute; right: clamp(20px, 7vw, 82px); top: 50%; width: 220px; height: 220px; transform: translateY(-50%); }
  .orbit,
  .orbit-core { position: absolute; inset: 50%; border-radius: 50%; transform: translate(-50%,-50%); }
  .orbit { border: 1px solid rgba(186,159,255,0.24); box-shadow: 0 0 36px rgba(113,61,194,0.13); }
  .orbit-one { width: 210px; height: 95px; transform: translate(-50%,-50%) rotate(18deg); }
  .orbit-two { width: 90px; height: 210px; transform: translate(-50%,-50%) rotate(36deg); }
  .orbit-core {
    width: 92px; height: 92px;
    background: radial-gradient(circle at 40% 35%, #1e122c 0 12%, #030207 38%, #7c41bd 43%, #0a0611 52%, #000 72%);
    box-shadow: 0 0 46px rgba(132,75,206,0.38), inset 0 0 22px #000;
    animation: shopVoidPulse 5s ease-in-out infinite;
  }
  @keyframes shopVoidPulse { 50% { transform: translate(-50%,-50%) scale(1.07); filter: brightness(1.18); } }

  .section-rail {
    display: flex;
    gap: 4px;
    overflow-x: auto;
    margin: 22px 0 10px;
    padding: 5px;
    border: 1px solid var(--shop-line);
    border-radius: 16px;
    background: rgba(255,255,255,0.018);
    scrollbar-width: none;
  }
  .section-rail::-webkit-scrollbar { display: none; }
  .section-rail button {
    min-height: 44px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    flex: 1 0 auto;
    padding: 0 13px;
    border: 0;
    border-radius: 11px;
    background: transparent;
    color: #7f8190;
    cursor: pointer;
    font: 650 0.76rem var(--font-display);
    white-space: nowrap;
  }
  .section-rail button:hover { color: #fff; }
  .section-rail button.active { color: #fff; background: rgba(255,255,255,0.075); }
  .section-rail button span { min-width: 20px; padding: 2px 5px; border-radius: 999px; background: rgba(143,119,255,0.13); color: #c7bcff; font-size: 0.58rem; }

  .subsection-rail { display: flex; flex-wrap: wrap; gap: 7px; margin-bottom: 10px; }
  .subsection-rail button {
    min-height: 44px;
    padding: 0 12px;
    border: 1px solid var(--shop-line);
    border-radius: 999px;
    background: rgba(255,255,255,0.02);
    color: #858797;
    cursor: pointer;
    font-size: 0.7rem;
  }
  .subsection-rail button.active { border-color: rgba(154,134,255,0.3); background: rgba(130,105,255,0.1); color: #ded8ff; }

  .catalog-controls {
    display: grid;
    gap: 10px;
    padding: 14px;
    border: 1px solid var(--shop-line);
    border-radius: 19px;
    background: rgba(255,255,255,0.018);
  }
  .search-field { position: relative; display: flex; align-items: center; }
  .search-field input {
    width: 100%;
    min-height: 48px;
    padding: 0 44px 0 42px;
    border: 1px solid rgba(255,255,255,0.085);
    border-radius: 13px;
    background: rgba(5,6,9,0.72);
    color: #fff;
    outline: none;
  }
  .search-field input:focus { border-color: rgba(158,140,255,0.55); box-shadow: 0 0 0 3px rgba(139,124,246,0.1); }
  .search-field input::placeholder { color: #656776; }
  .search-icon { position: absolute; left: 15px; z-index: 1; color: #858797; font-size: 1.1rem; }
  .search-field button { position: absolute; right: 9px; width: 32px; height: 32px; border: 0; border-radius: 9px; background: rgba(255,255,255,0.05); color: #999baa; cursor: pointer; }

  .select-row { display: flex; align-items: flex-end; gap: 9px; flex-wrap: wrap; }
  .select-row > label:not(.affordable-toggle) { display: flex; flex-direction: column; gap: 5px; flex: 1 1 150px; }
  .select-row > label > span { color: #747685; font-size: 0.58rem; text-transform: uppercase; letter-spacing: 0.09em; }
  .select-row select {
    min-height: 44px;
    padding: 0 34px 0 11px;
    border: 1px solid var(--shop-line);
    border-radius: 11px;
    background: #101116;
    color: #d7d5df;
  }
  .affordable-toggle {
    min-height: 44px;
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1 1 150px;
    padding: 0 11px;
    border: 1px solid var(--shop-line);
    border-radius: 11px;
    cursor: pointer;
  }
  .affordable-toggle input { accent-color: var(--shop-purple); }
  .affordable-toggle span { color: #b9b8c3 !important; text-transform: none !important; letter-spacing: 0 !important; font-size: 0.7rem !important; }

  .results-heading { display: flex; justify-content: space-between; gap: 20px; align-items: flex-end; margin: 30px 2px 14px; }
  .results-heading > div { min-width: 0; }
  .results-heading h2 { max-width: 680px; margin: 7px 0 0; color: #aaaab5; font: 500 0.85rem/1.5 var(--font-display); }
  .results-heading > strong { color: #747685; font: 600 0.68rem 'JetBrains Mono', monospace; white-space: nowrap; }

  .shop-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(235px, 1fr)); gap: 13px; }
  .shop-item {
    min-width: 0;
    display: flex;
    flex-direction: column;
    padding: 13px;
    border: 1px solid var(--shop-line);
    border-radius: 19px;
    background: linear-gradient(180deg, rgba(20,21,27,0.95), rgba(13,14,18,0.97));
    transition: border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
  }
  .shop-item:hover { transform: translateY(-2px); border-color: rgba(255,255,255,0.16); box-shadow: 0 18px 42px rgba(0,0,0,0.23); }
  .shop-item.is-wearing { border-color: rgba(142,121,255,0.52); box-shadow: inset 0 0 0 1px rgba(142,121,255,0.08); }
  .shop-item.rarity-Mythic { background: radial-gradient(circle at 100% 0%, rgba(150,112,255,0.08), transparent 34%), linear-gradient(180deg, rgba(20,21,27,0.96), rgba(13,14,18,0.98)); }

  .item-topline { display: flex; justify-content: space-between; gap: 8px; align-items: center; min-height: 25px; margin-bottom: 9px; }
  .item-topline > span:first-child { color: #77798a; font-size: 0.57rem; text-transform: uppercase; letter-spacing: 0.08em; }
  .item-state { max-width: 58%; overflow: hidden; padding: 4px 7px; border: 1px solid rgba(255,255,255,0.07); border-radius: 999px; color: #9496a5; font-size: 0.55rem; text-overflow: ellipsis; white-space: nowrap; }
  .item-state.tone-equipped { border-color: rgba(157,136,255,0.22); background: rgba(137,112,255,0.09); color: #d4cbff; }
  .item-state.tone-previewing { border-color: rgba(109,225,208,0.2); background: rgba(73,196,180,0.08); color: #a7eee4; }
  .item-state.tone-owned { border-color: rgba(77,159,255,0.18); color: #abd2ff; }
  .item-state.tone-available { border-color: rgba(74,222,170,0.17); color: #9de5ca; }

  .item-preview-button { position: relative; width: 100%; padding: 0; border: 0; border-radius: 16px; background: transparent; color: inherit; cursor: pointer; text-align: inherit; }
  .item-preview-button :global(.shop-preview-area) { margin-bottom: 0; }
  .preview-cue {
    position: absolute;
    right: 8px; bottom: 8px;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    min-height: 28px;
    padding: 0 8px;
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 8px;
    background: rgba(4,5,8,0.78);
    color: #b8b7c1;
    font-size: 0.56rem;
    opacity: 0;
    transform: translateY(3px);
    transition: opacity 0.2s, transform 0.2s;
  }
  .item-preview-button:hover .preview-cue,
  .item-preview-button:focus-visible .preview-cue { opacity: 1; transform: translateY(0); }
  .preview-cue i { font-style: normal; }

  .item-copy { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; margin-top: 13px; }
  .item-copy > div { min-width: 0; }
  .item-copy h3 { overflow: hidden; margin: 0; color: #f3f2f7; font: 680 0.88rem/1.2 var(--font-display); text-overflow: ellipsis; white-space: nowrap; }
  .item-copy div span { display: block; overflow: hidden; margin-top: 4px; color: #767887; font-size: 0.58rem; text-overflow: ellipsis; text-transform: uppercase; letter-spacing: 0.07em; white-space: nowrap; }
  .item-copy > strong { color: #d8d4e5; font: 650 0.67rem 'JetBrains Mono', monospace; white-space: nowrap; }
  .shop-item > p { min-height: 2.8em; display: -webkit-box; overflow: hidden; margin: 10px 0 13px; color: #858795; font-size: 0.68rem; line-height: 1.4; -webkit-box-orient: vertical; -webkit-line-clamp: 2; line-clamp: 2; }

  .item-actions { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 7px; margin-top: auto; }
  .item-actions button { min-width: 0; min-height: 44px; padding: 0 9px; border-radius: 11px; cursor: pointer; font: 700 0.65rem var(--font-display); }
  .item-actions button:disabled { cursor: not-allowed; opacity: 0.62; }
  .try-button { border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.06); color: #e5e3ec; }
  .try-button:hover { background: rgba(255,255,255,0.1); }
  .try-button.active { border-color: rgba(148,126,255,0.28); background: rgba(132,107,255,0.13); color: #dcd4ff; }
  .primary-item-action { border: 1px solid rgba(153,130,255,0.3); background: rgba(132,108,255,0.14); color: #e1dcff; }
  .primary-item-action:not(:disabled):hover { border-color: rgba(168,148,255,0.48); background: rgba(132,108,255,0.22); }
  .item-actions > .primary-item-action:first-child { grid-column: 1 / -1; }
  .detail-button { grid-column: 1 / -1; min-height: 36px !important; border: 1px solid var(--shop-line); background: transparent; color: #8d8f9e; }
  .detail-button:hover { border-color: rgba(255,255,255,0.14); color: #c5c4cc; }

  .shop-empty { display: flex; flex-direction: column; align-items: center; padding: 56px 20px; border: 1px dashed rgba(255,255,255,0.1); border-radius: 22px; text-align: center; }
  .shop-empty > span { color: #8c7cff; font-size: 1.8rem; }
  .shop-empty h3 { margin: 12px 0 7px; font: 700 1rem var(--font-display); }
  .shop-empty p { max-width: 440px; margin: 0; color: #858797; font-size: 0.78rem; line-height: 1.5; }
  .shop-empty button { min-height: 44px; margin-top: 16px; padding: 0 14px; border: 1px solid var(--shop-line); border-radius: 11px; background: rgba(255,255,255,0.05); color: #fff; cursor: pointer; }

  .mobile-look-tray { display: none; }
  .visually-hidden {
    position: absolute !important;
    width: 1px !important; height: 1px !important;
    padding: 0 !important; margin: -1px !important;
    overflow: hidden !important;
    clip: rect(0,0,0,0) !important;
    white-space: nowrap !important;
    border: 0 !important;
  }

  .shop-overlay {
    position: fixed;
    inset: 0;
    z-index: 1200;
    display: flex;
    background: rgba(3,4,8,0.74);
    backdrop-filter: blur(9px);
  }
  .detail-overlay { justify-content: flex-end; }
  .detail-drawer {
    width: min(520px, 100%);
    height: 100dvh;
    overflow-y: auto;
    padding: 22px;
    border-left: 1px solid rgba(255,255,255,0.1);
    background: radial-gradient(circle at 100% 0%, rgba(132,104,255,0.12), transparent 34%), #101116;
    box-shadow: -28px 0 80px rgba(0,0,0,0.38);
  }
  .drawer-head { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 18px; }
  .drawer-head > span { color: #888a99; font: 700 0.63rem 'JetBrains Mono', monospace; letter-spacing: 0.11em; text-transform: uppercase; }
  .drawer-head > button { width: 44px; height: 44px; border: 1px solid rgba(255,255,255,0.09); border-radius: 12px; background: rgba(255,255,255,0.04); color: #d5d3df; cursor: pointer; font-size: 1.25rem; }
  .drawer-preview { padding: 14px; border: 1px solid rgba(255,255,255,0.07); border-radius: 20px; background: rgba(4,5,8,0.5); }
  .drawer-preview :global(.shop-preview-area) { height: 220px; margin: 0; }
  .drawer-preview :global(.shop-preview-area-roll-effect) { height: 260px; }

  .drawer-title-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-top: 22px; }
  .drawer-title-row > div > span { color: #8d87a5; font-size: 0.64rem; letter-spacing: 0.08em; text-transform: uppercase; }
  .drawer-title-row h2 { margin: 6px 0 0; font: 720 1.75rem/1 var(--font-display); letter-spacing: -0.035em; }
  .drawer-rarity { padding: 6px 9px; border: 1px solid rgba(255,255,255,0.1); border-radius: 999px; color: #ccc8dc; font-size: 0.6rem; text-transform: uppercase; }
  .drawer-description { margin: 15px 0 18px; color: #9697a5; font-size: 0.85rem; line-height: 1.6; }

  .drawer-stats { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 8px; }
  .drawer-stats > div { min-width: 0; padding: 11px; border: 1px solid rgba(255,255,255,0.075); border-radius: 13px; background: rgba(255,255,255,0.025); }
  .drawer-stats span,
  .drawer-stats strong { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .drawer-stats span { color: #747685; font-size: 0.55rem; text-transform: uppercase; letter-spacing: 0.06em; }
  .drawer-stats strong { margin-top: 5px; color: #e2e0e8; font-size: 0.68rem; }

  .related-section { margin-top: 20px; padding: 15px; border: 1px solid rgba(255,255,255,0.075); border-radius: 16px; }
  .related-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 10px; }
  .related-head span { color: #777989; font-size: 0.58rem; text-transform: uppercase; letter-spacing: 0.07em; }
  .related-head strong { color: #c9c2e8; font-size: 0.68rem; }
  .related-list { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 7px; }
  .related-list button { min-width: 0; padding: 9px; border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; background: rgba(255,255,255,0.025); color: inherit; cursor: pointer; text-align: left; }
  .related-list span,
  .related-list strong { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .related-list span { color: #6f7180; font-size: 0.52rem; text-transform: uppercase; }
  .related-list strong { margin-top: 4px; color: #d8d6e0; font-size: 0.66rem; }

  .drawer-actions { display: grid; gap: 8px; margin-top: 22px; }
  .drawer-actions button { min-height: 48px; border-radius: 13px; cursor: pointer; font-weight: 750; }
  .drawer-try { border: 0; background: #f1eef9; color: #101116; }
  .drawer-buy { border: 1px solid rgba(153,130,255,0.25); background: rgba(132,108,255,0.12); color: #dbd3ff; }
  .drawer-buy:disabled { border-color: rgba(255,255,255,0.07); background: rgba(255,255,255,0.035); color: #717381; cursor: not-allowed; }
  .purchase-confirmation {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-top: 10px;
    padding: 11px 13px;
    border: 1px solid rgba(153,130,255,0.2);
    border-radius: 12px;
    background: rgba(132,108,255,0.07);
  }
  .purchase-confirmation span { color: #8f90a0; font-size: 0.65rem; }
  .purchase-confirmation strong { color: #ded8ff; font: 700 0.78rem 'JetBrains Mono', monospace; }
  .drawer-safety { margin: 12px 10px 2px; color: #686a78; font-size: 0.64rem; line-height: 1.45; text-align: center; }

  .loadout-overlay { display: none; align-items: flex-end; }
  .loadout-sheet {
    width: 100%;
    max-height: calc(100dvh - 18px);
    overflow-y: auto;
    padding: 16px;
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 22px 22px 0 0;
    background: #0e0f14;
  }
  .sheet-slots { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 7px; margin-top: 12px; }
  .sheet-slots > div { position: relative; min-width: 0; padding: 10px; border: 1px solid rgba(255,255,255,0.07); border-radius: 11px; }
  .sheet-slots span,
  .sheet-slots strong { display: block; overflow: hidden; padding-right: 34px; text-overflow: ellipsis; white-space: nowrap; }
  .sheet-slots span { color: #737585; font-size: 0.54rem; text-transform: uppercase; }
  .sheet-slots strong { margin-top: 4px; color: #d6d4df; font-size: 0.67rem; }
  .sheet-slots button { position: absolute; right: 2px; top: 50%; min-width: 44px; min-height: 44px; transform: translateY(-50%); border: 0; background: none; color: #918ba9; cursor: pointer; font-size: 0.58rem; }
  .sheet-reset { width: 100%; min-height: 44px; margin-top: 10px; }

  @media (max-width: 1080px) {
    .atelier-layout { grid-template-columns: 1fr; }
    .studio-sticky { position: static; grid-template-columns: minmax(0, 1.2fr) minmax(280px, 0.8fr); align-items: start; }
    .loadout-panel { align-self: stretch; }
    .collection-hero { min-height: 300px; }
  }

  @media (max-width: 720px) {
    .shop-page { width: min(100% - 20px, 680px); margin-top: 14px; padding-bottom: 70px; }
    .shop-info-banner { align-items: flex-start; padding: 11px; }
    .shop-info-banner div span { line-height: 1.35; }
    .shop-info-banner a { display: none; }
    .shop-header { align-items: stretch; flex-direction: column; gap: 20px; padding: 38px 4px 30px; }
    .shop-heading h1 { font-size: clamp(2.8rem, 15vw, 4.4rem); }
    .shop-heading p { font-size: 0.88rem; }
    .shop-wallet { min-width: 0; text-align: left; }
    .studio-sticky { display: block; }
    .loadout-panel { display: none; }
    .collection-hero { min-height: 390px; align-items: flex-start; padding: 28px 22px; }
    .collection-copy { width: 100%; }
    .collection-copy p { max-width: 90%; }
    .collection-orbit { right: 50%; top: auto; bottom: -68px; width: 210px; height: 210px; transform: translateX(50%); opacity: 0.82; }
    .section-rail { margin-top: 16px; }
    .section-rail button { flex: 0 0 auto; }
    .subsection-rail { flex-wrap: nowrap; overflow-x: auto; padding-bottom: 3px; scrollbar-width: none; }
    .select-row > label:not(.affordable-toggle),
    .affordable-toggle { flex-basis: calc(50% - 5px); }
    .affordable-toggle { flex-basis: 100%; }
    .results-heading { align-items: flex-start; flex-direction: column; gap: 8px; }
    .shop-grid { grid-template-columns: 1fr; }
    .shop-item { padding: 12px; }
    .preview-cue { opacity: 1; transform: none; }
    .mobile-look-tray {
      position: fixed;
      left: 50%; bottom: 12px;
      z-index: 38;
      width: min(calc(100% - 24px), 500px);
      min-height: 54px;
      display: grid;
      grid-template-columns: auto 1fr auto;
      align-items: center;
      gap: 12px;
      transform: translateX(-50%);
      padding: 0 15px;
      border: 1px solid rgba(171,152,255,0.24);
      border-radius: 16px;
      background: rgba(17,18,25,0.94);
      backdrop-filter: blur(16px);
      color: #f0edf8;
      box-shadow: 0 18px 50px rgba(0,0,0,0.48);
      cursor: pointer;
      text-align: left;
    }
    .mobile-look-tray span:first-child { display: inline-flex; align-items: center; gap: 8px; font-weight: 700; }
    .mobile-look-tray i { width: 8px; height: 8px; border-radius: 50%; background: #9c89ff; box-shadow: 0 0 12px rgba(156,137,255,0.8); }
    .mobile-look-tray strong { color: #898b9a; font-size: 0.67rem; font-weight: 600; text-align: right; }
    .loadout-overlay { display: flex; }
    .detail-overlay { align-items: flex-end; }
    .detail-drawer { width: 100%; height: auto; max-height: calc(100dvh - 18px); border-left: 0; border-top: 1px solid rgba(255,255,255,0.1); border-radius: 22px 22px 0 0; padding: 16px; }
    .drawer-preview :global(.shop-preview-area) { height: 170px; }
    .drawer-preview :global(.shop-preview-area-roll-effect) { height: 210px; }
    .drawer-stats { grid-template-columns: 1fr; }
  }

  @media (max-width: 420px) {
    .shop-heading h1 { letter-spacing: -0.065em; }
    .collection-actions { display: grid; }
    .collection-actions button { width: 100%; }
    .related-list { grid-template-columns: 1fr; }
    .drawer-title-row h2 { font-size: 1.45rem; }
  }
</style>
