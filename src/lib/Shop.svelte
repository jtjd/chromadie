<script>
  import RollPreview from './RollPreview.svelte';
  import { shopItems, shopItemsLoading, shopItemsError, loadShopItems, userInventory, equippedItems, walletBalance, addToast, rerollShards, profile, session, fetchInventoryState, refreshProfileState, fetchWalletBalance } from './stores';
  import { supabase } from './supabase';
  import { onMount } from 'svelte';

  let loadingAction = null;
  let activeTab = 'all';
  let sortMode = 'featured';
  let purchaseTarget = null;
  let ownedCollapsed = {};
  let ownedLayoutMode = 'desktop';
  let ownedStateMode = 'desktop';

  const rarityRank = {
    Trash: 0,
    Common: 1,
    Uncommon: 2,
    Rare: 3,
    Epic: 4,
    Anomaly: 5,
    Mythic: 6
  };

  const slotLabels = {
    all: 'All',
    owned: 'Owned Cosmetics',
    name_effect: 'Names',
    frame: 'Frames',
    profile_border: 'Borders',
    profile_bg: 'Backgrounds',
    orb_shape: 'Orbs',
    roll_effect: 'Roll',
    lb_theme: 'LB',
    consumable: 'Utility'
  };

  const sortLabels = {
    featured: 'Featured',
    price_asc: 'Price: Low',
    price_desc: 'Price: High',
    rarity: 'Rarity'
  };

  const featuredItemKeys = ['frame_spectrum', 'border_void', 'lb_spectrum'];
  const cosmeticSlotOrder = [
    'name_effect',
    'frame',
    'profile_border',
    'profile_bg',
    'orb_shape',
    'roll_effect',
    'lb_theme'
  ];

  function getSlotLabel(slot) {
    return slotLabels[slot] || slot;
  }

  function getItemSummary(item) {
    if (item.description) {
      return item.description;
    }

    switch (item.slot) {
      case 'name_effect':
        return 'Styles your username on profile and leaderboard views.';
      case 'frame':
        return 'Adds a custom frame around your profile header.';
      case 'profile_border':
        return 'Changes the border treatment of your profile card.';
      case 'profile_bg':
        return 'Swaps in a new background for your profile card.';
      case 'orb_shape':
        return 'Changes the silhouette of your roll orb.';
      case 'roll_effect':
        return 'Adds an aura effect to your roll result.';
      case 'lb_theme':
        return 'Styles your leaderboard row for everyone to see.';
      case 'consumable':
        if (item.item_key === 'streak_freeze') {
          return 'Auto-applies if you miss one day and protects that streak.';
        }
        if (item.item_key === 'reroll_shard') {
          return 'Gives you one reroll for a daily color result.';
        }
        return 'Utility item.';
      default:
        return item.description || 'Cosmetic item.';
    }
  }

  function getPurchaseReason(item) {
    if (item.slot === 'consumable') {
      return 'Utility items are consumed on use, so confirm before buying.';
    }
    if (item.cost >= 1000000) {
      return 'This is a premium cosmetic. Confirm before spending that much EP.';
    }
    if (item.cost >= 100000) {
      return 'This purchase is above the quick-buy threshold.';
    }
    return 'Confirm this purchase before spending EP.';
  }

  function getInventoryCount(itemKey) {
    return $userInventory.filter(key => key === itemKey).length;
  }

  function isLoading(action, itemKey) {
    return loadingAction === `${action}:${itemKey}`;
  }

  function shouldConfirmPurchase(item) {
    return item.slot === 'consumable' || item.cost >= 100000;
  }

  function featuredScore(item) {
    const rarityScore = rarityRank[item.rarity] || 0;
    const collectionScore = item.collection ? 1 : 0;
    return (rarityScore * 100000000) + (collectionScore * 1000000) + item.cost;
  }

  function sortItems(items, mode = sortMode) {
    const list = items.slice();

    if (mode === 'price_asc') {
      return list.sort((a, b) => a.cost - b.cost || (a.name || '').localeCompare(b.name || ''));
    }

    if (mode === 'price_desc') {
      return list.sort((a, b) => b.cost - a.cost || (a.name || '').localeCompare(b.name || ''));
    }

    if (mode === 'rarity') {
      return list.sort((a, b) => (rarityRank[b.rarity] || 0) - (rarityRank[a.rarity] || 0) || b.cost - a.cost || (a.name || '').localeCompare(b.name || ''));
    }

    return list.sort((a, b) => featuredScore(b) - featuredScore(a) || (a.name || '').localeCompare(b.name || ''));
  }

  function getStateLabel(item) {
    const owned = $userInventory.includes(item.item_key);
    const equipped = $equippedItems[item.slot] === item.item_key;

    if (item.cost <= 0) return 'Milestone reward';
    if (item.slot === 'consumable') {
      if (item.item_key === 'reroll_shard') {
        return $rerollShards > 0 ? `${$rerollShards} owned` : 'Utility';
      }
      const count = getInventoryCount(item.item_key);
      return count > 0 ? `${count} owned` : 'Utility';
    }
    if (equipped) return 'Equipped';
    if (owned) return 'Owned';
    if (item.cost > 0 && $walletBalance < item.cost) return 'Not enough EP';
    return 'Available';
  }

  function getStateClass(item) {
    const state = getStateLabel(item).toLowerCase();
    if (state === 'equipped') return 'equipped';
    if (state.includes('owned')) return 'owned';
    if (state === 'available') return 'available';
    if (state === 'not enough ep') return 'unaffordable';
    if (state === 'milestone reward') return 'milestone';
    return 'utility';
  }

  async function handleAction(itemKey, action, slot = null, silent = false) {
    loadingAction = `${action}:${itemKey}`;
    let error = null;

    try {
      if (action === 'buy') {
        const { data, error: rpcError } = await supabase.rpc('purchase_item', { p_item_key: itemKey });
        if (rpcError) error = rpcError.message;
        else if (!data.success) error = data.error;
        else {
          const item = $shopItems[itemKey];
          const itemCost = item.cost;
          walletBalance.update(bal => bal - itemCost);

          if (item.slot === 'consumable') {
            if (itemKey === 'reroll_shard') {
              rerollShards.update(s => s + 1);
              profile.update(p => p ? { ...p, reroll_shards: (p.reroll_shards || 0) + 1 } : p);
            } else if (itemKey === 'streak_freeze') {
              userInventory.update(inv => [...inv, itemKey]);
            } else {
              userInventory.update(inv => [...inv, itemKey]);
            }
            if ($session?.user?.id) {
              await Promise.all([
                refreshProfileState(),
                fetchInventoryState($session.user.id),
                fetchWalletBalance()
              ]);
            }
            addToast(`Purchased ${item.name}.`, 'success');
          } else {
            userInventory.update(inv => [...inv, itemKey]);
            if ($session?.user?.id) {
              await Promise.all([
                refreshProfileState(),
                fetchInventoryState($session.user.id),
                fetchWalletBalance()
              ]);
            }
            addToast(`Purchased ${item.name} and equipped it.`, 'success');
            await handleAction(itemKey, 'equip', null, true);
          }
        }
      } else if (action === 'equip') {
        const { data, error: rpcError } = await supabase.rpc('equip_item', { p_item_key: itemKey });
        if (rpcError) error = rpcError.message;
        else if (!data.success) error = data.error;
        else {
          equippedItems.set(data.cosmetics);
          profile.update(p => p ? { ...p, equipped_cosmetics: data.cosmetics } : p);
          if (!silent) addToast(`Equipped ${$shopItems[itemKey].name}.`, 'success');
        }
      } else if (action === 'unequip') {
        const { data, error: rpcError } = await supabase.rpc('unequip_item', { p_slot: slot });
        if (rpcError) error = rpcError.message;
        else if (!data.success) error = data.error;
        else {
          equippedItems.set(data.cosmetics);
          profile.update(p => p ? { ...p, equipped_cosmetics: data.cosmetics } : p);
          addToast('Unequipped item.', 'success');
        }
      }
    } finally {
      if (error) addToast(`Error: ${error}`);
      loadingAction = null;
    }
  }

  function requestPurchase(item) {
    if (shouldConfirmPurchase(item)) {
      purchaseTarget = item;
      return;
    }

    handleAction(item.item_key, 'buy');
  }

  function confirmPurchase() {
    if (!purchaseTarget) return;
    const item = purchaseTarget;
    purchaseTarget = null;
    handleAction(item.item_key, 'buy');
  }

  function cancelPurchase() {
    purchaseTarget = null;
  }

  $: cosmeticItems = Object.values($shopItems)
    .filter(item => item.slot !== 'consumable');

  $: utilityItems = Object.values($shopItems)
    .filter(item => item.slot === 'consumable');

  $: ownedCosmeticItems = cosmeticItems.filter(item => $userInventory.includes(item.item_key));
  $: ownedCosmeticSections = cosmeticSlotOrder
    .map(slot => ({
      slot,
      label: getSlotLabel(slot),
      items: sortItems(ownedCosmeticItems.filter(item => item.slot === slot), sortMode)
    }))
    .filter(section => section.items.length > 0);

  $: if (activeTab === 'owned' && ownedCosmeticSections.length) {
    const sectionKeysMatch = Object.keys(ownedCollapsed).length === ownedCosmeticSections.length
      && !Object.keys(ownedCollapsed).some(slot => !ownedCosmeticSections.some(section => section.slot === slot));

    if (ownedStateMode !== ownedLayoutMode || !sectionKeysMatch) {
      applyOwnedDefaultState(ownedLayoutMode === 'mobile');
    }
  }

  $: filteredCosmetics = sortItems(
    cosmeticItems.filter(item => activeTab === 'all' || item.slot === activeTab),
    sortMode
  );

  $: sortedUtilityItems = sortItems(utilityItems, sortMode);
  $: featuredItems = (() => {
    const picked = [];
    const seen = [];

    for (const itemKey of featuredItemKeys) {
      const item = $shopItems[itemKey];
      if (item && !seen.includes(item.item_key)) {
        picked.push(item);
        seen.push(item.item_key);
      }
    }

    if (picked.length < 3) {
      for (const item of Object.values($shopItems).filter(entry => entry.slot !== 'consumable').sort((a, b) => featuredScore(b) - featuredScore(a))) {
        if (picked.length >= 3) break;
        if (!seen.includes(item.item_key)) {
          picked.push(item);
          seen.push(item.item_key);
        }
      }
    }

    return picked.slice(0, 3);
  })();
  $: activeCategoryLabel = getSlotLabel(activeTab);
  $: selectedItemPreview = purchaseTarget ? getItemSummary(purchaseTarget) : '';

  function toggleOwnedSection(slot) {
    ownedCollapsed = {
      ...ownedCollapsed,
      [slot]: !ownedCollapsed[slot]
    };
  }

  function expandOwnedSections() {
    ownedCollapsed = Object.fromEntries(ownedCosmeticSections.map(section => [section.slot, false]));
  }

  function collapseOwnedSections() {
    ownedCollapsed = Object.fromEntries(ownedCosmeticSections.map(section => [section.slot, true]));
  }

  function applyOwnedDefaultState(isMobile) {
    ownedLayoutMode = isMobile ? 'mobile' : 'desktop';
    ownedStateMode = ownedLayoutMode;
    ownedCollapsed = Object.fromEntries(
      ownedCosmeticSections.map(section => [section.slot, isMobile])
    );
  }

  onMount(() => {
    const media = window.matchMedia('(max-width: 600px)');
    applyOwnedDefaultState(media.matches);

    const handleChange = event => {
      if (activeTab === 'owned') {
        applyOwnedDefaultState(event.matches);
      } else {
        ownedLayoutMode = event.matches ? 'mobile' : 'desktop';
      }
    };

    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', handleChange);
      return () => media.removeEventListener('change', handleChange);
    }

    media.addListener(handleChange);
    return () => media.removeListener(handleChange);
  });

  $: if (activeTab === 'owned' && ownedCosmeticSections.length) {
    const sectionKeysMatch = Object.keys(ownedCollapsed).length === ownedCosmeticSections.length
      && !Object.keys(ownedCollapsed).some(slot => !ownedCosmeticSections.some(section => section.slot === slot));

    if (ownedStateMode !== ownedLayoutMode || !sectionKeysMatch) {
      applyOwnedDefaultState(ownedLayoutMode === 'mobile');
    }
  }
