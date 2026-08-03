<script>
  import { createEventDispatcher } from 'svelte';
  import ShopItemCard from './ShopItemCard.svelte';
  import ShopItemPreview from './ShopItemPreview.svelte';
  import { getProfileMediaUrl } from './profileMedia.js';
  import { normalizeHexColor } from './utils.js';
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
  export let isSignedIn = false;
  export let purchaseArmedKey = '';
  export let loadingAction = null;

  const dispatch = createEventDispatcher();
  $: displayColor = normalizeHexColor(currentRoll?.hex_code || profile?.mood_color, '#8B7CF6');
  $: featuredItems = filterShopItems(items, { section: 'overview', sortMode: 'curated' }, fittingRoom).slice(0, 5);
  $: todayEditItem = featuredItems[0] || null;
  $: curatedItems = featuredItems.slice(1);
  $: username = profile?.display_name || profile?.username || 'You';
  $: previewProfileConfig = profileConfig?.published || profileConfig?.draft || profileConfig || {};
  $: avatarSrc = getProfileMediaUrl(previewProfileConfig?.avatar_path || '');

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
  <section class="shop-todays-edit" aria-labelledby="shop-todays-edit-title">
    <div class="shop-todays-merchandise">
      <div class="shop-todays-copy">
        <span class="shop-eyebrow">Today’s edit</span>
        <h2 id="shop-todays-edit-title">Make today’s color <span>yours.</span></h2>
        <p>A focused edit of profile pieces that work with the color you rolled today.</p>
        <div class="shop-todays-actions">
          <button type="button" class="shop-button shop-button--outline" on:click={() => openBrowse('overview')}>Browse catalog</button>
        </div>
      </div>
      {#if todayEditItem}
        <div class="shop-todays-product">
          <div class="shop-todays-product-preview">
            <ShopItemPreview item={todayEditItem} username={username} displayColor={displayColor} />
          </div>
          <div class="shop-todays-product-copy">
            <div class="shop-todays-product-topline"><span>{todayEditItem.collection || 'Featured piece'}</span><span class="shop-item-state tone-{stateFor(todayEditItem).tone}">{stateFor(todayEditItem).label}</span></div>
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
        <span class="shop-eyebrow">Your profile</span>
        <div class="shop-todays-identity">
          {#if avatarSrc}
            <img class="shop-todays-avatar" src={avatarSrc} alt="" width="48" height="48" loading="lazy" decoding="async" />
          {:else}
            <span class="shop-todays-avatar shop-todays-avatar--monogram" aria-hidden="true">{username.slice(0, 1).toUpperCase()}</span>
          {/if}
          <div>
            <strong>{username}</strong>
            <span>Current profile</span>
          </div>
        </div>
      </div>
      <div class="shop-todays-color">
        <span class="shop-eyebrow">Today’s color</span>
        <div class="shop-color-swatch" style={`--shop-roll-color:${displayColor}`} aria-label={`Current color ${displayColor}`}></div>
        <div>
          <strong>{displayColor}</strong>
          <span>{currentRoll?.rarity || 'Ready to style'}</span>
        </div>
      </div>
    </aside>
  </section>

  <section class="shop-home-section" aria-labelledby="shop-curated-title">
    <div class="shop-section-heading">
      <div>
        <span class="shop-eyebrow">A few directions</span>
        <h2 id="shop-curated-title">Carry it <span>forward.</span></h2>
        <p>Profile pieces selected to work with today’s color.</p>
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
            {isSignedIn}
            purchaseArmed={purchaseArmedKey === item.item_key}
            purchaseLoading={loadingAction === `buy:${item.item_key}`}
            on:select={event => dispatch('select', event.detail)}
            on:preview={event => dispatch('select', event.detail)}
            on:purchase={event => dispatch('purchase', event.detail)}
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
  .shop-home { display:grid; gap:2.75rem; padding-top:.15rem; }
  .shop-todays-edit { display:grid; grid-template-columns:minmax(0,1.55fr) minmax(17rem,.65fr); overflow:hidden; border:1px solid var(--shop-line); background:var(--shop-deep); }
  .shop-todays-merchandise { min-width:0; padding:2rem; }
  .shop-todays-copy { max-width:34rem; }
  .shop-eyebrow { color:var(--shop-faint); font:600 .72rem/1.3 var(--shop-mono); letter-spacing:.13em; text-transform:uppercase; }
  .shop-todays-copy h2 { max-width:34rem; margin:.7rem 0 .65rem; font:650 clamp(2.25rem,4vw,3.35rem)/.94 var(--shop-display); letter-spacing:-.055em; }
  .shop-todays-copy h2 span { color:var(--shop-accent); }
  .shop-todays-copy p { max-width:32rem; margin:0; color:var(--shop-muted); font-size:.98rem; line-height:1.55; }
  .shop-todays-actions { display:flex; flex-wrap:wrap; gap:.65rem; margin-top:1.35rem; }
  .shop-button { display:inline-flex; align-items:center; justify-content:center; min-height:2.75rem; padding:0 1rem; border-radius:var(--radius-sm); cursor:pointer; font:650 .78rem var(--shop-mono); text-decoration:none; }
  .shop-button--light { border:1px solid #efede7; background:#efede7; color:#0d0f14; }
  .shop-button--outline { border:1px solid #454852; background:#121419; color:#d9d7d2; }
  .shop-button:hover, .shop-button:focus-visible { border-color:#cdd2ff; }
  .shop-todays-product { display:grid; grid-template-columns:minmax(15rem,.9fr) minmax(0,1.1fr); gap:1.1rem; align-items:stretch; margin-top:1.85rem; padding-top:1.5rem; border-top:1px solid var(--shop-line); }
  .shop-todays-product-preview { min-width:0; display:flex; align-items:stretch; }
  .shop-todays-product-preview :global(.shop-preview-area) { height:100%; min-height:17rem; border-radius:var(--radius-sm); }
  .shop-todays-product-copy { display:flex; min-width:0; flex-direction:column; justify-content:center; }
  .shop-todays-product-topline { display:flex; align-items:center; justify-content:space-between; gap:.6rem; color:var(--shop-faint); font:.7rem var(--shop-mono); letter-spacing:.07em; text-transform:uppercase; }
  .shop-todays-product-topline > span:first-child { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .shop-item-state { max-width:50%; overflow:hidden; padding:.3rem .48rem; border:1px solid var(--shop-line-strong); color:var(--shop-muted); text-overflow:ellipsis; white-space:nowrap; }
  .shop-item-state.tone-equipped { border-color:#7d83a9; color:#d7dbff; }
  .shop-item-state.tone-owned, .shop-item-state.tone-available { border-color:#5875a4; color:#b7d2ff; }
  .shop-item-state.tone-premium, .shop-item-state.tone-premium-locked { border-color:#745c9e; color:#dcc3ff; }
  .shop-todays-product-copy h3 { overflow:hidden; margin:.65rem 0 .45rem; color:var(--shop-ink); font:650 1.45rem/1.1 var(--shop-display); letter-spacing:-.025em; text-overflow:ellipsis; white-space:nowrap; }
  .shop-todays-product-meta { display:flex; align-items:center; flex-wrap:wrap; gap:.45rem .65rem; color:var(--shop-faint); font:.74rem var(--shop-mono); }
  .shop-item-rarity { padding:.3rem .48rem; border:1px solid; font-size:.7rem; letter-spacing:.03em; text-transform:uppercase; }
  .rarity-common { border-color:#555a66; background:#15171c; color:#cdd0d8; }
  .rarity-uncommon { border-color:#597b70; background:#111b18; color:#b6e5d2; }
  .rarity-rare { border-color:#5875a4; background:#111923; color:#b7d2ff; }
  .rarity-epic { border-color:#745c9e; background:#191522; color:#dcc3ff; }
  .rarity-anomaly { border-color:#8e673d; background:#201811; color:#ffd09a; }
  .rarity-mythic { border-color:#8d4869; background:#21131b; color:#ffb3d2; }
  .shop-todays-product-copy > p { display:-webkit-box; overflow:hidden; margin:.75rem 0 1.15rem; color:var(--shop-muted); font-size:.9rem; line-height:1.5; -webkit-box-orient:vertical; -webkit-line-clamp:3; line-clamp:3; }
  .shop-todays-product-action { display:flex; align-items:center; justify-content:space-between; gap:.6rem; margin-top:auto; }
  .shop-todays-product-action strong { color:var(--shop-accent); font:650 1.05rem var(--shop-mono); white-space:nowrap; }
  .shop-todays-product-action button { min-height:2.55rem; padding:0 .8rem; border:1px solid #4a4d57; border-radius:var(--radius-sm); background:#121419; color:#d3d0d8; cursor:pointer; font:.76rem var(--shop-mono); }
  .shop-todays-product-action button:hover, .shop-todays-product-action button:focus-visible { border-color:#aeb5e5; color:#fff; }
  .shop-todays-context { display:grid; align-content:start; gap:1.35rem; padding:1.4rem; border-left:1px solid var(--shop-line); background:var(--shop-raised); }
  .shop-todays-profile { display:grid; gap:.8rem; min-width:0; }
  .shop-todays-identity { display:flex; align-items:center; gap:.75rem; min-width:0; padding:.9rem; border:1px solid var(--shop-line); background:var(--shop-canvas); }
  .shop-todays-avatar { flex:0 0 3rem; width:3rem; height:3rem; overflow:hidden; border:1px solid color-mix(in srgb,var(--shop-accent) 55%,rgba(255,255,255,.2)); border-radius:var(--radius-sm); object-fit:cover; }
  .shop-todays-avatar--monogram { display:grid; place-items:center; background:color-mix(in srgb,var(--shop-accent) 24%,#20232c); color:var(--shop-ink); font:650 1.15rem var(--shop-display); }
  .shop-todays-identity > div { min-width:0; }
  .shop-todays-identity strong, .shop-todays-identity span { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .shop-todays-identity strong { color:var(--shop-ink); font:650 1rem var(--shop-display); }
  .shop-todays-identity span { margin-top:.25rem; color:var(--shop-faint); font:.74rem var(--shop-mono); }
  .shop-todays-color { display:grid; grid-template-columns:3.5rem minmax(0,1fr); gap:.8rem; align-items:center; padding-top:1.15rem; border-top:1px solid var(--shop-line); }
  .shop-todays-color > .shop-eyebrow { grid-column:1 / -1; }
  .shop-color-swatch { width:3.5rem; height:3.5rem; border:1px solid rgba(255,255,255,.22); border-radius:var(--radius-sm); background:var(--shop-roll-color); box-shadow:0 0 2rem color-mix(in srgb,var(--shop-roll-color) 25%,transparent); }
  .shop-todays-color strong, .shop-todays-color span:last-child { display:block; }
  .shop-todays-color strong { color:var(--shop-ink); font:600 .98rem var(--shop-mono); }
  .shop-todays-color span:last-child { margin-top:.3rem; color:var(--shop-faint); font-size:.78rem; line-height:1.4; }
  .shop-home-section { display:grid; gap:1.25rem; }
  .shop-section-heading { display:flex; align-items:end; justify-content:space-between; gap:1.5rem; }
  .shop-section-heading h2 { margin:.4rem 0 0; font:650 clamp(2rem,3vw,2.5rem)/.98 var(--shop-display); letter-spacing:-.045em; }
  .shop-section-heading h2 span { color:var(--shop-accent); }
  .shop-section-heading p { max-width:34rem; margin:.65rem 0 0; color:var(--shop-muted); font-size:.94rem; line-height:1.55; }
  .shop-text-link { padding:.5rem 0; border:0; background:transparent; color:var(--shop-accent); font: .78rem var(--shop-mono); cursor:pointer; white-space:nowrap; }
  .shop-text-link:hover, .shop-text-link:focus-visible { color:#fff; }
  .shop-product-grid { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:.7rem; }
  .shop-home-links { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); border-top:1px solid var(--shop-line); border-bottom:1px solid var(--shop-line); }
  .shop-home-links a { position:relative; display:grid; gap:.35rem; min-height:4.25rem; align-content:center; padding:.75rem 1.1rem; border-right:1px solid var(--shop-line); color:inherit; text-decoration:none; }
  .shop-home-links a:last-child { border-right:0; }
  .shop-home-links a:hover, .shop-home-links a:focus-visible { background:#111319; }
  .shop-home-links span { color:var(--shop-faint); font: .72rem var(--shop-mono); letter-spacing:.1em; text-transform:uppercase; }
  .shop-home-links strong { font-size:1.05rem; }
  .shop-home-links i { position:absolute; top:1rem; right:1rem; color:var(--shop-accent); font-style:normal; }
  .shop-empty-copy { color:var(--shop-muted); }
  @media (max-width: 1100px) { .shop-todays-edit { grid-template-columns:minmax(0,1fr) minmax(16rem,.7fr); } .shop-product-grid { grid-template-columns:repeat(3,minmax(0,1fr)); } }
  @media (max-width: 760px) { .shop-todays-edit { grid-template-columns:1fr; } .shop-todays-merchandise { padding:1.25rem; } .shop-todays-context { grid-template-columns:1fr 1fr; padding:1rem; border-top:1px solid var(--shop-line); border-left:0; } .shop-todays-profile { min-width:0; } .shop-todays-color { align-content:center; padding-top:0; border-top:0; border-left:1px solid var(--shop-line); padding-left:1rem; } .shop-section-heading { align-items:flex-start; flex-direction:column; } .shop-product-grid { grid-template-columns:repeat(2,minmax(0,1fr)); } .shop-home-links { grid-template-columns:1fr; } .shop-home-links a { min-height:4.75rem; border-right:0; border-bottom:1px solid var(--shop-line); } .shop-home-links a:last-child { border-bottom:0; } }
  @media (max-width: 520px) { .shop-todays-product { grid-template-columns:1fr; } .shop-todays-product-preview :global(.shop-preview-area) { min-height:11rem; } .shop-todays-context { grid-template-columns:1fr; } .shop-todays-color { padding-top:1rem; border-top:1px solid var(--shop-line); border-left:0; padding-left:0; } .shop-product-grid { grid-template-columns:1fr; } }
  @media (max-width: 390px) { .shop-todays-copy h2 { font-size:2.2rem; } .shop-todays-actions { align-items:stretch; flex-direction:column; } .shop-todays-actions .shop-button { width:100%; } }
  @media (prefers-reduced-motion: reduce) { .shop-home-links a { transition:none; } }
</style>
