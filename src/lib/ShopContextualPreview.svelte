<script>
  import { createEventDispatcher } from 'svelte';
  import ShopStudioPreview from './ShopStudioPreview.svelte';

  export let loadout = {};
  /** @type {any} */
  export let selectedItem = null;
  export let activeContext = 'profile';
  export let username = 'Your profile';
  export let displayColor = '#8B7CF6';
  export let rollRarity = 'Current roll';
  export let rollScore = null;
  export let accountProfile = null;
  export let profileConfig = null;

  const dispatch = createEventDispatcher();
</script>

<aside class="shop-contextual-preview" aria-labelledby="shop-contextual-preview-title">
  <header class="shop-contextual-preview__header">
    <div>
      <span class="shop-eyebrow">Live preview</span>
      <h2 id="shop-contextual-preview-title">{selectedItem ? selectedItem.name : 'Your equipped look'}</h2>
      <p>{selectedItem ? 'Temporary preview · nothing changes your profile.' : 'Select a piece to see it in your profile.'}</p>
    </div>
    {#if selectedItem}
      <button type="button" class="shop-contextual-preview__reset" on:click={() => dispatch('reset')}>Reset</button>
    {/if}
  </header>

  <ShopStudioPreview
    bind:activeContext
    {loadout}
    {selectedItem}
    {username}
    {displayColor}
    {rollRarity}
    {rollScore}
    {accountProfile}
    {profileConfig}
  />

  <footer class="shop-contextual-preview__footer">
    <span>Temporary fitting room</span>
    <strong>Use Product Detail or Profile Settings for the next step.</strong>
  </footer>
</aside>

<style>
  .shop-contextual-preview {
    position: sticky;
    top: 1rem;
    align-self: start;
    min-width: 0;
    overflow: hidden;
    border: 1px solid var(--shop-line);
    background: #0b0d11;
  }

  .shop-contextual-preview__header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 0.95rem 1rem;
    border-bottom: 1px solid var(--shop-line);
    background: #111319;
  }

  .shop-contextual-preview__header h2 {
    overflow: hidden;
    margin: 0.35rem 0 0.2rem;
    color: #f2f0eb;
    font: 650 1.05rem/1.1 var(--font-display);
    letter-spacing: -0.025em;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .shop-contextual-preview__header p {
    margin: 0;
    color: #858690;
    font-size: 0.72rem;
    line-height: 1.35;
  }

  .shop-contextual-preview__reset {
    flex: 0 0 auto;
    min-height: 2.2rem;
    padding: 0 0.65rem;
    border: 1px solid #4a4d57;
    background: transparent;
    color: #cdd2ff;
    cursor: pointer;
    font: 0.67rem var(--font-mono-stack);
  }

  .shop-contextual-preview :global(.studio-preview) {
    min-height: 0;
    padding: 0.75rem;
    border: 0;
    border-radius: 0;
    background: transparent;
    box-shadow: none;
  }

  .shop-contextual-preview :global(.studio-preview-head) { display: none; }
  .shop-contextual-preview :global(.studio-stage) { min-height: 22rem; border-radius: 4px; }
  .shop-contextual-preview__footer {
    display: grid;
    gap: 0.2rem;
    padding: 0.7rem 1rem 0.85rem;
    border-top: 1px solid var(--shop-line);
  }
  .shop-contextual-preview__footer span {
    color: #777983;
    font: 0.61rem var(--font-mono-stack);
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .shop-contextual-preview__footer strong { color: #aaa8b0; font-size: 0.72rem; font-weight: 500; }

  @media (max-width: 960px) {
    .shop-contextual-preview { position: relative; top: auto; }
    .shop-contextual-preview :global(.studio-stage) { min-height: 18rem; }
  }

  @media (max-width: 700px) {
    .shop-contextual-preview__header { padding: 0.75rem; }
    .shop-contextual-preview :global(.studio-preview) { padding: 0.6rem; }
    .shop-contextual-preview :global(.studio-stage) { min-height: 15rem; }
    .shop-contextual-preview__footer { padding-inline: 0.75rem; }
  }
</style>
