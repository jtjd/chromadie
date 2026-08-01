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
    <ShopItemPreview {item} />
    <span class="preview-cue">Try on <i aria-hidden="true">↗</i></span>
  </button>

  <div class="item-copy">
    <div>
      <h3>{item.name}</h3>
      <span>{item.collection || item.rarity || 'Core collection'}</span>
    </div>
    <strong>{priceLabel}</strong>
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
  .shop-item {
    min-width: 0;
    display: flex;
    flex-direction: column;
    padding: 14px;
    border: 1px solid rgba(255,255,255,0.085);
    border-radius: 20px;
    background: linear-gradient(180deg, rgba(20,21,27,0.96), rgba(11,12,16,0.98));
    transition: border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
  }
  .shop-item:hover { transform: translateY(-2px); border-color: rgba(255,255,255,0.16); box-shadow: 0 18px 42px rgba(0,0,0,0.23); }
  .shop-item.is-wearing { border-color: rgba(142,121,255,0.52); box-shadow: inset 0 0 0 1px rgba(142,121,255,0.08); }
  .shop-item.is-previewing { border-color: rgba(109,225,208,0.5); box-shadow: inset 0 0 0 1px rgba(73,196,180,0.1), 0 16px 40px rgba(24,130,122,0.12); }
  .shop-item.rarity-Mythic { background: radial-gradient(circle at 100% 0%, rgba(150,112,255,0.1), transparent 34%), linear-gradient(180deg, rgba(20,21,27,0.96), rgba(11,12,16,0.98)); }
  .item-topline { display:flex; justify-content:space-between; align-items:center; gap:8px; min-height:25px; margin-bottom:9px; }
  .item-topline > span:first-child { color:#77798a; font-size:.57rem; text-transform:uppercase; letter-spacing:.08em; }
  .item-state { max-width:58%; overflow:hidden; padding:4px 7px; border:1px solid rgba(255,255,255,.07); border-radius:999px; color:#9496a5; font-size:.55rem; text-overflow:ellipsis; white-space:nowrap; }
  .item-state.tone-equipped { border-color:rgba(157,136,255,.22); background:rgba(137,112,255,.09); color:#d4cbff; }
  .item-state.tone-previewing { border-color:rgba(109,225,208,.2); background:rgba(73,196,180,.08); color:#a7eee4; }
  .item-state.tone-owned { border-color:rgba(77,159,255,.18); color:#abd2ff; }
  .item-state.tone-available { border-color:rgba(74,222,170,.17); color:#9de5ca; }
  .item-state.tone-free { border-color:rgba(75,222,165,.2); background:rgba(75,222,165,.07); color:#a9efd1; }
  .item-state.tone-premium { border-color:rgba(245,181,255,.2); background:rgba(186,125,255,.08); color:#e4c9ff; }
  .item-state.tone-premium-locked { border-color:rgba(245,181,255,.16); color:#c6a9d7; }
  .item-access-label { margin:-2px 0 8px; font:700 .55rem/1.2 var(--font-mono-stack); letter-spacing:.08em; text-transform:uppercase; }
  .item-access-label.tier-free { color:#8fe1bd; }
  .item-access-label.tier-earned { color:#a5b8d4; }
  .item-access-label.tier-premium { color:#d8b8ff; }
  .item-preview-button { position:relative; width:100%; padding:0; border:0; border-radius:16px; background:transparent; color:inherit; cursor:pointer; text-align:inherit; }
  .item-preview-button :global(.shop-preview-area) { margin-bottom:0; }
  .preview-cue { position:absolute; right:8px; bottom:8px; display:inline-flex; align-items:center; gap:5px; min-height:28px; padding:0 8px; border:1px solid rgba(255,255,255,.08); border-radius:8px; background:rgba(4,5,8,.78); color:#b8b7c1; font-size:.56rem; opacity:0; transform:translateY(3px); transition:opacity .2s, transform .2s; }
  .item-preview-button:hover .preview-cue, .item-preview-button:focus-visible .preview-cue { opacity:1; transform:translateY(0); }
  .preview-cue i { font-style:normal; }
  .item-copy { display:flex; align-items:flex-start; justify-content:space-between; gap:10px; margin-top:13px; }
  .item-copy > div { min-width:0; }
  .item-copy h3 { overflow:hidden; margin:0; color:#f3f2f7; font:680 .88rem/1.2 var(--font-display); text-overflow:ellipsis; white-space:nowrap; }
  .item-copy div span { display:block; overflow:hidden; margin-top:4px; color:#767887; font-size:.58rem; text-overflow:ellipsis; text-transform:uppercase; letter-spacing:.07em; white-space:nowrap; }
  .item-copy > strong { color:#d8d4e5; font:650 .67rem var(--font-mono-stack); white-space:nowrap; }
  .shop-item > p { min-height:2.8em; display:-webkit-box; overflow:hidden; margin:10px 0 13px; color:#858795; font-size:.68rem; line-height:1.4; -webkit-box-orient:vertical; -webkit-line-clamp:2; line-clamp:2; }
  .item-actions { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,.7fr); gap:7px; margin-top:auto; }
  .item-actions button, .item-actions a { min-width:0; min-height:44px; padding:0 9px; border-radius:11px; cursor:pointer; font:700 .65rem var(--font-display); }
  .item-actions button:disabled { cursor:not-allowed; opacity:.62; }
  .primary-item-action, .secondary-item-action { display:flex; align-items:center; justify-content:center; text-align:center; text-decoration:none; }
  .primary-item-action { border:1px solid rgba(153,130,255,.3); background:rgba(132,108,255,.14); color:#e1dcff; }
  .primary-item-action:not(:disabled):hover { border-color:rgba(168,148,255,.48); background:rgba(132,108,255,.22); }
  .secondary-item-action { border:1px solid rgba(255,255,255,.09); background:transparent; color:#aaa9b5; }
  .secondary-item-action:hover, .secondary-item-action.active { border-color:rgba(109,225,208,.3); background:rgba(73,196,180,.08); color:#c1f5eb; }
  @media (prefers-reduced-motion: reduce) { .shop-item { transition:none; } .shop-item:hover { transform:none; } .preview-cue { transition:none; } }
</style>
