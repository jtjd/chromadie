<script>
  import { createEventDispatcher, onDestroy, onMount, tick } from 'svelte';
  import ShopSelectionPanel from './ShopSelectionPanel.svelte';
  import ShopStudioPreview from './ShopStudioPreview.svelte';

  /** @type {any} */
  export let item = null;
  /** @type {any} */
  export let loadout = {};
  export let activeContext = 'profile';
  /** @type {any} */
  export let profile = null;
  /** @type {any} */
  export let profileConfig = null;
  export let displayColor = '#8B7CF6';
  export let rollRarity = '';
  /** @type {any} */
  export let rollScore = null;
  /** @type {any} */
  export let state = null;
  export let relatedItems = [];
  export let selectedHasAccess = false;
  export let selectedCanPurchase = false;
  export let balance = 0;
  export let loadingAction = false;
  export let purchaseArmed = false;
  export let isSignedIn = false;

  const dispatch = createEventDispatcher();
  let dialogElement;
  let closeButton;

  $: username = profile?.display_name || profile?.username || 'Your profile';

  onMount(() => {
    tick().then(() => closeButton?.focus());
    window.addEventListener('keydown', handleKeydown);
  });

  onDestroy(() => window.removeEventListener('keydown', handleKeydown));

  function handleKeydown(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      dispatch('close');
      return;
    }
    if (event.key !== 'Tab' || !dialogElement) return;
    const focusable = [...dialogElement.querySelectorAll('button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])')]
      .filter(element => !element.disabled && element.offsetParent !== null);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
</script>

{#if item}
  <div class="shop-detail-backdrop" role="presentation" on:click={() => dispatch('close')}>
    <dialog open class="shop-detail-dialog" bind:this={dialogElement} aria-modal="true" aria-labelledby={`shop-product-title-${item.item_key}`} on:click|stopPropagation>
      <header class="shop-detail-header">
        <span>Product detail · {item.collection || 'Chromadie catalog'}</span>
        <button bind:this={closeButton} type="button" class="shop-detail-close" aria-label="Close product detail" on:click={() => dispatch('close')}>×</button>
      </header>
      <div class="shop-detail-body">
        <div class="shop-detail-preview">
          <ShopStudioPreview
            bind:activeContext
            loadout={loadout}
            selectedItem={item}
            username={username}
            displayColor={displayColor}
            rollRarity={rollRarity}
            rollScore={rollScore}
            accountProfile={profile}
            profileConfig={profileConfig}
          />
        </div>
        <div class="shop-detail-info">
          <ShopSelectionPanel
            {item}
            {state}
            {relatedItems}
            {selectedHasAccess}
            {selectedCanPurchase}
            {balance}
            {loadingAction}
            {purchaseArmed}
            {isSignedIn}
            on:purchase={event => dispatch('purchase', event.detail)}
            on:select={event => dispatch('select', event.detail)}
            on:tryon={() => dispatch('tryon', item)}
            on:reset={() => dispatch('reset')}
          />
        </div>
      </div>
    </dialog>
  </div>
{/if}

<style>
  .shop-detail-backdrop { position:fixed; inset:0; z-index:100; display:grid; place-items:center; padding:1rem; background:rgba(4,5,7,.82); }
  .shop-detail-dialog { width:min(1100px,100%); max-height:min(92vh,900px); overflow:auto; border:1px solid #41444e; border-radius:8px; background:#0b0d11; box-shadow:0 2rem 7rem rgba(0,0,0,.5); }
  .shop-detail-header { display:flex; align-items:center; justify-content:space-between; gap:1rem; min-height:3.4rem; padding:.6rem .9rem .6rem 1.1rem; border-bottom:1px solid var(--shop-line); background:#111319; color:#92939c; font:.7rem var(--font-mono-stack); letter-spacing:.05em; text-transform:uppercase; }
  .shop-detail-close { display:grid; width:2.35rem; height:2.35rem; place-items:center; border:1px solid #4a4d57; border-radius:5px; background:#16181e; color:#f2f0eb; font-size:1.3rem; cursor:pointer; }
  .shop-detail-close:hover, .shop-detail-close:focus-visible { border-color:#9ca3b8; background:#20232b; }
  .shop-detail-body { display:grid; grid-template-columns:minmax(0,1.15fr) minmax(20rem,.85fr); }
  .shop-detail-preview { min-height:34rem; display:flex; align-items:center; padding:1.25rem; background:#08090c; }
  .shop-detail-preview :global(.studio-preview) { border:0; padding:0; background:transparent; box-shadow:none; }
  .shop-detail-preview :global(.studio-stage) { min-height:30rem; }
  .shop-detail-info { padding:1.25rem; border-left:1px solid var(--shop-line); }
  @media (max-width: 760px) { .shop-detail-backdrop { align-items:end; padding:0; } .shop-detail-dialog { max-height:94vh; border-bottom:0; border-radius:8px 8px 0 0; } .shop-detail-body { grid-template-columns:1fr; } .shop-detail-preview { min-height:20rem; padding:.75rem; } .shop-detail-preview :global(.studio-stage) { min-height:18rem; } .shop-detail-info { border-top:1px solid var(--shop-line); border-left:0; padding:.85rem; } }
</style>
