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
      <span class="shop-eyebrow">Preview</span>
      <h2 id="shop-contextual-preview-title">{selectedItem ? selectedItem.name : previewName}</h2>
      <p>{selectedItem ? 'Nothing is saved until you choose it.' : 'Your equipped look.'}</p>
      <div class="shop-preview-mode" role="tablist" aria-label="Preview mode">
        <button type="button" role="tab" aria-selected={effectivePreviewMode === 'isolated'} class:active={effectivePreviewMode === 'isolated'} disabled={!selectedItem} on:click={() => previewMode = 'isolated'}>Item</button>
        <button type="button" role="tab" aria-selected={effectivePreviewMode === 'combined'} class:active={effectivePreviewMode === 'combined'} on:click={() => previewMode = 'combined'}>On your profile</button>
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

</aside>

<style>
  .shop-contextual-preview {
    position: sticky;
    top: 1rem;
    align-self: start;
    min-width: 0;
    overflow: hidden;
    border: 1px solid var(--shop-line);
    border-radius: 9px;
    background: #101319;
  }

  .shop-contextual-preview__header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.9rem;
    padding: .85rem .9rem;
    border-bottom: 1px solid var(--shop-line);
    background: #15181f;
  }

  .shop-contextual-preview__header h2 {
    overflow: hidden;
    margin: 0.3rem 0 0.2rem;
    color: #f2f0eb;
    font: 650 1.08rem/1.1 var(--shop-display, var(--font-display));
    letter-spacing: -0.025em;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .shop-contextual-preview__header p {
    margin: 0;
    color: #858690;
    font-size: 0.82rem;
    line-height: 1.35;
  }

  .shop-preview-mode {
    display: flex;
    gap: 3px;
    width: max-content;
    margin-top: 0.65rem;
    padding: 3px;
    border: 1px solid #343740;
    border-radius: var(--radius-sm, 5px);
    background: #0d0f14;
  }

  .shop-preview-mode button,
  .shop-preview-actions button {
    border: 1px solid transparent;
    border-radius: 4px;
    background: transparent;
    color: #858892;
    cursor: pointer;
    font: 0.72rem var(--shop-mono, var(--font-mono-stack));
  }

  .shop-preview-mode button { min-height: 2rem; padding: 0 0.7rem; }
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
    min-height: 2.2rem;
    padding: 0 0.65rem;
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
    min-height: 13.5rem;
    padding: .8rem;
    place-items: center;
    background: #0b0e13;
  }

  .shop-contextual-preview__isolated :global(.shop-preview-area) {
    height: 9.5rem;
    border-color: #414650;
    background: #12151b;
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
  .shop-contextual-preview :global(.studio-stage) { min-height: 14.5rem; border-radius: 6px; }
  .shop-contextual-preview :global(.studio-profile-card) { width: min(calc(100% - 1.25rem), 100%); }

  @media (max-width: 960px) {
    .shop-contextual-preview { position: relative; top: auto; }
    .shop-contextual-preview :global(.studio-stage) { min-height: 16rem; }
    .shop-contextual-preview__isolated { min-height: 15.5rem; }
  }

  @media (max-width: 700px) {
    .shop-contextual-preview__header { padding: 0.75rem; }
    .shop-contextual-preview :global(.studio-preview) { padding: 0.6rem; }
    .shop-contextual-preview :global(.studio-stage) { min-height: 15rem; }
    .shop-contextual-preview__isolated { min-height: 14rem; padding: 0.75rem; }
  }
</style>
