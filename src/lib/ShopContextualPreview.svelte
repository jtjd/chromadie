<script>
  import { createEventDispatcher } from 'svelte';
  import ShopStudioPreview from './ShopStudioPreview.svelte';
  import { getVisibleProfileLinks } from './profileConfig.js';

  export let loadout = {};
  /** @type {any} */
  export let selectedItem = null;
  export let username = 'You';
  export let displayColor = '#8B7CF6';
  /** @type {{display_name?: string, username?: string} | null} */
  export let accountProfile = null;
  /** @type {any} */
  export let profileConfig = null;
  export let walletBalance = 0;

  const dispatch = createEventDispatcher();
  let paused = false;
  let replayKey = 0;

  $: previewName = accountProfile?.display_name || accountProfile?.username || username || 'You';
  $: previewConfig = profileConfig
    ? (profileConfig.published || profileConfig.draft || profileConfig)
    : {};
  $: previewLinks = getVisibleProfileLinks(previewConfig);
  $: rendererMode = paused ? 'paused' : 'animated';
  // Re-mount the shared renderer whenever the fitting-room selection or any
  // selected layer changes. This keeps Canvas, border, and motion effects in
  // sync even when a renderer owns mount-time state or an async font loader.
  $: previewKey = [
    replayKey,
    selectedItem?.item_key || 'equipped',
    loadout?.name_font || '',
    loadout?.name_material || '',
    loadout?.name_motion || '',
    loadout?.profile_border || '',
    loadout?.avatar_effect || '',
    loadout?.cursor_trail || '',
    loadout?.profile_layout || '',
    loadout?.profile_atmosphere || ''
  ].join('|');

  function replayPreview() {
    paused = false;
    replayKey += 1;
  }
</script>

<aside class="shop-contextual-preview" aria-labelledby="shop-contextual-preview-title">
  <div class="shop-contextual-preview__topline">
    <span>Live profile</span>
    <span>Draft preview</span>
  </div>

  <header class="shop-contextual-preview__header">
    <div class="shop-contextual-preview__balance">
      <span>EP balance</span>
      <strong>{Number(walletBalance || 0).toLocaleString()} EP</strong>
    </div>
    <div class="shop-preview-actions" aria-label="Preview controls">
      <button type="button" on:click={replayPreview}>Replay</button>
      <button type="button" aria-pressed={paused} on:click={() => paused = !paused}>{paused ? 'Play' : 'Pause'}</button>
      {#if selectedItem}<button type="button" class="shop-contextual-preview__reset" on:click={() => dispatch('reset')}>Clear</button>{/if}
    </div>
  </header>

  {#key previewKey}
    <ShopStudioPreview
      {loadout}
      {selectedItem}
      username={previewName}
      {displayColor}
      {accountProfile}
      {profileConfig}
      links={previewLinks}
      nameRendererMode={rendererMode}
      compact
    />
  {/key}

  <div class="shop-contextual-preview__status" aria-live="polite">
    <span>{selectedItem ? 'Temporary preview' : 'Equipped look'}</span>
    <strong id="shop-contextual-preview-title">{selectedItem?.name || 'Your profile'}</strong>
    {#if selectedItem}<small>Nothing is saved until you equip it in Profile settings.</small>{/if}
  </div>

</aside>

<style>
  .shop-contextual-preview {
    position: sticky;
    top: 1rem;
    align-self: start;
    display: grid;
    gap: .8rem;
    min-width: 0;
    overflow: hidden;
    padding: 1rem;
    border: 1px solid var(--shop-line);
    border-radius: var(--radius-md);
    background: rgba(11, 13, 18, .7);
    box-shadow: 0 1.5rem 4rem rgba(0, 0, 0, .18);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
  }

  .shop-contextual-preview__topline { display:flex; align-items:center; justify-content:space-between; gap:.8rem; color:var(--shop-accent); font:700 .64rem/1 var(--shop-mono); letter-spacing:.1em; text-transform:uppercase; }
  .shop-contextual-preview__topline span:last-child { color:var(--shop-faint); }
  .shop-contextual-preview__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: .9rem;
    padding: .75rem 0 .8rem;
    border-top: 1px solid var(--shop-line);
    border-bottom: 1px solid var(--shop-line);
  }

  .shop-contextual-preview__balance { display:grid; gap:.28rem; min-width:0; }
  .shop-contextual-preview__balance span { color:var(--shop-faint); font:700 .62rem/1 var(--shop-mono); letter-spacing:.1em; text-transform:uppercase; }
  .shop-contextual-preview__balance strong { overflow:hidden; color:var(--shop-ink); font:700 1rem/1 var(--shop-mono); letter-spacing:-.03em; text-overflow:ellipsis; white-space:nowrap; }
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
    border: 1px solid #3a3e47;
    border-radius: 4px;
    background: #17191f;
    color: #b5b8c1;
    cursor: pointer;
    font: 600 .72rem var(--shop-font);
  }

  .shop-preview-actions button:hover,
  .shop-preview-actions button:focus-visible { border-color: #aeb5e5; color: #fff; }

  .shop-contextual-preview__reset {
    color: #cdd2ff !important;
  }

  .shop-contextual-preview :global(.studio-preview) {
    min-height: 0;
    padding: .75rem;
    border: 0;
    border-radius: 0;
    background: transparent;
    box-shadow: none;
  }

  .shop-contextual-preview :global(.studio-stage.context-profile) { min-height: 19rem; padding: .55rem; border: 1px solid var(--shop-line); border-radius: var(--radius-md); background: var(--shop-deep); }
  .shop-contextual-preview :global(.stage-grid) { display:none; }
  .shop-contextual-preview :global(.studio-profile-card) { width: calc(100% - .25rem); max-width: 100%; margin-inline: auto; }
  .shop-contextual-preview :global(.studio-profile-card .identity-card) { min-height: 16rem; padding: 1.15rem; }
  .shop-contextual-preview :global(.studio-profile-card .identity-card__avatar) { flex-basis: 3.5rem; width: 3.5rem; }
  .shop-contextual-preview :global(.studio-profile-card .identity-card__name) { font-size: clamp(2rem, 5.5vw, 2.65rem); }
  .shop-contextual-preview :global(.studio-profile-card .identity-card__links) { gap: .45rem .8rem; margin-top: .8rem; }

  .shop-contextual-preview__status { display:grid; gap:.25rem; padding:0 .15rem .05rem; }
  .shop-contextual-preview__status span { color:var(--shop-faint); font:700 .62rem/1 var(--shop-mono); letter-spacing:.1em; text-transform:uppercase; }
  .shop-contextual-preview__status strong { overflow:hidden; color:var(--shop-ink); font:600 .9rem/1.15 var(--shop-font); text-overflow:ellipsis; white-space:nowrap; }
  .shop-contextual-preview__status small { color:var(--shop-muted); font-size:.72rem; line-height:1.35; }

  @media (max-width: 960px) {
    .shop-contextual-preview { position: static; }
    .shop-contextual-preview :global(.studio-stage.context-profile) { min-height: 17rem; }
  }

  @media (max-width: 700px) {
    .shop-contextual-preview { padding: .8rem; }
    .shop-contextual-preview__header { align-items:flex-start; flex-direction:column; padding: .75rem 0; }
    .shop-preview-actions { width:100%; justify-content:flex-start; }
    .shop-contextual-preview :global(.studio-stage.context-profile) { min-height: 15rem; }
  }
</style>
