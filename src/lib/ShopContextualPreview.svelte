<script>
  import { createEventDispatcher } from 'svelte';
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
  let paused = false;
  let replayKey = 0;

  $: previewName = accountProfile?.display_name || accountProfile?.username || username || 'You';
  $: rendererMode = paused ? 'paused' : 'animated';

  function replayPreview() {
    paused = false;
    replayKey += 1;
  }
</script>

<aside class="shop-contextual-preview" aria-labelledby="shop-contextual-preview-title">
  <header class="shop-contextual-preview__header">
    <div>
      <span class="shop-eyebrow">Your profile</span>
      <h2 id="shop-contextual-preview-title">{previewName}</h2>
    </div>
    <div class="shop-preview-actions">
      <button type="button" on:click={replayPreview}>Replay</button>
      <button type="button" aria-pressed={paused} on:click={() => paused = !paused}>{paused ? 'Play' : 'Pause'}</button>
      {#if selectedItem}<button type="button" class="shop-contextual-preview__reset" on:click={() => dispatch('reset')}>Clear</button>{/if}
    </div>
  </header>

  {#key replayKey}
    <ShopStudioPreview
      {loadout}
      {selectedItem}
      username={previewName}
      {displayColor}
      {accountProfile}
      {profileConfig}
      nameRendererMode={rendererMode}
    />
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
    margin: 0.3rem 0 0;
    color: #f2f0eb;
    font: 650 1.08rem/1.1 var(--shop-display, var(--font-display));
    letter-spacing: -0.025em;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .shop-preview-actions button {
    border: 1px solid transparent;
    border-radius: 4px;
    background: transparent;
    color: #858892;
    cursor: pointer;
    font: 0.72rem var(--shop-mono, var(--font-mono-stack));
  }

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
  .shop-preview-actions button:focus-visible { border-color: #aeb5e5; color: #fff; }

  .shop-contextual-preview__reset {
    color: #cdd2ff !important;
  }

  .shop-contextual-preview :global(.studio-preview) {
    min-height: 0;
    padding: 0.75rem;
    border: 0;
    border-radius: 0;
    background: transparent;
    box-shadow: none;
  }

  .shop-contextual-preview :global(.studio-preview-head),
  .shop-contextual-preview :global(.studio-selection) { display: none; }
  .shop-contextual-preview :global(.studio-stage) { min-height: 13rem; border-radius: 6px; }
  .shop-contextual-preview :global(.studio-profile-card) { width: calc(100% - 1.25rem); max-width: 100%; margin-inline: auto; }

  @media (max-width: 960px) {
    .shop-contextual-preview { position: relative; top: auto; }
    .shop-contextual-preview :global(.studio-stage) { min-height: 14rem; }
  }

  @media (max-width: 700px) {
    .shop-contextual-preview__header { padding: 0.75rem; }
    .shop-contextual-preview :global(.studio-preview) { padding: 0.6rem; }
    .shop-contextual-preview :global(.studio-stage) { min-height: 13.5rem; }
  }
</style>
