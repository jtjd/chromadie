<script>
  import { onDestroy, onMount, tick } from 'svelte';
  import { formatHomepageRelativeTime } from './homepageDirectory.js';
  import { normalizeHexColor } from './utils.js';

  export let events = [];
  export let loading = false;
  export let loadError = '';

  let firstGroup;
  let viewport;
  let distance = 0;
  let duration = 42;
  let resizeObserver;
  let fontsReady;
  let fontsLoadingDone;
  let measureFrame;

  function measureTicker() {
    if (!firstGroup || !viewport) return;
    const nextDistance = Math.ceil(firstGroup.getBoundingClientRect().width);
    if (!nextDistance) return;
    distance = nextDistance;
    duration = Math.max(26, Math.round(nextDistance / 38));
  }

  async function scheduleMeasure() {
    await tick();
    if (typeof window === 'undefined') return;
    if (resizeObserver && firstGroup) resizeObserver.observe(firstGroup);
    window.cancelAnimationFrame(measureFrame);
    measureFrame = window.requestAnimationFrame(measureTicker);
  }

  $: if (events) void scheduleMeasure();

  onMount(() => {
    void scheduleMeasure();
    resizeObserver = typeof ResizeObserver === 'function'
      ? new ResizeObserver(() => void scheduleMeasure())
      : null;
    if (resizeObserver && viewport) resizeObserver.observe(viewport);
    if (resizeObserver && firstGroup) resizeObserver.observe(firstGroup);
    if (document.fonts) {
      fontsReady = document.fonts.ready.then(() => measureTicker());
      fontsLoadingDone = () => measureTicker();
      document.fonts.addEventListener?.('loadingdone', fontsLoadingDone);
    }
    window.addEventListener('resize', measureTicker, { passive: true });
  });

  onDestroy(() => {
    window.cancelAnimationFrame(measureFrame);
    resizeObserver?.disconnect();
    document.fonts?.removeEventListener?.('loadingdone', fontsLoadingDone);
    window.removeEventListener('resize', measureTicker);
    void fontsReady;
  });

  function eventLabel(event) {
    const parts = [`@${event.username}`];
    if (event.identity) parts.push(event.identity);
    parts.push(event.hex);
    if (event.rarity) parts.push(event.rarity);
    if (event.score) parts.push(`${Number(event.score).toLocaleString()} EP`);
    const age = formatHomepageRelativeTime(event.occurredAt);
    if (age) parts.push(age);
    return parts.join(' · ');
  }

  function compactEventLabel(event) {
    return `@${event.username} rolled ${normalizeHexColor(event.hex, '#8DDCFF')}`;
  }
</script>

<section class="homepage-ticker" aria-label="Recent public rolls">
  <div class="homepage-ticker__viewport" bind:this={viewport}>
    {#if loading}
      <p class="homepage-ticker__empty">Loading recent public rolls.</p>
    {:else if events.length}
      <div
        class="homepage-ticker__track"
        style={`--ticker-distance: ${distance}px; --ticker-duration: ${duration}s;`}
      >
        <div class="homepage-ticker__group" bind:this={firstGroup}>
          <span class="homepage-ticker__item homepage-ticker__item--label"><strong>Recent public rolls</strong></span>
          {#each events as event (event.id)}
            <a class="homepage-ticker__item" href={event.profilePath} aria-label={`Open ${event.displayName || event.username}'s public profile. ${eventLabel(event)}`}>
              <span>{compactEventLabel(event)}</span>
              <i class="homepage-ticker__color" style={'--ticker-color: ' + normalizeHexColor(event.hex, '#8DDCFF') + ';'} aria-hidden="true"></i>
            </a>
          {/each}
        </div>
        <div class="homepage-ticker__group" aria-hidden="true">
          <span class="homepage-ticker__item homepage-ticker__item--label"><strong>Recent public rolls</strong></span>
          {#each events as event (event.id + '-repeat')}
            <span class="homepage-ticker__item homepage-ticker__item--repeat">
              <span>{compactEventLabel(event)}</span>
              <i class="homepage-ticker__color" style={'--ticker-color: ' + normalizeHexColor(event.hex, '#8DDCFF') + ';'}></i>
            </span>
          {/each}
        </div>
      </div>
    {:else}
      <p class="homepage-ticker__empty">{loadError || 'Waiting for today’s public rolls.'}</p>
    {/if}
  </div>
</section>

<style>
  .homepage-ticker {
    display: block;
    align-items: center;
    width: 100vw;
    min-height: 0;
    margin: 0 0 0 calc(50% - 50vw);
    border-top: 1px solid rgba(241, 243, 237, 0.12);
    border-bottom: 1px solid rgba(241, 243, 237, 0.12);
    color: rgba(241, 243, 237, 0.62);
    background: rgba(8, 9, 8, 0.78);
    font-family: var(--home-font, 'Instrument Sans', ui-sans-serif, sans-serif);
  }

  .homepage-ticker__viewport {
    min-width: 0;
    overflow: hidden;
  }

  .homepage-ticker__track {
    display: flex;
    width: max-content;
    animation: homepage-ticker-scroll var(--ticker-duration, 42s) linear infinite;
    will-change: transform;
  }

  .homepage-ticker__group {
    display: flex;
    flex: 0 0 auto;
    width: max-content;
  }

  .homepage-ticker__viewport:hover .homepage-ticker__track,
  .homepage-ticker__track:focus-within {
    animation-play-state: paused;
  }

  .homepage-ticker__item {
    display: inline-flex;
    align-items: center;
    gap: 0.85rem;
    min-height: 0;
    padding: 0.625rem 1.125rem;
    border-right: 1px solid rgba(241, 243, 237, 0.1);
    color: rgba(241, 243, 237, 0.75);
    font: 500 0.625rem / 1.2 var(--home-mono, 'IBM Plex Mono', monospace);
    text-decoration: none;
    white-space: nowrap;
  }

  .homepage-ticker__item--label { color: rgba(241, 243, 237, 0.48); }

  .homepage-ticker__item:hover,
  .homepage-ticker__item:focus-visible { color: var(--color-accent-cyan, #8ddcff); }
  .homepage-ticker__color { display: inline-block; flex: 0 0 0.4rem; width: 0.4rem; height: 0.4rem; border: 1px solid rgba(241, 243, 237, 0.38); border-radius: 50%; background: var(--ticker-color); box-shadow: 0 0 0.55rem var(--ticker-color); }
  .homepage-ticker__empty { margin: 0; padding: 0.625rem 1.125rem; color: rgba(241, 243, 237, 0.45); font: 500 0.625rem / 1.2 var(--home-mono, 'IBM Plex Mono', monospace); }

  @keyframes homepage-ticker-scroll {
    from { transform: translateX(0); }
    to { transform: translate3d(calc(var(--ticker-distance, 0px) * -1), 0, 0); }
  }

  @media (prefers-reduced-motion: reduce) {
    .homepage-ticker__track { animation: none; }
  }
</style>
