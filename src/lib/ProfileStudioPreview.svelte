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
    if (shell && shell.dataset.previewContentOverflow !== String(nextContentOverflow)) shell.dataset.previewContentOverflow = String(nextContentOverflow);
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

  function togglePreview() { dispatch('toggle'); }
  function setPreviewDevice(device) {
    if (device === 'desktop' || device === 'mobile') dispatch('devicechange', device);
  }
  function retryPreview() { dispatch('retry'); }
</script>

<div class="profile-studio-preview" data-preview-tab={activeCustomizeTab}>
  <header class="profile-studio-preview__header">
    <div class="profile-studio-preview__label"><i></i><span>Live public-profile preview</span></div>
    {#if isMobileViewport || activeSection === 'links'}
      <button class="profile-studio-preview__close" type="button" aria-label="Close live preview" on:click={togglePreview}>×</button>
    {/if}
  </header>

  <div class="profile-studio-preview__body">
    <div class="profile-studio-preview__canvas" class:profile-studio-preview__canvas--mobile={previewDevice === 'mobile'}>
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
              renderEnvironment={false}
              previewProfile={previewProfile}
              previewProfileConfig={previewProfileConfig}
              renderSnapshot={previewRenderSnapshot}
              previewScores={previewScores}
              previewTimelineEvents={previewTimelineEvents}
              previewCollectionItems={previewCollectionItems}
              previewAllAchievements={previewAllAchievements}
              {previewDevice}
              motionSurfaceElement={previewStage}
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

    <footer class="profile-studio-preview__footer">
      <span>Draft preview</span>
      <div class="profile-studio-preview__devices" role="group" aria-label="Preview device">
        <button type="button" class:active={previewDevice === 'desktop'} aria-pressed={previewDevice === 'desktop'} on:click={() => setPreviewDevice('desktop')}>Desktop</button>
        <button type="button" class:active={previewDevice === 'mobile'} aria-pressed={previewDevice === 'mobile'} on:click={() => setPreviewDevice('mobile')}>Mobile</button>
      </div>
    </footer>
  </div>
</div>

<style>
  .profile-studio-preview { display: grid; align-content: start; width: 100%; max-width: 100%; min-width: 0; min-height: 0; height: 100%; overflow: visible; }
  .profile-studio-preview__header { display: flex; align-items: center; justify-content: space-between; gap: .75rem; min-height: 2rem; margin-bottom: 1rem; }
  .profile-studio-preview__label { display: inline-flex; align-items: center; gap: .5rem; color: #8b8c94; font-size: .63rem; letter-spacing: .1em; text-transform: uppercase; }
  .profile-studio-preview__label i { width: .38rem; height: .38rem; border-radius: 50%; background: var(--studio-accent, #00ffb3); box-shadow: 0 0 8px var(--studio-accent-glow, rgba(0,255,179,.24)); }
  .profile-studio-preview__close { display: grid; width: 2rem; height: 2rem; place-items: center; border: 1px solid var(--studio-border, rgba(255,255,255,.1)); border-radius: .4rem; background: transparent; color: var(--studio-muted, #bac2de); font-size: 1.1rem; cursor: pointer; }
  .profile-studio-preview__close:hover, .profile-studio-preview__close:focus-visible { border-color: var(--studio-accent, #00ffb3); color: var(--studio-text, #f8f8f8); }
  .profile-studio-preview__body { display: grid; align-content: start; min-height: 0; overflow: visible; }
  .profile-studio-preview__canvas { display: grid; box-sizing: border-box; width: 100%; max-width: 100%; min-width: 0; min-height: clamp(30rem, 68vh, 42rem); place-items: center; overflow: visible; }
  .profile-studio-preview__viewport { position: relative; width: min(350px, 100%); height: clamp(28rem, 66vh, 40rem); min-height: 0; overflow: visible; }
  .profile-studio-preview__stage { position: relative; width: 100%; height: 100%; min-height: 0; overflow: hidden; }
  .profile-studio-preview__stage :global(.profile-shell-page--preview) { width: 100%; height: 100%; min-height: 100%; overflow-y: auto; background: transparent; }
  .profile-studio-preview__stage :global(.profile-shell__approved-main) { padding-inline: .25rem; }
  .profile-studio-preview__scroll-cue { position: absolute; right: .35rem; bottom: .35rem; z-index: 8; display: inline-flex; align-items: center; gap: .35rem; padding: .35rem .5rem; border: 1px solid rgba(255,255,255,.14); border-radius: 999px; background: rgba(10,10,12,.72); color: #8f9099; font: 600 .62rem/1 'Inter', sans-serif; pointer-events: none; }
  .profile-studio-preview__scroll-cue span:last-child { color: var(--studio-accent, #00ffb3); font-size: .8rem; }
  .profile-studio-preview__loading { display: grid; place-items: center; min-height: 22rem; gap: .55rem; color: var(--studio-muted, #bac2de); font-size: .8rem; text-align: center; }
  .profile-studio-preview__loading span { color: var(--studio-accent, #00ffb3); font-size: 1.2rem; }
  .profile-studio-preview__loading strong { color: var(--studio-text, #cdd6f4); font-size: .92rem; }
  .profile-studio-preview__loading p { max-width: 20rem; margin: 0; color: var(--studio-faint, #7f849c); line-height: 1.45; }
  .profile-studio-preview__loading button { min-height: 2rem; padding: .45rem .7rem; border: 1px solid var(--studio-border-hover, rgba(255,255,255,.2)); border-radius: .35rem; background: transparent; color: var(--studio-text, #cdd6f4); font-size: .78rem; cursor: pointer; }
  .profile-studio-preview__footer { display: flex; align-items: center; justify-content: space-between; gap: .7rem; width: min(350px, 100%); min-height: 2.8rem; margin: .75rem auto 0; padding-top: .7rem; border-top: 1px solid rgba(255,255,255,.12); color: #777881; font-size: .6rem; }
  .profile-studio-preview__devices { display: inline-flex; align-items: center; gap: .2rem; }
  .profile-studio-preview__devices button { min-height: 1.8rem; padding: .25rem .45rem; border: 0; border-radius: .3rem; background: transparent; color: #777881; font: 500 .6rem/1 'Inter', sans-serif; cursor: pointer; }
  .profile-studio-preview__devices button.active { background: rgba(255,255,255,.08); color: #bfc0c5; }
  .profile-studio-preview__devices button:hover, .profile-studio-preview__devices button:focus-visible { color: var(--studio-text, #f8f8f8); }

  @media (max-width: 1100px) {
    .profile-studio-preview { height: auto; }
    .profile-studio-preview__canvas { min-height: 30rem; }
  }

  @media (max-width: 700px) {
    .profile-studio-preview__header { margin-bottom: .7rem; }
    .profile-studio-preview__canvas { min-height: 0; padding: .5rem 0 1rem; }
    .profile-studio-preview__viewport { width: min(20rem, 100%); height: min(42rem, calc(100dvh - 12rem)); min-height: min(26rem, calc(100dvh - 12rem)); }
    .profile-studio-preview__footer { margin-top: 0; }
  }

  @media (prefers-reduced-motion: reduce) {
    .profile-studio-preview__stage { scroll-behavior: auto; }
  }
</style>
