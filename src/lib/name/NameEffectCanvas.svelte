<script>
  import { onDestroy, onMount } from 'svelte';
  import { registerNameAnimation } from './nameAnimationClock.js';
  import { shouldAnimateNameFrame, createNameCanvasRenderer } from './nameRenderer.js';
  import { getNameRendererDefinition, hasComposableNameInput, resolveNameRendererKey } from './nameCatalog.js';
  import { loadCodeOwnedNameRenderers } from './nameComposableRenderer.js';
  import { requestNameFontLoad } from './nameFonts.js';

  export let text = '';
  export let rendererKey = '';
  export let loadout = null;
  export let fontKey = '';
  export let materialKey = '';
  export let motionKey = '';
  export let todayColor = '#8B7CF6';
  export let recentColors = [];
  export let context = 'profile';
  export let compact = false;
  export let mode = 'animated';
  export let size = '';
  export let semanticTag = 'span';
  export let semanticClass = '';
  export let titleId = '';
  export let href = '';
  export let title = '';
  export let semanticOnClick = null;

  const SEMANTIC_TAGS = new Set(['span', 'strong', 'h1', 'h2', 'h3', 'a']);
  const SEMANTIC_CLASSES = new Set([
    '',
    'identity-card__name',
    'shop-name',
    'shop-item-name',
    'profile-name',
    'profile-username-large',
    'discovery-card__name',
    'lb-username',
    'studio-player-name',
    'home-leaderboard__username'
  ]);
  const RENDER_MODES = new Set(['animated', 'paused', 'static', 'static-signature', 'reduced-motion']);

  let host;
  let semantic;
  let canvas;
  let renderer;
  let mounted = false;
  let visible = true;
  let reducedMotion = false;
  let canvasReady = false;
  let lastDrawTime = 0;
  let stopAnimation = null;
  let intersectionObserver;
  let resizeObserver;
  let mediaQuery;
  let removeMediaListener;
  let removeFontListener;
  let composableLoadPromise;
  let requestedFontLoadKey = '';

  function loadoutValue(key, namespacedKey) {
    const input = /** @type {Record<string, any>} */ (loadout && typeof loadout === 'object' ? loadout : {});
    return input[key] ?? input[namespacedKey] ?? '';
  }

  $: explicitFontKey = typeof fontKey === 'string' && fontKey.trim()
    ? fontKey
    : loadoutValue('fontKey', 'name_font');
  $: explicitMaterialKey = typeof materialKey === 'string' && materialKey.trim()
    ? materialKey
    : loadoutValue('materialKey', 'name_material');
  $: explicitMotionKey = typeof motionKey === 'string' && motionKey.trim()
    ? motionKey
    : loadoutValue('motionKey', 'name_motion');
  $: hasComposableKeys = hasComposableNameInput({
    fontKey: explicitFontKey,
    materialKey: explicitMaterialKey,
    motionKey: explicitMotionKey
  });
  $: safeRendererKey = hasComposableKeys ? 'plain' : resolveNameRendererKey(rendererKey || 'plain');
  $: activeFontKey = hasComposableKeys
    ? explicitFontKey || 'soft-grotesk'
    : getNameRendererDefinition(safeRendererKey).font;
  $: fontLoadKey = `${activeFontKey}:${text}`;
  $: safeSemanticTag = SEMANTIC_TAGS.has(semanticTag) ? semanticTag : 'span';
  $: safeSemanticClass = SEMANTIC_CLASSES.has(semanticClass) ? semanticClass : '';
  $: safeMode = RENDER_MODES.has(mode) ? mode : 'animated';
  $: effectiveMode = reducedMotion ? 'reduced-motion' : safeMode;
  $: rendererOptions = {
    text,
    rendererKey: safeRendererKey,
    loadout: hasComposableKeys ? {
      fontKey: explicitFontKey,
      materialKey: explicitMaterialKey,
      motionKey: explicitMotionKey
    } : null,
    fontKey: hasComposableKeys ? explicitFontKey : '',
    materialKey: hasComposableKeys ? explicitMaterialKey : '',
    motionKey: hasComposableKeys ? explicitMotionKey : '',
    todayColor,
    recentColors,
    context,
    compact,
    size,
    mode: effectiveMode,
    reducedMotion
  };
  $: if (mounted && renderer) {
    renderer.setOptions(rendererOptions);
    renderer.draw(lastDrawTime);
    syncAnimationLoop();
  }
  function requestFontLoad() {
    if (!renderer || fontLoadKey === requestedFontLoadKey) return;
    requestedFontLoadKey = fontLoadKey;
    requestNameFontLoad(activeFontKey, 24, text).then(() => {
      renderer?.draw(lastDrawTime);
    });
  }

  $: if (mounted && renderer) requestFontLoad();

  function requestComposableRenderers() {
    if (!hasComposableKeys || composableLoadPromise) return;
    composableLoadPromise = loadCodeOwnedNameRenderers()
      .then(() => renderer?.draw(lastDrawTime))
      .catch(() => renderer?.draw(lastDrawTime));
  }

  $: if (mounted && renderer) requestComposableRenderers();

  function isAnimated() {
    return shouldAnimateNameFrame({ visible, mode: effectiveMode, reducedMotion });
  }

  function syncAnimationLoop() {
    if (!renderer) return;
    if (stopAnimation) {
      stopAnimation();
      stopAnimation = null;
    }
    renderer.draw(lastDrawTime);
    if (isAnimated()) {
      stopAnimation = registerNameAnimation(time => {
        if (!visible || !renderer) return;
        lastDrawTime = time;
        renderer.draw(time);
      });
    }
  }

  function updateVisibility(nextVisible) {
    visible = nextVisible;
    syncAnimationLoop();
  }

  function updateReducedMotion(nextValue) {
    reducedMotion = Boolean(nextValue);
    syncAnimationLoop();
  }

  function getSemanticFontSize() {
    if (!semantic || typeof globalThis.getComputedStyle !== 'function') return 0;
    const value = Number.parseFloat(globalThis.getComputedStyle(semantic).fontSize);
    return Number.isFinite(value) && value > 0 ? value : 0;
  }

  function isIntrinsicName() {
    if (!host || !semantic) return false;
    const hostRect = host.getBoundingClientRect?.() || {};
    const semanticRect = semantic.getBoundingClientRect?.() || {};
    const parentRect = host.parentElement?.getBoundingClientRect?.() || {};
    return Math.abs((hostRect.width || 0) - (semanticRect.width || 0)) < 1
      && (!parentRect.width || (hostRect.width || 0) < parentRect.width - 1);
  }

  function syncSemanticMetrics() {
    if (!renderer) return;
    renderer.setOptions({ fontSize: getSemanticFontSize(), inline: isIntrinsicName() });
  }

  function observeResize() {
    if (!renderer || !host) return;
    const rect = host.getBoundingClientRect?.() || {};
    syncSemanticMetrics();
    renderer.resize({ width: rect.width, height: rect.height });
    renderer.draw(lastDrawTime);
  }

  onMount(() => {
    mounted = true;
    renderer = createNameCanvasRenderer(canvas, rendererOptions);
    canvasReady = renderer.supported;
    observeResize();
    requestedFontLoadKey = '';

    if (typeof IntersectionObserver === 'function') {
      intersectionObserver = new IntersectionObserver(entries => {
        const entry = entries[0];
        if (entry) updateVisibility(entry.isIntersecting && entry.intersectionRatio > 0);
      }, { threshold: 0.01 });
      intersectionObserver.observe(host);
    }

    if (typeof ResizeObserver === 'function') {
      resizeObserver = new ResizeObserver(entries => {
        const entry = entries[0];
        if (!entry || !renderer) return;
        syncSemanticMetrics();
        renderer.resize({ width: entry.contentRect.width, height: entry.contentRect.height });
        renderer.draw(lastDrawTime);
      });
      resizeObserver.observe(host);
    } else {
      observeResize();
    }

    if (typeof globalThis.matchMedia === 'function') {
      mediaQuery = globalThis.matchMedia('(prefers-reduced-motion: reduce)');
      updateReducedMotion(mediaQuery.matches);
      const listener = event => updateReducedMotion(event.matches);
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', listener);
        removeMediaListener = () => mediaQuery.removeEventListener('change', listener);
      } else if (mediaQuery.addListener) {
        mediaQuery.addListener(listener);
        removeMediaListener = () => mediaQuery.removeListener(listener);
      }
    }

    if (typeof document !== 'undefined' && document.fonts?.addEventListener) {
      const fontListener = () => {
        observeResize();
        renderer?.draw(lastDrawTime);
      };
      document.fonts.addEventListener('loadingdone', fontListener);
      removeFontListener = () => document.fonts.removeEventListener('loadingdone', fontListener);
    }

    syncAnimationLoop();

    return () => {
      if (stopAnimation) stopAnimation();
      stopAnimation = null;
      intersectionObserver?.disconnect();
      resizeObserver?.disconnect();
      removeMediaListener?.();
      removeFontListener?.();
      renderer?.destroy();
      renderer = null;
      mounted = false;
    };
  });

  onDestroy(() => {
    if (stopAnimation) stopAnimation();
    stopAnimation = null;
  });
