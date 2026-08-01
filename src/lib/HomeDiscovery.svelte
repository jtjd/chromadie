<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import DiscoveryCard from './DiscoveryCard.svelte';
  import { supabase } from './supabase';
  import { getDiscoverySurface, normalizeDiscoveryResponse } from './discoveryData.js';

  const dispatch = createEventDispatcher();
  const DISCOVERY_LIMIT = 3;
  let items = [];
  let loading = true;
  let loadError = '';
  let loadRequestId = 0;

  async function loadProfiles() {
    const requestId = ++loadRequestId;
    loading = true;
    loadError = '';

    try {
      const { data, error } = await supabase.rpc('get_public_discovery', {
        p_surface: getDiscoverySurface('today'),
        p_rarity: null,
        p_query: null,
        p_page: 0,
        p_limit: DISCOVERY_LIMIT
      });

      if (requestId !== loadRequestId) return;
      if (error) {
        items = [];
        loadError = 'Profiles could not be loaded right now.';
        loading = false;
        return;
      }

      items = normalizeDiscoveryResponse(data).items.slice(0, DISCOVERY_LIMIT);
      loading = false;
    } catch {
      if (requestId !== loadRequestId) return;
      items = [];
      loadError = 'Profiles could not be loaded right now.';
      loading = false;
    }
  }

  function forwardNavigation(event) {
    dispatch('navigate', event.detail);
  }

  function openDiscovery(event) {
    event.preventDefault();
    dispatch('navigate', { view: 'leaderboard', tab: 'today' });
  }

  onMount(() => {
    void loadProfiles();
  });
</script>

<section class="home-discovery" aria-labelledby="home-discovery-title">
  <div class="home-discovery__heading">
    <div>
      <span class="home-discovery__kicker">Today on Chromadie</span>
      <h2 id="home-discovery-title">See what people are building.</h2>
      <p>Every profile starts with a color. These are the public profiles currently climbing the board.</p>
    </div>
    <a href="/leaderboard" on:click={openDiscovery}>Explore all profiles <span aria-hidden="true">↗</span></a>
  </div>

  {#if loading}
    <div class="home-discovery__grid" aria-busy="true" aria-label="Loading public profiles">
      {#each [1, 2, 3] as placeholder (placeholder)}
        <div class="home-discovery__skeleton" aria-hidden="true"></div>
      {/each}
    </div>
  {:else if loadError}
    <div class="home-discovery__empty" role="alert">
      <p>{loadError}</p>
      <button type="button" on:click={loadProfiles}>Retry</button>
    </div>
  {:else if items.length}
    <div class="home-discovery__grid">
      {#each items as item, index (`${item.username}:${item.rollDate || item.profileCreatedAt || index}`)}
        <div class="home-discovery__card">
          <DiscoveryCard item={item} on:navigate={forwardNavigation} />
        </div>
      {/each}
    </div>
  {:else}
    <div class="home-discovery__empty">
      <p>No public profiles have entered today’s board yet. Claim yours and be first.</p>
      <a href="#home-claim-username">Claim a username <span aria-hidden="true">↓</span></a>
    </div>
  {/if}
</section>

<style>
  .home-discovery { display: grid; gap: 1.6rem; margin-top: clamp(4.5rem, 10vw, 8rem); padding-top: clamp(2.25rem, 5vw, 3.5rem); border-top: 1px solid var(--home-line); }
  .home-discovery__heading { display: flex; align-items: flex-end; justify-content: space-between; gap: 2rem; }
  .home-discovery__kicker { color: var(--home-ink-faint); font: 600 0.64rem / 1.2 var(--home-mono); letter-spacing: 0.12em; text-transform: uppercase; }
  .home-discovery h2 { margin: 0.55rem 0 0; color: var(--home-ink); font: 600 clamp(1.8rem, 3.8vw, 3.1rem) / 0.98 var(--home-font); letter-spacing: -0.055em; }
  .home-discovery__heading p { max-width: 35rem; margin: 0.8rem 0 0; color: var(--home-ink-muted); font-size: 0.92rem; line-height: 1.55; }
  .home-discovery__heading a,
  .home-discovery__empty a { flex: 0 0 auto; color: var(--home-color); font: 600 0.7rem / 1.2 var(--home-mono); text-decoration: none; }
  .home-discovery__heading a:hover,
  .home-discovery__empty a:hover { color: #d3ff91; }
  .home-discovery__grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1rem; }
  .home-discovery__card { min-width: 0; }
  .home-discovery__card :global(.discovery-card) { height: 100%; border-color: var(--home-line); border-radius: 0.35rem; background: rgba(255,255,255,0.018); box-shadow: none; }
  .home-discovery__card :global(.discovery-card:hover) { border-color: color-mix(in srgb, var(--home-color) 38%, var(--home-line)); background: rgba(255,255,255,0.032); box-shadow: 0 1rem 2.5rem rgba(0,0,0,0.2); }
  .home-discovery__skeleton { min-height: 15rem; border: 1px solid var(--home-line); border-radius: 0.8rem; background: linear-gradient(110deg, rgba(255,255,255,0.035) 30%, rgba(255,255,255,0.08) 45%, rgba(255,255,255,0.035) 60%); background-size: 200% 100%; animation: home-discovery-loading 1.5s ease-in-out infinite; }
  .home-discovery__empty { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 1.25rem; border: 1px dashed var(--home-line-strong); border-radius: 0.8rem; color: var(--home-ink-muted); }
  .home-discovery__empty p { margin: 0; font-size: 0.84rem; line-height: 1.5; }
  .home-discovery__empty button { flex: 0 0 auto; min-height: 2.35rem; padding: 0.55rem 0.75rem; border: 1px solid var(--home-line-strong); border-radius: 0.45rem; background: var(--home-surface); color: var(--home-ink); cursor: pointer; font: 600 0.68rem / 1 var(--home-mono); }
  .home-discovery__empty button:hover { border-color: var(--home-color); }
  @keyframes home-discovery-loading { 50% { background-position: -100% 0; } }
  @media (max-width: 56rem) {
    .home-discovery__grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .home-discovery__card:last-child { display: none; }
  }
  @media (max-width: 42rem) {
    .home-discovery__heading { align-items: flex-start; flex-direction: column; gap: 1rem; }
    .home-discovery__grid { display: grid; grid-auto-columns: minmax(17rem, 82vw); grid-auto-flow: column; grid-template-columns: none; overflow-x: auto; margin-inline: -1.1rem; padding: 0 1.1rem 0.5rem; scroll-snap-type: x mandatory; scrollbar-width: none; }
    .home-discovery__grid::-webkit-scrollbar { display: none; }
    .home-discovery__card { scroll-snap-align: start; }
    .home-discovery__card:last-child { display: block; }
    .home-discovery__empty { align-items: flex-start; flex-direction: column; }
  }
  @media (prefers-reduced-motion: reduce) {
    .home-discovery__skeleton { animation: none; }
    .home-discovery__grid { scroll-behavior: auto; }
  }
</style>
