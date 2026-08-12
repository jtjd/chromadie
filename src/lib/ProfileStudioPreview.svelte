<script>
  import { afterUpdate, createEventDispatcher, onMount } from 'svelte';
  import { PROFILE_RENDER_CONTEXTS } from './profile-studio/previewContexts.js';

  /** @type {any} */
  export let previewComponent = null;
  export let previewError = '';
  export let previewProfile = null;
  export let previewProfileConfig = null;
  export let previewRenderSnapshot = null;
  export let previewScores = [];
  export let previewTimelineEvents = [];
  export let previewCollectionItems = [];
  export let previewAllAchievements = [];
  export let activeSection = 'customize';
  export let activeCustomizeTab = 'appearance';
  export let previewDevice = 'desktop';
  export let isMobileViewport = false;

  const dispatch = createEventDispatcher();
  const liveProfileContext = PROFILE_RENDER_CONTEXTS.LIVE_PROFILE;
  let previewStage;
  let previewScrollNeeded = false;
  let observedPreviewShell = null;
  let previewResizeObserver = null;
  let previewMutationObserver = null;

  function hasRenderablePreview(value) {
    return Boolean(value && typeof value === 'object' && value.profile);
  }

  $: isAppearancePreview = activeSection === 'customize' && activeCustomizeTab === 'appearance';
  $: previewReady = Boolean(previewComponent && hasRenderablePreview(previewRenderSnapshot));

  function updatePreviewScrollState() {
    const shell = previewStage?.querySelector('.profile-shell-page--preview');
    if (shell && shell !== observedPreviewShell) {
      if (observedPreviewShell) previewResizeObserver?.unobserve(observedPreviewShell);
      observedPreviewShell = shell;
      previewResizeObserver?.observe(shell);
    } else if (!shell && observedPreviewShell) {
      previewResizeObserver?.unobserve(observedPreviewShell);
      observedPreviewShell = null;
    }
    const nextContentOverflow = Boolean(shell && shell.scrollHeight > shell.clientHeight + 4);
    const opening = shell?.querySelector('.profile-shell__approved-opening');
    const openingBox = opening?.getBoundingClientRect();
    const nextOpeningOverflow = Boolean(shell && openingBox && openingBox.height > shell.clientHeight + 4);
    const nextContentOverflowValue = nextContentOverflow ? 'true' : 'false';
    const nextOpeningOverflowValue = nextOpeningOverflow ? 'true' : 'false';
    if (shell && shell.dataset.previewContentOverflow !== nextContentOverflowValue) shell.dataset.previewContentOverflow = nextContentOverflowValue;
    if (shell && shell.dataset.previewOpeningOverflow !== nextOpeningOverflowValue) shell.dataset.previewOpeningOverflow = nextOpeningOverflowValue;
    if (nextContentOverflow !== previewScrollNeeded) previewScrollNeeded = nextContentOverflow;
  }

  function ensurePreviewObservers() {
    if (!previewStage) return;
    if (!previewResizeObserver && typeof ResizeObserver !== 'undefined') {
      previewResizeObserver = new ResizeObserver(updatePreviewScrollState);
      previewResizeObserver.observe(previewStage);
    }
    if (!previewMutationObserver && typeof MutationObserver !== 'undefined') {
      previewMutationObserver = new MutationObserver(updatePreviewScrollState);
      // ResizeObserver covers layout changes. Avoid observing the data
      // attributes this component owns, otherwise each measurement can feed
      // back through MutationObserver while the preview is settling.
      previewMutationObserver.observe(previewStage, { childList: true, subtree: true });
    }
  }

  afterUpdate(() => {
    ensurePreviewObservers();
    if (previewStage) requestAnimationFrame(updatePreviewScrollState);
  });

  onMount(() => {
    ensurePreviewObservers();
    updatePreviewScrollState();
    return () => {
      previewResizeObserver?.disconnect();
      previewMutationObserver?.disconnect();
      previewResizeObserver = null;
      previewMutationObserver = null;
      observedPreviewShell = null;
    };
  });

  function togglePreview() {
    dispatch('toggle');
  }

  function setPreviewDevice(device) {
    if (device === 'desktop' || device === 'mobile') dispatch('devicechange', device);
  }

  function retryPreview() {
    dispatch('retry');
  }

  function openPremium(event) {
    event.preventDefault();
    dispatch('premiumrequest');
  }
</script>

