<script>
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { PROFILE_RENDER_CONTEXTS } from './profile-studio/previewContexts.js';
  import { trackProgressionEvent } from './productAnalytics.js';

  /** @type {any} */
  export let reward = null;
  export let username = 'You';
  export let displayColor = '#FFFFFF';
  export let avatarSrc = '';
  export let unlocked = false;
  export let milestoneId = null;
  export let track = 'rank';
  export let analyticsSurface = 'progression';

  let previewComponent = null;
  let catalogItems = {};
  let catalogLoading = false;
  let catalogError = '';
  let previewOpen = false;
  let requestInFlight = false;
  const previewInstanceId = globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2);

  function normalizedAnalyticsSurface(value) {
    const raw = typeof value === 'string' ? value.trim().toLowerCase() : '';
    return {
      studio: 'studio',
      progression: 'progression',
      roll: 'roll',
      'profile-roll': 'roll',
      'root-roll': 'root-roll',
      'dedicated-roll': 'dedicated-roll'
    }[raw] || 'progression';
  }

  function previewDedupeKey() {
    const value = typeof milestoneId === 'string' && milestoneId.trim()
      ? milestoneId
      : itemKey;
    return String(value || 'reward')
      .trim()
      .replace(/[^a-z0-9_:-]/gi, '_')
      .slice(0, 100) || 'reward';
  }

  function recordPreviewEvent() {
    if (catalogError || !catalogItems[itemKey]) return;
    trackProgressionEvent('progression_reward_previewed', {
      surface: normalizedAnalyticsSurface(analyticsSurface),
      accountMode: 'authenticated',
      track: track === 'ritual' || track === 'discovery' ? track : 'rank'
    }, { dedupeKey: previewDedupeKey() });
  }

  $: itemKey = typeof reward?.itemKey === 'string'
    ? reward.itemKey
    : typeof reward?.item_key === 'string'
      ? reward.item_key
      : '';
  $: rewardName = typeof reward?.name === 'string' && reward.name.trim()
    ? reward.name
    : 'Expression reward';
  $: catalogItem = itemKey ? catalogItems[itemKey] || null : null;
  const previewPanelId = `progression-reward-preview-panel-${previewInstanceId}`;

  async function loadPreviewAsset(openPanel = false) {
    if (openPanel) previewOpen = true;
    if (requestInFlight || (previewComponent && catalogItem)) {
      if (openPanel) recordPreviewEvent();
      return;
    }

    if (!itemKey) {
      catalogError = 'This reward does not have a previewable expression key yet.';
      return;
    }

    requestInFlight = true;
    catalogLoading = true;
    catalogError = '';

    try {
      // Keep the canonical renderer and catalog out of the progression route's
      // initial payload. The catalog remains server-owned and the renderer
      // receives the same normalized item used by Studio and the shop.
      const [previewModule, stores] = await Promise.all([
        import('./ShopItemPreview.svelte'),
        import('./stores.js')
      ]);
      previewComponent = previewModule.default;
      await stores.loadCosmeticCatalog();
      catalogItems = get(stores.cosmeticCatalogItems) || {};
      catalogError = get(stores.cosmeticCatalogError) || '';
      if (!catalogError && !catalogItems[itemKey]) {
        catalogError = 'This expression is not available in the current catalog.';
      }
      if (openPanel) recordPreviewEvent();
    } catch {
      catalogError = 'The expression preview could not be loaded. Try again.';
    } finally {
      catalogLoading = false;
      requestInFlight = false;
    }
  }

  function loadPreview() {
    return loadPreviewAsset(true);
  }

  onMount(() => {
    void loadPreviewAsset(false);
  });

  function closePreview() {
    previewOpen = false;
  }
</script>

