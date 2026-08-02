<script>
  import { createEventDispatcher } from 'svelte';
  import ShopItemCard from './ShopItemCard.svelte';
  import {
    SHOP_RARITIES,
    SHOP_SECTIONS,
    SHOP_SORTS,
    SHOP_SUBSECTIONS,
    SHOP_OWNERSHIP_FILTERS,
    filterShopItems,
    getShopAccessTier,
    getShopItemState,
    hasShopEntitlement
  } from './shopCatalog.js';

  export let items = [];
  export let section = 'overview';
  /** @type {any} */
  export let fittingRoom = {};
  /** @type {any} */
  export let equippedItems = {};
  /** @type {any} */
  export let profile = null;
  /** @type {any} */
  export let currentRoll = null;
  /** @type {any} */
  export let loadingAction = null;
  /** @type {any} */
  export let purchaseArmedKey = null;
  export let isSignedIn = false;

  const dispatch = createEventDispatcher();
  let searchQuery = '';
  let selectedSubslot = 'all';
  let selectedCollection = 'all';
  let selectedRarity = 'all';
  let selectedOwnership = 'all';
  let affordableOnly = false;
  let sortMode = 'curated';

  const availableSections = SHOP_SECTIONS.filter(item => item.id !== 'owned');
  $: subsections = SHOP_SUBSECTIONS[section] || [];
  $: collections = [...new Set(items.map(item => item.collection).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  $: rarities = [...new Set(items.map(item => item.rarity).filter(Boolean))]
    .sort((a, b) => ['Common', ...SHOP_RARITIES].indexOf(a) - ['Common', ...SHOP_RARITIES].indexOf(b));
  $: filteredItems = filterShopItems(items, {
    section,
    subslot: selectedSubslot,
    query: searchQuery,
    collection: selectedCollection,
    rarity: selectedRarity,
    ownership: selectedOwnership,
    affordableOnly,
    sortMode
  }, fittingRoom);
  $: username = profile?.display_name || profile?.username || 'Your profile';
  $: displayColor = currentRoll?.hex_code || profile?.mood_color || '#8B7CF6';
  $: displayRarity = currentRoll?.rarity || 'Current roll';

  function stateFor(item) {
    return getShopItemState(item, equippedItems, fittingRoom);
  }

  function canPurchase(item) {
    const accessTier = getShopAccessTier(item);
    const ownedCount = fittingRoom.inventoryCounts?.[item.item_key] || 0;
    return isSignedIn
      && accessTier === 'earned'
      && item.cost > 0
      && fittingRoom.balance >= item.cost
      && (item.slot === 'consumable' || ownedCount === 0);
  }

  function resetFilters() {
    searchQuery = '';
    selectedSubslot = 'all';
    selectedCollection = 'all';
    selectedRarity = 'all';
    selectedOwnership = 'all';
    affordableOnly = false;
    sortMode = 'curated';
  }
</script>

<section class="shop-browse" aria-labelledby="shop-browse-title">
  <div class="shop-surface-heading">
    <div>
      <span class="shop-eyebrow">Browse the catalog</span>
      <h2 id="shop-browse-title">Find the piece that changes the page.</h2>
      <p>{filteredItems.length} live catalog item{filteredItems.length === 1 ? '' : 's'} across profile, roll, leaderboard, and utility.</p>
    </div>
    <button type="button" class="shop-text-link" on:click={resetFilters}>Reset filters</button>
  </div>

  <div class="shop-browse-layout">
    <aside class="shop-browse-filters" aria-label="Catalog filters">
      <div class="shop-filter-group">
        <span class="shop-filter-label">Category</span>
        <div class="shop-filter-list">
          {#each availableSections as category (category.id)}
            <button type="button" class:active={section === category.id} on:click={() => dispatch('section', category.id)}>
              <span>{category.id === 'overview' ? 'All items' : category.label}</span>
              <small>{category.id === 'overview' ? items.length : items.filter(item => category.id === 'overview' || (category.id === 'profile' ? ['name_effect', 'frame', 'profile_border', 'profile_bg', 'profile_atmosphere'].includes(item.slot) : category.id === 'roll' ? ['orb_shape', 'roll_effect'].includes(item.slot) : category.id === 'leaderboard' ? item.slot === 'lb_theme' : item.slot === 'consumable')).length}</small>
            </button>
          {/each}
        </div>
      </div>

      {#if subsections.length}
        <div class="shop-filter-group">
          <span class="shop-filter-label">Surface</span>
          <div class="shop-filter-list shop-filter-list--compact">
            {#each subsections as subslot (subslot.id)}
              <button type="button" class:active={selectedSubslot === subslot.id} on:click={() => selectedSubslot = subslot.id}>{subslot.label}</button>
            {/each}
          </div>
        </div>
      {/if}

      <div class="shop-filter-group">
        <label><span class="shop-filter-label">Collection</span><select bind:value={selectedCollection}><option value="all">All collections</option>{#each collections as collection (collection)}<option value={collection}>{collection}</option>{/each}</select></label>
        <label><span class="shop-filter-label">Rarity</span><select bind:value={selectedRarity}><option value="all">All rarities</option>{#each rarities as rarity (rarity)}<option value={rarity}>{rarity}</option>{/each}</select></label>
        <label><span class="shop-filter-label">Ownership</span><select bind:value={selectedOwnership}>{#each SHOP_OWNERSHIP_FILTERS as ownership (ownership.id)}<option value={ownership.id}>{ownership.label}</option>{/each}</select></label>
        <label class="shop-affordable"><input type="checkbox" bind:checked={affordableOnly} /><span>Affordable now</span></label>
      </div>

      <button type="button" class="shop-reset-link" on:click={resetFilters}>Reset all filters</button>
    </aside>

    <div class="shop-browse-main">
      <div class="shop-browse-toolbar">
        <label class="shop-search">
          <span aria-hidden="true">⌕</span>
          <span class="visually-hidden">Search the catalog</span>
          <input bind:value={searchQuery} type="search" placeholder="Search names, collections, or surfaces" />
        </label>
        <label class="shop-sort"><span class="shop-filter-label">Sort</span><select bind:value={sortMode}>{#each SHOP_SORTS as sort (sort.id)}<option value={sort.id}>{sort.label}</option>{/each}</select></label>
      </div>

      {#if filteredItems.length}
        <div class="shop-result-count"><span>{filteredItems.length} result{filteredItems.length === 1 ? '' : 's'}</span><span>Live catalog</span></div>
        <div class="shop-result-grid">
          {#each filteredItems as item (item.item_key)}
            <ShopItemCard
              {item}
              state={stateFor(item)}
              accessTier={getShopAccessTier(item)}
              hasAccess={hasShopEntitlement(item, fittingRoom)}
              canPurchase={canPurchase(item)}
              isPreviewing={false}
              actuallyEquipped={equippedItems[item.slot] === item.item_key}
              ownedCount={fittingRoom.inventoryCounts?.[item.item_key] || 0}
              itemBusy={loadingAction?.endsWith(`:${item.item_key}`)}
              purchaseArmed={purchaseArmedKey === item.item_key}
              {isSignedIn}
              previewUsername={username}
              previewColor={displayColor}
              previewRarity={displayRarity}
              on:select={event => dispatch('select', event.detail)}
              on:purchase={event => dispatch('purchase', event.detail)}
            />
          {/each}
        </div>
      {:else}
        <div class="shop-empty-state">
          <span aria-hidden="true">◇</span>
          <h3>No catalog pieces match those filters.</h3>
          <p>Try another collection, rarity, or ownership state.</p>
          <button type="button" class="shop-button shop-button--outline" on:click={resetFilters}>Reset filters</button>
        </div>
      {/if}
    </div>
  </div>
</section>

<style>
  .shop-browse { display:grid; gap:1.15rem; }
  .shop-surface-heading { display:flex; align-items:end; justify-content:space-between; gap:1.5rem; padding-bottom:1.2rem; border-bottom:1px solid var(--shop-line); }
  .shop-surface-heading h2 { max-width:52rem; margin:.45rem 0 .6rem; font:650 clamp(2.15rem,4.3vw,4.7rem)/.94 var(--font-display); letter-spacing:-.05em; }
  .shop-surface-heading p { margin:0; color:#aaa8b0; font-size:.9rem; line-height:1.5; }
  .shop-eyebrow { color:#858690; font:500 .7rem/1.3 var(--font-mono-stack); letter-spacing:.13em; text-transform:uppercase; }
  .shop-text-link { padding:.5rem 0; border:0; background:transparent; color:#cdd2ff; font:.72rem var(--font-mono-stack); cursor:pointer; white-space:nowrap; }
  .shop-browse-layout { display:grid; grid-template-columns:12rem minmax(0,1fr); gap:1.15rem; padding-top:.15rem; }
  .shop-browse-filters { align-self:start; padding-right:1rem; border-right:1px solid var(--shop-line); }
  .shop-filter-group + .shop-filter-group { margin-top:1.2rem; padding-top:1rem; border-top:1px solid var(--shop-line); }
  .shop-filter-list { display:grid; gap:.15rem; }
  .shop-filter-list button { display:flex; align-items:center; justify-content:space-between; gap:.5rem; width:100%; min-height:2.15rem; padding:0 .55rem; border:0; border-radius:4px; background:transparent; color:#9698a1; cursor:pointer; text-align:left; }
  .shop-filter-list button:hover, .shop-filter-list button:focus-visible, .shop-filter-list button.active { background:#16181e; color:#fff; }
  .shop-filter-list button small { color:#696b73; font: .62rem var(--font-mono-stack); }
  .shop-filter-list--compact button { justify-content:flex-start; min-height:1.95rem; padding-left:.2rem; font-size:.8rem; }
  .shop-filter-group label { display:block; margin-top:.8rem; }
  .shop-filter-group label:first-of-type { margin-top:0; }
  .shop-filter-label { display:block; margin:0 0 .35rem .1rem; color:#777983; font:.65rem var(--font-mono-stack); letter-spacing:.08em; text-transform:uppercase; }
  .shop-filter-group select { width:100%; min-height:2.45rem; padding:0 .5rem; border:1px solid #3d404a; border-radius:4px; background:#111319; color:#aaa8b0; font-size:.78rem; }
  .shop-reset-link { margin-top:1rem; padding:0; border:0; background:transparent; color:#cdd2ff; font:.67rem var(--font-mono-stack); cursor:pointer; text-align:left; }
  .shop-browse-main { min-width:0; }
  .shop-browse-toolbar { display:grid; grid-template-columns:minmax(0,1fr) 10rem; gap:.65rem; align-items:end; padding-bottom:.85rem; border-bottom:1px solid var(--shop-line); }
  .shop-browse-toolbar label { min-width:0; }
  .shop-search { display:flex; align-items:center; gap:.6rem; min-height:2.7rem; padding:0 .8rem; border:1px solid #4a4d57; border-radius:5px; background:#121419; }
  .shop-search span { color:#cdd2ff; font-size:1.1rem; }
  .shop-search input { width:100%; min-width:0; border:0; outline:0; background:transparent; color:#f2f0eb; font-size:.9rem; }
  .shop-sort select { width:100%; min-height:2.7rem; padding:0 .65rem; border:1px solid #4a4d57; border-radius:5px; background:#121419; color:#d9d7d2; font-size:.82rem; }
  .shop-affordable { display:flex!important; align-items:center; gap:.45rem; min-height:2.4rem; color:#aaa8b0; font-size:.78rem; white-space:nowrap; }
  .shop-result-count { display:flex; justify-content:space-between; gap:1rem; padding:.8rem 0 .55rem; color:#777983; font:.65rem var(--font-mono-stack); letter-spacing:.05em; text-transform:uppercase; }
  .shop-result-grid { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:.75rem; }
  .shop-empty-state { display:grid; justify-items:start; gap:.55rem; min-height:15rem; align-content:center; padding:2rem; border:1px solid var(--shop-line); background:#0a0c10; }
  .shop-empty-state > span { color:#cdd2ff; font-size:2rem; }
  .shop-empty-state h3 { margin:0; font-size:1.2rem; }
  .shop-empty-state p { margin:0 0 .5rem; color:#aaa8b0; }
  .shop-button { display:inline-flex; align-items:center; justify-content:center; min-height:2.7rem; padding:0 .9rem; border-radius:5px; font-weight:650; text-decoration:none; cursor:pointer; }
  .shop-button--outline { border:1px solid #4a4d57; background:#121419; color:#d3d0d8; }
  @media (max-width: 1100px) { .shop-browse-layout { grid-template-columns:10.5rem minmax(0,1fr); } .shop-result-grid { grid-template-columns:repeat(3,minmax(0,1fr)); } }
  @media (max-width: 760px) { .shop-surface-heading { align-items:flex-start; flex-direction:column; } .shop-browse-layout { grid-template-columns:1fr; } .shop-browse-filters { padding:0 0 1rem; border-right:0; border-bottom:1px solid var(--shop-line); } .shop-filter-list { grid-template-columns:repeat(2,minmax(0,1fr)); } .shop-filter-group:last-of-type { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:.65rem; } .shop-filter-group:last-of-type label, .shop-filter-group:last-of-type label:first-of-type { margin-top:0; } .shop-affordable { grid-column:1 / -1; } .shop-browse-toolbar { grid-template-columns:1fr 9rem; } .shop-result-grid { grid-template-columns:repeat(2,minmax(0,1fr)); } }
  @media (max-width: 520px) { .shop-filter-list { grid-template-columns:1fr 1fr; } .shop-filter-group:last-of-type { grid-template-columns:1fr; } .shop-browse-toolbar { grid-template-columns:1fr; } .shop-result-grid { grid-template-columns:1fr; } }
</style>