</script>

<div bind:this={host} class={'name-effect-canvas name-effect-canvas--' + (canvasReady ? 'ready' : 'fallback')} data-name-renderer={safeRendererKey}>
  {#if safeSemanticTag === 'a'}
    <a bind:this={semantic} id={titleId || undefined} class={'name-effect-canvas__semantic ' + safeSemanticClass} href={href || undefined} title={title || undefined} on:click={semanticOnClick}>{text}</a>
  {:else}
    <svelte:element this={safeSemanticTag} bind:this={semantic} id={titleId || undefined} class={'name-effect-canvas__semantic ' + safeSemanticClass} title={title || undefined}>{text}</svelte:element>
  {/if}
  <canvas bind:this={canvas} class="name-effect-canvas__visual" aria-hidden="true"></canvas>
</div>

<style>
  .name-effect-canvas { position: relative; display: inline-block; min-width: 0; max-width: 100%; vertical-align: middle; }
  .name-effect-canvas__semantic { position: relative; z-index: 1; display: inline-block; max-width: 100%; }
  /* IdentityCard styles its fallback heading in the parent component. The
     semantic node lives here when the Canvas renderer is active, so mirror
     that contract locally or the visual Canvas would measure a tiny default
     heading and render the name at the wrong scale. */
  .name-effect-canvas__semantic.identity-card__name { max-width: 100%; margin: 0; color: rgba(248, 250, 255, 0.98); font: 700 clamp(1.85rem, 3.8vw, 2.55rem) / 0.98 var(--font-display-stack, var(--font-display)); letter-spacing: -0.055em; overflow-wrap: anywhere; }
  .name-effect-canvas__visual { position: absolute; z-index: 0; inset: 0; display: block; width: 100%; height: 100%; max-width: 100%; pointer-events: none; }
  .name-effect-canvas--ready .name-effect-canvas__semantic { color: transparent !important; text-shadow: none !important; -webkit-text-fill-color: transparent !important; }
  .name-effect-canvas--fallback .name-effect-canvas__visual { display: none; }
  .name-effect-canvas--fallback .name-effect-canvas__semantic { color: inherit; -webkit-text-fill-color: currentColor; }
  @media (prefers-reduced-motion: reduce) {
    .name-effect-canvas__visual { animation: none; }
  }
</style>
