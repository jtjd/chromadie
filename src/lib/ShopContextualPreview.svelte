<script>
  import { createEventDispatcher } from 'svelte';
  import ShopItemPreview from './ShopItemPreview.svelte';
  import ShopStudioPreview from './ShopStudioPreview.svelte';

  export let loadout = {};
  /** @type {any} */
  export let selectedItem = null;
  export let username = 'You';
  export let displayColor = '#8B7CF6';
  /** @type {{display_name?: string, username?: string} | null} */
  export let accountProfile = null;
  export let profileConfig = null;

  const dispatch = createEventDispatcher();
  let previewMode = 'isolated';
  let paused = false;
  let replayKey = 0;

  $: previewName = accountProfile?.display_name || accountProfile?.username || username || 'You';
  $: effectivePreviewMode = selectedItem ? previewMode : 'combined';
  $: rendererMode = paused ? 'paused' : 'animated';

  function replayPreview() {
    paused = false;
    replayKey += 1;
  }
</script>

<aside class="shop-contextual-preview" aria-labelledby="shop-contextual-preview-title">
  <header class="shop-contextual-preview__header">
    <div>
      <span class="shop-eyebrow">Live profile preview</span>
      <h2 id="shop-contextual-preview-title">{selectedItem ? selectedItem.name : previewName}</h2>
      <p>{selectedItem ? 'Temporary preview · nothing changes your profile.' : 'Your equipped look.'}</p>
      <div class="shop-preview-mode" role="tablist" aria-label="Preview mode">
        <button type="button" role="tab" aria-selected={effectivePreviewMode === 'isolated'} class:active={effectivePreviewMode === 'isolated'} disabled={!selectedItem} on:click={() => previewMode = 'isolated'}>Isolated</button>
        <button type="button" role="tab" aria-selected={effectivePreviewMode === 'combined'} class:active={effectivePreviewMode === 'combined'} on:click={() => previewMode = 'combined'}>Combined</button>
      </div>
    </div>
    <div class="shop-preview-actions">
      <button type="button" on:click={replayPreview}>Replay</button>
      <button type="button" aria-pressed={paused} on:click={() => paused = !paused}>{paused ? 'Play' : 'Pause'}</button>
      {#if selectedItem}<button type="button" class="shop-contextual-preview__reset" on:click={() => dispatch('reset')}>Reset</button>{/if}
    </div>
  </header>

  {#key replayKey}
    {#if selectedItem && effectivePreviewMode === 'isolated'}
      <div class="shop-contextual-preview__isolated">
        <ShopItemPreview item={selectedItem} username={previewName} displayColor={displayColor} mode={rendererMode} />
      </div>
    {:else}
      <ShopStudioPreview
        {loadout}
        {selectedItem}
        username={previewName}
        {displayColor}
        {accountProfile}
        {profileConfig}
        nameRendererMode={rendererMode}
      />
    {/if}
  {/key}

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
    border-radius: 7px;
    background: #0b0d11;
  }

  .shop-contextual-preview__header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.9rem;
    padding: 0.8rem 0.95rem;
    border-bottom: 1px solid var(--shop-line);
    background: #111319;
  }

  .shop-contextual-preview__header h2 {
    overflow: hidden;
    margin: 0.3rem 0 0.2rem;
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

  .shop-preview-mode {
    display: flex;
    gap: 3px;
    width: max-content;
    margin-top: 0.45rem;
    padding: 3px;
    border: 1px solid #343740;
    border-radius: 5px;
    background: #0d0f14;
  }

  .shop-preview-mode button,
  .shop-preview-actions button {
    border: 1px solid transparent;
    border-radius: 4px;
    background: transparent;
    color: #858892;
    cursor: pointer;
    font: 0.62rem var(--font-mono-stack);
  }

  .shop-preview-mode button { min-height: 1.7rem; padding: 0 0.55rem; }
  .shop-preview-mode button.active { background: #1d2027; color: var(--shop-accent); }
  .shop-preview-mode button:disabled { cursor: not-allowed; opacity: .45; }

  .shop-preview-actions {
    display: flex;
    flex: 0 0 auto;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 0.35rem;
  }

  .shop-preview-actions button {
    min-height: 1.9rem;
    padding: 0 0.5rem;
    border-color: #3a3e47;
    background: #17191f;
    color: #b5b8c1;
  }

  .shop-preview-actions button:hover,
  .shop-preview-actions button:focus-visible,
  .shop-preview-mode button:hover,
  .shop-preview-mode button:focus-visible { border-color: #aeb5e5; color: #fff; }

  .shop-contextual-preview__reset {
    color: #cdd2ff !important;
  }

  .shop-contextual-preview__isolated {
    display: grid;
    min-height: 26rem;
    padding: 1.5rem;
    place-items: center;
    background: #080a0e;
  }

  .shop-contextual-preview__isolated :global(.shop-preview-area) {
    height: 8rem;
    border-color: #393d46;
    background: #090b0f;
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
  .shop-contextual-preview :global(.studio-stage) { min-height: 26rem; border-radius: 4px; }
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
    .shop-contextual-preview :global(.studio-stage) { min-height: 20rem; }
    .shop-contextual-preview__isolated { min-height: 20rem; }
  }

  @media (max-width: 700px) {
    .shop-contextual-preview__header { padding: 0.75rem; }
    .shop-contextual-preview :global(.studio-preview) { padding: 0.6rem; }
    .shop-contextual-preview :global(.studio-stage) { min-height: 15rem; }
    .shop-contextual-preview__isolated { min-height: 15rem; padding: 0.75rem; }
    .shop-contextual-preview__footer { padding-inline: 0.75rem; }
  }
</style>
