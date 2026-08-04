<script>
  import { createEventDispatcher } from 'svelte';
  import ShopStudioPreview from './ShopStudioPreview.svelte';
  import { getVisibleProfileLinks } from './profileConfig.js';

  export let loadout = {};
  /** @type {any} */
  export let selectedItem = null;
  export let username = 'You';
  export let displayColor = '#8B7CF6';
  /** @type {{display_name?: string, username?: string} | null} */
  export let accountProfile = null;
  /** @type {any} */
  export let profileConfig = null;
  export let walletBalance = 0;
  /** @type {any} */
  export let state = null;
  export let accessTier = 'earned';
  export let isSignedIn = false;
  export let purchaseArmed = false;
  export let purchaseLoading = false;

  const dispatch = createEventDispatcher();

  $: previewName = accountProfile?.display_name || accountProfile?.username || username || 'You';
  $: previewConfig = profileConfig
    ? (profileConfig.published || profileConfig.draft || profileConfig)
    : {};
  $: previewLinks = getVisibleProfileLinks(previewConfig);
  $: selectedPriceLabel = accessTier === 'free'
    ? 'Included'
    : accessTier === 'premium'
      ? 'Premium'
      : selectedItem?.cost > 0
        ? `${compactPrice(selectedItem.cost)} EP`
        : 'Milestone';
  $: selectedPurchasable = Boolean(selectedItem)
    && accessTier === 'earned'
    && Number(selectedItem?.cost) > 0
    && (selectedItem?.slot === 'consumable' || !['owned', 'equipped'].includes(state?.tone));
  $: purchaseDisabled = purchaseLoading || (isSignedIn && state?.tone === 'unaffordable');
  $: purchaseLabel = purchaseLoading
    ? 'Buying…'
    : purchaseArmed
      ? 'Confirm purchase'
      : !isSignedIn
        ? 'Sign in to buy'
        : state?.tone === 'unaffordable'
          ? `Need ${compactPrice(Math.max(0, Number(selectedItem?.cost || 0) - Number(walletBalance || 0)))} more EP`
          : `Buy for ${selectedPriceLabel}`;
  $: stateLabel = state?.tone === 'free'
    ? 'Included'
    : state?.tone === 'premium-locked'
      ? 'Premium'
      : state?.tone === 'premium'
        ? 'Premium unlocked'
        : state?.label || 'Unavailable';
  $: slotLabel = {
    name_font: 'Font',
    name_material: 'Material',
    name_motion: 'Motion',
    profile_border: 'Border',
    avatar_effect: 'Avatar',
    profile_atmosphere: 'Atmosphere',
    cursor_trail: 'Cursor',
    profile_layout: 'Layout',
    consumable: 'Utility'
  }[selectedItem?.slot] || 'Piece';
  // Re-mount the shared renderer whenever the fitting-room selection or any
  // selected layer changes. This keeps Canvas, border, and motion effects in
  // sync even when a renderer owns mount-time state or an async font loader.
  $: previewKey = [
    selectedItem?.item_key || 'equipped',
    loadout?.name_font || '',
    loadout?.name_material || '',
    loadout?.name_motion || '',
    loadout?.profile_border || '',
    loadout?.avatar_effect || '',
    loadout?.cursor_trail || '',
    loadout?.profile_layout || '',
    loadout?.profile_atmosphere || ''
  ].join('|');

  function compactPrice(value) {
    const amount = Number(value) || 0;
    if (amount >= 1000000) return `${(amount / 1000000).toFixed(amount % 1000000 ? 1 : 0)}M`;
    if (amount >= 1000) return `${Math.round(amount / 1000)}K`;
    return amount.toLocaleString();
  }
</script>

