<script>
  import { afterUpdate, onMount } from 'svelte';
  import { AUTHORED_PROFILE_BORDER_KEYS, getProfileBorderDefinition, getProfileBorderKey } from './profileBorders.js';

  export let borderKey = '';
  export let className = '';
  export let compact = false;
  export let animated = true;
  export let surfaceStyle = '';

  let host;
  let visible = true;
  let reducedMotion = false;
  let mediaQuery;
  let observer;
  let documentVisible = true;
  let mounted = false;
  let AuthoredBorderLayers;
  let artworkPromise;

  $: definition = getProfileBorderDefinition(borderKey);
  $: resolvedKey = getProfileBorderKey(borderKey);
  $: shouldAnimate = Boolean(definition && animated && visible && documentVisible && !reducedMotion);
  $: authored = AUTHORED_PROFILE_BORDER_KEYS.includes(resolvedKey);
  $: hostClass = [
    'profile-border-effect',
    `profile-border-effect--${resolvedKey || 'none'}`,
    compact ? 'profile-border-effect--compact' : '',
    authored && AuthoredBorderLayers ? 'profile-border-effect--authored' : '',
    shouldAnimate ? '' : 'profile-border-effect--static',
    className
  ].filter(Boolean).join(' ');

  function updateReducedMotion(event) {
    reducedMotion = Boolean(event?.matches ?? mediaQuery?.matches);
  }

  // Illustration geometry is loaded only for profiles that actually equip it.
  // Celestial, Crystal and no-border profiles keep their existing small path.
  function loadArtwork() {
    if (!mounted || !authored || artworkPromise) return;
    artworkPromise = import('./AuthoredBorderLayers.svelte')
      .then(module => { if (mounted) AuthoredBorderLayers = module.default; })
      .catch(() => { /* Keep the static frame if the optional artwork fails. */ });
  }

  afterUpdate(loadArtwork);

  onMount(() => {
    mounted = true;
    loadArtwork();
    const updateVisibility = () => { documentVisible = !document.hidden; };
    updateVisibility();
    document.addEventListener('visibilitychange', updateVisibility);
    mediaQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    updateReducedMotion();
    mediaQuery?.addEventListener?.('change', updateReducedMotion);

    if ('IntersectionObserver' in window && host) {
      observer = new IntersectionObserver(entries => {
        visible = entries.some(entry => entry.isIntersecting);
      }, { rootMargin: '120px' });
      observer.observe(host);
    }

    return () => {
      mounted = false;
      document.removeEventListener('visibilitychange', updateVisibility);
      mediaQuery?.removeEventListener?.('change', updateReducedMotion);
      observer?.disconnect();
      observer = null;
    };
  });

</script>

