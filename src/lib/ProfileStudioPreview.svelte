<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import { PROFILE_RENDER_CONTEXTS } from './profile-studio/previewContexts.js';

  /** @type {any} */
  export let previewComponent = null;
  export let previewError = '';
  export let previewProfile = null;
  export let previewProfileConfig = null;
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
  const DESKTOP_PREVIEW_WIDTH = 1440;
  const DESKTOP_PREVIEW_HEIGHT = 900;
  let previewViewport;
  let previewScale = 0.28;
  let previewResizeObserver;

  $: isAppearancePreview = activeSection === 'customize' && activeCustomizeTab === 'appearance';

  function togglePreview() {
    dispatch('toggle');
  }

  function setPreviewDevice(device) {
    if (device === 'desktop' || device === 'mobile') dispatch('devicechange', device);
  }

  function syncPreviewScale() {
    if (!previewViewport || previewDevice === 'mobile') {
      previewScale = 1;
      return;
    }
    previewScale = Math.min(
      previewViewport.clientWidth / DESKTOP_PREVIEW_WIDTH,
      previewViewport.clientHeight / DESKTOP_PREVIEW_HEIGHT
    );
  }

  $: if (previewDevice && previewResizeObserver) requestAnimationFrame(syncPreviewScale);

  onMount(() => {
    syncPreviewScale();
    if (typeof ResizeObserver !== 'undefined' && previewViewport) {
      previewResizeObserver = new ResizeObserver(syncPreviewScale);
      previewResizeObserver.observe(previewViewport);
    }
    window.addEventListener('resize', syncPreviewScale);
    return () => {
      previewResizeObserver?.disconnect();
      previewResizeObserver = null;
      window.removeEventListener('resize', syncPreviewScale);
    };
  });

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
      {#if previewComponent}
        <div class="profile-studio-preview__viewport" bind:this={previewViewport}>
          <div
            class="profile-studio-preview__logical-canvas"
            style={`--preview-scale: ${previewScale}; --preview-logical-width: ${DESKTOP_PREVIEW_WIDTH}px; --preview-logical-height: ${DESKTOP_PREVIEW_HEIGHT}px;`}
          >
            <svelte:component
              this={previewComponent}
              previewMode={true}
              previewIdentityOnly={true}
              previewProfile={previewProfile}
              previewProfileConfig={previewProfileConfig}
              previewScores={previewScores}
              previewTimelineEvents={previewTimelineEvents}
              previewCollectionItems={previewCollectionItems}
              previewAllAchievements={previewAllAchievements}
              {previewDevice}
              renderContext={liveProfileContext}
            />
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
      {#if isAppearancePreview}
        <div class="profile-studio-preview__device-sample" aria-label="Desktop preview sample"></div>
      {/if}
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
  .profile-studio-preview__viewport { position: relative; width: 100%; aspect-ratio: 16 / 10; overflow: hidden; border: 1px solid color-mix(in srgb, var(--studio-focus, #b4befe) 42%, var(--studio-border, #313244)); border-radius: 1rem; background: var(--color-canvas-deep, #07080b); box-shadow: 0 1rem 2.5rem rgba(0, 0, 0, .28); }
  .profile-studio-preview__logical-canvas { position: relative; width: 100%; height: 100%; overflow: hidden; }
  .profile-studio-preview__logical-canvas :global(.profile-shell-page--preview) { position: absolute; top: 0; left: 50%; width: var(--preview-logical-width); height: var(--preview-logical-height); min-height: var(--preview-logical-height); max-height: none; overflow: hidden; border-radius: 0; background: transparent; box-shadow: none; transform: translateX(-50%) scale(var(--preview-scale)); transform-origin: top center; }
  .profile-studio-preview__logical-canvas :global(.profile-shell-page--preview .profile-shell__approved-canvas),
  .profile-studio-preview__logical-canvas :global(.profile-shell-page--preview .profile-shell__approved-main) { width: 100%; height: var(--preview-logical-height); min-height: var(--preview-logical-height); }
  .profile-studio-preview__logical-canvas :global(.profile-shell-page--preview .profile-shell__approved-main) { align-items: center; justify-content: center; }
  .profile-studio-preview__logical-canvas :global(.profile-shell-page--preview .profile-shell__opening) { min-height: 0; }
  /* The canvas is a real desktop viewport, so the profile object must keep
     its layout width instead of inheriting the old full-column preview rule. */
  .profile-studio-preview__logical-canvas :global(.profile-shell-page--preview.profile-shell-page--compact .profile-shell__approved-opening) { width: 300px; }
  .profile-studio-preview__logical-canvas :global(.profile-shell-page--preview.profile-shell-page--sleek .profile-shell__approved-opening) { width: 335px; }
  .profile-studio-preview__logical-canvas :global(.profile-shell-page--preview.profile-shell-page--minimal .profile-shell__approved-opening) { width: 300px; align-self: flex-start; margin-left: 8.5vw; margin-right: 0; }
  .profile-studio-preview__logical-canvas :global(.profile-shell-page--preview.profile-shell-page--modern .profile-shell__approved-opening) { width: 310px; }
  .profile-studio-preview__logical-canvas :global(.profile-shell-page--preview.profile-shell-page--portfolio .profile-shell__approved-opening) { width: 320px; }
  .profile-studio-preview__canvas--mobile { padding: .65rem 0 1rem; }
  .profile-studio-preview__canvas--mobile .profile-studio-preview__viewport { width: min(20rem, 100%); height: min(42rem, calc(100dvh - 14rem)); min-height: min(22rem, calc(100dvh - 12rem)); aspect-ratio: auto; border-radius: 1.25rem; }
  .profile-studio-preview__canvas--mobile .profile-studio-preview__logical-canvas :global(.profile-shell-page--preview) { top: 0; left: 0; width: 100%; height: 100%; min-height: 100%; transform: none; border-radius: 1.25rem; overflow: auto; }
  .profile-studio-preview__canvas--mobile .profile-studio-preview__logical-canvas :global(.profile-shell-page--preview .profile-shell__approved-canvas),
  .profile-studio-preview__canvas--mobile .profile-studio-preview__logical-canvas :global(.profile-shell-page--preview .profile-shell__approved-main) { height: auto; min-height: 100%; }
  .profile-studio-preview__canvas--mobile .profile-studio-preview__logical-canvas :global(.profile-shell-page--preview .profile-shell__approved-main) { align-items: stretch; justify-content: flex-start; }
  .profile-studio-preview__canvas--mobile .profile-studio-preview__logical-canvas :global(.profile-shell-page--preview .profile-shell__approved-opening) { width: 100%; margin-inline: 0; align-self: stretch; }
  .profile-studio-preview__device-panel { min-width: 0; }
  .profile-studio-preview__device-panel--appearance { display: grid; min-height: 13.2rem; overflow: hidden; border: 1px solid var(--studio-border, #313244); border-radius: .55rem; background: var(--studio-inset, #1e1e2e); }
  .profile-studio-preview__devices { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); min-height: 3rem; border: 1px solid var(--studio-border, #313244); border-radius: .55rem; background: var(--studio-inset, #1e1e2e); }
  .profile-studio-preview__device-panel--appearance .profile-studio-preview__devices { border: 0; border-bottom: 1px solid var(--studio-border, #313244); border-radius: 0; }
  .profile-studio-preview__devices button { display: inline-flex; align-items: center; justify-content: center; gap: .4rem; border: 0; border-bottom: 2px solid transparent; background: transparent; color: var(--studio-muted, #bac2de); font: 600 .74rem/1 var(--studio-font, var(--site-font, sans-serif)); cursor: pointer; }
  .profile-studio-preview__devices button.active { border-bottom-color: var(--studio-accent, #89b4fa); color: var(--studio-accent, #89b4fa); }
  .profile-studio-preview__devices button:focus-visible { outline: 2px solid var(--studio-focus, #b4befe); outline-offset: -2px; }
  .profile-studio-preview__devices svg { width: .9rem; height: .9rem; fill: none; stroke: currentColor; stroke-linecap: round; stroke-linejoin: round; stroke-width: 1.7; }
  .profile-studio-preview__device-sample { position: relative; min-height: 8.8rem; margin: .7rem; padding: .7rem; border: 1px solid var(--studio-border, #313244); border-radius: .5rem; background: var(--studio-inset, #1e1e2e); }
  .profile-studio-preview__device-sample::before { position: absolute; top: .8rem; right: .9rem; left: .9rem; height: .8rem; border-bottom: 1px solid var(--studio-border, #313244); background: var(--studio-focus, #b4befe); content: ''; opacity: .9; }
  .profile-studio-preview__device-sample::after { position: absolute; top: 2.25rem; right: .7rem; bottom: .7rem; left: .7rem; border: 1px solid var(--studio-border-strong, #45475a); border-radius: .35rem; background: var(--studio-panel, #181825); box-shadow: inset 3rem 1rem 0 -2.55rem var(--studio-border-strong, #45475a), inset 4.7rem 2.55rem 0 -4.25rem var(--studio-text, #cdd6f4), inset 4.7rem 3.3rem 0 -4.25rem var(--studio-faint, #7f849c), inset 4.7rem 4.05rem 0 -4.25rem var(--studio-faint, #7f849c); content: ''; }
  .profile-studio-preview__device-panel--appearance + .profile-studio-preview__plus-card { margin-top: .9rem; }
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
