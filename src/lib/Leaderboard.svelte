<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import { supabase } from './supabase';
  import LeaderboardEntry from './LeaderboardEntry.svelte';
  import RivalRow from './RivalRow.svelte';
  import {
    DISCOVERY_PAGE_SIZE,
    getDiscoverySurface,
    normalizeDiscoveryResponse,
    normalizeMyRivalsResponse
  } from './discoveryData.js';
  import { VALID_LEADERBOARD_TABS } from './routes.js';
  import { toggleFollow } from './stores.js';

  export let initialTab = 'today';

  const dispatch = createEventDispatcher();
  const LEADERBOARD_TAB_ORDER = Object.freeze(['monthly', 'today', 'rivals']);
  const TAB_META = {
    today: {
      label: 'Today',
      title: "Today's top rolls",
      description: "Highest scores from today's public rolls."
    },
    monthly: {
      label: 'This month',
      title: "This month's top rolls",
      description: "Best scores recorded by each player this month."
    },
    rivals: {
      label: 'Rivals',
      title: 'Your rivals today',
      description: 'The five profiles you follow, with today’s public roll when available.'
    }
  };

  let activeTab = 'today';
  let items = [];
  let loading = true;
  let loadingMore = false;
  let loadError = '';
  let hasMore = false;
  let currentPage = 0;
  let loadRequestId = 0;
  let removingId = '';

  $: meta = TAB_META[activeTab] || TAB_META.today;

  async function fetchLeaderboard({ reset = true } = {}) {
    const requestId = ++loadRequestId;
    const requestedPage = reset ? 0 : currentPage + 1;

    if (reset) {
      loading = true;
      items = [];
      currentPage = 0;
    } else {
      loadingMore = true;
    }
    loadError = '';

    const { data, error } = activeTab === 'rivals'
      ? await supabase.rpc('get_my_rivals')
      : await supabase.rpc('get_public_discovery', {
        p_surface: getDiscoverySurface(activeTab),
        p_rarity: null,
        p_query: null,
        p_page: requestedPage,
        p_limit: DISCOVERY_PAGE_SIZE
      });

    if (requestId !== loadRequestId) return;
    if (error) {
      if (reset) items = [];
      loadError = 'The leaderboard could not be loaded. Please retry.';
      loading = false;
      loadingMore = false;
      return;
    }

    if (activeTab === 'rivals') {
      items = normalizeMyRivalsResponse(data);
      currentPage = 0;
      hasMore = false;
    } else {
      const response = normalizeDiscoveryResponse(data);
      items = reset ? response.items : [...items, ...response.items];
      currentPage = response.page;
      hasMore = response.hasMore;
    }
    loading = false;
    loadingMore = false;
  }

  function switchTab(tab) {
    if (!VALID_LEADERBOARD_TABS.includes(tab) || tab === activeTab) return;
    activeTab = tab;
    dispatch('navigate', { view: 'leaderboard', tab });
    void fetchLeaderboard({ reset: true });
  }

  function forwardNavigation(event) {
    dispatch('navigate', event.detail);
  }

  async function removeRival(event) {
    const item = event.detail?.item;
    if (!item?.userId || removingId) return;
    removingId = item.userId;
    const result = await toggleFollow(item.userId);
    if (result?.success && result.action === 'unfollowed') {
      items = items.filter(current => current.userId !== item.userId);
    }
    removingId = '';
  }

  onMount(() => {
    activeTab = VALID_LEADERBOARD_TABS.includes(initialTab) ? initialTab : 'today';
    void fetchLeaderboard({ reset: true });
  });
</script>

