<script>
  import { createEventDispatcher } from 'svelte';
  import ShopCategoryNav from './ShopCategoryNav.svelte';
  import ShopItemCard from './ShopItemCard.svelte';
  import ShopItemPreview from './ShopItemPreview.svelte';
  import ShopStudioPreview from './ShopStudioPreview.svelte';
  import {
    filterShopItems,
    getShopAccessTier,
    getShopItemState
  } from './shopCatalog.js';

  export let items = [];
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
  $: displayColor = currentRoll?.hex_code || profile?.mood_color || '#8B7CF6';
  $: categorySections = Object.freeze([
    { id: 'overview', label: 'Browse', count: filterShopItems(items, { section: 'overview' }, fittingRoom).length },
    { id: 'names', label: 'Names', count: filterShopItems(items, { section: 'names' }, fittingRoom).length },
    { id: 'borders', label: 'Borders', count: filterShopItems(items, { section: 'borders' }, fittingRoom).length },
    { id: 'utility', label: 'Utility', count: filterShopItems(items, { section: 'utility' }, fittingRoom).length },
    { id: 'owned', label: 'Collection', count: filterShopItems(items, { section: 'owned' }, fittingRoom).length }
  ]);
  $: featuredItems = filterShopItems(items, { section: 'overview', sortMode: 'curated' }, fittingRoom).slice(0, 5);
  $: todayEditItem = featuredItems[0] || null;
  $: curatedItems = featuredItems.slice(1);
  $: username = profile?.display_name || profile?.username || 'You';

  function stateFor(item) {
    return getShopItemState(item, equippedItems, fittingRoom);
  }

  function openBrowse(section = 'overview') {
    if (section === 'owned') {
      dispatch('collection');
      return;
    }
    dispatch('browse', { section });
  }

  function priceLabel(item) {
    const accessTier = getShopAccessTier(item);
    if (accessTier === 'free') return 'Included';
    if (accessTier === 'premium') return 'Premium';
    return item.cost > 0 ? `${item.cost.toLocaleString()} EP` : 'Milestone';
  }
</script>

