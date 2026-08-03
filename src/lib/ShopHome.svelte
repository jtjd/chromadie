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
  $: todayEditState = todayEditItem ? stateFor(todayEditItem) : null;

  function stateFor(item) {
    return getShopItemState(item, equippedItems, fittingRoom);
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
      </div>
      {#if todayEditItem}
        <div class="shop-todays-product">
          <button type="button" class="shop-todays-product-preview" aria-label={`Open ${todayEditItem.name} details`} on:click={() => dispatch('select', todayEditItem)}>
            <ShopItemPreview item={todayEditItem} username={username} displayColor={displayColor} />
          </button>
          <div class="shop-todays-product-copy">
            <div class="shop-todays-product-topline">
              <span>{todayEditItem.collection || 'Featured piece'}</span>
              {#if todayEditState && ['equipped', 'owned', 'premium-locked', 'unaffordable'].includes(todayEditState.tone)}
                <span class="shop-item-state tone-{todayEditState.tone}">{todayEditState.label}</span>
              {/if}
            </div>
            <h3><button type="button" on:click={() => dispatch('select', todayEditItem)}>{todayEditItem.name}</button></h3>
            <div class="shop-todays-product-meta">
              <span class="shop-item-rarity rarity-{(todayEditItem.rarity || 'Common').toLowerCase()}">{todayEditItem.rarity || 'Common'}</span>
            </div>
            <p>{todayEditItem.description}</p>
            <div class="shop-todays-product-action">
              <strong>{priceLabel(todayEditItem)}</strong>
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
        <span class="shop-eyebrow">More pieces</span>
        <h2 id="shop-curated-title">Keep <span>exploring.</span></h2>
      </div>
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

</div>

<style>
  .shop-home { display:grid; gap:1.8rem; padding-top:.15rem; }
  .shop-todays-edit { display:grid; grid-template-columns:minmax(0,1.5fr) minmax(16rem,.58fr); overflow:hidden; border:1px solid rgba(255,255,255,.11); border-radius:10px; background:#0d1015; }
  .shop-todays-merchandise { min-width:0; padding:1.25rem; }
  .shop-todays-copy { max-width:34rem; }
  .shop-eyebrow { color:var(--shop-faint); font:600 .72rem/1.3 var(--shop-mono); letter-spacing:.13em; text-transform:uppercase; }
  .shop-todays-copy h2 { max-width:34rem; margin:.55rem 0 0; font:650 clamp(2.1rem,3.7vw,3rem)/.94 var(--shop-display); letter-spacing:-.055em; }
  .shop-todays-copy h2 span { color:var(--shop-accent); }
  .shop-todays-product { display:grid; grid-template-columns:minmax(12rem,.78fr) minmax(0,1.22fr); gap:1rem; align-items:stretch; margin-top:1rem; padding-top:.95rem; border-top:1px solid var(--shop-line); }
  .shop-todays-product-preview { min-width:0; display:flex; align-items:stretch; width:100%; padding:0; border:0; background:transparent; color:inherit; cursor:pointer; text-align:left; }
  .shop-todays-product-preview :global(.shop-preview-area) { height:100%; min-height:11.5rem; border-radius:var(--radius-sm); }
  .shop-todays-product-preview:hover :global(.shop-preview-area), .shop-todays-product-preview:focus-visible :global(.shop-preview-area) { border-color:#aeb5e5; }
  .shop-todays-product-copy { display:flex; min-width:0; flex-direction:column; justify-content:center; }
  .shop-todays-product-topline { display:flex; align-items:center; justify-content:space-between; gap:.6rem; color:var(--shop-faint); font:.7rem var(--shop-mono); letter-spacing:.07em; text-transform:uppercase; }
  .shop-todays-product-topline > span:first-child { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .shop-item-state { max-width:50%; overflow:hidden; padding:.3rem .48rem; border:1px solid var(--shop-line-strong); color:var(--shop-muted); text-overflow:ellipsis; white-space:nowrap; }
  .shop-item-state.tone-equipped { border-color:#7d83a9; color:#d7dbff; }
  .shop-item-state.tone-owned, .shop-item-state.tone-available { border-color:#5875a4; color:#b7d2ff; }
  .shop-item-state.tone-premium, .shop-item-state.tone-premium-locked { border-color:#745c9e; color:#dcc3ff; }
  .shop-todays-product-copy h3 { overflow:hidden; margin:.55rem 0 .4rem; color:var(--shop-ink); font:650 1.3rem/1.1 var(--shop-display); letter-spacing:-.025em; text-overflow:ellipsis; white-space:nowrap; }
  .shop-todays-product-copy h3 button { overflow:hidden; max-width:100%; padding:0; border:0; background:transparent; color:inherit; cursor:pointer; font:inherit; text-align:left; text-overflow:ellipsis; white-space:nowrap; }
  .shop-todays-product-copy h3 button:hover, .shop-todays-product-copy h3 button:focus-visible { color:var(--shop-accent); text-decoration:underline; text-underline-offset:3px; }
  .shop-todays-product-meta { display:flex; align-items:center; flex-wrap:wrap; gap:.45rem .65rem; color:var(--shop-faint); font:.74rem var(--shop-mono); }
  .shop-item-rarity { padding:.3rem .48rem; border:1px solid; font-size:.7rem; letter-spacing:.03em; text-transform:uppercase; }
  .rarity-common { border-color:#555a66; background:#15171c; color:#cdd0d8; }
  .rarity-uncommon { border-color:#597b70; background:#111b18; color:#b6e5d2; }
  .rarity-rare { border-color:#5875a4; background:#111923; color:#b7d2ff; }
  .rarity-epic { border-color:#745c9e; background:#191522; color:#dcc3ff; }
  .rarity-anomaly { border-color:#8e673d; background:#201811; color:#ffd09a; }
  .rarity-mythic { border-color:#8d4869; background:#21131b; color:#ffb3d2; }
  .shop-todays-product-copy > p { display:-webkit-box; overflow:hidden; margin:.65rem 0 1rem; color:var(--shop-muted); font-size:.84rem; line-height:1.45; -webkit-box-orient:vertical; -webkit-line-clamp:2; line-clamp:2; }
  .shop-todays-product-action { display:flex; align-items:center; justify-content:space-between; gap:.6rem; margin-top:auto; }
  .shop-todays-product-action strong { color:var(--shop-accent); font:650 1.05rem var(--shop-mono); white-space:nowrap; }
  .shop-todays-context { display:grid; align-content:center; gap:1.1rem; padding:1.15rem; border-left:1px solid var(--shop-line); background:#15181f; }
  .shop-todays-profile { display:grid; gap:.8rem; min-width:0; }
  .shop-todays-identity { display:flex; align-items:center; gap:.65rem; min-width:0; padding:.7rem; border:1px solid var(--shop-line); background:var(--shop-canvas); }
  .shop-todays-avatar { flex:0 0 3rem; width:3rem; height:3rem; overflow:hidden; border:1px solid color-mix(in srgb,var(--shop-accent) 55%,rgba(255,255,255,.2)); border-radius:var(--radius-sm); object-fit:cover; }
  .shop-todays-avatar--monogram { display:grid; place-items:center; background:color-mix(in srgb,var(--shop-accent) 24%,#20232c); color:var(--shop-ink); font:650 1.15rem var(--shop-display); }
  .shop-todays-identity > div { min-width:0; }
  .shop-todays-identity strong, .shop-todays-identity span { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .shop-todays-identity strong { color:var(--shop-ink); font:650 1rem var(--shop-display); }
  .shop-todays-identity span { margin-top:.25rem; color:var(--shop-faint); font:.74rem var(--shop-mono); }
  .shop-todays-color { display:grid; grid-template-columns:3rem minmax(0,1fr); gap:.7rem; align-items:center; padding-top:.95rem; border-top:1px solid var(--shop-line); }
  .shop-todays-color > .shop-eyebrow { grid-column:1 / -1; }
  .shop-color-swatch { width:3rem; height:3rem; border:1px solid rgba(255,255,255,.22); border-radius:var(--radius-sm); background:var(--shop-roll-color); box-shadow:0 0 2rem color-mix(in srgb,var(--shop-roll-color) 25%,transparent); }
  .shop-todays-color strong, .shop-todays-color span:last-child { display:block; }
  .shop-todays-color strong { color:var(--shop-ink); font:600 .98rem var(--shop-mono); }
  .shop-todays-color span:last-child { margin-top:.3rem; color:var(--shop-faint); font-size:.78rem; line-height:1.4; }
  .shop-home-section { display:grid; gap:1.25rem; }
  .shop-section-heading { display:flex; align-items:end; justify-content:space-between; gap:1.5rem; }
  .shop-section-heading h2 { margin:.4rem 0 0; font:650 clamp(2rem,3vw,2.5rem)/.98 var(--shop-display); letter-spacing:-.045em; }
  .shop-section-heading h2 span { color:var(--shop-accent); }
  .shop-product-grid { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:.7rem; }
  .shop-empty-copy { color:var(--shop-muted); }
  @media (max-width: 1100px) { .shop-todays-edit { grid-template-columns:minmax(0,1fr) minmax(16rem,.7fr); } .shop-product-grid { grid-template-columns:repeat(3,minmax(0,1fr)); } }
  @media (max-width: 760px) { .shop-todays-edit { grid-template-columns:1fr; } .shop-todays-merchandise { padding:1.25rem; } .shop-todays-context { grid-template-columns:1fr 1fr; padding:1rem; border-top:1px solid var(--shop-line); border-left:0; } .shop-todays-profile { min-width:0; } .shop-todays-color { align-content:center; padding-top:0; border-top:0; border-left:1px solid var(--shop-line); padding-left:1rem; } .shop-section-heading { align-items:flex-start; flex-direction:column; } .shop-product-grid { grid-template-columns:repeat(2,minmax(0,1fr)); } }
  @media (max-width: 520px) { .shop-todays-product { grid-template-columns:1fr; } .shop-todays-product-preview :global(.shop-preview-area) { min-height:11rem; } .shop-todays-context { grid-template-columns:1fr; } .shop-todays-color { padding-top:1rem; border-top:1px solid var(--shop-line); border-left:0; padding-left:0; } .shop-product-grid { grid-template-columns:1fr; } }
  @media (max-width: 390px) { .shop-todays-copy h2 { font-size:2.2rem; } }
</style>
