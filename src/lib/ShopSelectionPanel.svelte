<script>
  import ShopItemPreview from './ShopItemPreview.svelte';
  import { SHOP_SLOT_LABELS, getShopAccessLabel, getShopAccessTier, isShopCosmetic } from './shopCatalog';
  import { createEventDispatcher } from 'svelte';

  /** @type {any} */
  export let item = null;
  /** @type {any} */
  export let state = null;
  export let relatedItems = [];
  export let selectedHasAccess = false;
  export let selectedCanPurchase = false;
  export let balance = 0;
  export let loadingAction = null;
  export let purchaseArmed = false;
  export let isSignedIn = false;

  const dispatch = createEventDispatcher();

  $: accessTier = item ? getShopAccessTier(item) : 'earned';
  $: purchaseLabel = !item
    ? ''
    : !isSignedIn
    ? 'Sign in to buy'
    : loadingAction
      ? 'Completing purchase…'
      : purchaseArmed
        ? `Confirm purchase · ${item.cost.toLocaleString()} EP`
        : `Buy now · ${item.cost.toLocaleString()} EP`;
</script>

<section class="selection-panel" aria-live="polite">
  {#if !item}
    <div class="selection-panel__empty">
      <span>Live try-on</span>
      <strong>Select a cosmetic to preview it here.</strong>
      <p>Your current equipped look is shown above. Choosing an item changes only this temporary preview.</p>
    </div>
  {:else}
    <div class="selection-panel__eyebrow">Product detail · {SHOP_SLOT_LABELS[item.slot] || item.slot}</div>
    <div class="selection-panel__heading">
      <div>
        <span>{item.collection || `${item.rarity} cosmetic`}</span>
        <h2 id={`shop-product-title-${item.item_key}`}>{item.name}</h2>
      </div>
      <span class="selection-panel__rarity rarity-{(item.rarity || 'Common').toLowerCase()}" aria-label={`Rarity: ${item.rarity || 'Common'}`}>{item.rarity || 'Common'}</span>
    </div>
    <p class="selection-panel__description">{item.description}</p>
    <div class="selection-panel__meta">
      <div><span>Access</span><strong>{getShopAccessLabel(item)}</strong></div>
      <div><span>Price</span><strong>{accessTier === 'earned' && item.cost > 0 ? `${item.cost.toLocaleString()} EP` : accessTier === 'premium' ? 'Premium' : item.cost <= 0 ? 'Milestone' : 'Included'}</strong></div>
      <div><span>Status</span><strong>{state?.label || 'Available'}</strong></div>
    </div>

    <div class="selection-panel__actions">
      <button type="button" class="selection-panel__try-on" on:click={() => dispatch('tryon', item)}>Try on</button>
      {#if isShopCosmetic(item) && selectedHasAccess}
        <a class="selection-panel__primary" href="/profile/settings">Manage in profile settings ↗</a>
      {:else if accessTier === 'premium'}
        <button type="button" class="selection-panel__primary" disabled>Premium expression · Preview only</button>
      {:else if accessTier === 'free'}
        <button type="button" class="selection-panel__primary" disabled>Included baseline</button>
      {:else if item.cost <= 0}
        <button type="button" class="selection-panel__primary" disabled>Earned milestone · Preview only</button>
      {:else}
        <button type="button" class="selection-panel__primary" disabled={isSignedIn && (!selectedCanPurchase || !!loadingAction)} on:click={() => dispatch('purchase', item)}>{purchaseLabel}</button>
      {/if}
      <button type="button" class="selection-panel__reset" on:click={() => dispatch('reset')}>Close detail</button>
    </div>

    {#if purchaseArmed}
      <div class="selection-panel__confirmation" role="status">
        <span>Balance after purchase</span>
        <strong>{Math.max(0, balance - item.cost).toLocaleString()} EP</strong>
      </div>
    {/if}

    {#if relatedItems.length}
      <div class="selection-panel__related">
        <div><span>More from {item.collection}</span><strong>Explore the set</strong></div>
        <div class="selection-panel__related-list">
          {#each relatedItems as related (related.item_key)}
            <button type="button" on:click={() => dispatch('select', related)}>
              <ShopItemPreview item={related} />
              <span>{related.name}</span>
            </button>
          {/each}
        </div>
      </div>
    {/if}
  {/if}
</section>

<style>
  .selection-panel { padding:18px; border:1px solid #32353e; border-radius:8px; background:#0b0d11; }
  .selection-panel__empty { display:grid; gap:7px; min-height:150px; align-content:center; }
  .selection-panel__empty > span, .selection-panel__eyebrow { color:#858690; font:700 .7rem/1.2 var(--font-mono-stack); letter-spacing:.1em; text-transform:uppercase; }
  .selection-panel__empty strong { color:#eceaf3; font:700 1.05rem/1.15 var(--font-display); }
  .selection-panel__empty p { max-width:32rem; margin:0; color:#858795; font-size:.72rem; line-height:1.5; }
  .selection-panel__heading { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; margin-top:9px; }
  .selection-panel__heading > div { min-width:0; }
  .selection-panel__heading > div > span { color:#8c889c; font-size:.58rem; text-transform:uppercase; letter-spacing:.08em; }
  .selection-panel h2 { overflow:hidden; margin:5px 0 0; color:#f2f0f7; font:720 2rem/1 var(--font-display); letter-spacing:-.04em; text-overflow:ellipsis; white-space:nowrap; }
  .selection-panel__rarity { flex:0 0 auto; padding:6px 8px; border:1px solid; border-radius:4px; font:600 .7rem var(--font-mono-stack); text-transform:uppercase; }
  .selection-panel__rarity.rarity-common { border-color:#555a66; background:#15171c; color:#cdd0d8; }
  .selection-panel__rarity.rarity-uncommon { border-color:#597b70; background:#111b18; color:#b6e5d2; }
  .selection-panel__rarity.rarity-rare { border-color:#5875a4; background:#111923; color:#b7d2ff; }
  .selection-panel__rarity.rarity-epic { border-color:#745c9e; background:#191522; color:#dcc3ff; }
  .selection-panel__rarity.rarity-anomaly { border-color:#8e673d; background:#201811; color:#ffd09a; }
  .selection-panel__rarity.rarity-mythic { border-color:#8d4869; background:#21131b; color:#ffb3d2; }
  .selection-panel__description { margin:13px 0 16px; color:#aaa8b0; font-size:.9rem; line-height:1.6; }
  .selection-panel__meta { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:7px; }
  .selection-panel__meta > div { min-width:0; padding:9px; border:1px solid rgba(255,255,255,.07); border-radius:11px; background:rgba(255,255,255,.025); }
  .selection-panel__meta span, .selection-panel__meta strong { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .selection-panel__meta span { color:#747685; font-size:.52rem; text-transform:uppercase; letter-spacing:.06em; }
  .selection-panel__meta strong { margin-top:4px; color:#e1dfea; font:650 .94rem/1.1 var(--font-mono-stack); }
  .selection-panel__actions { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px; margin-top:18px; }
  .selection-panel__primary, .selection-panel__try-on, .selection-panel__reset { display:flex; align-items:center; justify-content:center; min-height:46px; border-radius:5px; cursor:pointer; font:700 .78rem var(--font-display); text-align:center; text-decoration:none; }
  .selection-panel__try-on { border:1px solid #4a4d57; background:#121419; color:#d3d0d8; }
  .selection-panel__try-on:hover, .selection-panel__try-on:focus-visible { border-color:#7b839b; color:#fff; }
  .selection-panel__primary { border:1px solid #656b80; background:#efede7; color:#101116; }
  .selection-panel__primary:hover:not(:disabled), .selection-panel__primary:focus-visible:not(:disabled) { border-color:#fff; background:#fff; }
  .selection-panel__primary:disabled { border-color:#3a3d46; background:#16181e; color:#858690; cursor:not-allowed; }
  .selection-panel__reset { grid-column:1 / -1; padding:0 12px; border:1px solid rgba(255,255,255,.09); background:transparent; color:#aaa9b5; }
  .selection-panel__reset:hover { color:#fff; border-color:rgba(255,255,255,.18); }
  .selection-panel__confirmation { display:flex; justify-content:space-between; gap:10px; margin-top:9px; padding:10px 12px; border:1px solid rgba(153,130,255,.2); border-radius:11px; background:rgba(132,108,255,.07); color:#9795a4; font-size:.62rem; }
  .selection-panel__confirmation strong { color:#ded8ff; font:700 .72rem var(--font-mono-stack); }
  .selection-panel__related { margin-top:18px; padding-top:15px; border-top:1px solid rgba(255,255,255,.07); }
  .selection-panel__related > div:first-child { display:flex; justify-content:space-between; gap:10px; margin-bottom:9px; }
  .selection-panel__related > div:first-child span { color:#777989; font-size:.58rem; text-transform:uppercase; letter-spacing:.07em; }
  .selection-panel__related > div:first-child strong { color:#c9c2e8; font-size:.64rem; }
  .selection-panel__related-list { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:7px; }
  .selection-panel__related-list button { min-width:0; padding:5px; border:1px solid rgba(255,255,255,.06); border-radius:10px; background:rgba(255,255,255,.025); color:inherit; cursor:pointer; text-align:left; }
  .selection-panel__related-list button:hover { border-color:rgba(202,187,255,.3); }
  .selection-panel__related-list :global(.shop-preview-area) { height:58px; margin:0 0 5px; padding:4px; border-radius:7px; }
  .selection-panel__related-list span { display:block; overflow:hidden; color:#c9c6d4; font-size:.72rem; text-overflow:ellipsis; white-space:nowrap; }
  @media (max-width:720px) { .selection-panel__meta { grid-template-columns:1fr; } .selection-panel__actions { grid-template-columns:1fr; } .selection-panel__reset { min-height:40px; } }
</style>
