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

  function compactPrice(value) {
    const amount = Number(value) || 0;
    if (amount >= 1000000) return `${(amount / 1000000).toFixed(amount % 1000000 ? 1 : 0)}M`;
    if (amount >= 1000) return `${Math.round(amount / 1000)}K`;
    return amount.toLocaleString();
  }
</script>

<article class="shop-item rarity-{item.rarity || 'Common'}" class:is-wearing={actuallyEquipped} class:is-previewing={isPreviewing}>
  <button class="item-select-button" type="button" aria-label={`Preview ${item.name} on your profile`} aria-pressed={isPreviewing} on:click={() => dispatch('select', item)}>
    <span class="item-card-heading">
      <span class="item-card-title">
        {#if !['name_font', 'name_material', 'name_motion'].includes(item.slot)}
          <span class="item-slot-label">{item.slot === 'profile_border' ? 'Border' : item.slot === 'avatar_effect' ? 'Avatar' : item.slot === 'cursor_trail' ? 'Cursor' : item.slot === 'profile_layout' ? 'Layout' : item.slot === 'consumable' ? 'Utility' : 'Name'}</span>
        {/if}
        <strong>{item.name}</strong>
      </span>
      {#if state?.tone === 'unaffordable'}
        <strong class="item-price">{priceLabel}</strong>
      {/if}
    </span>
    <ShopItemPreview {item} username={previewUsername} displayColor={previewColor} active={isPreviewing} />
  </button>

  <div class="item-card-meta">
    <div class="item-taxonomy">
      <span class="item-rarity rarity-{(item.rarity || 'Common').toLowerCase()}" aria-label={`Rarity: ${item.rarity || 'Common'}`}>{item.rarity || 'Common'}</span>
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
  .shop-item { min-width:0; display:flex; flex-direction:column; align-items:stretch; min-height:0; padding:.7rem; border:1px solid rgba(255,255,255,.12); border-radius:9px; background:#11141a; text-align:left; transition:border-color .2s ease, background .2s ease, transform .2s ease; }
  .shop-item:hover { border-color:rgba(205,210,255,.42); background:#161920; transform:translateY(-2px); }
  .shop-item.is-wearing { border-color:#7d83a9; }
  .shop-item.is-previewing { border-color:#7b9baf; }
  .item-select-button { display:flex; flex:1 1 auto; flex-direction:column; min-width:0; width:100%; padding:0; border:0; background:transparent; color:inherit; cursor:pointer; text-align:left; }
  .item-select-button:focus-visible { outline:2px solid #cdd2ff; outline-offset:4px; border-radius:4px; }
  .item-card-heading { display:flex; align-items:flex-start; justify-content:space-between; gap:10px; width:100%; min-height:1.95rem; }
  .item-card-title { display:grid; min-width:0; gap:.15rem; }
  .item-card-title strong { overflow:hidden; color:var(--shop-ink, #f3f2f7); font:680 1.1rem/1.15 var(--shop-display, var(--font-display)); text-overflow:ellipsis; white-space:nowrap; }
  .item-slot-label { color:#858892; font:600 .68rem/1 var(--shop-mono, var(--font-mono-stack)); letter-spacing:.09em; text-transform:uppercase; }
  .item-select-button:hover .item-card-title strong, .item-select-button:focus-visible .item-card-title strong { color:#d7dbff; }
  .item-card-meta { display:flex; align-items:center; justify-content:space-between; gap:.65rem; width:100%; min-height:2.35rem; margin:.55rem 0 0; padding-top:.55rem; border-top:1px solid rgba(255,255,255,.09); }
  .item-taxonomy { display:flex; align-items:center; flex-wrap:wrap; gap:.45rem; min-width:0; }
  .item-collection { overflow:hidden; min-width:0; padding-left:.55rem; border-left:1px solid rgba(205,210,255,.28); color:#c1becc; font:600 .82rem/1.1 var(--shop-mono, var(--font-mono-stack)); letter-spacing:.015em; text-overflow:ellipsis; white-space:nowrap; }
  .item-state { max-width:100%; overflow:hidden; padding:5px 8px; border:1px solid rgba(255,255,255,.1); border-radius:3px; color:#a7a9b2; font:.74rem var(--shop-mono, var(--font-mono-stack)); text-overflow:ellipsis; white-space:nowrap; }
  .item-state.tone-equipped { border-color:#7d83a9; background:#171923; color:#d7dbff; }
  .item-state.tone-previewing { border-color:#7b9baf; background:#111b20; color:#c9ecf3; }
  .item-state.tone-owned { border-color:#5875a4; color:#b7d2ff; }
  .item-state.tone-available { border-color:#597b70; color:#b6e5d2; }
  .item-state.tone-free { border-color:#597b70; background:#101b17; color:#b6e5d2; }
  .item-state.tone-premium { border-color:#745c9e; background:#191522; color:#dcc3ff; }
  .item-state.tone-premium-locked { border-color:#745c9e; color:#d0b5e4; }
  .item-state.tone-unaffordable { border-color:#5b4b4d; color:#c7a9ae; }
  .item-select-button :global(.shop-preview-area) { height:138px; margin-top:.5rem; padding:10px; border-radius:6px; }
  .item-select-button :global(.shop-preview-area-tall) { height:138px; }
  .item-rarity { width:max-content; padding:5px 8px; border:1px solid; border-radius:3px; font:600 .76rem/1 var(--shop-mono, var(--font-mono-stack)); letter-spacing:.03em; text-transform:uppercase; }
  .rarity-common { border-color:#555a66; background:#15171c; color:#cdd0d8; }
  .rarity-uncommon { border-color:#597b70; background:#111b18; color:#b6e5d2; }
  .rarity-rare { border-color:#5875a4; background:#111923; color:#b7d2ff; }
  .rarity-epic { border-color:#745c9e; background:#191522; color:#dcc3ff; }
  .rarity-anomaly { border-color:#8e673d; background:#201811; color:#ffd09a; }
  .rarity-mythic { border-color:#8d4869; background:#21131b; color:#ffb3d2; }
  .item-price { flex:0 0 auto; min-width:0; padding-top:.08rem; color:var(--shop-accent, #cdd2ff); font:650 .82rem/1 var(--shop-mono, var(--font-mono-stack)); white-space:nowrap; }
  .item-card-action { display:flex; flex:0 0 auto; justify-content:flex-end; min-width:0; }
  .item-buy-button { display:inline-flex; align-items:center; gap:.35rem; min-height:2.2rem; max-width:100%; padding:0 .65rem; border:1px solid var(--shop-accent, #cdd2ff); border-radius:var(--radius-sm, 4px); background:var(--shop-accent, #cdd2ff); color:#0d0f14; cursor:pointer; font:650 .72rem var(--shop-mono, var(--font-mono-stack)); white-space:nowrap; }
  .item-buy-price { font-weight:750; opacity:.78; }
  .item-buy-button:hover, .item-buy-button:focus-visible { border-color:#fff; background:#fff; }
  .item-buy-button:disabled { border-color:#454852; background:#23262e; color:#858994; cursor:not-allowed; }
  .item-buy-button--locked { border-color:#454852; background:#1a1d24; color:#a5a8b2; }
  .item-buy-button--state { background:transparent; color:#b9b6c7; }
  .item-buy-button--state.tone-equipped { border-color:#7d83a9; background:#171923; color:#d7dbff; }
  .item-buy-button--state.tone-owned { border-color:#5875a4; background:#111923; color:#b7d2ff; }
  @media (max-width: 600px) { .item-select-button :global(.shop-preview-area), .item-select-button :global(.shop-preview-area-tall) { height:128px; } }
  @media (max-width: 420px) { .item-card-meta { align-items:flex-start; flex-direction:column; } .item-card-action, .item-buy-button { width:100%; } .item-buy-button { justify-content:center; } }
  @media (prefers-reduced-motion: reduce) { .shop-item { transition:none; } .shop-item:hover { transform:none; } }
</style>