<div class="progression-reward-preview">
  <button
    type="button"
    class="progression-reward-preview__trigger"
    aria-expanded={previewOpen}
    aria-controls={previewPanelId}
    on:click={previewOpen ? closePreview : loadPreview}
  >
    <span class={`progression-reward-preview__thumbnail${unlocked ? '' : ' progression-reward-preview__thumbnail--locked'}`} aria-hidden="true">
      {#if previewComponent && catalogItem}
        <svelte:component
          this={previewComponent}
          item={catalogItem}
          {username}
          {displayColor}
          {avatarSrc}
          active={false}
          mode="static"
          renderContext={PROFILE_RENDER_CONTEXTS.EFFECT_CARD}
        />
      {:else if catalogLoading}
        <span class="progression-reward-preview__thumbnail-loader"></span>
      {:else}
        <span class="progression-reward-preview__thumbnail-fallback">{rewardName.slice(0, 1)}</span>
      {/if}
    </span>
    <span class="progression-reward-preview__trigger-copy">
      <strong>{rewardName}</strong>
      <small>{unlocked ? 'Earned' : 'Working toward it'}</small>
    </span>
  </button>

  {#if previewOpen}
    <div id={previewPanelId} class="progression-reward-preview__panel" aria-live="polite">
      {#if catalogLoading}
        <div class="progression-reward-preview__state" role="status">
          <span class="progression-reward-preview__loader" aria-hidden="true"></span>
          <span>Loading the canonical expression preview…</span>
        </div>
      {:else if catalogError}
        <div class="progression-reward-preview__state" role="alert">
          <span>{catalogError}</span>
          <button type="button" class="progression-reward-preview__retry" on:click={loadPreview}>Try again</button>
        </div>
      {:else if previewComponent && catalogItem}
        <svelte:component
          this={previewComponent}
          item={catalogItem}
          {username}
          {displayColor}
          {avatarSrc}
          active={false}
          mode="static"
          renderContext={PROFILE_RENDER_CONTEXTS.EFFECT_CARD}
        />
        <p class="progression-reward-preview__caption">The same expression used in Profile Studio.</p>
      {:else}
        <div class="progression-reward-preview__state" role="status">
          <span>Preview unavailable for this reward.</span>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .progression-reward-preview { display:grid; gap:.45rem; min-width:0; width:100%; }
  .progression-reward-preview__trigger,
  .progression-reward-preview__retry {
    display:flex;
    align-items:center;
    gap:.65rem;
    min-height:3.2rem;
    width:100%;
    padding:.55rem .7rem;
    border:1px solid var(--color-line-subtle);
    border-radius:var(--radius-sm);
    background:var(--surface-inset);
    color:var(--color-ink-strong);
    font:inherit;
    text-align:left;
    cursor:pointer;
  }
  .progression-reward-preview__trigger:hover,
  .progression-reward-preview__trigger:focus-visible,
  .progression-reward-preview__retry:hover,
  .progression-reward-preview__retry:focus-visible { border-color:var(--color-line-strong); }
  .progression-reward-preview__trigger:focus-visible,
  .progression-reward-preview__retry:focus-visible { outline:2px solid var(--color-ink-strong); outline-offset:2px; }
  .progression-reward-preview__thumbnail { display:grid; place-items:center; flex:0 0 2.7rem; width:2.7rem; height:2.7rem; overflow:hidden; border:1px solid var(--color-line-strong); border-radius:var(--radius-sm); background:var(--surface-panel-soft); }
  .progression-reward-preview__thumbnail--locked { filter:grayscale(1); opacity:.42; }
  .progression-reward-preview__thumbnail :global(.shop-preview-area) { display:grid; place-items:center; width:100%; min-height:2.7rem; height:2.7rem; padding:0; border:0; border-radius:0; background:transparent; }
  .progression-reward-preview__thumbnail :global(.shop-preview-area > *) { max-width:100%; max-height:100%; }
  .progression-reward-preview__thumbnail-loader { width:.8rem; height:.8rem; border:1px solid var(--color-line-strong); border-top-color:var(--color-ink-strong); border-radius:50%; animation:progression-preview-spin .8s linear infinite; }
  .progression-reward-preview__thumbnail-fallback { display:grid; place-items:center; width:1.7rem; height:1.7rem; border:1px solid var(--color-line-strong); border-radius:50%; color:var(--color-ink-muted); font:700 .8rem var(--font-mono-stack); }
  .progression-reward-preview__trigger-copy { display:grid; gap:.15rem; min-width:0; }
  .progression-reward-preview__trigger-copy strong { overflow-wrap:anywhere; font-size:var(--type-small); line-height:1.2; }
  .progression-reward-preview__trigger-copy small { color:var(--color-ink-muted); font-size:.7rem; line-height:1.25; }
  .progression-reward-preview__panel { display:grid; gap:.45rem; overflow:hidden; border:1px solid var(--color-line-subtle); border-radius:var(--radius-sm); background:var(--surface-panel-soft); }
  .progression-reward-preview__panel :global(.shop-preview-area) { min-height:5.5rem; }
  .progression-reward-preview__state { display:flex; align-items:center; justify-content:space-between; gap:.65rem; min-height:5.5rem; padding:.75rem; color:var(--color-ink-muted); font-size:.72rem; line-height:1.45; }
  .progression-reward-preview__retry { flex:0 0 auto; min-height:2.5rem; font-size:.72rem; }
  .progression-reward-preview__loader { flex:0 0 .7rem; width:.7rem; height:.7rem; border:1px solid var(--color-line-strong); border-top-color:var(--color-ink-strong); border-radius:50%; animation:progression-preview-spin .8s linear infinite; }
  .progression-reward-preview__caption { margin:0; padding:0 .7rem .65rem; color:var(--color-ink-muted); font-size:.68rem; }
  @keyframes progression-preview-spin { to { transform:rotate(360deg); } }
  @media (prefers-reduced-motion:reduce) { .progression-reward-preview__loader, .progression-reward-preview__thumbnail-loader { animation:none; } }
</style>
