<script>
  import { createEventDispatcher } from 'svelte';
  import ShopItemCard from './ShopItemCard.svelte';
  import {
    SHOP_NAME_SLOTS,
    getShopAccessTier,
    getShopItemState,
    hasShopEntitlement,
    isShopCosmetic
  } from './shopCatalog.js';

  export let items = [];
  /** @type {any} */
  export let fittingRoom = {};
  /** @type {any} */
  export let equippedItems = {};
  /** @type {any} */
  export let profile = null;
  /** @type {any} */
  export let currentRoll = null;
  export let isSignedIn = false;
  export let purchaseArmedKey = '';
  export let loadingAction = null;

  const dispatch = createEventDispatcher();
  const collectionSections = Object.freeze([
    { id: 'all', label: 'All pieces' },
    { id: 'names', label: 'Names' },
    { id: 'profile_border', label: 'Borders' },
    { id: 'utility', label: 'Utility' }
  ]);
  let selectedCollectionSection = 'all';
  let searchQuery = '';

  $: ownedItems = items
    .filter(item => {
      const ownedCount = fittingRoom.inventoryCounts?.[item.item_key] || 0;
      const equipped = equippedItems[item.slot] === item.item_key;
      const entitled = item.access_tier === 'premium' && hasShopEntitlement(item, fittingRoom);
      return (ownedCount > 0 || equipped || entitled) && (isShopCosmetic(item) || item.slot === 'consumable');
    })
    .sort((left, right) => (left.slot === 'consumable' ? 1 : 0) - (right.slot === 'consumable' ? 1 : 0) || left.name.localeCompare(right.name));
  $: consumables = items.filter(item => item.slot === 'consumable' && (fittingRoom.inventoryCounts?.[item.item_key] || 0) > 0);
  $: visibleOwnedItems = ownedItems
    .filter(item => collectionSectionMatches(item, selectedCollectionSection))
    .filter(item => {
      const query = searchQuery.trim().toLowerCase();
      return !query || [item.name, item.collection, item.description].filter(Boolean).some(value => String(value).toLowerCase().includes(query));
    });
  $: username = profile?.display_name || profile?.username || 'Your profile';
  $: displayColor = currentRoll?.hex_code || profile?.mood_color || '#8B7CF6';

  function collectionSectionMatches(item, section) {
    if (section === 'all') return true;
    if (section === 'utility') return item.slot === 'consumable';
    if (section === 'names') return SHOP_NAME_SLOTS.includes(item.slot);
    if (['name_font', 'name_material', 'name_motion', 'profile_border'].includes(section)) return item.slot === section;
    return false;
  }

</script>

