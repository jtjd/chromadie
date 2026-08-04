<script>
  import ShopItemPreview from './ShopItemPreview.svelte';
  import { getShopAccessTier } from './shopCatalog';
  import { createEventDispatcher } from 'svelte';

  export let item;
  export let state = { label: 'Available', tone: 'available' };
  export let accessTier = getShopAccessTier(item);
  export let isPreviewing = false;
  export let actuallyEquipped = false;
  export let previewUsername = 'You';
  export let previewColor = '#8B7CF6';
  export let walletBalance = 0;
  export let isSignedIn = false;
  export let purchaseArmed = false;
  export let purchaseLoading = false;

  const dispatch = createEventDispatcher();

  $: priceLabel = accessTier === 'free'
    ? 'Included'
    : accessTier === 'premium'
      ? 'Premium'
      : item.cost > 0
        ? `${compactPrice(item.cost)} EP`
        : 'Milestone';
  $: purchasable = accessTier === 'earned'
    && Number(item?.cost) > 0
    && (item?.slot === 'consumable' || !['owned', 'equipped'].includes(state?.tone));
  $: purchaseDisabled = purchaseLoading || (isSignedIn && state?.tone === 'unaffordable');
  $: purchaseLabel = purchaseLoading
    ? 'Buying…'
    : purchaseArmed
      ? 'Confirm purchase'
        : !isSignedIn
          ? 'Sign in to buy'
          : state?.tone === 'unaffordable'
          ? `Need ${compactPrice(Math.max(0, Number(item?.cost || 0) - Number(walletBalance || 0)))} more EP`
          : 'Buy';
  $: stateLabel = state?.tone === 'free'
    ? 'Included'
    : state?.tone === 'premium-locked'
      ? 'Premium'
      : state?.tone === 'premium'
        ? 'Premium unlocked'
        : state?.label;
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
  }[item?.slot] || 'Piece';

  function compactPrice(value) {
    const amount = Number(value) || 0;
    if (amount >= 1000000) return `${(amount / 1000000).toFixed(amount % 1000000 ? 1 : 0)}M`;
    if (amount >= 1000) return `${Math.round(amount / 1000)}K`;
    return amount.toLocaleString();
  }
</script>