<div class="shop-home">
  <ShopCategoryNav
    sections={categorySections}
    activeId="overview"
    variant="category"
    on:select={event => openBrowse(event.detail)}
  />

  <section class="shop-todays-edit" aria-labelledby="shop-todays-edit-title">
    <div class="shop-todays-merchandise">
      <div class="shop-todays-copy">
        <span class="shop-eyebrow">Today’s edit</span>
        <h2 id="shop-todays-edit-title">Today’s color, <span>made wearable.</span></h2>
        <p>A complete profile look selected for the color you rolled today.</p>
        <div class="shop-todays-actions">
          {#if todayEditItem}<button type="button" class="shop-button shop-button--light" on:click={() => dispatch('select', todayEditItem)}>Preview look</button>{/if}
          <button type="button" class="shop-button shop-button--outline" on:click={() => openBrowse('overview')}>Browse catalog</button>
        </div>
      </div>
      {#if todayEditItem}
        <div class="shop-todays-product">
          <div class="shop-todays-product-preview">
            <ShopItemPreview item={todayEditItem} username={username} displayColor={displayColor} />
          </div>
          <div class="shop-todays-product-copy">
            <div class="shop-todays-product-topline"><span>Featured catalog item</span><span class="shop-item-state tone-{stateFor(todayEditItem).tone}">{stateFor(todayEditItem).label}</span></div>
            <h3>{todayEditItem.name}</h3>
            <div class="shop-todays-product-meta">
              <span class="shop-item-rarity rarity-{(todayEditItem.rarity || 'Common').toLowerCase()}">{todayEditItem.rarity || 'Common'}</span>
              <span>{todayEditItem.collection || 'Core collection'}</span>
            </div>
            <p>{todayEditItem.description}</p>
            <div class="shop-todays-product-action">
              <strong>{priceLabel(todayEditItem)}</strong>
              <button type="button" on:click={() => dispatch('select', todayEditItem)}>Open detail <span aria-hidden="true">↗</span></button>
            </div>
          </div>
        </div>
      {:else}
        <p class="shop-empty-copy">The live catalog is ready for a fresh edit.</p>
      {/if}
    </div>
    <aside class="shop-todays-context" aria-label="Current profile and rolled color">
      <div class="shop-todays-profile">
        <span class="shop-eyebrow">Your live profile</span>
        <ShopStudioPreview
          compact={true}
          loadout={equippedItems}
          username={username}
          displayColor={displayColor}
          accountProfile={profile}
          profileConfig={profileConfig}
        />
      </div>
      <div class="shop-todays-color">
        <span class="shop-eyebrow">Current roll</span>
        <div class="shop-color-swatch" style={`--shop-roll-color:${displayColor}`} aria-label={`Current color ${displayColor}`}></div>
        <div>
          <strong>{displayColor}</strong>
          <span>{currentRoll?.rarity || 'Roll for today'}{currentRoll?.score ? ` · ${Number(currentRoll.score).toLocaleString()} EP` : ''}</span>
        </div>
      </div>
    </aside>
  </section>

  <section class="shop-home-section" aria-labelledby="shop-curated-title">
    <div class="shop-section-heading">
      <div>
        <span class="shop-eyebrow">Recommended for today</span>
        <h2 id="shop-curated-title">Recommended <span>for today.</span></h2>
        <p>Four real catalog pieces that respond well to today’s color.</p>
      </div>
      <button type="button" class="shop-text-link" on:click={() => openBrowse('overview')}>View full catalog ↗</button>
    </div>

    {#if curatedItems.length}
      <div class="shop-product-grid shop-product-grid--home">
        {#each curatedItems as item (item.item_key)}
          <ShopItemCard
            {item}
            state={stateFor(item)}
            accessTier={getShopAccessTier(item)}
            isPreviewing={false}
            actuallyEquipped={equippedItems[item.slot] === item.item_key}
            previewUsername={username}
            previewColor={displayColor}
            on:select={event => dispatch('select', event.detail)}
            on:preview={event => dispatch('select', event.detail)}
          />
        {/each}
      </div>
    {:else}
      <p class="shop-empty-copy">The catalog is ready for a fresh edit.</p>
    {/if}
  </section>

  <nav class="shop-home-links" aria-label="Continue shopping">
    <a href="#browse" on:click|preventDefault={() => openBrowse('overview')}>
      <span>Browse</span><strong>Find the full catalog</strong><i aria-hidden="true">↗</i>
    </a>
    <a href="#collection" on:click|preventDefault={() => dispatch('collection')}>
      <span>Collection</span><strong>See what you already own</strong><i aria-hidden="true">↗</i>
    </a>
  </nav>
</div>

<style>
  .shop-home { display:grid; gap:2.2rem; padding-top:.15rem; }
  .shop-todays-edit { display:grid; grid-template-columns:minmax(0,1.55fr) minmax(17rem,.65fr); overflow:hidden; border:1px solid var(--shop-line); background:#090b0f; }
  .shop-todays-merchandise { min-width:0; padding:1.7rem; }
  .shop-todays-copy { max-width:34rem; }
  .shop-eyebrow { color:#858690; font:500 .7rem/1.3 var(--font-mono-stack); letter-spacing:.13em; text-transform:uppercase; }
  .shop-todays-copy h2 { max-width:34rem; margin:.65rem 0 .55rem; font:650 clamp(2.25rem,4vw,3.8rem)/.92 var(--font-display); letter-spacing:-.065em; }
  .shop-todays-copy h2 span { color:var(--shop-accent); }
  .shop-todays-copy p { max-width:30rem; margin:0; color:#aaa8b0; font-size:.9rem; line-height:1.55; }
  .shop-todays-actions { display:flex; flex-wrap:wrap; gap:.55rem; margin-top:1.15rem; }
  .shop-button { display:inline-flex; align-items:center; justify-content:center; min-height:2.35rem; padding:0 .8rem; border-radius:4px; cursor:pointer; font:650 .7rem var(--font-mono-stack); text-decoration:none; }
  .shop-button--light { border:1px solid #efede7; background:#efede7; color:#0d0f14; }
  .shop-button--outline { border:1px solid #454852; background:#121419; color:#d9d7d2; }
  .shop-button:hover, .shop-button:focus-visible { border-color:#cdd2ff; }
  .shop-todays-product { display:grid; grid-template-columns:minmax(12rem,.85fr) minmax(0,1.15fr); gap:1rem; align-items:stretch; margin-top:1.55rem; padding-top:1.3rem; border-top:1px solid var(--shop-line); }
  .shop-todays-product-preview { min-width:0; display:flex; align-items:stretch; }
  .shop-todays-product-preview :global(.shop-preview-area) { height:100%; min-height:13.5rem; border-radius:4px; }
  .shop-todays-product-copy { display:flex; min-width:0; flex-direction:column; justify-content:center; }
  .shop-todays-product-topline { display:flex; align-items:center; justify-content:space-between; gap:.6rem; color:#777983; font:.61rem var(--font-mono-stack); letter-spacing:.07em; text-transform:uppercase; }
  .shop-todays-product-topline > span:first-child { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .shop-item-state { max-width:50%; overflow:hidden; padding:.25rem .4rem; border:1px solid #3a3d46; color:#aaa8b0; text-overflow:ellipsis; white-space:nowrap; }
  .shop-item-state.tone-equipped { border-color:#7d83a9; color:#d7dbff; }
  .shop-item-state.tone-owned, .shop-item-state.tone-available { border-color:#5875a4; color:#b7d2ff; }
  .shop-item-state.tone-premium, .shop-item-state.tone-premium-locked { border-color:#745c9e; color:#dcc3ff; }
  .shop-todays-product-copy h3 { overflow:hidden; margin:.55rem 0 .4rem; color:#f2f0eb; font:650 1.25rem/1.15 var(--font-display); letter-spacing:-.025em; text-overflow:ellipsis; white-space:nowrap; }
  .shop-todays-product-meta { display:flex; align-items:center; flex-wrap:wrap; gap:.45rem .65rem; color:#858690; font:.67rem var(--font-mono-stack); }
  .shop-item-rarity { padding:.25rem .4rem; border:1px solid; font-size:.67rem; letter-spacing:.03em; text-transform:uppercase; }
  .rarity-common { border-color:#555a66; background:#15171c; color:#cdd0d8; }
  .rarity-uncommon { border-color:#597b70; background:#111b18; color:#b6e5d2; }
  .rarity-rare { border-color:#5875a4; background:#111923; color:#b7d2ff; }
  .rarity-epic { border-color:#745c9e; background:#191522; color:#dcc3ff; }
  .rarity-anomaly { border-color:#8e673d; background:#201811; color:#ffd09a; }
  .rarity-mythic { border-color:#8d4869; background:#21131b; color:#ffb3d2; }
  .shop-todays-product-copy > p { display:-webkit-box; overflow:hidden; margin:.7rem 0 1rem; color:#aaa8b0; font-size:.8rem; line-height:1.45; -webkit-box-orient:vertical; -webkit-line-clamp:3; line-clamp:3; }
  .shop-todays-product-action { display:flex; align-items:center; justify-content:space-between; gap:.6rem; margin-top:auto; }
  .shop-todays-product-action strong { color:var(--shop-accent); font:650 1rem var(--font-mono-stack); white-space:nowrap; }
  .shop-todays-product-action button { min-height:2.35rem; padding:0 .65rem; border:1px solid #4a4d57; background:#121419; color:#d3d0d8; cursor:pointer; font:.7rem var(--font-mono-stack); }
  .shop-todays-product-action button:hover, .shop-todays-product-action button:focus-visible { border-color:#aeb5e5; color:#fff; }
  .shop-todays-context { display:grid; align-content:start; gap:1rem; padding:1.2rem; border-left:1px solid var(--shop-line); background:#111319; }
  .shop-todays-profile { min-width:0; }
  .shop-todays-profile :global(.studio-preview) { margin-top:.55rem; border:0; padding:0; border-radius:0; background:transparent; box-shadow:none; }
  .shop-todays-profile :global(.studio-stage) { min-height:15.5rem; }
  .shop-todays-color { display:grid; grid-template-columns:3.2rem minmax(0,1fr); gap:.75rem; align-items:center; padding-top:1rem; border-top:1px solid var(--shop-line); }
  .shop-todays-color > .shop-eyebrow { grid-column:1 / -1; }
  .shop-color-swatch { width:3.2rem; height:3.2rem; border:1px solid rgba(255,255,255,.22); background:var(--shop-roll-color); }
  .shop-todays-color strong, .shop-todays-color span:last-child { display:block; }
  .shop-todays-color strong { color:#f2f0eb; font:600 .88rem var(--font-mono-stack); }
  .shop-todays-color span:last-child { margin-top:.28rem; color:#9297a3; font-size:.7rem; line-height:1.4; }
  .shop-home-section { display:grid; gap:1.25rem; }
  .shop-section-heading { display:flex; align-items:end; justify-content:space-between; gap:1.5rem; }
  .shop-section-heading h2 { margin:.35rem 0 0; font:650 clamp(2.15rem,3.8vw,3.55rem)/.95 var(--font-display); letter-spacing:-.055em; }
  .shop-section-heading h2 span { color:var(--shop-accent); }
  .shop-section-heading p { max-width:34rem; margin:.6rem 0 0; color:#aaa8b0; font-size:.9rem; line-height:1.55; }
  .shop-text-link { padding:.5rem 0; border:0; background:transparent; color:#cdd2ff; font: .72rem var(--font-mono-stack); cursor:pointer; white-space:nowrap; }
  .shop-text-link:hover, .shop-text-link:focus-visible { color:#fff; }
  .shop-product-grid { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:.7rem; }
  .shop-home-links { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); border-top:1px solid var(--shop-line); border-bottom:1px solid var(--shop-line); }
  .shop-home-links a { position:relative; display:grid; gap:.35rem; min-height:4.25rem; align-content:center; padding:.75rem 1.1rem; border-right:1px solid var(--shop-line); color:inherit; text-decoration:none; }
  .shop-home-links a:last-child { border-right:0; }
  .shop-home-links a:hover, .shop-home-links a:focus-visible { background:#111319; }
  .shop-home-links span { color:#858690; font: .68rem var(--font-mono-stack); letter-spacing:.1em; text-transform:uppercase; }
  .shop-home-links strong { font-size:1rem; }
  .shop-home-links i { position:absolute; top:1rem; right:1rem; color:#cdd2ff; font-style:normal; }
  .shop-empty-copy { color:#aaa8b0; }
  @media (max-width: 1100px) { .shop-todays-edit { grid-template-columns:minmax(0,1fr) minmax(16rem,.7fr); } .shop-product-grid { grid-template-columns:repeat(3,minmax(0,1fr)); } }
  @media (max-width: 760px) { .shop-todays-edit { grid-template-columns:1fr; } .shop-todays-merchandise { padding:1rem; } .shop-todays-context { grid-template-columns:1fr 1fr; padding:1rem; border-top:1px solid var(--shop-line); border-left:0; } .shop-todays-profile { min-width:0; } .shop-todays-profile :global(.studio-stage) { min-height:11rem; } .shop-todays-color { align-content:center; padding-top:0; border-top:0; border-left:1px solid var(--shop-line); padding-left:1rem; } .shop-section-heading { align-items:flex-start; flex-direction:column; } .shop-product-grid { grid-template-columns:repeat(2,minmax(0,1fr)); } .shop-home-links { grid-template-columns:1fr; } .shop-home-links a { min-height:4.75rem; border-right:0; border-bottom:1px solid var(--shop-line); } .shop-home-links a:last-child { border-bottom:0; } }
  @media (max-width: 520px) { .shop-todays-product { grid-template-columns:1fr; } .shop-todays-product-preview :global(.shop-preview-area) { min-height:9rem; } .shop-todays-context { grid-template-columns:1fr; } .shop-todays-color { padding-top:1rem; border-top:1px solid var(--shop-line); border-left:0; padding-left:0; } .shop-product-grid { grid-template-columns:1fr; } }
  @media (max-width: 390px) { .shop-todays-copy h2 { font-size:2.05rem; } .shop-todays-actions { align-items:stretch; flex-direction:column; } .shop-todays-actions .shop-button { width:100%; } }
  @media (prefers-reduced-motion: reduce) { .shop-home-links a { transition:none; } }
</style>