</script>

<div class="container shop-container">
  <div class="section-title">
    <div class="section-bar bar-green"></div>
    <h2>Cosmetic Shop</h2>
  </div>

  <div class="shop-masthead">
    <div class="shop-masthead-copy">
      <p class="shop-intro">
        Build your look with profile cosmetics, roll effects, and leaderboard styles. Preview every item before you spend EP.
      </p>
      <div class="shop-hero-pills">
        <span class="hero-pill">Permanent unlocks</span>
        <span class="hero-pill">Utility items below</span>
      </div>
    </div>

    <div class="wallet-display">
      <span class="wallet-label">Wallet</span>
      <strong>{$walletBalance.toLocaleString()} EP</strong>
    </div>
  </div>

  {#if $shopItemsLoading}
    <div class="shop-status-panel" role="status" aria-live="polite">
      <span class="shop-status-eyebrow">Cosmetic catalog</span>
      <strong>Loading the shop...</strong>
      <span>Preparing previews and item details.</span>
    </div>
  {:else if $shopItemsError}
    <div class="shop-status-panel shop-status-error" role="alert">
      <span class="shop-status-eyebrow">Shop unavailable</span>
      <strong>{$shopItemsError}</strong>
      <button class="shop-btn secondary shop-retry-btn" type="button" on:click={() => loadShopItems()}>Try again</button>
    </div>
  {:else}

  {#if featuredItems.length && activeTab === 'all'}
    <div class="featured-section">
      <div class="shop-section-header featured-header">
        <div>
          <h3>Featured Picks</h3>
          <p>A small spotlight of items with the most noticeable visual impact.</p>
        </div>
      </div>

      <div class="featured-grid">
        {#each featuredItems as item (item.item_key)}
          {@const owned = $userInventory.includes(item.item_key)}
          {@const equipped = $equippedItems[item.slot] === item.item_key}
          {@const affordable = $walletBalance >= item.cost}
          {@const loadingBuy = isLoading('buy', item.item_key)}
          {@const loadingEquip = isLoading('equip', item.item_key)}
          {@const loadingUnequip = isLoading('unequip', item.item_key)}

          <div class="shop-item featured-item shop-rarity-{item.rarity || 'Common'} {equipped ? 'is-equipped' : ''} {owned ? 'is-owned' : ''}">
            <div class="shop-item-meta">
              <span class="state-pill slot">Featured</span>
              <span class="state-pill rarity">{item.rarity || 'Common'}</span>
            </div>

            <div class="shop-preview-area {item.slot === 'profile_border' || item.slot === 'lb_theme' ? 'shop-preview-area-tall' : ''} {item.slot === 'roll_effect' ? 'shop-preview-area-roll-effect' : ''}">
              {#if item.slot === 'profile_bg'}
                <div class="preview-bg" style="{item.css_type === 'style' ? item.css_value : ''}"></div>
              {:else if item.slot === 'roll_effect'}
                <RollPreview effectCls={item.css_type === 'class' ? item.css_value : ''} effectStyle={item.css_type === 'style' ? item.css_value : ''} size="shop" />
              {:else if item.slot === 'lb_theme'}
                <div class="leaderboard-row preview-lb-row {item.css_type === 'class' ? item.css_value : ''}" style="{item.css_type === 'style' ? item.css_value : ''}">
                  <span class="lb-rank preview-lb-rank">#1</span>
                  <div class="lb-info preview-lb-info">
                    <span class="lb-username preview-lb-name">YourName</span>
                    <span class="preview-lb-sub">#7B5CFF • Mythic</span>
                  </div>
                  <span class="lb-score preview-lb-score">9.8M</span>
                </div>
              {:else if item.slot === 'orb_shape'}
                <div class="preview-orb-shape {item.css_type === 'class' ? item.css_value : ''}"></div>
              {:else if item.slot === 'profile_border'}
                <div class="preview-profile-card {item.css_type === 'class' ? item.css_value : ''}" style="{item.css_type === 'style' ? item.css_value : ''}">
                  <div class="preview-profile-topline">
                    <span class="preview-profile-badge">Featured</span>
                    <span class="preview-profile-dot"></span>
                  </div>
                  <span class="preview-profile-name">YourName</span>
                  <div class="preview-profile-meta">
                    <span>Rank</span>
                    <span>30d</span>
                  </div>
                </div>
              {:else}
                <div class="shop-preview-text">
                  {#if item.css_type === 'class'}
                    {#if item.slot === 'frame'}
                      <span class="profile-name-frame {item.css_value}">Username</span>
                    {:else}
                      <span class="{item.css_value}" data-text="Username">Username</span>
                    {/if}
                  {:else if item.css_type === 'style'}
                    {#if item.slot === 'frame'}
                      <span class="profile-name-frame" style="{item.css_value}">Username</span>
                    {:else}
                      <span style="{item.css_value}" data-text="Username">Username</span>
                    {/if}
                  {/if}
                </div>
              {/if}
            </div>

            <h3>{item.name}</h3>
            <p class="item-summary">{getItemSummary(item)}</p>
            <div class="item-footnote">
              <span class="item-cost">{item.cost.toLocaleString()} EP</span>
              <span class="state-pill status-{getStateClass(item)}">{getStateLabel(item)}</span>
            </div>

            <div class="shop-actions">
              {#if equipped}
                <button class="shop-btn equipped" type="button" on:click={() => handleAction(item.item_key, 'unequip', item.slot)} disabled={!!loadingAction}>
                  {loadingUnequip ? 'Unequipping...' : 'Unequip'}
                </button>
              {:else if owned && item.slot !== 'consumable'}
                <button class="shop-btn owned" type="button" on:click={() => handleAction(item.item_key, 'equip')} disabled={!!loadingAction}>
                  {loadingEquip ? 'Equipping...' : 'Equip'}
                </button>
              {:else if item.cost > 0 && affordable}
                <button class="shop-btn" type="button" on:click={() => requestPurchase(item)} disabled={!!loadingAction}>
                  {loadingBuy ? 'Buying...' : 'Buy'}
                </button>
              {:else if item.cost <= 0}
                <button class="shop-btn disabled" type="button" disabled>
                  🔒 Milestone Reward
                </button>
              {:else}
                <button class="shop-btn disabled" type="button" disabled>
                  Not Enough EP
                </button>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <div class="shop-toolbar">
    <div class="shop-tabs" role="group" aria-label="Shop categories">
      <button class="shop-tab" class:active={activeTab === 'all'} type="button" on:click={() => activeTab = 'all'}>All</button>
      <button class="shop-tab" class:active={activeTab === 'owned'} type="button" on:click={() => activeTab = 'owned'}>Owned</button>
      <button class="shop-tab" class:active={activeTab === 'frame'} type="button" on:click={() => activeTab = 'frame'}>Frames</button>
      <button class="shop-tab" class:active={activeTab === 'name_effect'} type="button" on:click={() => activeTab = 'name_effect'}>Names</button>
      <button class="shop-tab" class:active={activeTab === 'profile_border'} type="button" on:click={() => activeTab = 'profile_border'}>Borders</button>
      <button class="shop-tab" class:active={activeTab === 'profile_bg'} type="button" on:click={() => activeTab = 'profile_bg'}>Backgrounds</button>
      <button class="shop-tab" class:active={activeTab === 'orb_shape'} type="button" on:click={() => activeTab = 'orb_shape'}>Orbs</button>
      <button class="shop-tab" class:active={activeTab === 'roll_effect'} type="button" on:click={() => activeTab = 'roll_effect'}>Roll</button>
      <button class="shop-tab" class:active={activeTab === 'lb_theme'} type="button" on:click={() => activeTab = 'lb_theme'}>LB</button>
    </div>

    <div class="shop-sort">
      <span>Sort</span>
      <div class="sort-pills" role="group" aria-label="Sort shop items">
        {#each Object.entries(sortLabels) as [value, label] (value)}
          <button
            class="sort-pill"
            class:active={sortMode === value}
            type="button"
            on:click={() => sortMode = value}
          >
            {label}
          </button>
        {/each}
      </div>
    </div>
  </div>

  <div class="shop-section-header">
    <div>
      <h3>{activeCategoryLabel}</h3>
      {#if activeTab === 'owned'}
        <p>Your collected cosmetics, grouped by type so they are easy to scan, equip, and compare.</p>
      {:else}
        <p>Permanent cosmetics only. Utility items live below so they do not compete with visual rewards.</p>
      {/if}
    </div>
    <span class="section-count">{activeTab === 'owned' ? ownedCosmeticItems.length : filteredCosmetics.length} item{(activeTab === 'owned' ? ownedCosmeticItems.length : filteredCosmetics.length) === 1 ? '' : 's'}</span>
  </div>

  {#if activeTab === 'owned'}
    {#if ownedCosmeticItems.length === 0}
      <div class="shop-empty">
        <p>You do not own any cosmetics yet.</p>
        <span>Buy or earn a cosmetic first, then it will appear here.</span>
      </div>
    {:else}
      <div class="owned-controls" aria-label="Owned cosmetic controls">
        <button type="button" class="owned-control" on:click={expandOwnedSections}>Expand all</button>
        <button type="button" class="owned-control" on:click={collapseOwnedSections}>Collapse all</button>
      </div>
      <div class="owned-groups">
        {#each ownedCosmeticSections as section (section.slot)}
          <section class="owned-group">
            <button
              type="button"
              class="owned-group-header"
              aria-expanded={!ownedCollapsed[section.slot]}
              on:click={() => toggleOwnedSection(section.slot)}
            >
              <div>
                <h3>{section.label}</h3>
                <p>{section.items.length} item{section.items.length === 1 ? '' : 's'}</p>
              </div>
              <span class="owned-group-chevron" aria-hidden="true">{ownedCollapsed[section.slot] ? '▸' : '▾'}</span>
            </button>

            {#if !ownedCollapsed[section.slot]}
              <div class="shop-grid owned-grid">
                {#each section.items as item (item.item_key)}
                {@const equipped = $equippedItems[item.slot] === item.item_key}
                {@const loadingEquip = isLoading('equip', item.item_key)}
                {@const loadingUnequip = isLoading('unequip', item.item_key)}

                <div class="shop-item shop-rarity-{item.rarity || 'Common'} {equipped ? 'is-equipped' : ''} is-owned">
                  <div class="shop-item-meta">
                    <span class="state-pill slot">{getSlotLabel(item.slot)}</span>
                    <span class="state-pill rarity">{item.rarity || 'Common'}</span>
                  </div>

                  <div class="shop-preview-area {item.slot === 'profile_border' || item.slot === 'lb_theme' ? 'shop-preview-area-tall' : ''} {item.slot === 'roll_effect' ? 'shop-preview-area-roll-effect' : ''}">
                    {#if item.slot === 'profile_bg'}
                      <div class="preview-bg" style="{item.css_type === 'style' ? item.css_value : ''}"></div>
                    {:else if item.slot === 'roll_effect'}
                      <RollPreview effectCls={item.css_type === 'class' ? item.css_value : ''} effectStyle={item.css_type === 'style' ? item.css_value : ''} size="shop" />
                    {:else if item.slot === 'lb_theme'}
                      <div class="leaderboard-row preview-lb-row {item.css_type === 'class' ? item.css_value : ''}" style="{item.css_type === 'style' ? item.css_value : ''}">
                        <span class="lb-rank preview-lb-rank">#1</span>
                        <div class="lb-info preview-lb-info">
                          <span class="lb-username preview-lb-name">YourName</span>
                          <span class="preview-lb-sub">#7B5CFF • Mythic</span>
                        </div>
                        <span class="lb-score preview-lb-score">9.8M</span>
                      </div>
                    {:else if item.slot === 'orb_shape'}
                      <div class="preview-orb-shape {item.css_type === 'class' ? item.css_value : ''}"></div>
                    {:else if item.slot === 'profile_border'}
                      <div class="preview-profile-card {item.css_type === 'class' ? item.css_value : ''}" style="{item.css_type === 'style' ? item.css_value : ''}">
                        <div class="preview-profile-topline">
                          <span class="preview-profile-badge">Featured</span>
                          <span class="preview-profile-dot"></span>
                        </div>
                        <span class="preview-profile-name">YourName</span>
                        <div class="preview-profile-meta">
                          <span>Rank</span>
                          <span>30d</span>
                        </div>
                      </div>
                    {:else}
                      <div class="shop-preview-text">
                        {#if item.css_type === 'class'}
                          {#if item.slot === 'frame'}
                            <span class="profile-name-frame {item.css_value}">Username</span>
                          {:else}
                            <span class="{item.css_value}" data-text="Username">Username</span>
                          {/if}
                        {:else if item.css_type === 'style'}
                          {#if item.slot === 'frame'}
                            <span class="profile-name-frame" style="{item.css_value}">Username</span>
                          {:else}
                            <span style="{item.css_value}" data-text="Username">Username</span>
                          {/if}
                        {/if}
                      </div>
                    {/if}
                  </div>

                  <h3>{item.name}</h3>
                  {#if item.collection}
                    <p class="item-collection">{item.collection}</p>
                  {/if}
                  <p class="item-summary">{getItemSummary(item)}</p>
                  {#if item.description && item.description !== getItemSummary(item)}
                    <p class="item-desc">{item.description}</p>
                  {/if}

                  <div class="item-footnote">
                    <span class="item-cost">{item.cost.toLocaleString()} EP</span>
                    <span class="state-pill status-{getStateClass(item)}">{getStateLabel(item)}</span>
                  </div>

                  <div class="shop-actions">
                    {#if equipped}
                      <button class="shop-btn equipped" type="button" on:click={() => handleAction(item.item_key, 'unequip', item.slot)} disabled={!!loadingAction}>
                        {loadingUnequip ? 'Unequipping...' : 'Unequip'}
                      </button>
                    {:else}
                      <button class="shop-btn owned" type="button" on:click={() => handleAction(item.item_key, 'equip')} disabled={!!loadingAction}>
                        {loadingEquip ? 'Equipping...' : 'Equip'}
                      </button>
                    {/if}
                  </div>
                </div>
                {/each}
              </div>
            {/if}
          </section>
        {/each}
      </div>
    {/if}
  {:else}
    {#if filteredCosmetics.length === 0}
      <div class="shop-empty">
        <p>No items in this category yet.</p>
        <span>Try a different category or switch back to All cosmetics.</span>
      </div>
    {:else}
      <div class="shop-grid">
        {#each filteredCosmetics as item (item.item_key)}
          {@const owned = $userInventory.includes(item.item_key)}
          {@const equipped = $equippedItems[item.slot] === item.item_key}
          {@const affordable = $walletBalance >= item.cost}
          {@const loadingBuy = isLoading('buy', item.item_key)}
          {@const loadingEquip = isLoading('equip', item.item_key)}
          {@const loadingUnequip = isLoading('unequip', item.item_key)}

          <div class="shop-item shop-rarity-{item.rarity || 'Common'} {equipped ? 'is-equipped' : ''} {owned ? 'is-owned' : ''}">
            <div class="shop-item-meta">
              <span class="state-pill slot">{getSlotLabel(item.slot)}</span>
              <span class="state-pill rarity">{item.rarity || 'Common'}</span>
            </div>

            <div class="shop-preview-area {item.slot === 'profile_border' || item.slot === 'lb_theme' ? 'shop-preview-area-tall' : ''} {item.slot === 'roll_effect' ? 'shop-preview-area-roll-effect' : ''}">
              {#if item.slot === 'profile_bg'}
                <div class="preview-bg" style="{item.css_type === 'style' ? item.css_value : ''}"></div>
              {:else if item.slot === 'roll_effect'}
                <RollPreview effectCls={item.css_type === 'class' ? item.css_value : ''} effectStyle={item.css_type === 'style' ? item.css_value : ''} size="shop" />
              {:else if item.slot === 'lb_theme'}
                <div class="leaderboard-row preview-lb-row {item.css_type === 'class' ? item.css_value : ''}" style="{item.css_type === 'style' ? item.css_value : ''}">
                  <span class="lb-rank preview-lb-rank">#1</span>
                  <div class="lb-info preview-lb-info">
                    <span class="lb-username preview-lb-name">YourName</span>
                    <span class="preview-lb-sub">#7B5CFF • Mythic</span>
                  </div>
                  <span class="lb-score preview-lb-score">9.8M</span>
                </div>
              {:else if item.slot === 'orb_shape'}
                <div class="preview-orb-shape {item.css_type === 'class' ? item.css_value : ''}"></div>
              {:else if item.slot === 'profile_border'}
                <div class="preview-profile-card {item.css_type === 'class' ? item.css_value : ''}" style="{item.css_type === 'style' ? item.css_value : ''}">
                  <div class="preview-profile-topline">
                    <span class="preview-profile-badge">Featured</span>
                    <span class="preview-profile-dot"></span>
                  </div>
                  <span class="preview-profile-name">YourName</span>
                  <div class="preview-profile-meta">
                    <span>Rank</span>
                    <span>30d</span>
                  </div>
                </div>
              {:else}
                <div class="shop-preview-text">
                  {#if item.css_type === 'class'}
                    {#if item.slot === 'frame'}
                      <span class="profile-name-frame {item.css_value}">Username</span>
                    {:else}
                      <span class="{item.css_value}" data-text="Username">Username</span>
                    {/if}
                  {:else if item.css_type === 'style'}
                    {#if item.slot === 'frame'}
                      <span class="profile-name-frame" style="{item.css_value}">Username</span>
                    {:else}
                      <span style="{item.css_value}" data-text="Username">Username</span>
                    {/if}
                  {/if}
                </div>
              {/if}
            </div>

            <h3>{item.name}</h3>
            {#if item.collection}
              <p class="item-collection">{item.collection}</p>
            {/if}
            <p class="item-summary featured-summary">{getItemSummary(item)}</p>
            {#if item.description && item.description !== getItemSummary(item)}
              <p class="item-desc">{item.description}</p>
            {/if}

            <div class="item-footnote">
              <span class="item-cost">{item.cost.toLocaleString()} EP</span>
              <span class="state-pill status-{getStateClass(item)}">{getStateLabel(item)}</span>
            </div>

            <div class="shop-actions">
              {#if equipped}
                <button class="shop-btn equipped" type="button" on:click={() => handleAction(item.item_key, 'unequip', item.slot)} disabled={!!loadingAction}>
                  {loadingUnequip ? 'Unequipping...' : 'Unequip'}
                </button>
              {:else if owned && item.slot !== 'consumable'}
                <button class="shop-btn owned" type="button" on:click={() => handleAction(item.item_key, 'equip')} disabled={!!loadingAction}>
                  {loadingEquip ? 'Equipping...' : 'Equip'}
                </button>
              {:else if item.cost > 0 && affordable}
                <button class="shop-btn" type="button" on:click={() => requestPurchase(item)} disabled={!!loadingAction}>
                  {loadingBuy ? 'Buying...' : 'Buy'}
                </button>
              {:else if item.cost <= 0}
                <button class="shop-btn disabled" type="button" disabled>
                  🔒 Milestone Reward
                </button>
              {:else}
                <button class="shop-btn disabled" type="button" disabled>
                  Not Enough EP
                </button>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    {/if}
  {/if}

  {#if utilityItems.length}
    <div class="shop-section-header utility-header">
      <div>
        <h3>Utility</h3>
        <p>Consumables that affect streaks or rerolls. They stay in their own section so the cosmetic catalog remains clean.</p>
      </div>
      <span class="section-count">{utilityItems.length} item{utilityItems.length === 1 ? '' : 's'}</span>
    </div>

    <div class="shop-grid utility-grid">
      {#each sortedUtilityItems as item (item.item_key)}
        {@const affordable = $walletBalance >= item.cost}
        {@const loadingBuy = isLoading('buy', item.item_key)}
        {@const count = item.item_key === 'reroll_shard' ? $rerollShards : getInventoryCount(item.item_key)}

        <div class="shop-item utility-item shop-rarity-{item.rarity || 'Common'}">
          <div class="shop-item-meta">
            <span class="state-pill slot">Utility</span>
            <span class="state-pill rarity">{item.rarity || 'Common'}</span>
          </div>

          <div class="shop-preview-area">
            <div class="utility-preview">
              {#if item.item_key === 'reroll_shard'}
                <span>+1 reroll</span>
                <strong>{count} owned</strong>
              {:else if item.item_key === 'streak_freeze'}
                <span>Protects your streak</span>
                <strong>{count} owned</strong>
                <span class="utility-note">Automatically applied if needed.</span>
              {:else}
                <span>Utility item</span>
                <strong>{count} owned</strong>
              {/if}
            </div>
          </div>

          <h3>{item.name}</h3>
          <p class="item-summary">{getItemSummary(item)}</p>
          {#if item.description && item.description !== getItemSummary(item)}
            <p class="item-desc">{item.description}</p>
          {/if}

          <div class="item-footnote">
            <span class="item-cost">{item.cost.toLocaleString()} EP</span>
            <span class="state-pill status-{getStateClass(item)}">{getStateLabel(item)}</span>
          </div>

          <div class="shop-actions">
            {#if item.cost > 0 && affordable}
              <button class="shop-btn" type="button" on:click={() => requestPurchase(item)} disabled={!!loadingAction}>
                {loadingBuy ? 'Buying...' : 'Buy'}
              </button>
            {:else if item.cost <= 0}
              <button class="shop-btn disabled" type="button" disabled>
                🔒 Milestone Reward
              </button>
            {:else}
              <button class="shop-btn disabled" type="button" disabled>
                Not Enough EP
              </button>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {/if}
  {/if}
</div>

{#if purchaseTarget}
  <div class="purchase-modal-overlay" role="presentation" on:click|self={cancelPurchase}>
    <div
      class="purchase-modal-content"
      role="dialog"
      aria-modal="true"
      aria-labelledby="purchase-modal-title"
    >
      <div class="purchase-modal-head">
        <div>
          <p class="purchase-kicker">Confirm purchase</p>
          <h3 id="purchase-modal-title">{purchaseTarget.name}</h3>
        </div>
        <span class="state-pill rarity">{purchaseTarget.rarity || 'Common'}</span>
      </div>

      <p class="purchase-summary">{selectedItemPreview}</p>
      <p class="purchase-desc">{purchaseTarget.description}</p>

      <div class="purchase-stats">
        <div>
          <span>Cost</span>
          <strong>{purchaseTarget.cost.toLocaleString()} EP</strong>
        </div>
        <div>
          <span>Your balance</span>
          <strong>{$walletBalance.toLocaleString()} EP</strong>
        </div>
        <div>
          <span>After purchase</span>
          <strong>{Math.max(0, $walletBalance - purchaseTarget.cost).toLocaleString()} EP</strong>
        </div>
      </div>

      <p class="purchase-reason">{getPurchaseReason(purchaseTarget)}</p>

      <div class="purchase-actions">
        <button class="shop-btn secondary" type="button" on:click={cancelPurchase} disabled={!!loadingAction}>
          Cancel
        </button>
        <button class="shop-btn" type="button" on:click={confirmPurchase} disabled={!!loadingAction}>
          Confirm Purchase
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .shop-intro {
    margin: 0;
    color: #e2e8ff;
    line-height: 1.6;
    font-size: 0.95rem;
    max-width: 560px;
  }

  .shop-masthead {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    margin: 4px 0 22px;
    padding: 22px 24px;
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 22px;
    background:
      radial-gradient(circle at 100% 0%, rgba(139, 124, 246, 0.16), transparent 42%),
      linear-gradient(135deg, rgba(255,255,255,0.045), rgba(255,255,255,0.012));
    box-shadow: 0 18px 42px rgba(0, 0, 0, 0.16);
    position: relative;
    overflow: hidden;
  }

  .shop-masthead::before {
    content: '';
    position: absolute;
    inset: 0 auto 0 0;
    width: 3px;
    background: var(--spectrum);
    opacity: 0.8;
  }

  .shop-masthead-copy {
    min-width: 0;
    flex: 1;
  }

  .shop-hero-pills {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 12px;
  }

  .shop-status-panel {
    display: grid;
    gap: 6px;
    margin: 18px 0 24px;
    padding: 24px;
    border: 1px solid var(--card-border);
    border-radius: 18px;
    background:
      radial-gradient(circle at top right, rgba(139, 92, 246, 0.12), transparent 38%),
      rgba(255,255,255,0.025);
    text-align: left;
  }

  .shop-status-panel strong {
    color: #fff;
    font-family: 'Space Grotesk', sans-serif;
    font-size: 1rem;
  }

  .shop-status-panel > span:last-child {
    color: var(--text-muted);
    font-size: 0.85rem;
  }

  .shop-status-eyebrow {
    color: var(--accent-purple);
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .shop-status-error {
    border-color: rgba(239, 68, 68, 0.35);
  }

  .shop-status-error .shop-status-eyebrow {
    color: #fca5a5;
  }

  .shop-retry-btn {
    justify-self: start;
    width: auto;
    margin-top: 8px;
  }

  .hero-pill {
    display: inline-flex;
    align-items: center;
    min-height: 32px;
    padding: 0 12px;
    border-radius: 999px;
    border: 1px solid rgba(255,255,255,0.08);
    background: rgba(255,255,255,0.03);
    color: var(--text-muted);
    font-size: 0.75rem;
    white-space: nowrap;
  }

  .wallet-display {
    padding: 12px 14px;
    text-align: left;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    justify-content: center;
    gap: 4px;
    flex-shrink: 0;
    min-width: 184px;
    border: 1px solid var(--card-border);
    border-radius: 16px;
    background:
      radial-gradient(circle at top right, rgba(168, 85, 247, 0.12), transparent 42%),
      rgba(255,255,255,0.02);
  }

  .wallet-label {
    color: var(--text-muted);
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    margin: 0;
    flex-shrink: 0;
  }

  .wallet-display strong {
    color: #fff;
    font-size: clamp(1.35rem, 2vw, 1.75rem);
    font-weight: 700;
    line-height: 1;
    font-family: 'Space Grotesk', sans-serif;
  }

  .shop-toolbar {
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin-bottom: 24px;
    padding: 16px 18px 14px;
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 20px;
    background: rgba(255,255,255,0.02);
  }

  .shop-tabs {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    border-bottom: 1px solid rgba(255,255,255,0.06);
    padding: 0 0 14px;
    scrollbar-width: thin;
    scrollbar-color: rgba(168, 85, 247, 0.55) transparent;
  }

  .shop-tab,
  .sort-pill {
    background: rgba(255,255,255,0.04);
    border: 1px solid var(--card-border);
    color: var(--text-muted);
    padding: 8px 12px;
    border-radius: 999px;
    cursor: pointer;
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.8rem;
    transition: all 0.2s;
    min-height: 40px;
    white-space: nowrap;
  }

  .shop-tab:hover,
  .sort-pill:hover {
    background: rgba(255,255,255,0.08);
    color: #fff;
    border-color: var(--card-border-hover);
  }

  .shop-tab.active,
  .sort-pill.active {
    background: linear-gradient(135deg, rgba(139, 92, 246, 0.92), rgba(168, 85, 247, 0.82));
    color: #fff;
    border-color: rgba(168, 85, 247, 0.55);
    box-shadow: 0 8px 18px rgba(139, 92, 246, 0.18);
  }

  .shop-tab:focus-visible,
  .sort-pill:focus-visible,
  .owned-control:focus-visible,
  .owned-group-header:focus-visible,
  .shop-btn:focus-visible {
    outline: 2px solid #c4b5fd;
    outline-offset: 3px;
  }

  .shop-sort {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 12px;
    padding: 0;
  }

  .shop-sort > span {
    color: var(--text-muted);
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .sort-pills {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .shop-section-header {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 16px;
    margin: 16px 0 18px;
    padding: 16px 18px;
    background: rgba(255,255,255,0.02);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 18px;
  }

  .shop-section-header h3 {
    margin: 0 0 6px 0;
    font-family: 'Space Grotesk', sans-serif;
    font-size: 1.15rem;
  }

  .shop-section-header p {
    margin: 0;
    color: var(--text-muted);
    font-size: 0.85rem;
    line-height: 1.45;
  }

  .section-count {
    color: var(--text-muted);
    font-size: 0.75rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .shop-empty {
    background: rgba(255,255,255,0.03);
    border: 1px solid var(--card-border);
    border-radius: 16px;
    padding: 20px;
    margin-bottom: 18px;
  }

  .shop-empty p {
    margin: 0 0 6px 0;
    color: #fff;
    font-family: 'Space Grotesk', sans-serif;
  }

  .shop-empty span {
    color: var(--text-muted);
    font-size: 0.85rem;
  }

  .owned-controls {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 16px;
  }

  .owned-control {
    background: rgba(255,255,255,0.04);
    border: 1px solid var(--card-border);
    color: var(--text-muted);
    padding: 8px 12px;
    border-radius: 999px;
    cursor: pointer;
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.8rem;
    transition: all 0.2s;
    min-height: 40px;
  }

  .owned-control:hover,
  .owned-control:focus-visible {
    background: rgba(255,255,255,0.08);
    color: #fff;
  }

  .owned-groups {
    display: grid;
    gap: 14px;
    margin-bottom: 28px;
  }

  .owned-group {
    background:
      radial-gradient(circle at top right, rgba(168, 85, 247, 0.08), transparent 32%),
      rgba(255,255,255,0.02);
    border: 1px solid var(--card-border);
    border-radius: 18px;
    padding: 14px;
    box-shadow: 0 10px 28px rgba(0, 0, 0, 0.12);
  }

  .owned-group-header {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    background: none;
    border: none;
    color: inherit;
    padding: 2px 2px 12px;
    cursor: pointer;
    text-align: left;
  }

  .owned-group-header h3 {
    margin: 0 0 4px 0;
    font-family: 'Space Grotesk', sans-serif;
    font-size: 1.05rem;
  }

  .owned-group-header p {
    margin: 0;
    color: var(--text-muted);
    font-size: 0.8rem;
  }

  .owned-group-chevron {
    color: var(--text-muted);
    font-size: 0.9rem;
    flex-shrink: 0;
  }

  .owned-grid {
    margin-bottom: 0;
  }

  .shop-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 18px;
    margin-bottom: 28px;
  }

  .featured-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 14px;
    margin-bottom: 22px;
  }

  .featured-section {
    margin-bottom: 26px;
    padding: 4px 16px 16px;
    border: 1px solid rgba(168, 85, 247, 0.18);
    border-radius: 24px;
    background:
      radial-gradient(circle at 50% 0%, rgba(139, 92, 246, 0.11), transparent 48%),
      rgba(255,255,255,0.018);
  }

  .featured-section .featured-header {
    justify-content: center;
    margin: 0 0 16px;
    padding: 18px 12px 12px;
    background: transparent;
    border: 0;
    text-align: center;
  }

  .featured-section .featured-header > div {
    max-width: 42rem;
  }

  .featured-section .featured-header h3 {
    font-size: 1.25rem;
  }

  .shop-item {
    background:
      linear-gradient(180deg, rgba(255,255,255,0.025), rgba(255,255,255,0.01)),
      rgba(19, 20, 26, 0.95);
    border: 1px solid var(--card-border);
    border-radius: 20px;
    padding: 18px;
    display: flex;
    flex-direction: column;
    min-width: 0;
    box-shadow: 0 14px 32px rgba(0, 0, 0, 0.18);
    transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
    min-height: 430px;
    text-align: left;
  }

  .shop-item:hover {
    transform: translateY(-2px);
    border-color: var(--card-border-hover);
    box-shadow: 0 18px 36px rgba(0, 0, 0, 0.24);
  }

  .featured-item {
    padding: 15px;
    min-height: 420px;
  }

  .shop-item.is-equipped {
    border-color: rgba(168, 85, 247, 0.8);
    box-shadow: 0 0 0 1px rgba(168, 85, 247, 0.25), 0 16px 32px rgba(0, 0, 0, 0.18);
  }

  .shop-item.is-owned:not(.is-equipped) {
    border-color: rgba(59, 130, 246, 0.3);
  }

  .shop-item-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 14px;
    width: 100%;
  }

  .state-pill {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 24px;
    padding: 4px 10px;
    border-radius: 999px;
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    border: 1px solid transparent;
    white-space: nowrap;
  }

  .state-pill.slot {
    background: rgba(168, 85, 247, 0.1);
    color: #d8b4fe;
    border-color: rgba(168, 85, 247, 0.18);
  }

  .state-pill.rarity {
    background: rgba(255,255,255,0.04);
    color: #fff;
    border-color: rgba(255,255,255,0.12);
  }

  .state-pill.muted {
    background: rgba(255,255,255,0.04);
    color: var(--text-muted);
    border-color: rgba(255,255,255,0.08);
  }

  .state-pill.status-available {
    background: rgba(168, 85, 247, 0.12);
    color: #ddd6fe;
    border-color: rgba(168, 85, 247, 0.24);
  }

  .state-pill.status-owned {
    background: rgba(59, 130, 246, 0.14);
    color: #bfdbfe;
    border-color: rgba(59, 130, 246, 0.24);
  }

  .state-pill.status-equipped {
    background: rgba(34, 197, 94, 0.14);
    color: #bbf7d0;
    border-color: rgba(34, 197, 94, 0.24);
  }

  .state-pill.status-unaffordable,
  .state-pill.status-milestone,
  .state-pill.status-utility {
    background: rgba(255,255,255,0.045);
    color: var(--text-muted);
    border-color: rgba(255,255,255,0.1);
  }

  .state-pill.equipped {
    background: rgba(34, 197, 94, 0.14);
    color: #86efac;
    border-color: rgba(34, 197, 94, 0.18);
  }

  .state-pill.owned {
    background: rgba(59, 130, 246, 0.14);
    color: #93c5fd;
    border-color: rgba(59, 130, 246, 0.18);
  }

  .shop-preview-area {
    height: 96px;
    margin-bottom: 16px;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 0;
    align-self: stretch;
  }

  .shop-preview-area-tall {
    height: 104px;
  }

  .shop-preview-area-roll-effect {
    height: 164px;
    border: 1px solid rgba(139, 124, 246, 0.14);
    border-radius: 18px;
    background: radial-gradient(circle at center, rgba(123, 92, 255, 0.12), rgba(6, 7, 12, 0.7) 62%, rgba(3, 4, 8, 0.9));
    overflow: hidden;
  }

  .preview-bg {
    width: 100%;
    height: 46px;
    border-radius: 10px;
    border: 1px solid var(--card-border);
    background-color: #111;
    flex-shrink: 0;
    box-sizing: border-box;
  }

  .preview-lb-row {
    width: 100%;
    min-height: 58px;
    border-radius: 14px;
    padding: 10px 12px;
    box-sizing: border-box;
    overflow: hidden;
    margin: 0;
    gap: 10px;
  }

  .preview-lb-rank {
    width: auto;
    min-width: 22px;
    font-size: 0.72rem;
  }

  .preview-lb-info {
    display: flex;
    flex-direction: column;
    gap: 3px;
    margin-left: 0;
  }

  .preview-lb-name {
    font-size: 0.76rem;
    line-height: 1.1;
  }

  .preview-lb-sub {
    color: var(--text-muted);
    font-size: 0.62rem;
    line-height: 1.1;
    white-space: nowrap;
  }

  .preview-lb-score {
    font-size: 0.74rem;
  }

  .preview-lb-row.lb-gold-theme .preview-lb-rank,
  .preview-lb-row.lb-gold-theme .preview-lb-sub {
    color: rgba(26, 26, 26, 0.72);
  }

  .preview-orb-shape {
    width: 72px;
    height: 72px;
    flex: 0 0 auto;
    background-color: #7b5cff;
    box-shadow: 0 0 0 12px rgba(123, 92, 255, 0.06);
  }

  .preview-profile-card {
    width: 100%;
    min-height: 72px;
    background:
      radial-gradient(circle at top right, rgba(123, 92, 255, 0.18), transparent 42%),
      linear-gradient(180deg, rgba(15, 15, 21, 0.98), rgba(9, 9, 14, 0.96));
    border-radius: 16px;
    border: 2px solid transparent;
    padding: 10px 12px;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    overflow: hidden;
  }

  .preview-profile-topline,
  .preview-profile-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .preview-profile-badge,
  .preview-profile-meta span {
    color: var(--text-muted);
    font-size: 0.58rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .preview-profile-dot {
    width: 8px;
    height: 8px;
    border-radius: 999px;
    background: rgba(255,255,255,0.3);
    box-shadow: 0 0 12px rgba(255,255,255,0.18);
    flex-shrink: 0;
  }

  .preview-profile-name {
    color: #fff;
    font-family: var(--font-display);
    font-size: 0.95rem;
    font-weight: 700;
  }

  .shop-preview-text {
    width: 100%;
    min-height: 76px;
    margin-bottom: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 8px;
    text-align: center;
    box-sizing: border-box;
  }

  .utility-preview {
    width: 100%;
    min-height: 68px;
    height: auto;
    padding: 10px 12px;
    border-radius: 12px;
    border: 1px solid var(--card-border);
    background: linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02));
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    text-align: center;
  }

  .utility-preview span {
    color: var(--text-muted);
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .utility-note {
    color: var(--text-muted);
    font-size: 0.64rem;
    line-height: 1.25;
    text-transform: none !important;
    letter-spacing: 0;
    max-width: 24ch;
  }

  .utility-preview strong {
    color: #fff;
    font-size: 0.9rem;
    font-family: 'Space Grotesk', sans-serif;
  }

  .shop-item h3 {
    margin: 0;
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.97rem;
    color: #fff;
    line-height: 1.2;
    min-height: 1.2em;
  }

  .item-collection {
    font-size: 0.7rem;
    color: var(--accent-purple);
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-top: 4px;
    margin-bottom: 2px;
    font-weight: 600;
  }

  .item-summary {
    color: #dbe4ff;
    font-size: 0.8rem;
    line-height: 1.45;
    margin: 6px 0 8px;
    min-height: 2.9em;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .featured-summary {
    min-height: 3.1em;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .item-desc {
    color: var(--text-muted);
    font-size: 0.75rem;
    line-height: 1.45;
    margin: 0 0 14px 0;
    overflow-wrap: anywhere;
    min-height: 2.9em;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .item-footnote {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
    margin-top: auto;
    margin-bottom: 14px;
  }

  .item-cost {
    color: var(--accent-green);
    font-family: 'JetBrains Mono';
    font-size: 0.85rem;
    white-space: nowrap;
  }

  .shop-actions {
    display: flex;
    gap: 10px;
    margin-top: auto;
  }

  .shop-btn {
    flex: 1;
    border: 1px solid transparent;
    border-radius: 12px;
    padding: 12px 14px;
    font-family: 'Space Grotesk', sans-serif;
    font-weight: 700;
    cursor: pointer;
    background: linear-gradient(135deg, rgba(139, 92, 246, 0.92), rgba(168, 85, 247, 0.86));
    color: #fff;
    transition: transform 0.15s ease, opacity 0.15s ease, background 0.2s ease, border-color 0.2s ease;
    min-height: 44px;
    box-shadow: 0 10px 18px rgba(139, 92, 246, 0.15);
  }

  .shop-btn:hover:not(:disabled) {
    transform: translateY(-1px);
    border-color: rgba(255,255,255,0.12);
  }

  .shop-btn:disabled {
    cursor: not-allowed;
    opacity: 0.7;
    transform: none;
  }

  .shop-btn.owned {
    background: rgba(59, 130, 246, 0.14);
    color: #bfdbfe;
  }

  .shop-btn.equipped {
    background: rgba(34, 197, 94, 0.18);
    color: #bbf7d0;
  }

  .shop-btn.secondary {
    background: rgba(255,255,255,0.06);
    border: 1px solid var(--card-border);
    color: #fff;
  }

  .shop-btn.disabled {
    background: rgba(255,255,255,0.05);
    color: var(--text-muted);
  }

  .utility-header {
    margin-top: 12px;
  }

  .utility-grid {
    margin-bottom: 12px;
  }

  .purchase-modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(3, 7, 18, 0.72);
    backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    z-index: 80;
  }

  .purchase-modal-content {
    width: min(560px, 100%);
    background:
      radial-gradient(circle at top right, rgba(168, 85, 247, 0.12), transparent 42%),
      linear-gradient(180deg, rgba(22, 23, 31, 0.98), rgba(17, 18, 25, 0.98));
    border: 1px solid var(--card-border);
    border-radius: 20px;
    padding: 24px;
    box-shadow: 0 24px 80px rgba(0, 0, 0, 0.5);
  }

  .purchase-modal-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 14px;
  }

  .purchase-kicker {
    margin: 0 0 6px 0;
    color: var(--accent-purple);
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    font-weight: 700;
  }

  .purchase-modal-content h3 {
    margin: 0;
    font-family: 'Space Grotesk', sans-serif;
    color: #fff;
  }

  .purchase-summary {
    margin: 0 0 8px 0;
    color: #dbe4ff;
    line-height: 1.5;
  }

  .purchase-desc {
    margin: 0 0 18px 0;
    color: var(--text-muted);
    line-height: 1.5;
    font-size: 0.9rem;
  }

  .purchase-stats {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
    margin-bottom: 16px;
  }

  .purchase-stats div {
    background: rgba(255,255,255,0.04);
    border: 1px solid var(--card-border);
    border-radius: 14px;
    padding: 12px;
  }

  .purchase-stats span {
    display: block;
    color: var(--text-muted);
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 6px;
  }

  .purchase-stats strong {
    color: #fff;
    font-family: 'Space Grotesk', sans-serif;
  }

  .purchase-reason {
    margin: 0 0 18px 0;
    color: var(--text-muted);
    font-size: 0.85rem;
    line-height: 1.5;
  }

  .purchase-actions {
    display: flex;
    gap: 10px;
    justify-content: flex-end;
  }

  @media (max-width: 900px) {
    .shop-masthead {
      flex-direction: column;
      align-items: stretch;
    }

    .wallet-display {
      align-items: flex-start;
      min-width: 0;
    }

    .featured-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .shop-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .purchase-stats {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 600px) {
    .shop-masthead {
      padding: 14px;
      gap: 12px;
    }

    .featured-section {
      padding: 2px 10px 10px;
      border-radius: 20px;
    }

    .featured-section .featured-header {
      padding: 16px 8px 10px;
    }

    .shop-intro {
      font-size: 0.9rem;
    }

    .shop-tabs {
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: none;
      flex-wrap: nowrap;
      justify-content: flex-start;
    }

    .shop-tabs::-webkit-scrollbar {
      display: none;
    }

    .shop-tab {
      flex: 0 0 auto;
    }

    .shop-sort {
      align-items: flex-start;
    }

    .shop-toolbar {
      padding: 12px 12px 10px;
      border-radius: 18px;
    }

    .shop-section-header {
      align-items: flex-start;
      flex-direction: column;
      padding: 14px 14px 15px;
    }

    .shop-grid {
      grid-template-columns: 1fr;
    }

    .featured-grid {
      grid-template-columns: 1fr;
    }

    .shop-item {
      padding: 15px 14px;
      border-radius: 18px;
      min-height: 0;
    }

    .shop-item-meta {
      margin-bottom: 12px;
    }

    .shop-preview-area {
      height: 82px;
    }

    .shop-preview-area-tall {
      height: 94px;
    }

    .shop-preview-area-roll-effect {
      height: 124px;
    }

    .wallet-display p {
      text-align: left;
      max-width: none;
    }

    .shop-item h3 {
      font-size: 0.96rem;
    }

    .item-summary,
    .item-desc {
      font-size: 0.74rem;
    }

    .shop-preview-area {
      margin-bottom: 16px;
    }

    .purchase-modal-overlay {
      align-items: flex-end;
      padding: 12px;
    }

    .purchase-modal-content {
      border-radius: 18px 18px 12px 12px;
      padding: 18px;
    }

    .purchase-actions {
      flex-direction: column;
    }

    .shop-btn {
      width: 100%;
    }
  }
</style>
