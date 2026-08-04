<script>
  import { createEventDispatcher } from 'svelte';
  import ShopItemCard from './ShopItemCard.svelte';
  import {
    SHOP_RARITIES,
    SHOP_SORTS,
    SHOP_OWNERSHIP_FILTERS,
    filterShopItems,
    getShopAccessTier,
    getShopItemState
  } from './shopCatalog.js';

  export let items = [];
  export let section = 'overview';
  /** @type {any} */
  export let selectedItem = null;
  /** @type {any} */
  export let fittingRoom = {};
  /** @type {any} */
  export let equippedItems = {};
  export let selectedSubslot = 'all';
  export let username = 'You';
  export let displayColor = '#8B7CF6';
  export let isSignedIn = false;
  export let purchaseArmedKey = '';
  export let loadingAction = null;

  const dispatch = createEventDispatcher();
  let searchQuery = '';
  let selectedCollection = 'all';
  let selectedRarity = 'all';
  let selectedOwnership = 'all';
  let affordableOnly = false;
  let sortMode = 'curated';
  let filtersOpen = false;
  let showAllItems = false;

  const INITIAL_VISIBLE_ITEMS = 18;
  $: isNameBrowse = section === 'names';
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
  $: activeFilterCount = [
    selectedCollection !== 'all',
    selectedRarity !== 'all',
    selectedOwnership !== 'all',
    affordableOnly
  ].filter(Boolean).length;
  $: displayedItems = showAllItems ? filteredItems : filteredItems.slice(0, INITIAL_VISIBLE_ITEMS);

  function stateFor(item) {
    return getShopItemState(item, equippedItems, fittingRoom);
  }

  function resetFilters() {
    searchQuery = '';
    selectedCollection = 'all';
    selectedRarity = 'all';
    selectedOwnership = 'all';
    affordableOnly = false;
    sortMode = 'curated';
    filtersOpen = false;
    showAllItems = false;
  }

  function previewItem(item) {
    dispatch('select', item);
  }

</script>

