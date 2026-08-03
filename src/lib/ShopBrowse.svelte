<script>
  import { createEventDispatcher } from 'svelte';
  import ShopCategoryNav from './ShopCategoryNav.svelte';
  import ShopContextualPreview from './ShopContextualPreview.svelte';
  import ShopItemCard from './ShopItemCard.svelte';
  import {
    SHOP_RARITIES,
    SHOP_NAME_SUBTYPES,
    SHOP_SECTIONS,
    SHOP_SORTS,
    SHOP_SUBSECTIONS,
    SHOP_OWNERSHIP_FILTERS,
    filterShopItems,
    getShopAccessTier,
    getShopItemState,
    tryOnShopItem
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
  export let profileConfig = null;
  /** @type {any} */
  export let currentRoll = null;

  const dispatch = createEventDispatcher();
  let searchQuery = '';
  let selectedSubslot = 'all';
  let selectedCollection = 'all';
  let selectedRarity = 'all';
  let selectedOwnership = 'all';
  let affordableOnly = false;
  let sortMode = 'curated';
  let filtersOpen = false;
  let previewedItem = null;

  const availableSections = SHOP_SECTIONS.filter(item => item.id !== 'owned');
  $: subsections = SHOP_SUBSECTIONS[section] || [];
  $: if (section === 'names' && selectedSubslot === 'all') selectedSubslot = 'name_font';
  $: if (section !== 'names' && SHOP_NAME_SUBTYPES.some(subtype => subtype.id === selectedSubslot)) selectedSubslot = 'all';
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
  $: previewLoadout = previewedItem?.slot
    ? tryOnShopItem(equippedItems, previewedItem)
    : { ...(equippedItems || {}) };
  $: activeFilterCount = [
    selectedSubslot !== 'all',
    selectedCollection !== 'all',
    selectedRarity !== 'all',
    selectedOwnership !== 'all',
    affordableOnly
  ].filter(Boolean).length;

  function stateFor(item) {
    return getShopItemState(item, equippedItems, fittingRoom);
  }

  function resetFilters() {
    searchQuery = '';
    selectedSubslot = 'all';
    selectedCollection = 'all';
    selectedRarity = 'all';
    selectedOwnership = 'all';
    affordableOnly = false;
    sortMode = 'curated';
    filtersOpen = false;
  }

  function selectSection(nextSection) {
    selectedSubslot = nextSection === 'names' ? 'name_font' : 'all';
    previewedItem = null;
    filtersOpen = false;
    dispatch('section', nextSection);
  }

  function previewItem(item) {
    previewedItem = item;
  }
</script>

<section class="shop-browse" aria-labelledby="shop-browse-title">
  <div class="shop-surface-heading">
    <div>
      <span class="shop-eyebrow">Browse the catalog</span>
      <h2 id="shop-browse-title">Find the piece that changes the page.</h2>
    <p>{filteredItems.length} active catalog item{filteredItems.length === 1 ? '' : 's'} for names, borders, and utility.</p>
    </div>
    <button type="button" class="shop-text-link" on:click={resetFilters}>Reset filters</button>
  </div>

  <ShopCategoryNav
    sections={availableSections}
    activeId={section}
    ariaLabel="Catalog categories"
    on:select={event => selectSection(event.detail)}
  />

  {#if section === 'names'}
    <ShopCategoryNav
      sections={SHOP_NAME_SUBTYPES}
      activeId={selectedSubslot}
      ariaLabel="Name catalog layers"
      on:select={event => { selectedSubslot = event.detail; previewedItem = null; }}
    />
  {/if}

  <div class="shop-browse-layout">
    <div class="shop-browse-main">
      <div class="shop-browse-toolbar">
        <label class="shop-search">
          <span aria-hidden="true">⌕</span>
          <span class="visually-hidden">Search the catalog</span>
          <input bind:value={searchQuery} type="search" placeholder="Search names, collections, or surfaces" />
        </label>
        <label class="shop-sort"><span class="shop-filter-label">Sort</span><select bind:value={sortMode}>{#each SHOP_SORTS as sort (sort.id)}<option value={sort.id}>{sort.label}</option>{/each}</select></label>
        <button type="button" class="shop-filter-toggle" aria-expanded={filtersOpen} aria-controls="shop-filter-panel" on:click={() => filtersOpen = !filtersOpen}>
          Filters{#if activeFilterCount} <span>{activeFilterCount}</span>{/if}
        </button>
      </div>

      {#if filtersOpen}
        <div id="shop-filter-panel" class="shop-filter-panel" role="region" aria-label="Catalog filters">
          <div class="shop-filter-panel__head"><strong>Refine catalog</strong><button type="button" on:click={() => filtersOpen = false}>Done</button></div>
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
          <div class="shop-filter-panel__fields">
            <label><span class="shop-filter-label">Collection</span><select bind:value={selectedCollection}><option value="all">All collections</option>{#each collections as collection (collection)}<option value={collection}>{collection}</option>{/each}</select></label>
            <label><span class="shop-filter-label">Rarity</span><select bind:value={selectedRarity}><option value="all">All rarities</option>{#each rarities as rarity (rarity)}<option value={rarity}>{rarity}</option>{/each}</select></label>
            <label><span class="shop-filter-label">Ownership</span><select bind:value={selectedOwnership}>{#each SHOP_OWNERSHIP_FILTERS as ownership (ownership.id)}<option value={ownership.id}>{ownership.label}</option>{/each}</select></label>
            <label class="shop-affordable"><input type="checkbox" bind:checked={affordableOnly} /><span>Affordable now</span></label>
          </div>
          <button type="button" class="shop-reset-link" on:click={resetFilters}>Reset all filters</button>
        </div>
      {/if}

      {#if filteredItems.length}
        <div class="shop-result-count"><span>{filteredItems.length} result{filteredItems.length === 1 ? '' : 's'}</span><span>Live catalog</span></div>
        <div class="shop-result-grid">
          {#each filteredItems as item (item.item_key)}
            <ShopItemCard
              {item}
              state={stateFor(item)}
              accessTier={getShopAccessTier(item)}
              isPreviewing={previewedItem?.item_key === item.item_key}
              actuallyEquipped={equippedItems[item.slot] === item.item_key}
              previewUsername={username}
              previewColor={displayColor}
              on:select={event => dispatch('select', event.detail)}
              on:preview={event => previewItem(event.detail)}
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

    <ShopContextualPreview
      loadout={previewLoadout}
      selectedItem={previewedItem}
      username={username}
      displayColor={displayColor}
      accountProfile={profile}
      {profileConfig}
      on:reset={() => previewedItem = null}
    />
  </div>
</section>

<style>
  .shop-browse { display:grid; gap:1.15rem; }
  .shop-surface-heading { display:flex; align-items:end; justify-content:space-between; gap:1.5rem; padding-bottom:1.2rem; border-bottom:1px solid var(--shop-line); }
  .shop-surface-heading h2 { max-width:52rem; margin:.45rem 0 .6rem; font:650 clamp(2rem,3.5vw,3.4rem)/.95 var(--font-display); letter-spacing:-.05em; }
  .shop-surface-heading p { margin:0; color:#aaa8b0; font-size:.9rem; line-height:1.5; }
  .shop-eyebrow { color:#858690; font:500 .7rem/1.3 var(--font-mono-stack); letter-spacing:.13em; text-transform:uppercase; }
  .shop-text-link { padding:.5rem 0; border:0; background:transparent; color:#cdd2ff; font:.72rem var(--font-mono-stack); cursor:pointer; white-space:nowrap; }
  .shop-browse-layout { display:grid; grid-template-columns:minmax(0,1fr) minmax(19rem,25rem); gap:1rem; align-items:start; padding-top:.15rem; }
  .shop-browse-main { min-width:0; }
  .shop-browse-toolbar { display:grid; grid-template-columns:minmax(0,1fr) 9.5rem auto; gap:.65rem; align-items:end; padding-bottom:.85rem; border-bottom:1px solid var(--shop-line); }
  .shop-browse-toolbar label { min-width:0; }
  .shop-search { display:flex; align-items:center; gap:.6rem; min-height:2.7rem; padding:0 .8rem; border:1px solid #4a4d57; border-radius:4px; background:#121419; }
  .shop-search span { color:#cdd2ff; font-size:1.1rem; }
  .shop-search input { width:100%; min-width:0; border:0; outline:0; background:transparent; color:#f2f0eb; font-size:.9rem; }
  .shop-sort select { width:100%; min-height:2.7rem; padding:0 .65rem; border:1px solid #4a4d57; border-radius:4px; background:#121419; color:#d9d7d2; font-size:.82rem; }
  .shop-filter-toggle { min-height:2.7rem; padding:0 .75rem; border:1px solid #4a4d57; background:#16181e; color:#d3d0d8; cursor:pointer; font:.7rem var(--font-mono-stack); white-space:nowrap; }
  .shop-filter-toggle:hover, .shop-filter-toggle:focus-visible, .shop-filter-toggle[aria-expanded="true"] { border-color:#aeb5e5; color:#fff; }
  .shop-filter-toggle span { display:inline-grid; min-width:1.25rem; height:1.25rem; margin-left:.25rem; place-items:center; border:1px solid #6e7699; color:#cdd2ff; }
  .shop-filter-panel { position:relative; z-index:3; display:grid; gap:.9rem; margin-top:.65rem; padding:1rem; border:1px solid #4a4d57; background:#111319; box-shadow:0 1rem 3rem rgba(0,0,0,.28); }
  .shop-filter-panel__head { display:flex; align-items:center; justify-content:space-between; gap:1rem; }
  .shop-filter-panel__head strong { color:#f2f0eb; font-size:.9rem; }
  .shop-filter-panel__head button { padding:0; border:0; background:transparent; color:#cdd2ff; cursor:pointer; font:.67rem var(--font-mono-stack); }
  .shop-filter-panel > .shop-filter-group { padding-top:.85rem; border-top:1px solid var(--shop-line); }
  .shop-filter-list { display:grid; gap:.15rem; }
  .shop-filter-list--compact { grid-template-columns:repeat(3,minmax(0,1fr)); }
  .shop-filter-list button { display:flex; align-items:center; justify-content:flex-start; gap:.5rem; width:100%; min-height:2.15rem; padding:0 .55rem; border:0; background:transparent; color:#9698a1; cursor:pointer; text-align:left; }
  .shop-filter-list button:hover, .shop-filter-list button:focus-visible, .shop-filter-list button.active { background:#16181e; color:#fff; }
  .shop-filter-label { display:block; margin:0 0 .35rem .1rem; color:#777983; font:.65rem var(--font-mono-stack); letter-spacing:.08em; text-transform:uppercase; }
  .shop-filter-panel__fields { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:.7rem; }
  .shop-filter-panel__fields select { width:100%; min-height:2.45rem; padding:0 .5rem; border:1px solid #3d404a; border-radius:4px; background:#0b0d11; color:#aaa8b0; font-size:.78rem; }
  .shop-affordable { display:flex!important; align-items:center; gap:.45rem; min-height:2.4rem; color:#aaa8b0; font-size:.78rem; white-space:nowrap; }
  .shop-reset-link { width:max-content; margin-top:.1rem; padding:0; border:0; background:transparent; color:#cdd2ff; font:.67rem var(--font-mono-stack); cursor:pointer; text-align:left; }
  .shop-result-count { display:flex; justify-content:space-between; gap:1rem; padding:.8rem 0 .55rem; color:#777983; font:.65rem var(--font-mono-stack); letter-spacing:.05em; text-transform:uppercase; }
  .shop-result-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:.75rem; }
  .shop-empty-state { display:grid; justify-items:start; gap:.55rem; min-height:15rem; align-content:center; padding:2rem; border:1px solid var(--shop-line); background:#0a0c10; }
  .shop-empty-state > span { color:#cdd2ff; font-size:2rem; }
  .shop-empty-state h3 { margin:0; font-size:1.2rem; }
  .shop-empty-state p { margin:0 0 .5rem; color:#aaa8b0; }
  .shop-button { display:inline-flex; align-items:center; justify-content:center; min-height:2.7rem; padding:0 .9rem; border-radius:5px; font-weight:650; text-decoration:none; cursor:pointer; }
  .shop-button--outline { border:1px solid #4a4d57; background:#121419; color:#d3d0d8; }
  @media (max-width: 1180px) { .shop-browse-layout { grid-template-columns:minmax(0,1fr) minmax(17rem,21rem); } .shop-result-grid { grid-template-columns:repeat(2,minmax(0,1fr)); } }
  @media (max-width: 960px) { .shop-browse-layout { grid-template-columns:1fr; } .shop-browse-layout :global(.shop-contextual-preview) { order:-1; } .shop-result-grid { grid-template-columns:repeat(3,minmax(0,1fr)); } }
  @media (max-width: 760px) { .shop-surface-heading { align-items:flex-start; flex-direction:column; } .shop-browse-toolbar { grid-template-columns:minmax(0,1fr) 8rem; } .shop-filter-toggle { grid-column:1 / -1; } .shop-filter-panel__fields { grid-template-columns:repeat(2,minmax(0,1fr)); } .shop-result-grid { grid-template-columns:repeat(2,minmax(0,1fr)); } }
  @media (max-width: 520px) { .shop-browse-toolbar { grid-template-columns:1fr; } .shop-filter-toggle { grid-column:auto; } .shop-filter-list--compact, .shop-filter-panel__fields { grid-template-columns:1fr; } .shop-result-grid { grid-template-columns:1fr; } }
</style>
