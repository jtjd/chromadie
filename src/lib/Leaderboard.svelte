<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import { supabase } from './supabase';
  import LeaderboardEntry from './LeaderboardEntry.svelte';
  import {
    DISCOVERY_PAGE_SIZE,
    getDiscoverySurface,
    normalizeDiscoveryResponse
  } from './discoveryData.js';
  import { VALID_LEADERBOARD_TABS } from './routes.js';

  export let initialTab = 'today';

  const dispatch = createEventDispatcher();
  const TAB_META = {
    today: {
      label: 'Today',
      title: "Today's top rolls",
      description: "Top profiles ranked by score from today's rolls."
    },
    monthly: {
      label: 'This month',
      title: "This month's top rolls",
      description: "Top profiles ranked by their best score this month."
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

    const { data, error } = await supabase.rpc('get_public_discovery', {
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

    const response = normalizeDiscoveryResponse(data);
    items = reset ? response.items : [...items, ...response.items];
    currentPage = response.page;
    hasMore = response.hasMore;
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

  onMount(() => {
    activeTab = VALID_LEADERBOARD_TABS.includes(initialTab) ? initialTab : 'today';
    void fetchLeaderboard({ reset: true });
  });
</script>

<main class="roll-leaderboard" data-leaderboard-tab={activeTab}>
  <div class="roll-leaderboard__shell">
    <section class="roll-leaderboard__hero" aria-labelledby="leaderboard-title">
      <div class="roll-leaderboard__hero-copy">
        <p class="roll-leaderboard__eyebrow">Public rankings</p>
        <h1 id="leaderboard-title" aria-label="Roll leaderboard"><span aria-hidden="true">Roll</span><span aria-hidden="true">leaderboard</span></h1>
        <p>{meta.description}</p>
      </div>

      <div class="roll-leaderboard__tabs" role="tablist" aria-label="Leaderboard period">
        {#each VALID_LEADERBOARD_TABS as tab (tab)}
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

    <section class="roll-leaderboard__table" aria-labelledby="leaderboard-table-title" aria-live="polite">
      <h2 id="leaderboard-table-title" class="roll-leaderboard__sr-only">{meta.title}</h2>
      <div class="roll-leaderboard__table-head" aria-hidden="true">
        <span>#</span>
        <span>Profile</span>
        <span>Score</span>
      </div>

      {#if loading}
        <div class="roll-leaderboard__list" aria-busy="true" aria-label="Loading leaderboard profiles">
          {#each [1, 2, 3, 4, 5, 6] as placeholder (placeholder)}
            <div class="roll-leaderboard__skeleton" data-placeholder={placeholder} aria-hidden="true">
              <span></span><span></span><span></span>
            </div>
          {/each}
        </div>
      {:else if loadError}
        <div class="roll-leaderboard__state" role="alert">
          <div><strong>Leaderboard unavailable</strong><p>{loadError}</p></div>
          <button type="button" class="roll-leaderboard__retry" on:click={() => fetchLeaderboard({ reset: true })}>Retry</button>
        </div>
      {:else if items.length === 0}
        <div class="roll-leaderboard__state">
          <div><strong>No rolls on this board yet</strong><p>Check back after the next public roll.</p></div>
        </div>
      {:else}
        <ol class="roll-leaderboard__list" aria-label={meta.title}>
          {#each items as item, index (`${item.username}:${item.rollDate || item.hexCode || index}`)}
            <li class="roll-leaderboard__list-item">
              <LeaderboardEntry
                {item}
                position={index}
                featured={index < 3}
                on:navigate={forwardNavigation}
              />
            </li>
          {/each}
        </ol>

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
    --leaderboard-bg: #050506;
    --leaderboard-panel: #0d0d0e;
    --leaderboard-line: rgba(255, 255, 255, .1);
    --leaderboard-muted: #929198;
    --leaderboard-text: #f5f4f7;
    --leaderboard-purple: #34203c;
    --leaderboard-purple-line: #6e3e7f;
    min-height: calc(100dvh - 4.25rem);
    box-sizing: border-box;
    padding: 4rem 1rem 5rem;
    background: var(--leaderboard-bg);
    color: var(--leaderboard-text);
    font-family: 'Inter', var(--font-body-stack, sans-serif);
    color-scheme: dark;
  }
  .roll-leaderboard__shell { width: min(100%, 72rem); margin-inline: auto; }
  .roll-leaderboard__hero {
    position: relative;
    isolation: isolate;
    min-height: 12.5rem;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 1.5rem;
    overflow: hidden;
    padding: 2.35rem;
    border-radius: 1.15rem;
    background: var(--leaderboard-purple);
  }
  .roll-leaderboard__hero::before,
  .roll-leaderboard__hero::after {
    position: absolute;
    z-index: -1;
    border: 1px solid rgba(177, 106, 205, .16);
    content: '';
    pointer-events: none;
  }
  .roll-leaderboard__hero::before { width: 19rem; height: 19rem; right: -3rem; top: -12rem; transform: rotate(28deg); box-shadow: inset 0 0 0 1.25rem rgba(177, 106, 205, .08), inset 0 0 0 2.4rem transparent; }
  .roll-leaderboard__hero::after { width: 12rem; height: 12rem; right: 18%; bottom: -10rem; transform: rotate(-12deg); box-shadow: inset 0 0 0 1.1rem rgba(177, 106, 205, .08); }
  .roll-leaderboard__hero-copy { width: 100%; max-width: 36rem; min-width: 0; }
  .roll-leaderboard__eyebrow { margin: 0 0 .8rem; color: #c8a5d3; font: 500 .66rem/1 'Inter', sans-serif; letter-spacing: .14em; text-transform: uppercase; }
  .roll-leaderboard__hero h1 { display: flex; flex-wrap: wrap; max-width: 100%; min-width: 0; column-gap: .28em; margin: 0; color: #fff; font: 600 clamp(2.15rem, 5vw, 3.5rem)/.98 'Clash Display', var(--font-display-stack, sans-serif) !important; letter-spacing: -.045em; }
  .roll-leaderboard__hero-copy > p:last-child { margin: .8rem 0 0; color: #bdb2c2; font: 400 .88rem/1.45 'Inter', sans-serif; }
  .roll-leaderboard__tabs { display: flex; gap: .55rem; }
  .roll-leaderboard__tabs button {
    min-height: 2.5rem;
    padding: .6rem 1rem;
    border: 1px solid rgba(255, 255, 255, .08);
    border-radius: 999px;
    background: rgba(4, 4, 5, .48);
    color: #aaa2ad;
    cursor: pointer;
    font: 500 .76rem/1 'Inter', sans-serif;
  }
  .roll-leaderboard__tabs button:hover,
  .roll-leaderboard__tabs button:focus-visible,
  .roll-leaderboard__tabs button.active { border-color: var(--leaderboard-purple-line); color: #fff; }
  .roll-leaderboard__tabs button.active { background: #563163; box-shadow: 0 0 0 1px rgba(199, 122, 224, .12); }
  .roll-leaderboard__table { margin-top: 1.75rem; overflow: hidden; border: 1px solid var(--leaderboard-line); border-radius: 1.1rem 1.1rem 0 0; background: var(--leaderboard-panel); }
  .roll-leaderboard__table-head { display: grid; grid-template-columns: 3.75rem minmax(0, 1fr) minmax(7rem, auto); gap: 1.25rem; align-items: center; }
  .roll-leaderboard__table-head { min-height: 3.2rem; padding: 0 1.4rem; border-bottom: 1px solid var(--leaderboard-line); color: #87858b; font: 500 .67rem/1 'Inter', sans-serif; letter-spacing: .06em; text-transform: uppercase; }
  .roll-leaderboard__table-head span:last-child { text-align: right; }
  .roll-leaderboard__list { margin: 0; padding: 0; list-style: none; }
  .roll-leaderboard__list-item { min-width: 0; }
  .roll-leaderboard__skeleton { display: grid; grid-template-columns: 3.75rem minmax(0, 1fr) 7rem; gap: 1.25rem; align-items: center; min-height: 6rem; padding: 0 1.4rem; border-bottom: 1px solid var(--leaderboard-line); }
  .roll-leaderboard__skeleton span { display: block; height: .75rem; border-radius: .25rem; background: linear-gradient(90deg, rgba(255,255,255,.04), rgba(255,255,255,.1), rgba(255,255,255,.04)); background-size: 220% 100%; animation: leaderboard-shimmer 1.5s ease-in-out infinite; }
  .roll-leaderboard__skeleton span:nth-child(2) { width: 45%; height: 2rem; }
  .roll-leaderboard__skeleton span:last-child { width: 70%; justify-self: end; }
  .roll-leaderboard__state { display: flex; align-items: center; justify-content: space-between; gap: 1rem; min-height: 10rem; padding: 1.4rem; }
  .roll-leaderboard__state strong { font: 600 .9rem/1 'Inter', sans-serif; }
  .roll-leaderboard__state p { margin: .45rem 0 0; color: var(--leaderboard-muted); font: 400 .76rem/1.45 'Inter', sans-serif; }
  .roll-leaderboard__retry { min-height: 2.5rem; padding: .6rem .9rem; border: 1px solid rgba(255, 255, 255, .2); border-radius: .45rem; background: transparent; color: #d8d5db; cursor: pointer; font: 500 .7rem/1 'Inter', sans-serif; }
  .roll-leaderboard__retry:hover:not(:disabled), .roll-leaderboard__retry:focus-visible { border-color: #b677c9; color: #fff; }
  .roll-leaderboard__retry:disabled { cursor: wait; opacity: .55; }
  .roll-leaderboard__load-more { display: flex; justify-content: center; padding: 1rem; border-top: 1px solid var(--leaderboard-line); }
  .roll-leaderboard__sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; clip-path: inset(50%); }
  :global(.roll-leaderboard a:focus-visible), :global(.roll-leaderboard button:focus-visible) { outline: 2px solid #c77cde; outline-offset: 3px; }
  @keyframes leaderboard-shimmer { 0% { background-position: 100% 0; } 100% { background-position: -100% 0; } }

  @media (max-width: 620px) {
    .roll-leaderboard { padding: 2rem .65rem 3.5rem; }
    .roll-leaderboard__hero { min-height: 13rem; padding: 1.4rem; border-radius: .9rem; }
    .roll-leaderboard__hero h1 { font-size: clamp(1.9rem, 10vw, 2.7rem) !important; }
    .roll-leaderboard__tabs button { flex: 1; }
    .roll-leaderboard__table { margin-top: 1rem; border-radius: .9rem .9rem 0 0; }
    .roll-leaderboard__table-head,
    .roll-leaderboard__skeleton { grid-template-columns: 2.5rem minmax(0, 1fr) 6.75rem; gap: .75rem; padding-inline: .8rem; }
    .roll-leaderboard__table-head { min-height: 2.9rem; }
    .roll-leaderboard__state { align-items: flex-start; flex-direction: column; }
  }

  @media (prefers-reduced-motion: reduce) {
    .roll-leaderboard__skeleton span { animation: none; }
  }
</style>