<section class="shop-collection" id="collection" aria-labelledby="shop-collection-title">
  <div class="shop-surface-heading">
    <div>
      <span class="shop-eyebrow">Owned</span>
      <h2 id="shop-collection-title">Pieces you own.</h2>
      <p>Your equipped look and earned expression, in one place.</p>
    </div>
    <a class="shop-button shop-button--outline" href="/profile/settings">Open profile settings ↗</a>
  </div>

  {#if consumables.length}
    <section class="shop-quantity-strip" aria-labelledby="shop-quantity-title">
      <div><span class="shop-eyebrow">Utility</span><h3 id="shop-quantity-title">Progress you can carry.</h3></div>
      <div class="shop-quantity-list">
        {#each consumables as item (item.item_key)}
          <div class="shop-quantity-item"><strong>{fittingRoom.inventoryCounts[item.item_key]}</strong><span>{item.name}</span></div>
        {/each}
      </div>
    </section>
  {/if}

  <nav class="shop-collection-tabs" aria-label="Owned categories">
    {#each collectionSections as collectionSection (collectionSection.id)}
      <button type="button" class:active={selectedCollectionSection === collectionSection.id} on:click={() => selectedCollectionSection = collectionSection.id}>{collectionSection.label}</button>
    {/each}
  </nav>

  <div class="shop-collection-toolbar">
    <label class="shop-collection-search">
      <span aria-hidden="true">⌕</span>
      <span class="visually-hidden">Search your collection</span>
      <input bind:value={searchQuery} type="search" placeholder="Search your pieces" />
    </label>
    <span>{visibleOwnedItems.length} owned piece{visibleOwnedItems.length === 1 ? '' : 's'}</span>
  </div>

  {#if visibleOwnedItems.length}
    <div class="shop-result-grid shop-result-grid--collection">
      {#each visibleOwnedItems as item (item.item_key)}
        <ShopItemCard
          {item}
          state={getShopItemState(item, equippedItems, fittingRoom)}
          accessTier={getShopAccessTier(item)}
          isPreviewing={false}
          actuallyEquipped={equippedItems[item.slot] === item.item_key}
          previewUsername={username}
          previewColor={displayColor}
          walletBalance={fittingRoom.balance}
          {isSignedIn}
          purchaseArmed={purchaseArmedKey === item.item_key}
          purchaseLoading={loadingAction === `buy:${item.item_key}`}
          on:select={event => dispatch('select', event.detail)}
          on:purchase={event => dispatch('purchase', event.detail)}
        />
      {/each}
    </div>
  {:else}
    <div class="shop-empty-state">
      <span aria-hidden="true">◇</span>
      <h3>{ownedItems.length ? 'Nothing in this view yet.' : 'Your collection is empty.'}</h3>
      <p>{ownedItems.length ? 'Try another category or clear your search.' : 'Browse the catalog to find your first piece.'}</p>
      <button type="button" class="shop-button shop-button--light" on:click={() => dispatch('browse')}>Browse catalog</button>
    </div>
  {/if}
</section>

<style>
  .shop-collection { display:grid; gap:1rem; }
  .shop-surface-heading { display:flex; align-items:end; justify-content:space-between; gap:1.5rem; padding:.4rem 0 .9rem; border-bottom:1px solid var(--shop-line); }
  .shop-surface-heading h2 { max-width:52rem; margin:.4rem 0 .45rem; font:650 clamp(1.8rem,3vw,2.7rem)/.95 var(--font-display); letter-spacing:-.05em; }
  .shop-surface-heading p { max-width:42rem; margin:0; color:#aaa8b0; font-size:.9rem; line-height:1.5; }
  .shop-eyebrow { color:#858690; font:500 .7rem/1.3 var(--font-mono-stack); letter-spacing:.13em; text-transform:uppercase; }
  .shop-button { display:inline-flex; align-items:center; justify-content:center; min-height:2.7rem; padding:0 .9rem; border-radius:5px; font-weight:650; text-decoration:none; cursor:pointer; }
  .shop-button--outline { border:1px solid #4a4d57; background:#121419; color:#d3d0d8; }
  .shop-button--light { border:1px solid #efede7; background:#efede7; color:#101116; }
  .shop-quantity-strip { display:flex; align-items:center; justify-content:space-between; gap:1rem; padding:1.1rem 1.2rem; border:1px solid var(--shop-line); background:#111319; }
  .shop-quantity-strip h3 { margin:.3rem 0 0; font-size:1.15rem; }
  .shop-quantity-list { display:flex; flex-wrap:wrap; gap:.55rem; }
  .shop-quantity-item { display:flex; align-items:center; gap:.55rem; min-height:2.6rem; padding:0 .75rem; border:1px solid #3a3d46; border-radius:5px; }
  .shop-quantity-item strong { color:#cdd2ff; font:650 1rem var(--font-mono-stack); }
  .shop-quantity-item span { color:#d9d7d2; font-size:.82rem; }
  .shop-collection-tabs { display:flex; gap:.25rem; padding-bottom:.45rem; border-bottom:1px solid var(--shop-line); overflow:auto; }
  .shop-collection-tabs button { min-height:2.25rem; padding:0 .75rem; border:0; border-radius:4px; background:transparent; color:#8d8f98; cursor:pointer; white-space:nowrap; }
  .shop-collection-tabs button:hover, .shop-collection-tabs button:focus-visible, .shop-collection-tabs button.active { background:#16181e; color:#fff; }
  .shop-collection-toolbar { display:flex; align-items:center; justify-content:space-between; gap:1rem; }
  .shop-collection-search { display:flex; align-items:center; gap:.55rem; width:min(20rem,100%); min-height:2.65rem; padding:0 .7rem; border:1px solid #4a4d57; background:#121419; }
  .shop-collection-search > span:first-child { color:#cdd2ff; }
  .shop-collection-search input { width:100%; min-width:0; border:0; outline:0; background:transparent; color:#f2f0eb; font-size:.86rem; }
  .shop-collection-search input::placeholder { color:#8e9099; }
  .shop-collection-toolbar > span { color:#777983; font:.65rem var(--font-mono-stack); letter-spacing:.05em; text-transform:uppercase; white-space:nowrap; }
  .shop-result-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:.75rem; }
  .shop-empty-state { display:grid; justify-items:start; gap:.55rem; min-height:11rem; align-content:center; padding:1.6rem; border:1px solid var(--shop-line); background:#0a0c10; }
  .shop-empty-state > span { color:#cdd2ff; font-size:2rem; }
  .shop-empty-state h3 { margin:0; font-size:1.2rem; }
  .shop-empty-state p { margin:0 0 .5rem; color:#aaa8b0; }
  @media (max-width: 960px) { .shop-result-grid { grid-template-columns:repeat(3,minmax(0,1fr)); } }
  @media (max-width: 760px) { .shop-surface-heading { align-items:flex-start; flex-direction:column; } .shop-quantity-strip { align-items:flex-start; flex-direction:column; } .shop-collection-toolbar { align-items:stretch; flex-direction:column; } .shop-collection-search { width:auto; } .shop-result-grid { grid-template-columns:repeat(2,minmax(0,1fr)); } }
  @media (max-width: 520px) { .shop-result-grid { grid-template-columns:1fr; } }
</style>
