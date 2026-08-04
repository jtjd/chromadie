<script>
  import { onMount } from 'svelte';
  import { getAtmosphereDefinition } from './atmospheres.js';

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
      video: '/atmospheres/night-pollen/night-pollen-loop-v1.webm',
      fallback: '/atmospheres/night-pollen/night-pollen-loop-v1.mp4',
      poster: '/atmospheres/night-pollen/night-pollen-loop-v1-poster.png',
      className: 'pollen'
    }),
    'paper-shadow': Object.freeze({
      video: '/atmospheres/paper-shadow/paper-shadow-loop-v1.webm',
      fallback: '/atmospheres/paper-shadow/paper-shadow-loop-v1.mp4',
      poster: '/atmospheres/paper-shadow/paper-shadow-loop-v1-poster.png',
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
  let visible = true;
  let mediaQuery;
  let mounted = false;

  $: definition = getAtmosphereDefinition(atmosphereKey);
  $: media = definition ? MEDIA[definition.key] : null;
  $: compact = mode === 'card' || mode === 'compact';
  $: motionActive = Boolean(active && animated && visible && !reducedMotion && !compact && media);
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

  function updateVisibility() {
    visible = document.visibilityState === 'visible';
  }

  onMount(() => {
    mounted = true;
    mediaQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    updateReducedMotion();
    mediaQuery?.addEventListener?.('change', updateReducedMotion);
    document.addEventListener('visibilitychange', updateVisibility);
    return () => {
      mediaQuery?.removeEventListener?.('change', updateReducedMotion);
      document.removeEventListener('visibilitychange', updateVisibility);
      mounted = false;
    };
  });
</script>

{#if mounted && definition && media}
  <div class={classes} style={style} aria-hidden="true" data-atmosphere={definition.key}>
    {#if motionActive}
      <video class={`profile-atmosphere__video profile-atmosphere__video--${media.className}`} autoplay muted loop playsinline preload="metadata" poster={media.poster}>
        <source src={media.video} type="video/webm" />
        <source src={media.fallback} type="video/mp4" />
      </video>
    {:else}
      <img class={`profile-atmosphere__video profile-atmosphere__video--${media.className} profile-atmosphere__video--poster`} src={media.poster} alt="" />
    {/if}
  </div>
{/if}

<style>
  /* Atmospheres are authored media plates. They add texture without tinting or
   * dimming the user's uploaded background, and never intercept input. */
  .profile-atmosphere { position: absolute; inset: 0; z-index: 0; overflow: hidden; pointer-events: none; isolation: isolate; background: transparent; }
  .profile-atmosphere--compact { opacity: 1; }
  .profile-atmosphere__video { position: absolute; inset: -6%; width: 112%; height: 112%; object-fit: cover; mix-blend-mode: screen; }
  .profile-atmosphere__video--rain { opacity: .5; filter: drop-shadow(0 0 5px var(--atmosphere-color-2)); }
  .profile-atmosphere__video--droplets { opacity: .34; filter: sepia(.2) saturate(1.15) drop-shadow(0 0 7px var(--atmosphere-color-1)); }
  .profile-atmosphere__video--dust { opacity: .24; filter: grayscale(1) contrast(1.12) brightness(1.08) drop-shadow(0 0 6px var(--atmosphere-color-1)); }
  .profile-atmosphere__video--ink { opacity: .17; filter: saturate(1.2) drop-shadow(0 0 8px var(--atmosphere-color-1)); }
  .profile-atmosphere__video--snow { opacity: .23; filter: contrast(1.12) brightness(1.08) drop-shadow(0 0 6px var(--atmosphere-color-2)); }
  .profile-atmosphere__video--silk { opacity: .22; filter: contrast(1.14) brightness(1.05) drop-shadow(0 0 7px var(--atmosphere-color-1)); }
  .profile-atmosphere__video--caustics { opacity: .14; filter: contrast(1.04) brightness(.92) drop-shadow(0 0 5px var(--atmosphere-color-2)); }
  .profile-atmosphere__video--cinder { opacity: .24; filter: sepia(.16) saturate(1.1) brightness(1.08) drop-shadow(0 0 7px var(--atmosphere-color-1)); }
  .profile-atmosphere__video--pollen { opacity: .25; filter: contrast(1.16) brightness(1.1) drop-shadow(0 0 6px var(--atmosphere-color-4)); }
  .profile-atmosphere__video--paper { opacity: .16; filter: contrast(1.1) brightness(1.08) drop-shadow(0 0 5px var(--atmosphere-color-1)); }
  .profile-atmosphere__video--smoke { opacity: .16; filter: contrast(1.08) brightness(1.05) drop-shadow(0 0 8px var(--atmosphere-color-2)); }
  .profile-atmosphere__video--lumen { opacity: .13; filter: contrast(1.12) brightness(1.1) drop-shadow(0 0 9px var(--atmosphere-color-1)); }
  .profile-atmosphere__video--poster { opacity: .14; }

  @media (prefers-reduced-motion: reduce) {
    .profile-atmosphere__video { animation: none !important; }
  }
</style>
