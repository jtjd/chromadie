<script>
  import ShopItemPreview from './ShopItemPreview.svelte';
  import { SHOP_SLOT_LABELS, getShopAccessLabel, getShopAccessTier, isShopCosmetic } from './shopCatalog';
  import { createEventDispatcher } from 'svelte';

  export let item;
  export let state = { label: 'Available', tone: 'available' };
  export let accessTier = getShopAccessTier(item);
  export let hasAccess = false;
  export let canPurchase = false;
  export let isPreviewing = false;
  export let actuallyEquipped = false;
  export let ownedCount = 0;
  export let itemBusy = false;
  export let purchaseArmed = false;
  export let isSignedIn = false;
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

  $: purchaseLabel = !isSignedIn
    ? 'Sign in to buy'
    : itemBusy
      ? 'Purchasing…'
      : purchaseArmed
        ? `Confirm · ${item.cost.toLocaleString()} EP`
        : `${ownedCount > 0 ? 'Buy another' : 'Buy'} · ${item.cost.toLocaleString()} EP`;
</script>

<article class="shop-item rarity-{item.rarity || 'Common'}" class:is-wearing={actuallyEquipped} class:is-previewing={isPreviewing}>
  <div class="item-topline">
    <span>{SHOP_SLOT_LABELS[item.slot] || item.slot}</span>
    <span class="item-state tone-{isPreviewing ? 'previewing' : state.tone}">{isPreviewing ? 'Previewing' : state.label}</span>
  </div>
  <div class="item-access-label tier-{accessTier}">{getShopAccessLabel(item)}</div>

  <button class="item-preview-button" type="button" aria-label={`Try on ${item.name}`} on:click={() => dispatch('select', item)}>
    <ShopItemPreview {item} username={previewUsername} displayColor={previewColor} rollRarity={previewRarity} />
    <span class="preview-cue">Try on <i aria-hidden="true">↗</i></span>
  </button>

  <div class="item-copy">
    <div>
      <h3>{item.name}</h3>
      <span>{item.collection || 'Core collection'}</span>
      <span class="item-rarity rarity-{(item.rarity || 'Common').toLowerCase()}" aria-label={`Rarity: ${item.rarity || 'Common'}`}>{item.rarity || 'Common'}</span>
    </div>
    <strong class="item-price">{priceLabel}</strong>
  </div>
  <p>{item.description}</p>

  <div class="item-actions">
    {#if isShopCosmetic(item) && hasAccess}
      <a class="primary-item-action" href="/profile/settings">Manage in profile</a>
    {:else if accessTier === 'premium'}
      <button type="button" class="primary-item-action" disabled>Premium preview</button>
    {:else if accessTier === 'free'}
      <button type="button" class="primary-item-action" disabled>Included</button>
    {:else if item.cost <= 0}
      <button type="button" class="primary-item-action" disabled>Earned milestone</button>
    {:else}
      <button
        type="button"
        class="primary-item-action"
        disabled={isSignedIn && (!canPurchase || itemBusy)}
        on:click={() => dispatch('purchase', item)}
      >{purchaseLabel}</button>
    {/if}
    <button type="button" class="secondary-item-action" class:active={isPreviewing} on:click={() => dispatch('select', item)}>
      {isPreviewing ? 'Previewing' : 'Try on'}
    </button>
  </div>
</article>

<style>
  .shop-item { min-width:0; display:flex; flex-direction:column; padding:12px; border:1px solid #32353e; border-radius:8px; background:#0a0c10; transition:border-color .2s ease, background .2s ease; }
  .shop-item:hover { border-color:#4b4f5a; background:#0d0f14; }
  .shop-item.is-wearing { border-color:#7d83a9; }
  .shop-item.is-previewing { border-color:#7b9baf; }
  .item-topline { display:flex; justify-content:space-between; align-items:center; gap:8px; min-height:25px; margin-bottom:7px; }
  .item-topline > span:first-child { color:#858690; font-size:.68rem; text-transform:uppercase; letter-spacing:.08em; }
  .item-state { max-width:58%; overflow:hidden; padding:4px 7px; border:1px solid rgba(255,255,255,.1); border-radius:4px; color:#a7a9b2; font-size:.68rem; text-overflow:ellipsis; white-space:nowrap; }
  .item-state.tone-equipped { border-color:#7d83a9; background:#171923; color:#d7dbff; }
  .item-state.tone-previewing { border-color:#7b9baf; background:#111b20; color:#c9ecf3; }
  .item-state.tone-owned { border-color:#5875a4; color:#b7d2ff; }
  .item-state.tone-available { border-color:#597b70; color:#b6e5d2; }
  .item-state.tone-free { border-color:#597b70; background:#101b17; color:#b6e5d2; }
  .item-state.tone-premium { border-color:#745c9e; background:#191522; color:#dcc3ff; }
  .item-state.tone-premium-locked { border-color:#745c9e; color:#d0b5e4; }
  .item-access-label { margin:-1px 0 8px; font:700 .68rem/1.2 var(--font-mono-stack); letter-spacing:.06em; text-transform:uppercase; }
  .item-access-label.tier-free { color:#a9dfc7; }
  .item-access-label.tier-earned { color:#a9bce0; }
  .item-access-label.tier-premium { color:#d8b8ff; }
  .item-preview-button { position:relative; width:100%; padding:0; border:0; border-radius:16px; background:transparent; color:inherit; cursor:pointer; text-align:inherit; }
  .item-preview-button :global(.shop-preview-area) { margin-bottom:0; }
  .preview-cue { position:absolute; right:8px; bottom:8px; display:inline-flex; align-items:center; gap:5px; min-height:28px; padding:0 8px; border:1px solid rgba(255,255,255,.12); border-radius:4px; background:rgba(4,5,8,.86); color:#cdd2ff; font-size:.68rem; opacity:0; transform:translateY(3px); transition:opacity .2s, transform .2s; }
  .item-preview-button:hover .preview-cue, .item-preview-button:focus-visible .preview-cue { opacity:1; transform:translateY(0); }
  .preview-cue i { font-style:normal; }
  .item-copy { display:flex; align-items:flex-start; justify-content:space-between; gap:10px; margin-top:13px; }
  .item-copy > div { min-width:0; }
  .item-copy h3 { overflow:hidden; margin:0; color:#f3f2f7; font:680 1rem/1.25 var(--font-display); text-overflow:ellipsis; white-space:nowrap; }
  .item-copy div span { display:block; overflow:hidden; margin-top:4px; color:#858690; font-size:.72rem; text-overflow:ellipsis; text-transform:uppercase; letter-spacing:.06em; white-space:nowrap; }
  .item-rarity { width:max-content; padding:4px 7px; border:1px solid; border-radius:4px; font:600 .68rem/1 var(--font-mono-stack); letter-spacing:.03em; text-transform:uppercase; }
  .rarity-common { border-color:#555a66; background:#15171c; color:#cdd0d8; }
  .rarity-uncommon { border-color:#597b70; background:#111b18; color:#b6e5d2; }
  .rarity-rare { border-color:#5875a4; background:#111923; color:#b7d2ff; }
  .rarity-epic { border-color:#745c9e; background:#191522; color:#dcc3ff; }
  .rarity-anomaly { border-color:#8e673d; background:#201811; color:#ffd09a; }
  .rarity-mythic { border-color:#8d4869; background:#21131b; color:#ffb3d2; }
  .item-price { display:inline-flex; align-items:center; min-width:5.1rem; min-height:2.25rem; justify-content:center; padding:0 .55rem; border:1px solid #414550; border-radius:5px; background:#181b22; color:#cdd2ff; font:650 0.94rem/1 var(--font-mono-stack); white-space:nowrap; }
  .shop-item > p { min-height:2.8em; display:-webkit-box; overflow:hidden; margin:10px 0 13px; color:#aaa8b0; font-size:.82rem; line-height:1.45; -webkit-box-orient:vertical; -webkit-line-clamp:2; line-clamp:2; }
  .item-actions { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,.7fr); gap:7px; margin-top:auto; }
  .item-actions button, .item-actions a { min-width:0; min-height:44px; padding:0 9px; border-radius:5px; cursor:pointer; font:700 .78rem var(--font-display); }
  .item-actions button:disabled { cursor:not-allowed; opacity:.62; }
  .primary-item-action, .secondary-item-action { display:flex; align-items:center; justify-content:center; text-align:center; text-decoration:none; }
  .primary-item-action { border:1px solid #656b80; background:#e8e7e3; color:#111217; }
  .primary-item-action:not(:disabled):hover { border-color:#fff; background:#fff; }
  .secondary-item-action { border:1px solid #4a4d57; background:#121419; color:#d3d0d8; }
  .secondary-item-action:hover, .secondary-item-action.active { border-color:#7b839b; background:#1a1d25; color:#fff; }
  @media (prefers-reduced-motion: reduce) { .shop-item { transition:none; } .shop-item:hover { transform:none; } .preview-cue { transition:none; } }
</style>