<section class="shop-browse" class:shop-browse--names={isNameBrowse} aria-label={isNameBrowse ? 'Name catalog' : 'Catalog'}>

  <div class="shop-browse-layout" id={isNameBrowse ? 'shop-name-results' : undefined}>
    <div class="shop-browse-main">
      <div class="shop-browse-toolbar">
        <label class="shop-search">
          <span aria-hidden="true">⌕</span>
          <input bind:value={searchQuery} type="search" aria-label={isNameBrowse ? 'Search name effects' : 'Search catalog'} placeholder={isNameBrowse ? 'Search fonts, materials, motion' : 'Search pieces or collections'} />
        </label>
        <label class="shop-sort"><span class="shop-filter-label">Sort</span><select bind:value={sortMode} aria-label="Sort catalog">{#each SHOP_SORTS as sort (sort.id)}<option value={sort.id}>{sort.label}</option>{/each}</select></label>
        <button type="button" class="shop-filter-toggle" aria-expanded={filtersOpen} aria-controls="shop-filter-panel" on:click={() => filtersOpen = !filtersOpen}>
          Filter{#if activeFilterCount} <span>{activeFilterCount}</span>{/if}
        </button>
      </div>

      {#if filtersOpen}
        <div id="shop-filter-panel" class="shop-filter-panel" role="region" aria-label="Catalog filters">
          <div class="shop-filter-panel__head"><strong>Filter products</strong><button type="button" on:click={() => filtersOpen = false}>Done</button></div>
          <div class="shop-filter-panel__fields">
            <label><span class="shop-filter-label">Collection</span><select bind:value={selectedCollection}><option value="all">All collections</option>{#each collections as collection (collection)}<option value={collection}>{collection}</option>{/each}</select></label>
            <label><span class="shop-filter-label">Rarity</span><select bind:value={selectedRarity}><option value="all">All rarities</option>{#each rarities as rarity (rarity)}<option value={rarity}>{rarity}</option>{/each}</select></label>
            <label><span class="shop-filter-label">Ownership</span><select bind:value={selectedOwnership}>{#each SHOP_OWNERSHIP_FILTERS as ownership (ownership.id)}<option value={ownership.id}>{ownership.label}</option>{/each}</select></label>
            <label class="shop-affordable"><input type="checkbox" bind:checked={affordableOnly} /><span>Affordable now</span></label>
          </div>
          <button type="button" class="shop-reset-link" on:click={resetFilters}>Reset all filters</button>
        </div>
      {/if}

      <div class="shop-results-header">
        <span>{filteredItems.length} piece{filteredItems.length === 1 ? '' : 's'}</span>
        {#if activeFilterCount}<button type="button" on:click={resetFilters}>Clear filters</button>{/if}
      </div>

      {#if filteredItems.length}
        <div class="shop-result-grid">
          {#each displayedItems as item (item.item_key)}
            <ShopItemCard
              {item}
              state={stateFor(item)}
              accessTier={getShopAccessTier(item)}
              isPreviewing={selectedItem?.item_key === item.item_key}
              actuallyEquipped={equippedItems[item.slot] === item.item_key}
              previewUsername={username}
              previewColor={displayColor}
              walletBalance={fittingRoom.balance}
              {isSignedIn}
              purchaseArmed={purchaseArmedKey === item.item_key}
              purchaseLoading={loadingAction === `buy:${item.item_key}`}
              on:select={event => previewItem(event.detail)}
              on:purchase={event => dispatch('purchase', event.detail)}
            />
          {/each}
        </div>
        {#if displayedItems.length < filteredItems.length}
          <button type="button" class="shop-load-more" on:click={() => showAllItems = true}>Load more pieces <span>{filteredItems.length - displayedItems.length} remaining</span></button>
        {/if}
      {:else}
        <div class="shop-empty-state">
          <span aria-hidden="true">⌕</span>
          <h3>No pieces match those filters.</h3>
          <p>Try a different search or clear the filters to see the full catalog.</p>
          <button type="button" class="shop-button shop-button--outline" on:click={resetFilters}>Reset filters</button>
        </div>
      {/if}
    </div>

  </div>
</section>

<style>
  .shop-browse { display:grid; gap:.75rem; }
  .shop-browse-layout { display:block; }
  .shop-browse-main { min-width:0; }
  .shop-browse-toolbar { display:grid; grid-template-columns:minmax(0,1fr) 9.5rem auto; gap:.6rem; align-items:end; padding-bottom:.7rem; border-bottom:1px solid var(--shop-line); }
  .shop-browse-toolbar label { min-width:0; }
  .shop-search { display:flex; align-items:center; gap:.6rem; min-height:2.8rem; padding:0 .8rem; border:1px solid #454953; border-radius:var(--radius-sm); background:#11141a; }
  .shop-search > span { color:var(--shop-accent); font-size:1.2rem; }
  .shop-search input { width:100%; min-width:0; border:0; outline:0; background:transparent; color:var(--shop-ink); font-size:.98rem; }
  .shop-search input::placeholder { color:#8e9099; }
  .shop-sort select { width:100%; min-height:2.8rem; padding:0 .7rem; border:1px solid #454953; border-radius:var(--radius-sm); background:#11141a; color:#d9d7d2; font-size:.9rem; }
  .shop-filter-toggle { min-height:2.8rem; padding:0 .85rem; border:1px solid #454953; border-radius:var(--radius-sm); background:#15181f; color:#d3d0d8; cursor:pointer; font:600 .84rem var(--shop-font); white-space:nowrap; }
  .shop-filter-toggle:hover, .shop-filter-toggle:focus-visible, .shop-filter-toggle[aria-expanded="true"] { border-color:#aeb5e5; color:#fff; }
  .shop-filter-toggle span { display:inline-grid; min-width:1.25rem; height:1.25rem; margin-left:.25rem; place-items:center; border:1px solid #6e7699; color:#cdd2ff; }
  .shop-filter-panel { position:relative; z-index:3; display:grid; gap:1rem; margin-top:.75rem; padding:1.15rem; border:1px solid #4a4d57; border-radius:var(--radius-sm); background:var(--shop-raised); box-shadow:0 1rem 3rem rgba(0,0,0,.28); }
  .shop-filter-panel__head { display:flex; align-items:center; justify-content:space-between; gap:1rem; }
  .shop-filter-panel__head strong { color:var(--shop-ink); font-size:.98rem; }
  .shop-filter-panel__head button { padding:0; border:0; background:transparent; color:var(--shop-accent); cursor:pointer; font:.74rem var(--shop-mono); }
  .shop-filter-label { display:block; margin:0 0 .4rem .1rem; color:var(--shop-faint); font:.7rem var(--shop-mono); letter-spacing:.08em; text-transform:uppercase; }
  .shop-filter-panel__fields { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:.7rem; }
  .shop-filter-panel__fields select { width:100%; min-height:2.65rem; padding:0 .6rem; border:1px solid #3d404a; border-radius:var(--radius-sm); background:var(--shop-deep); color:var(--shop-muted); font-size:.84rem; }
  .shop-affordable { display:flex!important; align-items:center; gap:.45rem; min-height:2.6rem; color:var(--shop-muted); font-size:.84rem; white-space:nowrap; }
  .shop-reset-link { width:max-content; margin-top:.1rem; padding:0; border:0; background:transparent; color:var(--shop-accent); font:.74rem var(--shop-mono); cursor:pointer; text-align:left; }
  .shop-results-header { display:flex; align-items:center; justify-content:space-between; gap:1rem; padding:.7rem 0 .55rem; color:var(--shop-faint); font:.74rem var(--shop-mono); letter-spacing:.05em; text-transform:uppercase; }
  .shop-results-header button { padding:0; border:0; background:transparent; color:var(--shop-accent); cursor:pointer; font:inherit; text-transform:none; }
  .shop-result-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:.75rem; }
  .shop-load-more { display:flex; align-items:center; justify-content:center; gap:.55rem; width:100%; min-height:2.8rem; margin-top:.75rem; border:1px solid var(--shop-line-strong); border-radius:var(--radius-sm); background:#11141a; color:var(--shop-ink); cursor:pointer; font:.76rem var(--shop-mono); }
  .shop-load-more:hover, .shop-load-more:focus-visible { border-color:#aeb5e5; background:#171a22; }
  .shop-load-more span { color:var(--shop-muted); }
  .shop-empty-state { display:grid; justify-items:start; gap:.55rem; min-height:13rem; align-content:center; padding:1.6rem; border:1px solid var(--shop-line); background:#0a0c10; }
  .shop-empty-state > span { color:#cdd2ff; font-size:1.7rem; }
  .shop-empty-state h3 { margin:0; font-size:1.2rem; }
  .shop-empty-state p { margin:0 0 .5rem; color:#aaa8b0; }
  .shop-button { display:inline-flex; align-items:center; justify-content:center; min-height:2.7rem; padding:0 .9rem; border-radius:5px; font-weight:650; text-decoration:none; cursor:pointer; }
  .shop-button--outline { border:1px solid #4a4d57; background:#121419; color:#d3d0d8; }
  @media (max-width: 760px) { .shop-browse-toolbar { grid-template-columns:minmax(0,1fr) 8rem; } .shop-filter-toggle { grid-column:1 / -1; } .shop-filter-panel__fields { grid-template-columns:repeat(2,minmax(0,1fr)); } .shop-result-grid { grid-template-columns:repeat(2,minmax(0,1fr)); } }
  @media (max-width: 520px) { .shop-browse-toolbar { grid-template-columns:1fr; } .shop-filter-toggle { grid-column:auto; } .shop-filter-panel__fields { grid-template-columns:1fr; } .shop-result-grid { grid-template-columns:1fr; } }
</style>
