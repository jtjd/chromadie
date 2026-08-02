<script>
  import { createEventDispatcher } from 'svelte';
  import ShopItemCard from './ShopItemCard.svelte';
  import ShopStudioPreview from './ShopStudioPreview.svelte';
  import {
    SHOP_SECTIONS,
    filterShopItems,
    getShopAccessTier,
    getShopItemState,
    hasShopEntitlement
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
  /** @type {any} */
  export let loadingAction = null;
  /** @type {any} */
  export let purchaseArmedKey = null;
  export let isSignedIn = false;

  const dispatch = createEventDispatcher();
  const categorySections = Object.freeze([
    { id: 'overview', label: 'Browse', description: 'full catalog' },
    ...SHOP_SECTIONS.filter(section => !['overview', 'owned'].includes(section.id)).map(section => ({
      ...section,
      description: section.id === 'profile' ? 'identity' : section.id === 'roll' ? 'daily color' : section.id === 'leaderboard' ? 'ranked row' : 'progress'
    })),
    { id: 'owned', label: 'Collection', description: 'your pieces' }
  ]);

  $: displayColor = currentRoll?.hex_code || profile?.mood_color || '#8B7CF6';
  $: displayRarity = currentRoll?.rarity || '';
  $: featuredItems = filterShopItems(items, { section: 'overview', sortMode: 'curated' }, fittingRoom).slice(0, 4);
  $: username = profile?.display_name || profile?.username || 'Your profile';

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

  function hasAccess(item) {
    return hasShopEntitlement(item, fittingRoom);
  }

  function openBrowse(section = 'overview') {
    if (section === 'owned') {
      dispatch('collection');
      return;
    }
    dispatch('browse', { section });
  }
</script>

<div class="shop-home">
  <nav class="shop-home-categories" aria-label="Shop categories">
    {#each categorySections as section (section.id)}
      <button type="button" on:click={() => openBrowse(section.id)}>
        <strong>{section.label}</strong>
        <span>{section.description}</span>
      </button>
    {/each}
  </nav>

  <section class="shop-todays-edit" aria-labelledby="shop-todays-edit-title">
    <div class="shop-todays-stage">
      <div class="shop-todays-copy">
        <span class="shop-eyebrow">Today’s edit</span>
        <h2 id="shop-todays-edit-title">A look built around your color.</h2>
        <p>See your current profile, equipped cosmetics, and today’s rolled signal in one quiet fitting room.</p>
        <div class="shop-home-actions">
          <button class="shop-button shop-button--light" type="button" on:click={() => openBrowse('overview')}>Browse the catalog <span aria-hidden="true">↗</span></button>
          <a class="shop-button shop-button--outline" href="#collection" on:click|preventDefault={() => dispatch('collection')}>Open collection</a>
        </div>
      </div>
      <div class="shop-todays-profile">
        <ShopStudioPreview
          compact={true}
          loadout={equippedItems}
          username={username}
          displayColor={displayColor}
          rollRarity={displayRarity}
          rollScore={currentRoll?.score}
          accountProfile={profile}
          profileConfig={profileConfig}
        />
      </div>
    </div>
    <aside class="shop-todays-color" aria-label="Current rolled color">
      <span class="shop-eyebrow">Current roll</span>
      {#if currentRoll?.hex_code}
        <div class="shop-color-swatch" style={`--shop-roll-color:${currentRoll.hex_code}`} aria-label={`Current color ${currentRoll.hex_code}`}></div>
        <h3>{currentRoll.rarity || 'Current result'}</h3>
        <strong>{currentRoll.hex_code}</strong>
        <span>{currentRoll.rarity || 'Unrated result'} · {Number(currentRoll.score || 0).toLocaleString()} EP</span>
      {:else}
        <div class="shop-color-swatch shop-color-swatch--fallback" style={`--shop-roll-color:${displayColor}`} aria-label={`Profile color ${displayColor}`}></div>
        <h3>Roll for today</h3>
        <strong>{displayColor}</strong>
        <span>Roll today to add a new signal.</span>
      {/if}
    </aside>
  </section>

  <section class="shop-home-section" aria-labelledby="shop-curated-title">
    <div class="shop-section-heading">
      <div>
        <span class="shop-eyebrow">A small edit</span>
        <h2 id="shop-curated-title">Pieces worth trying on.</h2>
        <p>A curated handful from the live catalog. The rest stays one click away in Browse.</p>
      </div>
      <button type="button" class="shop-text-link" on:click={() => openBrowse('overview')}>View full catalog ↗</button>
    </div>

    {#if featuredItems.length}
      <div class="shop-product-grid shop-product-grid--home">
        {#each featuredItems as item (item.item_key)}
          <ShopItemCard
            {item}
            state={stateFor(item)}
            accessTier={getShopAccessTier(item)}
            hasAccess={hasAccess(item)}
            canPurchase={canPurchase(item)}
            isPreviewing={false}
            actuallyEquipped={equippedItems[item.slot] === item.item_key}
            ownedCount={fittingRoom.inventoryCounts?.[item.item_key] || 0}
            itemBusy={loadingAction?.endsWith(`:${item.item_key}`)}
            purchaseArmed={purchaseArmedKey === item.item_key}
            {isSignedIn}
            previewUsername={username}
            previewColor={displayColor}
            previewRarity={displayRarity || 'Current roll'}
            on:select={event => dispatch('select', event.detail)}
            on:purchase={event => dispatch('purchase', event.detail)}
          />
        {/each}
      </div>
    {:else}
      <p class="shop-empty-copy">The catalog is ready for a fresh edit.</p>
    {/if}
  </section>

  <section class="shop-home-look-row" aria-label="Profile and roll pathways">
    <button type="button" class="shop-home-look-card shop-home-look-card--profile" on:click={() => dispatch('collection')}>
      <span class="shop-eyebrow">Your profile</span>
      <h3>{username}</h3>
      <p>See the owned expression already shaping your public identity.</p>
      <strong>Open collection <span aria-hidden="true">↗</span></strong>
      <div class="shop-home-look-preview">
        <ShopStudioPreview
          compact={true}
          loadout={equippedItems}
          username={username}
          displayColor={displayColor}
          rollRarity={displayRarity}
          accountProfile={profile}
          profileConfig={profileConfig}
        />
      </div>
    </button>
    <button type="button" class="shop-home-look-card shop-home-look-card--roll" on:click={() => openBrowse('roll')}>
      <span class="shop-eyebrow">Today’s color</span>
      <h3>{currentRoll?.rarity || 'Current roll'}</h3>
      <p>{currentRoll?.hex_code ? `${currentRoll.hex_code} · ${Number(currentRoll.score || 0).toLocaleString()} EP` : 'Your next roll becomes part of the profile story.'}</p>
      <strong>Browse roll expression <span aria-hidden="true">↗</span></strong>
      <div class="shop-home-look-color" style={`--shop-roll-color:${displayColor}`} aria-hidden="true"></div>
    </button>
  </section>

  <section class="shop-home-links" aria-label="Continue shopping">
    <a href="#browse" on:click|preventDefault={() => openBrowse('overview')}>
      <span>Browse</span><strong>Find the full catalog</strong><i aria-hidden="true">↗</i>
    </a>
    <a href="#collection" on:click|preventDefault={() => dispatch('collection')}>
      <span>Collection</span><strong>See what you already own</strong><i aria-hidden="true">↗</i>
    </a>
    <a href="#studio" on:click|preventDefault={() => dispatch('studio')}>
      <span>Studio</span><strong>Fit a temporary look</strong><i aria-hidden="true">↗</i>
    </a>
  </section>
</div>

<style>
  .shop-home { display:grid; gap:1.75rem; padding-top:.15rem; }
  .shop-home-categories { display:grid; grid-template-columns:repeat(6,minmax(0,1fr)); border:1px solid var(--shop-line); border-radius:6px; overflow:hidden; }
  .shop-home-categories button { min-height:76px; padding:0 1rem; border:0; border-right:1px solid var(--shop-line); background:#111319; color:#aaa8b0; text-align:left; cursor:pointer; }
  .shop-home-categories button:last-child { border-right:0; }
  .shop-home-categories button:hover, .shop-home-categories button:focus-visible { background:#181b22; color:#fff; }
  .shop-home-categories strong, .shop-home-categories span { display:block; }
  .shop-home-categories strong { font-size:.95rem; }
  .shop-home-categories span { margin-top:.35rem; color:#8f919a; font: .65rem/1.2 var(--font-mono-stack); letter-spacing:.06em; text-transform:uppercase; }
  .shop-todays-edit { display:grid; grid-template-columns:minmax(0,1.35fr) minmax(17.5rem,.65fr); min-height:22rem; overflow:hidden; border:1px solid var(--shop-line); border-radius:7px; background:#0a0c10; }
  .shop-todays-stage { position:relative; min-height:22rem; overflow:hidden; background:repeating-linear-gradient(90deg,transparent 0 76px,rgba(255,255,255,.015) 77px); }
  .shop-todays-copy { position:relative; z-index:2; max-width:24rem; padding:2.25rem; align-self:center; }
  .shop-eyebrow { color:#858690; font:500 .7rem/1.3 var(--font-mono-stack); letter-spacing:.13em; text-transform:uppercase; }
  .shop-todays-copy h2 { max-width:34rem; margin:.8rem 0 .9rem; font:650 clamp(2.25rem,4vw,4.2rem)/.95 var(--font-display); letter-spacing:-.05em; }
  .shop-todays-copy p { max-width:30rem; margin:0; color:#aaa8b0; font-size:.95rem; line-height:1.6; }
  .shop-home-actions { display:flex; flex-wrap:wrap; gap:.6rem; margin-top:1.4rem; }
  .shop-button { display:inline-flex; align-items:center; justify-content:center; min-height:2.7rem; padding:0 .9rem; border-radius:5px; font-weight:650; text-decoration:none; cursor:pointer; }
  .shop-button--light { border:1px solid #efede7; background:#efede7; color:#101116; }
  .shop-button--outline { border:1px solid #4a4d57; background:#121419; color:#d3d0d8; }
  .shop-button--light:hover, .shop-button--light:focus-visible { background:#fff; }
  .shop-button--outline:hover, .shop-button--outline:focus-visible { border-color:#777d8d; color:#fff; }
  .shop-todays-profile { position:absolute; top:50%; right:2.1rem; width:44%; min-width:18rem; padding:1.1rem; transform:translateY(-50%); border:1px solid #3a3d46; border-radius:7px; background:#121419; }
  .shop-todays-profile :global(.studio-preview) { border:0; padding:0; border-radius:0; background:transparent; box-shadow:none; }
  .shop-todays-profile :global(.studio-stage) { min-height:18rem; }
  .shop-todays-color { display:flex; flex-direction:column; padding:1.4rem; border-left:1px solid var(--shop-line); background:#121419; }
  .shop-color-swatch { min-height:9.4rem; margin:1rem 0 .9rem; border-radius:5px; background:var(--shop-roll-color); }
  .shop-color-swatch--fallback { opacity:.72; }
  .shop-todays-color h3 { margin:0 0 .25rem; font-size:1.25rem; letter-spacing:-.025em; }
  .shop-todays-color strong { color:#f2f0eb; font:600 1rem var(--font-mono-stack); }
  .shop-todays-color > span:last-child { margin-top:.5rem; color:#9297a3; font-size:.72rem; line-height:1.4; }
  .shop-home-section { display:grid; gap:1.25rem; }
  .shop-section-heading { display:flex; align-items:end; justify-content:space-between; gap:1.5rem; }
  .shop-section-heading h2 { margin:.35rem 0 0; font:650 clamp(2rem,3.5vw,3.4rem)/.98 var(--font-display); letter-spacing:-.045em; }
  .shop-section-heading p { max-width:34rem; margin:.6rem 0 0; color:#aaa8b0; font-size:.9rem; line-height:1.55; }
  .shop-text-link { padding:.5rem 0; border:0; background:transparent; color:#cdd2ff; font: .72rem var(--font-mono-stack); cursor:pointer; white-space:nowrap; }
  .shop-text-link:hover, .shop-text-link:focus-visible { color:#fff; }
  .shop-product-grid { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:.75rem; }
  .shop-product-grid--home :global(.shop-item:nth-child(n+5)) { display:none; }
  .shop-home-look-row { display:grid; grid-template-columns:1fr 1fr; gap:.65rem; }
  .shop-home-look-card { position:relative; min-height:14.5rem; overflow:hidden; padding:1.4rem; border:1px solid var(--shop-line); border-radius:7px; background:#0a0c10; color:inherit; cursor:pointer; text-align:left; }
  .shop-home-look-card:hover, .shop-home-look-card:focus-visible { border-color:#555966; }
  .shop-home-look-card h3 { position:relative; z-index:2; margin:.5rem 0 .55rem; font-size:1.65rem; letter-spacing:-.035em; }
  .shop-home-look-card p { position:relative; z-index:2; max-width:17rem; margin:0; color:#9fa1aa; font-size:.82rem; line-height:1.55; }
  .shop-home-look-card > strong { position:absolute; z-index:2; left:1.4rem; bottom:1.25rem; color:#cdd2ff; font:.72rem var(--font-mono-stack); }
  .shop-home-look-card--profile { background:#0d1015; }
  .shop-home-look-card--roll { background:#130e0d; }
  .shop-home-look-preview { position:absolute; top:50%; right:1.4rem; width:42%; transform:translateY(-50%); opacity:.9; }
  .shop-home-look-preview :global(.studio-preview) { border:0; padding:0; background:transparent; box-shadow:none; }
  .shop-home-look-preview :global(.studio-stage) { min-height:10rem; }
  .shop-home-look-color { position:absolute; top:50%; right:3rem; width:8.5rem; height:8.5rem; border:1px solid rgba(255,255,255,.22); border-radius:50%; background:var(--shop-roll-color); box-shadow:0 0 4rem color-mix(in srgb,var(--shop-roll-color) 42%,transparent); opacity:.85; transform:translateY(-50%); }
  .shop-home-links { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); border-top:1px solid var(--shop-line); border-bottom:1px solid var(--shop-line); }
  .shop-home-links a { position:relative; display:grid; gap:.35rem; min-height:6.5rem; align-content:center; padding:0 1.1rem; border-right:1px solid var(--shop-line); color:inherit; text-decoration:none; }
  .shop-home-links a:last-child { border-right:0; }
  .shop-home-links a:hover, .shop-home-links a:focus-visible { background:#111319; }
  .shop-home-links span { color:#858690; font: .68rem var(--font-mono-stack); letter-spacing:.1em; text-transform:uppercase; }
  .shop-home-links strong { font-size:1rem; }
  .shop-home-links i { position:absolute; top:1rem; right:1rem; color:#cdd2ff; font-style:normal; }
  .shop-empty-copy { color:#aaa8b0; }
  @media (max-width: 1100px) { .shop-todays-edit { grid-template-columns:minmax(0,1fr) minmax(16rem,.7fr); } .shop-todays-profile { right:1.25rem; width:45%; min-width:15rem; } }
  @media (max-width: 900px) { .shop-home-categories { grid-template-columns:repeat(3,minmax(0,1fr)); } .shop-home-categories button:nth-child(3) { border-right:0; } .shop-home-categories button:nth-child(-n+3) { border-bottom:1px solid var(--shop-line); } }
  @media (max-width: 760px) { .shop-home-categories { grid-template-columns:repeat(2,minmax(0,1fr)); } .shop-home-categories button:nth-child(2), .shop-home-categories button:nth-child(4) { border-right:0; } .shop-home-categories button:nth-child(-n+3) { border-bottom:1px solid var(--shop-line); } .shop-home-categories button:nth-child(5), .shop-home-categories button:nth-child(6) { border-bottom:0; } .shop-todays-edit { grid-template-columns:1fr; } .shop-todays-stage { min-height:0; } .shop-todays-copy { max-width:none; padding:1.5rem; } .shop-todays-profile { position:relative; top:auto; right:auto; width:auto; min-width:0; margin:0 1.5rem 1.5rem; transform:none; } .shop-todays-color { border-top:1px solid var(--shop-line); border-left:0; } .shop-section-heading { align-items:flex-start; flex-direction:column; } .shop-product-grid { grid-template-columns:repeat(2,minmax(0,1fr)); } .shop-home-look-row { grid-template-columns:1fr; } .shop-home-look-preview { width:38%; } .shop-home-links { grid-template-columns:1fr; } .shop-home-links a { min-height:4.75rem; border-right:0; border-bottom:1px solid var(--shop-line); } .shop-home-links a:last-child { border-bottom:0; } }
  @media (max-width: 520px) { .shop-product-grid { grid-template-columns:1fr; } }
  @media (prefers-reduced-motion: reduce) { .shop-home-categories button, .shop-home-links a { transition:none; } }
</style>