<aside class="shop-contextual-preview" aria-labelledby="shop-contextual-preview-title">
  <div class="shop-contextual-preview__topline">
    <span>Live profile</span>
    <span>Draft preview</span>
  </div>

  <header class="shop-contextual-preview__header">
    <div class="shop-contextual-preview__balance">
      <span class="shop-contextual-preview__balance-icon" aria-hidden="true">✦</span>
      <div>
        <span>EP balance</span>
        <strong>{Number(walletBalance || 0).toLocaleString()} EP</strong>
        <small>Available to spend</small>
      </div>
    </div>
    {#if selectedItem}
      <button type="button" class="shop-contextual-preview__reset" on:click={() => dispatch('reset')}>Clear</button>
    {/if}
  </header>

  {#key previewKey}
    <ShopStudioPreview
      {loadout}
      {selectedItem}
      username={previewName}
      {displayColor}
      {accountProfile}
      {profileConfig}
      links={previewLinks}
      nameRendererMode="animated"
      compact
    />
  {/key}

  <div class="shop-contextual-preview__status" aria-live="polite">
    <span>{selectedItem ? 'Temporary preview' : 'Equipped look'}</span>
    <strong id="shop-contextual-preview-title">{selectedItem?.name || 'Your profile'}</strong>
    {#if selectedItem}<small>Nothing is saved until you equip it in Profile settings.</small>{/if}
  </div>

  {#if selectedItem}
    <section class="shop-contextual-preview__selection" aria-labelledby="shop-selected-item-title">
      <div class="shop-selection-heading">
        <div>
          <span>{slotLabel} · {selectedItem.rarity || 'Common'}</span>
          <h2 id="shop-selected-item-title">{selectedItem.name}</h2>
        </div>
        <strong>{selectedPriceLabel}</strong>
      </div>
      <p>{selectedItem.description || 'A profile cosmetic designed to make your identity more personal.'}</p>
      <div class="shop-selection-meta">
        <span>{selectedItem.collection || 'Core collection'}</span>
        <span>{stateLabel}</span>
      </div>
      {#if selectedPurchasable}
        <button type="button" class="shop-selection-buy" disabled={purchaseDisabled} on:click={() => dispatch('purchase', selectedItem)}>{purchaseLabel}</button>
      {:else}
        <button type="button" class="shop-selection-buy shop-selection-buy--state" disabled>{stateLabel}</button>
      {/if}
      <button type="button" class="shop-selection-clear" on:click={() => dispatch('reset')}>Clear preview</button>
    </section>
  {:else}
    <div class="shop-contextual-preview__empty-selection">
      <span>Catalog</span>
      <strong>Select a cosmetic to inspect it.</strong>
      <small>Preview it on your profile, then purchase it when it feels right.</small>
    </div>
  {/if}

</aside>

<style>
  .shop-contextual-preview {
    position: sticky;
    top: 1rem;
    align-self: start;
    display: grid;
    gap: .8rem;
    min-width: 0;
    overflow: visible;
    padding: 1rem;
    background: transparent;
  }

  .shop-contextual-preview__topline { display:flex; align-items:center; justify-content:space-between; gap:.8rem; color:var(--shop-accent); font:700 .64rem/1 var(--shop-mono); letter-spacing:.1em; text-transform:uppercase; }
  .shop-contextual-preview__topline span:last-child { color:var(--shop-faint); }
  .shop-contextual-preview__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: .9rem;
    padding: .75rem 0 .8rem;
    border-top: 1px solid var(--shop-line);
    border-bottom: 1px solid var(--shop-line);
  }

  .shop-contextual-preview__balance { display:grid; grid-template-columns:2rem minmax(0,1fr); align-items:center; gap:.55rem; min-width:0; padding:.32rem .7rem .32rem .35rem; border:1px solid color-mix(in srgb,var(--shop-accent) 38%,var(--shop-line)); border-radius:6px; background:color-mix(in srgb,var(--shop-accent) 7%,transparent); }
  .shop-contextual-preview__balance-icon { display:grid; place-items:center; width:1.8rem; height:1.8rem; border-radius:5px; background:color-mix(in srgb,var(--shop-accent) 20%,transparent); color:var(--shop-accent); font-size:.95rem; }
  .shop-contextual-preview__balance > div { display:grid; gap:.2rem; min-width:0; }
  .shop-contextual-preview__balance > div > span { color:var(--shop-accent); font:700 .62rem/1 var(--shop-mono); letter-spacing:.1em; text-transform:uppercase; }
  .shop-contextual-preview__balance strong { overflow:hidden; color:var(--shop-ink); font:750 1.2rem/1 var(--shop-mono); letter-spacing:-.04em; text-overflow:ellipsis; white-space:nowrap; }
  .shop-contextual-preview__balance small { color:var(--shop-muted); font-size:.65rem; line-height:1; }
  .shop-contextual-preview__reset {
    min-height: 2.2rem;
    padding: 0 0.65rem;
    border: 1px solid #3a3e47;
    border-radius: 4px;
    background: #17191f;
    color: #b5b8c1;
    cursor: pointer;
    font: 600 .72rem var(--shop-font);
  }

  .shop-contextual-preview__reset:hover,
  .shop-contextual-preview__reset:focus-visible {
    border-color: #aeb5e5;
    color: #cdd2ff !important;
  }

  .shop-contextual-preview :global(.studio-preview) {
    min-height: 0;
    padding: .75rem;
    border: 0;
    border-radius: 0;
    background: transparent;
    box-shadow: none;
  }

  .shop-contextual-preview :global(.studio-stage.context-profile) { min-height: 19rem; padding: .55rem; border: 1px solid var(--shop-line); border-radius: var(--radius-md); background: var(--shop-deep); }
  .shop-contextual-preview :global(.stage-grid) { display:none; }
  .shop-contextual-preview :global(.studio-profile-card) { width: calc(100% - .25rem); max-width: 100%; margin-inline: auto; border-color: transparent; background: transparent; box-shadow: none; }
  .shop-contextual-preview :global(.studio-profile-card .identity-card) { min-height: 16rem; padding: 1.15rem; border-color: transparent; background: transparent !important; box-shadow: none; backdrop-filter: none; -webkit-backdrop-filter: none; }
  .shop-contextual-preview :global(.studio-profile-card .identity-card__avatar) { flex-basis: 3.5rem; width: 3.5rem; }
  .shop-contextual-preview :global(.studio-profile-card .identity-card__name) { font-size: clamp(2rem, 5.5vw, 2.65rem); }
  .shop-contextual-preview :global(.studio-profile-card .identity-card__links) { gap: .45rem .8rem; margin-top: .8rem; }

  .shop-contextual-preview__status { display:grid; gap:.25rem; padding:0 .15rem .05rem; }
  .shop-contextual-preview__status span { color:var(--shop-faint); font:700 .62rem/1 var(--shop-mono); letter-spacing:.1em; text-transform:uppercase; }
  .shop-contextual-preview__status strong { overflow:hidden; color:var(--shop-ink); font:600 .9rem/1.15 var(--shop-font); text-overflow:ellipsis; white-space:nowrap; }
  .shop-contextual-preview__status small { color:var(--shop-muted); font-size:.72rem; line-height:1.35; }
  .shop-contextual-preview__selection { display:grid; gap:.7rem; padding-top:1rem; border-top:1px solid var(--shop-line); }
  .shop-selection-heading { display:flex; align-items:flex-start; justify-content:space-between; gap:.8rem; }
  .shop-selection-heading > div { min-width:0; }
  .shop-selection-heading span { color:var(--shop-faint); font:700 .62rem/1 var(--shop-mono); letter-spacing:.1em; text-transform:uppercase; }
  .shop-selection-heading h2 { overflow:hidden; margin:.35rem 0 0; color:var(--shop-ink); font:650 1.15rem/1.1 var(--shop-display); letter-spacing:-.03em; text-overflow:ellipsis; white-space:nowrap; }
  .shop-selection-heading strong { flex:0 0 auto; padding-top:.2rem; color:var(--shop-ink); font:650 .76rem var(--shop-mono); white-space:nowrap; }
  .shop-contextual-preview__selection p { margin:0; color:var(--shop-muted); font-size:.75rem; line-height:1.5; }
  .shop-selection-meta { display:flex; align-items:center; justify-content:space-between; gap:.7rem; color:var(--shop-faint); font:.65rem var(--shop-mono); text-transform:uppercase; }
  .shop-selection-buy, .shop-selection-clear { width:100%; min-height:2.65rem; border-radius:5px; cursor:pointer; font:650 .76rem var(--shop-font); }
  .shop-selection-buy { border:1px solid color-mix(in srgb,var(--shop-accent) 68%,transparent); background:linear-gradient(100deg,color-mix(in srgb,var(--shop-accent) 80%,#5965e8),color-mix(in srgb,var(--shop-accent) 82%,#a070f3)); color:#11121a; box-shadow:0 .7rem 1.5rem color-mix(in srgb,var(--shop-accent) 16%,transparent); }
  .shop-selection-buy:hover, .shop-selection-buy:focus-visible { filter:brightness(1.08); }
  .shop-selection-buy:disabled { border-color:#333947; background:#171c27; color:#727c96; box-shadow:none; cursor:not-allowed; }
  .shop-selection-buy--state { background:transparent; color:#b9b6c7; }
  .shop-selection-clear { border:1px solid var(--shop-line-strong); background:transparent; color:var(--shop-muted); }
  .shop-selection-clear:hover, .shop-selection-clear:focus-visible { border-color:#8b91a3; color:var(--shop-ink); }
  .shop-contextual-preview__empty-selection { display:grid; gap:.35rem; padding-top:1rem; border-top:1px solid var(--shop-line); }
  .shop-contextual-preview__empty-selection span { color:var(--shop-faint); font:700 .62rem/1 var(--shop-mono); letter-spacing:.1em; text-transform:uppercase; }
  .shop-contextual-preview__empty-selection strong { color:var(--shop-ink); font:650 .95rem var(--shop-display); }
  .shop-contextual-preview__empty-selection small { color:var(--shop-muted); font-size:.72rem; line-height:1.4; }

  @media (max-width: 960px) {
    .shop-contextual-preview { position: static; }
    .shop-contextual-preview :global(.studio-stage.context-profile) { min-height: 17rem; }
  }

  @media (max-width: 700px) {
    .shop-contextual-preview { padding: .8rem; }
    .shop-contextual-preview__header { align-items:flex-start; flex-direction:column; padding: .75rem 0; }
    .shop-contextual-preview :global(.studio-stage.context-profile) { min-height: 15rem; }
  }
</style>