<div bind:this={host} class={hostClass} style={surfaceStyle} data-profile-border={resolvedKey || 'none'} data-profile-surface="true">
  {#if authored && AuthoredBorderLayers}
    <svelte:component this={AuthoredBorderLayers} borderKey={resolvedKey} active={shouldAnimate} {compact} />
  {/if}
  <div class="profile-border-effect__content"><slot /></div>
</div>

<style>
  .profile-border-effect {
    --border-accent: #cdd2ff;
    --border-shadow: rgba(205, 210, 255, 0.22);
    /* Layout wrappers use this to give the slotted surface its full authored
       width while leaving room for the renderer's own frame. */
    --profile-border-frame-inset: calc(var(--profile-border-width, 1px) + var(--profile-border-width, 1px) + 2px);
    --profile-border-content-radius: max(0px, calc(var(--profile-border-radius, var(--radius-lg)) - var(--profile-border-frame-inset)));
    position: relative;
    min-width: 0;
    max-width: 100%;
    padding: 1px;
    border: 2px solid var(--border-accent);
    border-radius: var(--profile-border-radius, var(--radius-lg));
    box-sizing: border-box;
    overflow: visible;
    isolation: isolate;
  }

  /* An empty slot is a real no-effect state. Keep the base surface's normal
     border behavior, but never let the renderer's default accent leak into it
     when no profile border cosmetic is equipped. */
  .profile-border-effect--none {
    --border-accent: transparent;
    --border-shadow: transparent;
    --profile-border-frame-inset: 0px;
    --profile-border-content-radius: var(--profile-border-radius, var(--radius-lg));
  }

  .profile-border-effect,
  .profile-border-effect--surface {
    border-width: var(--profile-border-width, 1px);
    border-color: color-mix(in srgb, var(--profile-border-color, #ffffff) calc(var(--profile-border-opacity, .11) * 100%), var(--border-accent));
    background: var(--profile-surface-fill, color-mix(in srgb, var(--profile-surface, #090b0f) calc(var(--profile-surface-opacity, .64) * 100%), transparent));
    box-shadow: 0 2rem 5rem rgba(0, 0, 0, .34), inset 0 1px 0 rgba(255, 255, 255, .045);
    backdrop-filter: blur(var(--profile-surface-blur, 20px));
    -webkit-backdrop-filter: blur(var(--profile-surface-blur, 20px));
  }

  @supports ((-webkit-backdrop-filter: blur(0)) or (backdrop-filter: blur(0))) {
    .profile-border-effect,
    .profile-border-effect--surface {
      -webkit-backdrop-filter: blur(var(--profile-surface-blur, 20px));
      backdrop-filter: blur(var(--profile-surface-blur, 20px));
    }
  }

  .profile-border-effect--content {
    background: transparent;
    box-shadow: none;
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }

  /* Keep the unprefixed reset inside the same feature query as the base
     surface rule. Some production CSS transforms otherwise retain the base
     blur while dropping this unprefixed declaration. */
  @supports (backdrop-filter: blur(0)) {
    .profile-border-effect--content {
      backdrop-filter: none;
    }
  }

  .profile-border-effect__content {
    min-width: 0;
    max-width: 100%;
    border-radius: inherit;
    position: relative;
    z-index: 1;
  }

  .profile-border-effect__content { overflow: visible; }

  .profile-border-effect:not(.profile-border-effect--none):not(.profile-border-effect--authored)::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: 0;
    border-radius: inherit;
    box-shadow: inset 0 0 1.2rem var(--border-shadow);
    opacity: 0.82;
    pointer-events: none;
  }

  .profile-border-effect--none.profile-border-effect--content {
    padding: 0;
    border: 0;
    border-color: transparent;
    box-shadow: none;
    overflow: visible;
  }

  .profile-border-effect--content:not(.profile-border-effect--none) {
    --profile-border-frame-inset: calc(var(--profile-border-width, 1px) + var(--profile-border-width, 1px) + 4px);
    padding: 2px;
  }

  .profile-border-effect--celestial {
    --border-accent: #a1c4fd;
    --border-shadow: rgba(170, 182, 255, 0.36);
    box-shadow: 0 0 35px rgba(161, 196, 253, 0.6), inset 0 0 25px rgba(255, 255, 255, 0.3);
  }

  .profile-border-effect--crystal {
    --border-accent: #bfeaff;
    --border-shadow: rgba(171, 222, 255, 0.32);
    box-shadow: 0 0 15px var(--border-shadow), inset 0 0 10px rgba(185, 242, 255, 0.3);
  }

  .profile-border-effect--celestial:not(.profile-border-effect--static) {
    animation: profile-border-celestial 4s ease-in-out infinite;
  }

  .profile-border-effect--crystal:not(.profile-border-effect--static) {
    animation: profile-border-crystal 3.8s ease-in-out infinite;
  }

  .profile-border-effect--authored {
    border-color: transparent;
  }

  .profile-border-effect--compact {
    --profile-border-frame-inset: calc(var(--profile-border-width, 1px) + var(--profile-border-width, 1px) + 2px);
    padding: 1px;
  }

  .profile-border-effect--static {
    animation: none;
  }

  @keyframes profile-border-celestial {
    0%, 100% { box-shadow: 0 0 35px rgba(161, 196, 253, 0.5), inset 0 0 20px rgba(255, 255, 255, 0.2); }
    50% { box-shadow: 0 0 50px rgba(194, 233, 251, 0.9), inset 0 0 35px rgba(255, 255, 255, 0.5); }
  }

  @keyframes profile-border-crystal {
    0%, 100% {
      border-color: #bfeaff;
      box-shadow: 0 0 15px #b9f2ff, inset 0 0 10px rgba(185, 242, 255, 0.3);
    }
    50% {
      border-color: #ffffff;
      box-shadow: 0 0 25px #ffffff, inset 0 0 15px rgba(255, 255, 255, 0.5);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .profile-border-effect,
    .profile-border-effect::before {
      animation: none !important;
    }
  }
</style>