<main class="roll-leaderboard" data-leaderboard-tab={activeTab}>
  <div class="roll-leaderboard__shell">
    <section class="roll-leaderboard__intro" aria-labelledby="leaderboard-title">
      <h1 id="leaderboard-title">Leaderboard</h1>
      <p class="roll-leaderboard__scope">{meta.description}</p>
      <div class="roll-leaderboard__tabs" role="tablist" aria-label="Leaderboard period">
        {#each LEADERBOARD_TAB_ORDER as tab (tab)}
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            class:active={activeTab === tab}
            on:click={() => switchTab(tab)}
          >{TAB_META[tab].label}</button>
        {/each}
      </div>
    </section>

    <section class="roll-leaderboard__board" aria-labelledby="leaderboard-board-title" aria-live="polite">
      <h2 id="leaderboard-board-title" class="roll-leaderboard__sr-only">{meta.title}</h2>

      {#if loading}
        <div class="roll-leaderboard__loading" aria-busy="true" aria-label="Loading leaderboard profiles">
          <div class="roll-leaderboard__list-skeleton">
            {#each [1, 2, 3, 4, 5, 6] as placeholder (placeholder)}
              <div class="roll-leaderboard__row-skeleton" data-placeholder={placeholder} aria-hidden="true">
                <span></span><span></span><span></span>
              </div>
            {/each}
          </div>
        </div>
      {:else if loadError}
        <div class="roll-leaderboard__state" role="alert">
          <div><strong>Leaderboard unavailable</strong><p>{loadError}</p></div>
          <button type="button" class="roll-leaderboard__retry" on:click={() => fetchLeaderboard({ reset: true })}>Retry</button>
        </div>
      {:else if items.length === 0}
        <div class="roll-leaderboard__state">
          <div><strong>{activeTab === 'rivals' ? 'No rivals yet' : 'No rolls on this board yet'}</strong><p>{activeTab === 'rivals' ? 'Open a public profile and add up to five players as rivals.' : 'Check back after the next public roll.'}</p></div>
        </div>
      {:else}
        <section class="roll-leaderboard__results" class:roll-leaderboard__results--rivals={activeTab === 'rivals'} aria-labelledby="leaderboard-results-title">
          <h3 id="leaderboard-results-title" class="roll-leaderboard__sr-only">Ranked profiles</h3>
          {#if activeTab !== 'rivals'}<div class="roll-leaderboard__column-headings" aria-hidden="true">
            <span></span>
            <span></span>
            <span class="roll-leaderboard__column-heading-metrics">
              <span>Color</span>
              <span>Rarity</span>
              <span>Score</span>
            </span>
          </div>{/if}
          {#if activeTab === 'rivals'}
            <ul class="roll-leaderboard__list">
              {#each items as item (item.userId)}<li class="roll-leaderboard__list-item"><RivalRow {item} removing={removingId === item.userId} on:navigate={forwardNavigation} on:remove={removeRival} /></li>{/each}
            </ul>
          {:else}
            <ol class="roll-leaderboard__list">
              {#each items as item, index (`ranked:${item.username}:${item.rollDate || item.hexCode || index}`)}
                <li class="roll-leaderboard__list-item"><LeaderboardEntry {item} position={index} on:navigate={forwardNavigation} /></li>
              {/each}
            </ol>
          {/if}
        </section>

        {#if hasMore}
          <div class="roll-leaderboard__load-more">
            <button type="button" class="roll-leaderboard__retry" disabled={loadingMore} on:click={() => fetchLeaderboard({ reset: false })}>
              {loadingMore ? 'Loading…' : 'Load more'}
            </button>
          </div>
        {/if}
      {/if}
    </section>
  </div>
</main>

<style>
  .roll-leaderboard {
    --leaderboard-bg: var(--bg, #0e0e10);
    --leaderboard-panel: #111115;
    --leaderboard-line: #30313b;
    --leaderboard-muted: #b7b8c2;
    --leaderboard-text: #f7f7fa;
    --leaderboard-accent: #aab1ff;
    min-height: calc(100dvh - 4.25rem);
    box-sizing: border-box;
    padding: clamp(2.5rem, 5.5vw, 4.5rem) 0 4.5rem;
    background: transparent;
    color: var(--leaderboard-text);
    font-family: 'Inter', var(--font-body-stack, sans-serif);
    color-scheme: dark;
  }
  .roll-leaderboard__shell { width: min(980px, calc(100% - 48px)); margin-inline: auto; }
  .roll-leaderboard__intro { display: flex; flex-direction: column; align-items: center; text-align: center; }
  .roll-leaderboard__tabs { display: flex; justify-content: center; gap: .7rem; margin-top: 1.5rem; }
  .roll-leaderboard__tabs button {
    min-height: 2.55rem;
    padding: .65rem 1.3rem;
    border: 1px solid var(--leaderboard-line);
    border-radius: 999px;
    background: transparent;
    color: var(--leaderboard-muted);
    cursor: pointer;
    font: 700 .82rem/1 'Inter', sans-serif;
    transition: background-color 160ms ease, border-color 160ms ease, color 160ms ease, transform 160ms ease;
  }
  .roll-leaderboard__tabs button:hover,
  .roll-leaderboard__tabs button:focus-visible { border-color: var(--leaderboard-accent); color: var(--leaderboard-text); background: color-mix(in srgb, var(--leaderboard-accent) 9%, transparent); transform: translateY(-1px); }
  .roll-leaderboard__tabs button.active { border-color: var(--leaderboard-accent); background: color-mix(in srgb, var(--leaderboard-accent) 12%, transparent); color: var(--leaderboard-text); }
  .roll-leaderboard__intro h1 { margin: 0; color: var(--leaderboard-text); font: 750 clamp(3.4rem, 6.3vw, 5.5rem)/.94 'Manrope Variable', var(--font-display-stack, sans-serif) !important; letter-spacing: -.055em; }
  .roll-leaderboard__scope { max-width: 30rem; margin: .85rem auto 0; color: var(--leaderboard-muted); font: 600 .88rem/1.45 'Inter', sans-serif; }
  .roll-leaderboard__board { margin-top: 2.9rem; }
  .roll-leaderboard__list { margin: 0; padding: 0; list-style: none; }
  .roll-leaderboard__results { width: min(960px, 100%); margin-inline: auto; }
  .roll-leaderboard__column-headings { display: grid; grid-template-columns: 2.5rem minmax(13rem, 1.15fr) minmax(0, 1.8fr); gap: .85rem; align-items: end; min-height: 1.45rem; padding: 0 1rem .25rem; color: var(--leaderboard-muted); font: 750 .65rem/1 'Inter', sans-serif; letter-spacing: .12em; text-transform: uppercase; }
  .roll-leaderboard__column-heading-metrics { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1rem; min-width: 0; }
  .roll-leaderboard__column-heading-metrics span { text-align: center; }
  .roll-leaderboard__list { display: grid; gap: .75rem; }
  .roll-leaderboard__list-item { min-width: 0; }
  .roll-leaderboard__state { display: flex; align-items: center; justify-content: space-between; gap: 1rem; min-height: 9rem; padding: 1.4rem; border: 1px solid var(--leaderboard-line); border-radius: 18px; background: var(--leaderboard-panel); box-shadow: 0 1.5rem 4rem rgba(0, 0, 0, .16); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); }
  .roll-leaderboard__state strong { color: var(--leaderboard-text); font: 750 .98rem/1 'Inter', sans-serif; }
  .roll-leaderboard__state p { margin: .5rem 0 0; color: var(--leaderboard-muted); font: 600 .82rem/1.45 'Inter', sans-serif; }
  .roll-leaderboard__retry { min-height: 44px; padding: 0 20px; border: 1px solid var(--leaderboard-line); border-radius: 999px; background: transparent; color: var(--leaderboard-text); cursor: pointer; font: 700 .82rem/1 'Inter', sans-serif; }
  .roll-leaderboard__retry:hover:not(:disabled), .roll-leaderboard__retry:focus-visible { border-color: var(--leaderboard-accent); background: color-mix(in srgb, var(--leaderboard-accent) 9%, transparent); color: var(--leaderboard-text); }
  .roll-leaderboard__retry:disabled { cursor: wait; opacity: .55; }
  .roll-leaderboard__load-more { display: flex; justify-content: center; padding-top: 1rem; }
  .roll-leaderboard__loading { display: grid; gap: 2.6rem; }
  .roll-leaderboard__list-skeleton { display: grid; gap: .7rem; }
  .roll-leaderboard__row-skeleton { display: grid; grid-template-columns: 2.5rem minmax(0, 1fr) 6rem; gap: .8rem; align-items: center; min-height: 4.5rem; padding: .75rem .9rem; border: 1px solid var(--leaderboard-line); border-radius: 18px; background: var(--leaderboard-panel); }
  .roll-leaderboard__row-skeleton span { display: block; height: .7rem; border-radius: .25rem; background: linear-gradient(90deg, rgba(255,255,255,.04), rgba(255,255,255,.1), rgba(255,255,255,.04)); background-size: 220% 100%; animation: leaderboard-shimmer 1.5s ease-in-out infinite; }
  .roll-leaderboard__row-skeleton span:nth-child(2) { width: 48%; height: 1.65rem; }
  .roll-leaderboard__row-skeleton span:last-child { width: 75%; justify-self: end; }
  .roll-leaderboard__sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; clip-path: inset(50%); }
  :global(.roll-leaderboard a:focus-visible), :global(.roll-leaderboard button:focus-visible) { outline: 2px solid var(--leaderboard-accent); outline-offset: 3px; }
  @keyframes leaderboard-shimmer { 0% { background-position: 100% 0; } 100% { background-position: -100% 0; } }

  @media (max-width: 620px) {
    .roll-leaderboard { padding: 2.25rem 0 3.25rem; }
    .roll-leaderboard__shell { width: calc(100% - 30px); }
    .roll-leaderboard__tabs { width: 100%; margin-top: 1.3rem; }
    .roll-leaderboard__tabs button { flex: 1; }
    .roll-leaderboard__intro h1 { font-size: clamp(2.8rem, 13vw, 4rem) !important; }
    .roll-leaderboard__scope { max-width: 18rem; }
    .roll-leaderboard__board { margin-top: 2.65rem; }
    .roll-leaderboard__column-headings { grid-template-columns: 2.25rem minmax(0, 1fr); gap: .65rem; padding-inline: .8rem; }
    .roll-leaderboard__column-heading-metrics { grid-column: 2; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: .4rem; }
    .roll-leaderboard__column-heading-metrics span { text-align: center; }
    .roll-leaderboard__state { align-items: flex-start; flex-direction: column; }
    .roll-leaderboard__row-skeleton { grid-template-columns: 2.25rem minmax(0, 1fr) 5.5rem; gap: .6rem; padding-inline: .7rem; }
  }

  @media (prefers-reduced-motion: reduce) {
    .roll-leaderboard__tabs button,
    .roll-leaderboard__row-skeleton span { transition: none; animation: none; }
  }
</style>