<div class="profile-studio-preview">
  <header class="profile-studio-preview__header">
    <div>
      <h2>Live preview</h2>
      <p>This is how your profile looks</p>
    </div>
    {#if isMobileViewport || activeSection === 'links'}
      <button class="profile-studio-preview__close" type="button" aria-label="Close live preview" on:click={togglePreview}>×</button>
    {/if}
  </header>
  <div class="profile-studio-preview__body">
    <div class="profile-studio-preview__canvas" class:profile-studio-preview__canvas--mobile={previewDevice === 'mobile'} class:profile-studio-preview__canvas--appearance={isAppearancePreview}>
      {#if previewReady}
        <div class="profile-studio-preview__viewport" data-preview-device={previewDevice}>
          <div
            bind:this={previewStage}
            class="profile-studio-preview__stage"
            data-preview-device={previewDevice}
            data-preview-scrollable={previewScrollNeeded ? 'true' : 'false'}
          >
            <svelte:component
              this={previewComponent}
              previewMode={true}
              previewProfile={previewProfile}
              previewProfileConfig={previewProfileConfig}
              renderSnapshot={previewRenderSnapshot}
              previewScores={previewScores}
              previewTimelineEvents={previewTimelineEvents}
              previewCollectionItems={previewCollectionItems}
              previewAllAchievements={previewAllAchievements}
              {previewDevice}
              renderContext={liveProfileContext}
            />
            {#if previewScrollNeeded}
              <div class="profile-studio-preview__scroll-cue" aria-hidden="true"><span>Scroll to explore</span><span>↓</span></div>
            {/if}
          </div>
        </div>
      {:else if previewError}
        <div class="profile-studio-preview__loading" role="alert"><span aria-hidden="true">!</span><strong>Preview unavailable</strong><p>{previewError}</p><button type="button" on:click={retryPreview}>Retry preview</button></div>
      {:else}
        <div class="profile-studio-preview__loading" role="status" aria-live="polite"><span aria-hidden="true">✦</span> Preparing your live canvas…</div>
      {/if}
    </div>
    <div class="profile-studio-preview__device-panel" class:profile-studio-preview__device-panel--appearance={isAppearancePreview}>
      <div class="profile-studio-preview__devices" role="group" aria-label="Preview device">
        <button type="button" class:active={previewDevice === 'desktop'} aria-pressed={previewDevice === 'desktop'} on:click={() => setPreviewDevice('desktop')}><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="13" rx="1.5"></rect><path d="M8 20h8M12 17v3"></path></svg>Desktop</button>
        <button type="button" class:active={previewDevice === 'mobile'} aria-pressed={previewDevice === 'mobile'} on:click={() => setPreviewDevice('mobile')}><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="3" width="10" height="18" rx="2"></rect><path d="M11 18h2"></path></svg>Mobile</button>
      </div>
    </div>
    <aside class="profile-studio-preview__plus-card" aria-label="Chromadie Plus">
      <div class="profile-studio-preview__plus-icon" aria-hidden="true">♔</div>
      <div><h3>Unlock more with Chromadie Plus</h3><p>Get access to premium effects, animated cursors, unique borders and more.</p><a href="#premium" on:click={openPremium}>View premium features <span aria-hidden="true">→</span></a></div>
    </aside>
  </div>
</div>

<style>
  .profile-studio-preview { display: grid; grid-template-rows: auto minmax(0, 1fr); width: 100%; max-width: 100%; min-width: 0; min-height: 0; height: 100%; overflow: hidden; }
  .profile-studio-preview__header { display: flex; align-items: flex-start; justify-content: space-between; gap: .75rem; min-height: 5.1rem; padding: 1.1rem 1rem .7rem; }
  .profile-studio-preview__header h2 { margin: 0; color: var(--studio-text, var(--site-ink, #f2f0eb)); font-size: 1.05rem; letter-spacing: -.02em; }
  .profile-studio-preview__header p { margin: .35rem 0 0; color: var(--studio-faint, var(--site-muted, #a6adc8)); font-size: .74rem; }
  .profile-studio-preview__close { display: grid; width: 2.25rem; height: 2.25rem; place-items: center; border: 1px solid var(--studio-border-strong, rgba(255,255,255,.14)); border-radius: .4rem; background: transparent; color: var(--studio-muted, #bac2de); font-size: 1.1rem; cursor: pointer; }
  .profile-studio-preview__close:hover, .profile-studio-preview__close:focus-visible { border-color: var(--studio-focus, #b4befe); color: var(--studio-text, #cdd6f4); }
  .profile-studio-preview__body { display: grid; align-content: start; gap: .9rem; min-height: 0; overflow: auto; padding: .2rem 1rem calc(1rem + env(safe-area-inset-bottom)); background: var(--ctp-mantle, var(--site-deep, #11111b)); }
  .profile-studio-preview__canvas { display: grid; box-sizing: border-box; width: 100%; max-width: 100%; min-width: 0; place-items: start center; padding: .15rem 0 0; overflow-x: hidden; }
  .profile-studio-preview__canvas--appearance { min-height: 0; margin-bottom: .6rem; }
  .profile-studio-preview__viewport { position: relative; width: 100%; height: clamp(24rem, 54vh, 32rem); min-height: 0; aspect-ratio: 16 / 10; overflow: hidden; border: 1px solid color-mix(in srgb, var(--studio-focus, #b4befe) 42%, var(--studio-border, #313244)); border-radius: 1rem; background: var(--color-canvas-deep, #07080b); box-shadow: 0 1rem 2.5rem rgba(0, 0, 0, .28); }
  .profile-studio-preview__stage { position: relative; width: 100%; height: 100%; min-height: 0; overflow: hidden; }
  .profile-studio-preview__scroll-cue { position: absolute; right: .7rem; bottom: .7rem; z-index: 8; display: inline-flex; align-items: center; gap: .35rem; padding: .35rem .5rem; border: 1px solid color-mix(in srgb, var(--studio-focus, #b4befe) 38%, transparent); border-radius: 999px; background: color-mix(in srgb, var(--studio-inset, #1e1e2e) 82%, transparent); color: var(--studio-muted, #bac2de); font: 600 .62rem/1 var(--studio-font, var(--site-font, sans-serif)); pointer-events: none; }
  .profile-studio-preview__scroll-cue span:last-child { color: var(--studio-focus, #b4befe); font-size: .8rem; }
  .profile-studio-preview__canvas--mobile { padding: .65rem 0 1rem; }
  .profile-studio-preview__canvas--mobile .profile-studio-preview__viewport { width: min(20rem, 100%); height: min(42rem, calc(100dvh - 14rem)); min-height: min(24rem, calc(100dvh - 12rem)); aspect-ratio: auto; border-radius: 1.25rem; }
  .profile-studio-preview__canvas--mobile .profile-studio-preview__stage { min-height: 100%; }
  .profile-studio-preview__device-panel { min-width: 0; }
  .profile-studio-preview__device-panel--appearance { min-height: 0; overflow: hidden; border: 1px solid var(--studio-border, #313244); border-radius: .55rem; background: var(--studio-inset, #1e1e2e); }
  .profile-studio-preview__devices { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); min-height: 3rem; border: 1px solid var(--studio-border, #313244); border-radius: .55rem; background: var(--studio-inset, #1e1e2e); }
  .profile-studio-preview__device-panel--appearance .profile-studio-preview__devices { border: 0; border-bottom: 1px solid var(--studio-border, #313244); border-radius: 0; }
  .profile-studio-preview__devices button { display: inline-flex; align-items: center; justify-content: center; gap: .4rem; border: 0; border-bottom: 2px solid transparent; background: transparent; color: var(--studio-muted, #bac2de); font: 600 .74rem/1 var(--studio-font, var(--site-font, sans-serif)); cursor: pointer; }
  .profile-studio-preview__devices button.active { border-bottom-color: var(--studio-accent, #89b4fa); color: var(--studio-accent, #89b4fa); }
  .profile-studio-preview__devices button:focus-visible { outline: 2px solid var(--studio-focus, #b4befe); outline-offset: -2px; }
  .profile-studio-preview__devices svg { width: .9rem; height: .9rem; fill: none; stroke: currentColor; stroke-linecap: round; stroke-linejoin: round; stroke-width: 1.7; }
  .profile-studio-preview__plus-card { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: .7rem; padding: .85rem; border: 1px solid color-mix(in srgb, var(--ctp-mauve, #cba6f7) 30%, var(--ctp-surface0, #313244)); border-radius: .55rem; background: color-mix(in srgb, var(--ctp-mauve, #cba6f7) 5%, var(--ctp-mantle, #181825)); }
  .profile-studio-preview__plus-icon { display: grid; width: 1.5rem; height: 1.5rem; place-items: center; color: var(--ctp-mauve, #cba6f7); font-size: 1.25rem; }
  .profile-studio-preview__plus-card h3 { margin: 0; color: var(--ctp-mauve, #cba6f7); font-size: .82rem; }
  .profile-studio-preview__plus-card p { margin: .35rem 0 .65rem; color: var(--ctp-subtext1, #bac2de); font-size: .7rem; line-height: 1.4; }
  .profile-studio-preview__plus-card a { color: var(--ctp-mauve, #cba6f7); font-size: .72rem; font-weight: 650; text-decoration: none; }
  .profile-studio-preview__plus-card a:hover { text-decoration: underline; }
  .profile-studio-preview__loading { display: grid; place-items: center; min-height: 18rem; gap: .55rem; color: var(--studio-muted, #bac2de); font-size: .8rem; text-align: center; }
  .profile-studio-preview__loading span { color: var(--studio-focus, #b4befe); font-size: 1.2rem; }
  .profile-studio-preview__loading strong { color: var(--studio-text, #cdd6f4); font-size: .92rem; }
  .profile-studio-preview__loading p { max-width: 20rem; margin: 0; color: var(--studio-faint, #7f849c); line-height: 1.45; }
  .profile-studio-preview__loading button { min-height: 2rem; padding: .45rem .7rem; border: 1px solid var(--studio-border-strong, rgba(255,255,255,.14)); border-radius: .35rem; background: transparent; color: var(--studio-text, #cdd6f4); font-size: .78rem; cursor: pointer; }
  @media (prefers-reduced-motion: reduce) { .profile-studio-preview__body { scroll-behavior: auto; } }
</style>