<article class="shop-item rarity-{item.rarity || 'Common'}" class:is-wearing={actuallyEquipped} class:is-previewing={isPreviewing}>
  <button class="item-select-button" type="button" aria-label={`Preview ${item.name} on your profile`} aria-pressed={isPreviewing} on:click={() => dispatch('select', item)}>
    <ShopItemPreview {item} username={previewUsername} displayColor={previewColor} active={isPreviewing} />
    <span class="item-card-heading">
      <span class="item-card-title">
        <span class="item-slot-label">{slotLabel}</span>
        <strong>{item.name}</strong>
      </span>
    </span>
  </button>

  <div class="item-card-meta">
    <div class="item-taxonomy">
      <span class="item-rarity rarity-{(item.rarity || 'Common').toLowerCase()}" aria-label={`Rarity: ${item.rarity || 'Common'}`}>{item.rarity || 'Common'}</span>
      <span class="item-taxonomy-divider" aria-hidden="true">·</span>
      <span class="item-collection">{item.collection || 'Core collection'}</span>
    </div>
    <div class="item-card-action">
      {#if purchasable}
        <button type="button" class="item-buy-button" class:item-buy-button--locked={state?.tone === 'unaffordable'} disabled={purchaseDisabled} on:click|stopPropagation={() => dispatch('purchase', item)}>
          <span>{purchaseLabel}</span>
          {#if state?.tone !== 'unaffordable'}<span class="item-buy-price" aria-label={`Cost ${priceLabel}`}>· {priceLabel}</span>{/if}
        </button>
      {:else if ['owned', 'equipped'].includes(state?.tone)}
        <button type="button" class="item-buy-button item-buy-button--state tone-{state.tone}" disabled aria-label={`${state.label}: ${item.name}`}>{stateLabel}</button>
      {:else if isPreviewing}
        <span class="item-state tone-previewing">Previewing</span>
      {:else}
        <span class="item-state tone-{state.tone}">{stateLabel}</span>
      {/if}
    </div>
  </div>
</article>

<style>
  .shop-item { min-width:0; display:flex; flex-direction:column; align-items:stretch; min-height:0; text-align:left; transition:transform .2s ease; }
  .shop-item:hover { transform:translateY(-2px); }
  :global(.app-main--site) .shop-item { padding:0; border:0; border-radius:0; background:transparent; box-shadow:none; }
  :global(.app-main--site) .shop-item:hover { border-color:transparent; background:transparent; box-shadow:none; }
  .shop-item.is-wearing :global(.shop-preview-area) { box-shadow:inset 0 0 0 2px #7d83a9; }
  .shop-item.is-previewing :global(.shop-preview-area) { box-shadow:inset 0 0 0 2px #9aa7d1, 0 .8rem 1.8rem rgba(0,0,0,.22); }
  .item-select-button { display:flex; flex:1 1 auto; flex-direction:column; min-width:0; width:100%; padding:0; border:0; background:transparent; color:inherit; cursor:pointer; text-align:left; }
  .item-select-button:focus-visible { outline:2px solid #cdd2ff; outline-offset:4px; border-radius:4px; }
  .item-card-heading { display:flex; align-items:flex-start; justify-content:space-between; gap:10px; width:100%; margin:.72rem .15rem 0; }
  .item-card-title { display:grid; min-width:0; gap:.15rem; }
  .item-card-title strong { overflow:hidden; color:var(--shop-ink, #f3f2f7); font:680 1.06rem/1.15 var(--shop-display, var(--font-display)); text-overflow:ellipsis; white-space:nowrap; }
  .item-slot-label { color:#8f929d; font:600 .62rem/1 var(--shop-mono, var(--font-mono-stack)); letter-spacing:.1em; text-transform:uppercase; }
  .item-select-button:hover .item-card-title strong, .item-select-button:focus-visible .item-card-title strong { color:#d7dbff; }
  .item-card-meta { display:flex; align-items:center; justify-content:space-between; gap:.65rem; width:100%; min-height:2rem; margin:.48rem .15rem 0; }
  .item-taxonomy { display:flex; align-items:center; flex-wrap:wrap; gap:.35rem; min-width:0; }
  .item-taxonomy-divider { color:#60636d; font:600 .76rem/1 var(--shop-mono, var(--font-mono-stack)); }
  .item-collection { overflow:hidden; min-width:0; color:#aaaab5; font:600 .74rem/1.1 var(--shop-mono, var(--font-mono-stack)); letter-spacing:.015em; text-overflow:ellipsis; white-space:nowrap; }
  .item-state { max-width:100%; overflow:hidden; color:#a7a9b2; font:.74rem var(--shop-mono, var(--font-mono-stack)); text-overflow:ellipsis; white-space:nowrap; }
  .item-state.tone-equipped { color:#d7dbff; }
  .item-state.tone-previewing { color:#c9ecf3; }
  .item-state.tone-owned { color:#b7d2ff; }
  .item-state.tone-available, .item-state.tone-free { color:#b6e5d2; }
  .item-state.tone-premium, .item-state.tone-premium-locked { color:#dcc3ff; }
  .item-state.tone-unaffordable { color:#c7a9ae; }
  .item-select-button :global(.shop-preview-area) { aspect-ratio:16 / 9; height:auto; margin-top:0; padding:0; border-radius:12px; }
  .item-rarity { width:max-content; padding:0; border:0; border-radius:0; background:transparent; font:700 .67rem/1 var(--shop-mono, var(--font-mono-stack)); letter-spacing:.06em; text-transform:uppercase; }
  .rarity-common { color:#cdd0d8; }
  .rarity-uncommon { color:#b6e5d2; }
  .rarity-rare { color:#b7d2ff; }
  .rarity-epic { color:#dcc3ff; }
  .rarity-anomaly { color:#ffd09a; }
  .rarity-mythic { color:#ffb3d2; }
  .item-card-action { display:flex; flex:0 0 auto; justify-content:flex-end; min-width:0; }
  .item-buy-button { display:inline-flex; align-items:center; gap:.35rem; min-height:2rem; max-width:100%; padding:0 0 .16rem; border:0; border-bottom:1px solid color-mix(in srgb, var(--shop-accent, #cdd2ff) 58%, transparent); border-radius:0; background:transparent; color:var(--shop-accent, #cdd2ff); cursor:pointer; font:650 .68rem var(--shop-mono, var(--font-mono-stack)); white-space:nowrap; }
  .item-buy-price { font-weight:750; opacity:.78; }
  .item-buy-button:hover, .item-buy-button:focus-visible { border-bottom-color:var(--shop-accent, #cdd2ff); color:#fff; }
  .item-buy-button:disabled { border-bottom-color:#454852; background:transparent; color:#858994; cursor:not-allowed; }
  .item-buy-button--locked { border-bottom-color:#454852; background:transparent; color:#a5a8b2; }
  .item-buy-button--state { background:transparent; color:#b9b6c7; }
  .item-buy-button--state.tone-equipped { border-bottom-color:#7d83a9; background:transparent; color:#d7dbff; }
  .item-buy-button--state.tone-owned { border-bottom-color:#5875a4; background:transparent; color:#b7d2ff; }
  @media (max-width: 420px) { .item-card-meta { align-items:flex-start; flex-direction:column; } .item-card-action, .item-buy-button { width:100%; } .item-buy-button { justify-content:center; } }
  @media (prefers-reduced-motion: reduce) { .shop-item { transition:none; } .shop-item:hover { transform:none; } }
</style>
