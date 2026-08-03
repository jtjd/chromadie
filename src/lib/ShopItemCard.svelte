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
          ? 'Need more EP'
          : 'Buy';

  function compactPrice(value) {
    const amount = Number(value) || 0;
    if (amount >= 1000000) return `${(amount / 1000000).toFixed(amount % 1000000 ? 1 : 0)}M`;
    if (amount >= 1000) return `${Math.round(amount / 1000)}K`;
    return amount.toLocaleString();
  }

</script>

<article class="shop-item rarity-{item.rarity || 'Common'}" class:is-wearing={actuallyEquipped} class:is-previewing={isPreviewing}>
  <div class="item-card-heading">
    <div class="item-card-title">
      <h3><button type="button" class="item-product-button" aria-label={`Open ${item.name} details`} on:click={() => dispatch('select', item)}>{item.name}</button></h3>
    </div>
    {#if !purchasable}
      <strong class="item-price">{priceLabel}</strong>
    {/if}
  </div>
  <button class="item-preview-button" type="button" aria-label={`Preview ${item.name}`} on:click={() => dispatch('preview', item)}>
    <ShopItemPreview {item} username={previewUsername} displayColor={previewColor} />
  </button>

  <div class="item-card-meta">
    <span class="item-rarity rarity-{(item.rarity || 'Common').toLowerCase()}" aria-label={`Rarity: ${item.rarity || 'Common'}`}>{item.rarity || 'Common'}</span>
    <span class="item-collection">{item.collection || 'Core collection'}</span>
    {#if isPreviewing || ['owned', 'equipped', 'premium', 'premium-locked', 'unaffordable'].includes(state?.tone)}
      <span class="item-state tone-{isPreviewing ? 'previewing' : state.tone}">{isPreviewing ? 'Previewing' : state.label}</span>
    {/if}
  </div>

  {#if purchasable}
    <div class="item-card-footer">
      <button type="button" class="item-buy-button" disabled={purchaseDisabled} on:click|stopPropagation={() => dispatch('purchase', item)}>
        <span>{purchaseLabel}</span>
        <span class="item-buy-price" aria-label={`Cost ${priceLabel}`}>· {priceLabel}</span>
      </button>
    </div>
  {/if}
</article>

<style>
  .shop-item { min-width:0; display:flex; flex-direction:column; align-items:stretch; min-height:0; padding:.65rem; border:1px solid rgba(255,255,255,.12); border-radius:9px; background:#11141a; text-align:left; transition:border-color .2s ease, background .2s ease, transform .2s ease; }
  .shop-item:hover { border-color:rgba(205,210,255,.42); background:#161920; transform:translateY(-2px); }
  .shop-item.is-wearing { border-color:#7d83a9; }
  .shop-item.is-previewing { border-color:#7b9baf; }
  .item-card-heading { display:flex; align-items:baseline; justify-content:space-between; gap:10px; width:100%; min-height:1.45rem; }
  .item-card-title { min-width:0; }
  .item-card-title h3 { overflow:hidden; margin:0; font-size:.96rem; line-height:1.2; text-overflow:ellipsis; white-space:nowrap; }
  .item-product-button { overflow:hidden; max-width:100%; padding:0; border:0; background:transparent; color:var(--shop-ink, #f3f2f7); cursor:pointer; font:680 .96rem/1.15 var(--shop-display, var(--font-display)); text-align:left; text-overflow:ellipsis; white-space:nowrap; }
  .item-product-button:hover, .item-product-button:focus-visible { color:#cdd2ff; text-decoration:underline; text-underline-offset:3px; }
  .item-card-meta { display:flex; align-items:center; flex-wrap:wrap; gap:5px 8px; width:100%; min-height:1.45rem; margin:.5rem 0 .1rem; }
  .item-collection { overflow:hidden; min-width:0; padding-left:.55rem; border-left:1px solid rgba(205,210,255,.28); color:#b9b6c7; font:600 .76rem/1.1 var(--shop-mono, var(--font-mono-stack)); letter-spacing:.015em; text-overflow:ellipsis; white-space:nowrap; }
  .item-state { max-width:100%; overflow:hidden; padding:5px 8px; border:1px solid rgba(255,255,255,.1); border-radius:3px; color:#a7a9b2; font: .7rem var(--shop-mono, var(--font-mono-stack)); text-overflow:ellipsis; white-space:nowrap; }
  .item-state.tone-equipped { border-color:#7d83a9; background:#171923; color:#d7dbff; }
  .item-state.tone-previewing { border-color:#7b9baf; background:#111b20; color:#c9ecf3; }
  .item-state.tone-owned { border-color:#5875a4; color:#b7d2ff; }
  .item-state.tone-legacy { border-color:#8e673d; background:#201811; color:#ffd09a; }
  .item-state.tone-legacy-locked { border-color:#5c4a3b; background:#17130f; color:#c7aa88; }
  .item-state.tone-available { border-color:#597b70; color:#b6e5d2; }
  .item-state.tone-free { border-color:#597b70; background:#101b17; color:#b6e5d2; }
  .item-state.tone-premium { border-color:#745c9e; background:#191522; color:#dcc3ff; }
  .item-state.tone-premium-locked { border-color:#745c9e; color:#d0b5e4; }
  .item-preview-button { position:relative; width:100%; margin:.6rem 0 .1rem; padding:0; border:0; border-radius:5px; background:transparent; color:inherit; cursor:pointer; text-align:inherit; }
  .item-preview-button :global(.shop-preview-area) { height:108px; margin-bottom:0; padding:10px; border-radius:6px; }
  .item-preview-button :global(.shop-preview-area-tall) { height:108px; }
  .item-rarity { width:max-content; padding:5px 8px; border:1px solid; border-radius:3px; font:600 .72rem/1 var(--shop-mono, var(--font-mono-stack)); letter-spacing:.03em; text-transform:uppercase; }
  .rarity-common { border-color:#555a66; background:#15171c; color:#cdd0d8; }
  .rarity-uncommon { border-color:#597b70; background:#111b18; color:#b6e5d2; }
  .rarity-rare { border-color:#5875a4; background:#111923; color:#b7d2ff; }
  .rarity-epic { border-color:#745c9e; background:#191522; color:#dcc3ff; }
  .rarity-anomaly { border-color:#8e673d; background:#201811; color:#ffd09a; }
  .rarity-mythic { border-color:#8d4869; background:#21131b; color:#ffb3d2; }
  .item-price { flex:0 0 auto; min-width:0; padding-top:.08rem; color:var(--shop-accent, #cdd2ff); font:650 .78rem/1 var(--shop-mono, var(--font-mono-stack)); white-space:nowrap; }
  .item-card-footer { display:flex; align-items:center; gap:8px; width:100%; margin-top:.55rem; padding-top:.55rem; border-top:1px solid rgba(255,255,255,.08); }
  .item-buy-button { display:inline-flex; align-items:center; gap:.4rem; min-height:2.15rem; padding:0 .75rem; border:1px solid var(--shop-accent, #cdd2ff); border-radius:var(--radius-sm, 4px); background:var(--shop-accent, #cdd2ff); color:#0d0f14; cursor:pointer; font:650 .7rem var(--shop-mono, var(--font-mono-stack)); white-space:nowrap; }
  .item-buy-price { font-weight:750; opacity:.78; }
  .item-buy-button:hover, .item-buy-button:focus-visible { border-color:#fff; background:#fff; }
  .item-buy-button:disabled { border-color:#454852; background:#23262e; color:#858994; cursor:not-allowed; }
  @media (max-width: 520px) { .item-card-title h3, .item-product-button { font-size:1.05rem; } .item-preview-button :global(.shop-preview-area) { height:124px; } }
  @media (prefers-reduced-motion: reduce) { .shop-item { transition:none; } .shop-item:hover { transform:none; } }
</style>
