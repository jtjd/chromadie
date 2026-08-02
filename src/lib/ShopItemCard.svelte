<script>
  import ShopItemPreview from './ShopItemPreview.svelte';
  import { SHOP_SLOT_LABELS, getShopAccessTier } from './shopCatalog';
  import { createEventDispatcher } from 'svelte';

  export let item;
  export let state = { label: 'Available', tone: 'available' };
  export let accessTier = getShopAccessTier(item);
  export let isPreviewing = false;
  export let actuallyEquipped = false;
  export let previewUsername = 'Your profile';
  export let previewColor = '#8B7CF6';
  export let previewRarity = 'Current roll';

  const dispatch = createEventDispatcher();

  $: priceLabel = accessTier === 'free'
    ? 'Included'
    : accessTier === 'premium'
      ? 'Premium'
      : item.cost > 0
        ? `${item.cost.toLocaleString()} EP`
        : 'Milestone';

</script>

<article class="shop-item rarity-{item.rarity || 'Common'}" class:is-wearing={actuallyEquipped} class:is-previewing={isPreviewing}>
  <div class="item-card-heading">
    <div class="item-card-title">
      <span class="item-slot">{SHOP_SLOT_LABELS[item.slot] || item.slot}</span>
      <h3><button type="button" class="item-detail-button" on:click={() => dispatch('select', item)}>{item.name}</button></h3>
    </div>
    <strong class="item-price">{priceLabel}</strong>
  </div>
  <div class="item-card-meta">
    <span class="item-rarity rarity-{(item.rarity || 'Common').toLowerCase()}" aria-label={`Rarity: ${item.rarity || 'Common'}`}>{item.rarity || 'Common'}</span>
    <span class="item-collection">{item.collection || 'Core collection'}</span>
    <span class="item-state tone-{isPreviewing ? 'previewing' : state.tone}">{isPreviewing ? 'Previewing' : state.label}</span>
  </div>

  <button class="item-preview-button" type="button" aria-label={`Preview ${item.name}`} on:click={() => dispatch('preview', item)}>
    <ShopItemPreview {item} username={previewUsername} displayColor={previewColor} rollRarity={previewRarity} />
    <span class="preview-cue">Preview <i aria-hidden="true">↗</i></span>
  </button>

  <p>{item.description}</p>

  <div class="item-card-footer">
    {#if accessTier === 'premium'}<span class="item-access">Premium</span>{:else}<span class="item-access">{item.slot === 'consumable' ? 'Utility' : 'Catalog item'}</span>{/if}
    <button type="button" class="item-detail-link" on:click={() => dispatch('select', item)}>Details <span aria-hidden="true">↗</span></button>
  </div>
</article>

<style>
  .shop-item { min-width:0; display:flex; flex-direction:column; padding:12px; border:1px solid #32353e; border-radius:6px; background:#0a0c10; transition:border-color .2s ease, background .2s ease; }
  .shop-item:hover { border-color:#4b4f5a; background:#0d0f14; }
  .shop-item.is-wearing { border-color:#7d83a9; }
  .shop-item.is-previewing { border-color:#7b9baf; }
  .item-card-heading { display:flex; align-items:flex-start; justify-content:space-between; gap:10px; min-height:3.1rem; }
  .item-card-title { min-width:0; }
  .item-slot { display:block; overflow:hidden; color:#858690; font: .62rem var(--font-mono-stack); letter-spacing:.08em; text-overflow:ellipsis; text-transform:uppercase; white-space:nowrap; }
  .item-card-title h3 { overflow:hidden; margin:.35rem 0 0; font-size:1rem; line-height:1.2; text-overflow:ellipsis; white-space:nowrap; }
  .item-detail-button { overflow:hidden; max-width:100%; padding:0; border:0; background:transparent; color:#f3f2f7; cursor:pointer; font:680 1rem/1.2 var(--font-display); text-align:left; text-overflow:ellipsis; white-space:nowrap; }
  .item-detail-button:hover, .item-detail-button:focus-visible { color:#cdd2ff; text-decoration:underline; text-underline-offset:3px; }
  .item-card-meta { display:flex; align-items:center; flex-wrap:wrap; gap:5px 7px; min-height:2rem; margin:.65rem 0 .55rem; }
  .item-collection { overflow:hidden; min-width:0; color:#858690; font: .67rem var(--font-mono-stack); text-overflow:ellipsis; white-space:nowrap; }
  .item-state { max-width:100%; overflow:hidden; padding:4px 7px; border:1px solid rgba(255,255,255,.1); border-radius:3px; color:#a7a9b2; font: .66rem var(--font-mono-stack); text-overflow:ellipsis; white-space:nowrap; }
  .item-state.tone-equipped { border-color:#7d83a9; background:#171923; color:#d7dbff; }
  .item-state.tone-previewing { border-color:#7b9baf; background:#111b20; color:#c9ecf3; }
  .item-state.tone-owned { border-color:#5875a4; color:#b7d2ff; }
  .item-state.tone-available { border-color:#597b70; color:#b6e5d2; }
  .item-state.tone-free { border-color:#597b70; background:#101b17; color:#b6e5d2; }
  .item-state.tone-premium { border-color:#745c9e; background:#191522; color:#dcc3ff; }
  .item-state.tone-premium-locked { border-color:#745c9e; color:#d0b5e4; }
  .item-preview-button { position:relative; width:100%; padding:0; border:0; border-radius:4px; background:transparent; color:inherit; cursor:pointer; text-align:inherit; }
  .item-preview-button :global(.shop-preview-area) { margin-bottom:0; }
  .preview-cue { position:absolute; right:8px; bottom:8px; display:inline-flex; align-items:center; gap:5px; min-height:26px; padding:0 7px; border:1px solid rgba(255,255,255,.12); border-radius:3px; background:rgba(4,5,8,.86); color:#cdd2ff; font: .66rem var(--font-mono-stack); }
  .preview-cue i { font-style:normal; }
  .item-rarity { width:max-content; padding:4px 7px; border:1px solid; border-radius:3px; font:600 .7rem/1 var(--font-mono-stack); letter-spacing:.03em; text-transform:uppercase; }
  .rarity-common { border-color:#555a66; background:#15171c; color:#cdd0d8; }
  .rarity-uncommon { border-color:#597b70; background:#111b18; color:#b6e5d2; }
  .rarity-rare { border-color:#5875a4; background:#111923; color:#b7d2ff; }
  .rarity-epic { border-color:#745c9e; background:#191522; color:#dcc3ff; }
  .rarity-anomaly { border-color:#8e673d; background:#201811; color:#ffd09a; }
  .rarity-mythic { border-color:#8d4869; background:#21131b; color:#ffb3d2; }
  .item-price { flex:0 0 auto; min-width:0; padding-top:.15rem; color:#cdd2ff; font:650 1rem/1 var(--font-mono-stack); white-space:nowrap; }
  .shop-item > p { min-height:2.8em; display:-webkit-box; overflow:hidden; margin:10px 0 13px; color:#aaa8b0; font-size:.82rem; line-height:1.45; -webkit-box-orient:vertical; -webkit-line-clamp:2; line-clamp:2; }
  .item-card-footer { display:flex; align-items:center; justify-content:space-between; gap:8px; margin-top:auto; padding-top:.65rem; border-top:1px solid rgba(255,255,255,.07); }
  .item-access { overflow:hidden; color:#777983; font: .62rem var(--font-mono-stack); letter-spacing:.05em; text-overflow:ellipsis; text-transform:uppercase; white-space:nowrap; }
  .item-detail-link { min-height:2rem; padding:0; border:0; background:transparent; color:#cdd2ff; cursor:pointer; font: .68rem var(--font-mono-stack); white-space:nowrap; }
  .item-detail-link:hover, .item-detail-link:focus-visible { color:#fff; text-decoration:underline; text-underline-offset:3px; }
  @media (max-width: 520px) { .item-card-title h3, .item-detail-button { font-size:.95rem; } }
  @media (prefers-reduced-motion: reduce) { .shop-item { transition:none; } .shop-item:hover { transform:none; } }
</style>
