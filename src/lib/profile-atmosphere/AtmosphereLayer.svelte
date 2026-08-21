<script>
  import { onMount } from 'svelte';
  import { getAtmosphereDefinition } from './atmospheres.js';
  import PrismDustLayer from './PrismDustLayer.svelte';

  export let atmosphereKey = '';
  export let todayColor = '#8B7CF6';
  export let recentColors = [];
  export let mode = 'profile';
  export let active = true;
  export let animated = true;
  export let className = '';

  const FALLBACK_COLORS = ['#8B7CF6', '#8DDCFF', '#B7FD4D', '#F7B7E2'];
  const MEDIA = Object.freeze({
    'rain-window': Object.freeze({
      video: '/atmospheres/rain-window/rain-window-loop-v2.webm',
      fallback: '/atmospheres/rain-window/rain-window-loop-v2.mp4',
      poster: '/atmospheres/rain-window/rain-window-loop-v2-poster.png',
      className: 'rain'
    }),
    'droplets-glass': Object.freeze({
      video: '/atmospheres/droplets-on-glass/droplets-on-glass-loop-v3.webm',
      fallback: '/atmospheres/droplets-on-glass/droplets-on-glass-loop-v3.mp4',
      poster: '/atmospheres/droplets-on-glass/droplets-on-glass-loop-v3-poster.png',
      className: 'droplets'
    }),
    'dust-light': Object.freeze({
      video: '/atmospheres/dust-light/dust-light-loop-v1.webm',
      fallback: '/atmospheres/dust-light/dust-light-loop-v1.mp4',
      poster: '/atmospheres/dust-light/dust-light-loop-v1-poster.png',
      className: 'dust'
    }),
    'ink-bloom': Object.freeze({
      video: '/atmospheres/ink-bloom/ink-bloom-loop-v1.webm',
      fallback: '/atmospheres/ink-bloom/ink-bloom-loop-v1.mp4',
      poster: '/atmospheres/ink-bloom/ink-bloom-loop-v1-poster.png',
      className: 'ink'
    }),
    snowfall: Object.freeze({
      video: '/atmospheres/snowfall/snowfall-loop-v1.webm',
      fallback: '/atmospheres/snowfall/snowfall-loop-v1.mp4',
      poster: '/atmospheres/snowfall/snowfall-loop-v1-poster.png',
      className: 'snow'
    }),
    'silk-folds': Object.freeze({
      video: '/atmospheres/silk-folds/silk-folds-loop-v1.webm',
      fallback: '/atmospheres/silk-folds/silk-folds-loop-v1.mp4',
      poster: '/atmospheres/silk-folds/silk-folds-loop-v1-poster.png',
      className: 'silk'
    }),
    'glass-caustics': Object.freeze({
      video: '/atmospheres/glass-caustics/glass-caustics-loop-v1.webm',
      fallback: '/atmospheres/glass-caustics/glass-caustics-loop-v1.mp4',
      poster: '/atmospheres/glass-caustics/glass-caustics-loop-v1-poster.png',
      className: 'caustics'
    }),
    'cinder-drift': Object.freeze({
      video: '/atmospheres/cinder-drift/cinder-drift-loop-v1.webm',
      fallback: '/atmospheres/cinder-drift/cinder-drift-loop-v1.mp4',
      poster: '/atmospheres/cinder-drift/cinder-drift-loop-v1-poster.png',
      className: 'cinder'
    }),
    'night-pollen': Object.freeze({
      video: '/atmospheres/night-pollen/night-pollen-loop-v2.webm',
      fallback: '/atmospheres/night-pollen/night-pollen-loop-v2.mp4',
      poster: '/atmospheres/night-pollen/night-pollen-loop-v2-poster.png',
      className: 'pollen'
    }),
    'paper-shadow': Object.freeze({
      video: '/atmospheres/paper-shadow/paper-shadow-loop-v2.webm',
      fallback: '/atmospheres/paper-shadow/paper-shadow-loop-v2.mp4',
      poster: '/atmospheres/paper-shadow/paper-shadow-loop-v2-poster.png',
      className: 'paper'
    }),
    'smoke-spiral': Object.freeze({
      video: '/atmospheres/smoke-spiral/smoke-spiral-loop-v1.webm',
      fallback: '/atmospheres/smoke-spiral/smoke-spiral-loop-v1.mp4',
      poster: '/atmospheres/smoke-spiral/smoke-spiral-loop-v1-poster.png',
      className: 'smoke'
    }),
    'lumen-flare': Object.freeze({
      video: '/atmospheres/lumen-flare/lumen-flare-loop-v1.webm',
      fallback: '/atmospheres/lumen-flare/lumen-flare-loop-v1.mp4',
      poster: '/atmospheres/lumen-flare/lumen-flare-loop-v1-poster.png',
      className: 'lumen'
    })
  });

  let reducedMotion = false;
  let constrainedConnection = false;
  let visible = true;
  let inViewport = true;
  let mediaQuery;
  let host;
  let videoElement;
  let intersectionObserver;
  let resizeObserver;
  let recovery;
  let renderedDefinitionKey = '';
  let mounted = false;
  let posterFallback = false;
  let resumeFrame = 0;

  $: definition = getAtmosphereDefinition(atmosphereKey);
  $: media = definition ? MEDIA[definition.key] : null;
  $: isProcedural = definition?.key === 'prism-dust';
  $: compact = mode === 'card' || mode === 'compact';
  $: if ((definition?.key || '') !== renderedDefinitionKey) {
    // This value is consumed on the next reactive pass to detect a scene
    // change; ESLint cannot model Svelte's reactive scheduling here.
    // eslint-disable-next-line no-useless-assignment
    renderedDefinitionKey = definition?.key || '';
    posterFallback = false;
    recovery?.ready();
  }
  $: motionActive = Boolean(active && animated && visible && inViewport && !reducedMotion && !constrainedConnection && !compact && (media || isProcedural) && !posterFallback);
  $: colors = [todayColor, ...(Array.isArray(recentColors) ? recentColors : []), ...FALLBACK_COLORS]
    .map(color => /^#[0-9a-f]{6}$/i.test(String(color || '')) ? String(color).toUpperCase() : null)
    .filter(Boolean)
    .filter((color, index, list) => list.indexOf(color) === index)
    .slice(0, 4);
  $: style = [
    `--atmosphere-color-1:${colors[0] || FALLBACK_COLORS[0]}`,
    `--atmosphere-color-2:${colors[1] || FALLBACK_COLORS[1]}`,
    `--atmosphere-color-3:${colors[2] || FALLBACK_COLORS[2]}`,
    `--atmosphere-color-4:${colors[3] || FALLBACK_COLORS[3]}`
  ].join(';');
  $: classes = [
    'profile-atmosphere', className,
    definition ? `profile-atmosphere--${definition.key}` : 'profile-atmosphere--none',
    compact ? 'profile-atmosphere--compact' : '',
    motionActive ? 'profile-atmosphere--animated' : 'profile-atmosphere--static'
  ].filter(Boolean).join(' ');

  function updateReducedMotion(event) {
    reducedMotion = Boolean(event?.matches ?? mediaQuery?.matches);
  }

  function getNetworkConnection() {
    const browserNavigator = /** @type {any} */ (navigator);
    return browserNavigator.connection || browserNavigator.mozConnection || browserNavigator.webkitConnection || null;
  }

  function updateConnection() {
    const network = getNetworkConnection();
    constrainedConnection = Boolean(network?.saveData || ['slow-2g', '2g'].includes(network?.effectiveType));
  }

  function updateVisibility() {
    visible = document.visibilityState === 'visible';
    if (visible && inViewport) recoverVideo();
  }

  function recoverVideo() {
    if (!mounted || !media || !active || !animated || compact || reducedMotion || constrainedConnection || !visible || !inViewport) return;
    if (recovery) {
      recovery.recover();
      return;
    }
    // A hidden tab can leave the recovery controller holding the poster state
    // while its video node is gone. Clear that presentation state before the
    // next render creates a fresh video element.
    posterFallback = false;
    if (resumeFrame) window.cancelAnimationFrame(resumeFrame);
    resumeFrame = window.requestAnimationFrame(() => {
      resumeFrame = 0;
      videoElement?.play?.().catch?.(() => {});
    });
  }

  function updateHostVisibility() {
    if (!host) return;
    const rect = host.getBoundingClientRect();
    const nextInViewport = rect.width > 0 && rect.height > 0;
    inViewport = nextInViewport;
    if (nextInViewport) recoverVideo();
    else if (videoElement) videoElement.pause?.();
  }

  function handleVideoReady() {
    recovery?.ready();
  }

  function handleVideoStall(event) {
    if (!motionActive) return;
    const video = event?.currentTarget || videoElement;
    // `waiting` is expected while a newly selected local plate buffers. Keep
    // the video node mounted during that first wait; replacing it with the
    // poster immediately can strand the renderer in a static state.
    if (['waiting', 'stalled'].includes(event?.type) && video?.currentTime === 0 && video?.readyState < 3) {
      recoverVideo();
      return;
    }
    recovery?.stalled();
  }

  // Hidden Customize tabs keep the renderer mounted but can pause both the
  // video element and its observers. Re-entering the viewport must explicitly
  // resume the decorative media after Svelte has restored the video node.
  $: if (mounted && motionActive && videoElement) recoverVideo();

  onMount(() => {
    mounted = true;
    mediaQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    updateReducedMotion();
    mediaQuery?.addEventListener?.('change', updateReducedMotion);
    updateConnection();
    const network = getNetworkConnection();
    network?.addEventListener?.('change', updateConnection);
    document.addEventListener('visibilitychange', updateVisibility);
    window.addEventListener('pageshow', recoverVideo);
    import('./atmosphereRecovery.js').then(({ createAtmosphereRecovery }) => {
      if (!mounted) return;
      recovery = createAtmosphereRecovery({
        canRecover: () => Boolean(mounted && media && active && animated && !compact && !reducedMotion && !constrainedConnection && visible && inViewport),
        getVideo: () => videoElement,
        setPosterFallback: value => { posterFallback = value; }
      });
      if (media && active && animated && !reducedMotion && !constrainedConnection && !compact) recoverVideo();
    }).catch(() => {
      // Atmosphere is decorative; a failed recovery helper must not break the
      // profile shell or the rest of the live preview.
      recovery = null;
    });
    if ('IntersectionObserver' in window && host) {
      intersectionObserver = new IntersectionObserver(entries => {
        inViewport = entries.some(entry => entry.isIntersecting && entry.intersectionRatio > 0);
        if (inViewport) recoverVideo();
      }, { rootMargin: '160px' });
      intersectionObserver.observe(host);
    }
    if ('ResizeObserver' in window && host) {
      resizeObserver = new ResizeObserver(() => {
        updateHostVisibility();
      });
      resizeObserver.observe(host);
    }
    updateHostVisibility();
    return () => {
      mounted = false;
      recovery?.destroy();
      recovery = null;
      if (resumeFrame) window.cancelAnimationFrame(resumeFrame);
      resumeFrame = 0;
      intersectionObserver?.disconnect();
      resizeObserver?.disconnect();
      mediaQuery?.removeEventListener?.('change', updateReducedMotion);
      network?.removeEventListener?.('change', updateConnection);
      document.removeEventListener('visibilitychange', updateVisibility);
      window.removeEventListener('pageshow', recoverVideo);
    };
  });
</script>

{#if definition && (media || isProcedural)}
  {#if isProcedural}
    <PrismDustLayer {todayColor} {recentColors} {mode} {active} {animated} {className} />
  {:else}
  <div bind:this={host} class={classes} style={style} aria-hidden="true" data-atmosphere={definition.key} data-atmosphere-state={motionActive ? 'animated' : 'poster'}>
    {#key definition.key}
      {#if motionActive}
        <video bind:this={videoElement} class={`profile-atmosphere__video profile-atmosphere__video--${media.className}`} autoplay muted loop playsinline poster={media.poster} on:canplay={handleVideoReady} on:playing={handleVideoReady} on:stalled={handleVideoStall} on:waiting={handleVideoStall} on:error={handleVideoStall}>
          <source src={media.video} type="video/webm" />
          <source src={media.fallback} type="video/mp4" />
        </video>
      {:else}
        <img class={`profile-atmosphere__video profile-atmosphere__video--${media.className} profile-atmosphere__video--poster`} src={media.poster} alt="" />
      {/if}
    {/key}
  </div>
  {/if}
{/if}

<style>
  /* Atmospheres are authored media plates. They add texture without tinting or
   * dimming the user's uploaded background, and never intercept input. */
  .profile-atmosphere { position: absolute; inset: 0; z-index: 0; overflow: hidden; pointer-events: none; isolation: auto; background: transparent; }
  .profile-atmosphere--compact { opacity: 1; }
  /* object-fit: cover already handles the crop. Keep the media plate inside
   * its environment bounds so a narrow Studio device cannot acquire a hidden
   * horizontal scroll region from decorative overscan. */
  .profile-atmosphere__video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; mix-blend-mode: screen; }
  .profile-atmosphere__video--rain { opacity: .5; filter: drop-shadow(0 0 5px var(--atmosphere-color-2)); }
  .profile-atmosphere__video--droplets { opacity: .34; filter: sepia(.2) saturate(1.15) drop-shadow(0 0 7px var(--atmosphere-color-1)); }
  .profile-atmosphere__video--dust { opacity: .24; filter: grayscale(1) contrast(1.12) brightness(1.08) drop-shadow(0 0 6px var(--atmosphere-color-1)); }
  .profile-atmosphere__video--ink { opacity: .17; filter: saturate(1.2) drop-shadow(0 0 8px var(--atmosphere-color-1)); }
  .profile-atmosphere__video--snow { opacity: .23; filter: contrast(1.12) brightness(1.08) drop-shadow(0 0 6px var(--atmosphere-color-2)); }
  .profile-atmosphere__video--silk { opacity: .22; filter: contrast(1.14) brightness(1.05) drop-shadow(0 0 7px var(--atmosphere-color-1)); }
  .profile-atmosphere__video--caustics { opacity: .14; filter: contrast(1.04) brightness(.92) drop-shadow(0 0 5px var(--atmosphere-color-2)); }
  .profile-atmosphere__video--cinder { opacity: .24; filter: sepia(.16) saturate(1.1) brightness(1.08) drop-shadow(0 0 7px var(--atmosphere-color-1)); }
  .profile-atmosphere__video--pollen { opacity: .28; filter: contrast(1.18) brightness(1.12) drop-shadow(0 0 6px var(--atmosphere-color-4)); }
  .profile-atmosphere__video--paper { opacity: .24; filter: saturate(1.12) contrast(1.12) brightness(1.04) drop-shadow(0 0 6px var(--atmosphere-color-1)); }
  .profile-atmosphere__video--smoke { opacity: .16; filter: contrast(1.08) brightness(1.05) drop-shadow(0 0 8px var(--atmosphere-color-2)); }
  .profile-atmosphere__video--lumen { opacity: .13; filter: contrast(1.12) brightness(1.1) drop-shadow(0 0 9px var(--atmosphere-color-1)); }
  .profile-atmosphere__video--poster { opacity: .14; }

  @media (prefers-reduced-motion: reduce) {
    .profile-atmosphere__video { animation: none !important; }
  }
</style>
