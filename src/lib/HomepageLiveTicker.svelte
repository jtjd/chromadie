<script>
  import { formatHomepageRelativeTime } from './homepageDirectory.js';
  import { normalizeHexColor } from './utils.js';

  export let events = [];
  export let loading = false;
  export let loadError = '';

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
  <div class="homepage-ticker__label">Recent public rolls</div>
  <div class="homepage-ticker__viewport">
    {#if loading}
      <p class="homepage-ticker__empty">Loading recent public rolls.</p>
    {:else if events.length}
      <div class="homepage-ticker__track">
        {#each events as event (event.id)}
          <a class="homepage-ticker__item" href={event.profilePath} aria-label={`Open ${event.displayName || event.username}'s public profile. ${eventLabel(event)}`}>
            <span>{compactEventLabel(event)}</span>
            <i class="homepage-ticker__color" style={'--ticker-color: ' + normalizeHexColor(event.hex, '#8DDCFF') + ';'} aria-hidden="true"></i>
          </a>
        {/each}
        {#if events.length}
          {#each events as event (event.id + '-repeat')}
            <span class="homepage-ticker__item homepage-ticker__item--repeat" aria-hidden="true">
              <span>{compactEventLabel(event)}</span>
              <i class="homepage-ticker__color" style={'--ticker-color: ' + normalizeHexColor(event.hex, '#8DDCFF') + ';'} aria-hidden="true"></i>
            </span>
          {/each}
        {/if}
      </div>
    {:else}
      <p class="homepage-ticker__empty">{loadError || 'Waiting for today’s public rolls.'}</p>
    {/if}
  </div>
</section>

<style>
  .homepage-ticker {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    align-items: center;
    width: min(100%, 86rem);
    min-height: 2.65rem;
    margin: 0 auto;
    border-top: 1px solid rgba(241, 243, 237, 0.12);
    border-bottom: 1px solid rgba(241, 243, 237, 0.12);
    color: rgba(241, 243, 237, 0.62);
    background: rgba(8, 9, 8, 0.78);
    font-family: var(--home-font, 'Instrument Sans', ui-sans-serif, sans-serif);
  }

  .homepage-ticker__label {
    padding: 0.78rem 1rem;
    border-right: 1px solid rgba(241, 243, 237, 0.12);
    color: rgba(241, 243, 237, 0.42);
    font: 600 0.61rem / 1 var(--home-mono, 'IBM Plex Mono', monospace);
    letter-spacing: 0.12em;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .homepage-ticker__viewport {
    min-width: 0;
    overflow: hidden;
  }

  .homepage-ticker__track {
    display: flex;
    width: max-content;
    min-width: 100%;
    animation: homepage-ticker-scroll 72s linear infinite;
  }

  .homepage-ticker__track:hover,
  .homepage-ticker__track:focus-within {
    animation-play-state: paused;
  }

  .homepage-ticker__item {
    display: inline-flex;
    align-items: center;
    gap: 0.85rem;
    min-height: 2.65rem;
    padding: 0.65rem 1.25rem;
    border-right: 1px solid rgba(241, 243, 237, 0.1);
    color: rgba(241, 243, 237, 0.75);
    font: 500 0.69rem / 1 var(--home-mono, 'IBM Plex Mono', monospace);
    text-decoration: none;
    white-space: nowrap;
  }

  .homepage-ticker__item:hover,
  .homepage-ticker__item:focus-visible { color: var(--color-accent-cyan, #8ddcff); }
  .homepage-ticker__color { display: inline-block; flex: 0 0 0.4rem; width: 0.4rem; height: 0.4rem; border: 1px solid rgba(241, 243, 237, 0.38); border-radius: 50%; background: var(--ticker-color); box-shadow: 0 0 0.55rem var(--ticker-color); }
  .homepage-ticker__empty { margin: 0; padding: 0.78rem 1.25rem; color: rgba(241, 243, 237, 0.45); font: 500 0.69rem / 1 var(--home-mono, 'IBM Plex Mono', monospace); }

  @keyframes homepage-ticker-scroll {
    from { transform: translateX(0); }
    to { transform: translateX(-50%); }
  }

  @media (max-width: 42rem) {
    .homepage-ticker { display: block; }
    .homepage-ticker__label { border-right: 0; border-bottom: 1px solid rgba(241, 243, 237, 0.1); }
    .homepage-ticker__viewport { overflow-x: auto; scrollbar-width: none; }
    .homepage-ticker__viewport::-webkit-scrollbar { display: none; }
    .homepage-ticker__track { animation: none; }
    .homepage-ticker__item { padding-inline: 1rem; }
  }

  @media (prefers-reduced-motion: reduce) {
    .homepage-ticker__track { animation: none; }
  }
</style>
