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
  const LEADERBOARD_TAB_ORDER = Object.freeze(['monthly', 'today']);
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
  $: featuredItems = items.slice(0, 3);
  $: remainingItems = items.slice(featuredItems.length);

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
    <section class="roll-leaderboard__intro" aria-labelledby="leaderboard-title">
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

      <p class="roll-leaderboard__eyebrow">Public rankings</p>
      <h1 id="leaderboard-title">Top rolls</h1>
      <p class="roll-leaderboard__scope">{meta.description}</p>
    </section>

    <section class="roll-leaderboard__board" aria-labelledby="leaderboard-board-title" aria-live="polite">
      <h2 id="leaderboard-board-title" class="roll-leaderboard__sr-only">{meta.title}</h2>

      {#if loading}
        <div class="roll-leaderboard__loading" aria-busy="true" aria-label="Loading leaderboard profiles">
          <div class="roll-leaderboard__featured-skeleton" aria-hidden="true">
            {#each [1, 2, 3] as placeholder (placeholder)}
              <div class="roll-leaderboard__podium-skeleton">
                <span></span><i></i><b></b>
              </div>
            {/each}
          </div>
          <div class="roll-leaderboard__list-skeleton">
            {#each [1, 2, 3, 4] as placeholder (placeholder)}
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
          <div><strong>No rolls on this board yet</strong><p>Check back after the next public roll.</p></div>
        </div>
      {:else}
        <section class="roll-leaderboard__featured" aria-labelledby="leaderboard-featured-title">
          <h3 id="leaderboard-featured-title" class="roll-leaderboard__sr-only">Top three profiles</h3>
          <ol class="roll-leaderboard__featured-list">
            {#each featuredItems as item, index (`featured:${item.username}:${item.rollDate || item.hexCode || index}`)}
              <li class="roll-leaderboard__featured-item">
                <LeaderboardEntry
                  {item}
                  position={index}
                  featured={true}
                  variant="podium"
                  on:navigate={forwardNavigation}
                />
              </li>
            {/each}
          </ol>
        </section>

        {#if remainingItems.length}
          <section class="roll-leaderboard__lower" aria-labelledby="leaderboard-lower-title">
            <h3 id="leaderboard-lower-title" class="roll-leaderboard__sr-only">More top profiles</h3>
            <ol class="roll-leaderboard__list">
              {#each remainingItems as item, index (`list:${item.username}:${item.rollDate || item.hexCode || index}`)}
                <li class="roll-leaderboard__list-item">
                  <LeaderboardEntry
                    {item}
                    position={featuredItems.length + index}
                    featured={false}
                    variant="list"
                    on:navigate={forwardNavigation}
                  />
                </li>
              {/each}
            </ol>
          </section>
        {/if}

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
    --leaderboard-panel: rgba(255, 255, 255, .035);
    --leaderboard-line: rgba(255, 255, 255, .13);
    --leaderboard-muted: #929198;
    --leaderboard-text: #f5f4f7;
    --leaderboard-accent: #c77cde;
    min-height: calc(100dvh - 4.25rem);
    box-sizing: border-box;
    padding: 3rem 1rem 5rem;
    background: var(--leaderboard-bg);
    color: var(--leaderboard-text);
    font-family: 'Inter', var(--font-body-stack, sans-serif);
    color-scheme: dark;
  }
  .roll-leaderboard__shell { width: min(100%, 42rem); margin-inline: auto; }
  .roll-leaderboard__intro { display: flex; flex-direction: column; align-items: center; text-align: center; }
  .roll-leaderboard__tabs { display: flex; gap: .65rem; margin-bottom: 2.35rem; }
  .roll-leaderboard__tabs button {
    min-height: 2.4rem;
    padding: .6rem 1.15rem;
    border: 1px solid rgba(255, 255, 255, .16);
    border-radius: 999px;
    background: rgba(255, 255, 255, .045);
    color: #aaa8b0;
    cursor: pointer;
    font: 500 .75rem/1 'Inter', sans-serif;
    transition: background-color 160ms ease, border-color 160ms ease, color 160ms ease, transform 160ms ease;
  }
  .roll-leaderboard__tabs button:hover,
  .roll-leaderboard__tabs button:focus-visible { border-color: rgba(199, 124, 222, .65); color: #fff; transform: translateY(-1px); }
  .roll-leaderboard__tabs button.active { border-color: rgba(199, 124, 222, .7); background: rgba(199, 124, 222, .2); color: #fff; }
  .roll-leaderboard__eyebrow { margin: 0 0 .6rem; color: #8f8c96; font: 500 .63rem/1 'Inter', sans-serif; letter-spacing: .15em; text-transform: uppercase; }
  .roll-leaderboard__intro h1 { margin: 0; color: #fff; font: 400 clamp(2.3rem, 6vw, 3.2rem)/1 'Clash Display', var(--font-display-stack, sans-serif) !important; letter-spacing: -.05em; }
  .roll-leaderboard__scope { max-width: 24rem; margin: .75rem 0 0; color: #8f8c96; font: 400 .76rem/1.4 'Inter', sans-serif; }
  .roll-leaderboard__board { margin-top: 2.5rem; }
  .roll-leaderboard__featured-list,
  .roll-leaderboard__list { margin: 0; padding: 0; list-style: none; }
  .roll-leaderboard__featured-list { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); align-items: end; gap: .8rem; }
  .roll-leaderboard__featured-item { display: flex; min-width: 0; align-items: flex-end; }
  .roll-leaderboard__featured-item:only-child { grid-column: 2; }
  .roll-leaderboard__featured-item:nth-child(1) { order: 2; }
  .roll-leaderboard__featured-item:nth-child(2) { order: 1; }
  .roll-leaderboard__featured-item:nth-child(3) { order: 3; }
  .roll-leaderboard__lower { margin-top: 2.6rem; }
  .roll-leaderboard__list { display: grid; gap: .7rem; }
  .roll-leaderboard__list-item { min-width: 0; }
  .roll-leaderboard__state { display: flex; align-items: center; justify-content: space-between; gap: 1rem; min-height: 9rem; padding: 1.4rem; border: 1px solid var(--leaderboard-line); border-radius: .9rem; background: var(--leaderboard-panel); }
  .roll-leaderboard__state strong { font: 600 .9rem/1 'Inter', sans-serif; }
  .roll-leaderboard__state p { margin: .45rem 0 0; color: var(--leaderboard-muted); font: 400 .76rem/1.45 'Inter', sans-serif; }
  .roll-leaderboard__retry { min-height: 2.4rem; padding: .6rem .9rem; border: 1px solid rgba(255, 255, 255, .2); border-radius: .45rem; background: transparent; color: #d8d5db; cursor: pointer; font: 500 .7rem/1 'Inter', sans-serif; }
  .roll-leaderboard__retry:hover:not(:disabled), .roll-leaderboard__retry:focus-visible { border-color: var(--leaderboard-accent); color: #fff; }
  .roll-leaderboard__retry:disabled { cursor: wait; opacity: .55; }
  .roll-leaderboard__load-more { display: flex; justify-content: center; padding-top: 1rem; }
  .roll-leaderboard__loading { display: grid; gap: 2.6rem; }
  .roll-leaderboard__featured-skeleton { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); align-items: end; gap: .8rem; }
  .roll-leaderboard__podium-skeleton { display: flex; flex-direction: column; align-items: center; gap: .55rem; }
  .roll-leaderboard__podium-skeleton span { width: 4.25rem; height: 4.25rem; border: .3rem solid rgba(255, 255, 255, .12); border-radius: 50%; background: rgba(255, 255, 255, .07); }
  .roll-leaderboard__podium-skeleton:nth-child(2) span { width: 5.25rem; height: 5.25rem; }
  .roll-leaderboard__podium-skeleton i { width: 4.2rem; height: .75rem; border-radius: .3rem; background: rgba(255, 255, 255, .08); }
  .roll-leaderboard__podium-skeleton b { width: 3rem; height: .55rem; border-radius: .3rem; background: rgba(255, 255, 255, .06); }
  .roll-leaderboard__list-skeleton { display: grid; gap: .7rem; }
  .roll-leaderboard__row-skeleton { display: grid; grid-template-columns: 2.5rem minmax(0, 1fr) 6rem; gap: .8rem; align-items: center; min-height: 4.5rem; padding: .75rem .9rem; border: 1px solid rgba(255, 255, 255, .08); border-radius: .85rem; background: var(--leaderboard-panel); }
  .roll-leaderboard__row-skeleton span { display: block; height: .7rem; border-radius: .25rem; background: linear-gradient(90deg, rgba(255,255,255,.04), rgba(255,255,255,.12), rgba(255,255,255,.04)); background-size: 220% 100%; animation: leaderboard-shimmer 1.5s ease-in-out infinite; }
  .roll-leaderboard__row-skeleton span:nth-child(2) { width: 48%; height: 1.65rem; }
  .roll-leaderboard__row-skeleton span:last-child { width: 75%; justify-self: end; }
  .roll-leaderboard__sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; clip-path: inset(50%); }
  :global(.roll-leaderboard a:focus-visible), :global(.roll-leaderboard button:focus-visible) { outline: 2px solid var(--leaderboard-accent); outline-offset: 3px; }
  @keyframes leaderboard-shimmer { 0% { background-position: 100% 0; } 100% { background-position: -100% 0; } }

  @media (max-width: 620px) {
    .roll-leaderboard { padding: 2rem .8rem 3.5rem; }
    .roll-leaderboard__tabs { width: 100%; margin-bottom: 2rem; }
    .roll-leaderboard__tabs button { flex: 1; }
    .roll-leaderboard__intro h1 { font-size: clamp(2.2rem, 12vw, 3rem) !important; }
    .roll-leaderboard__scope { max-width: 18rem; }
    .roll-leaderboard__board { margin-top: 2rem; }
    .roll-leaderboard__featured-list { gap: .35rem; }
    .roll-leaderboard__lower { margin-top: 2.1rem; }
    .roll-leaderboard__state { align-items: flex-start; flex-direction: column; }
    .roll-leaderboard__row-skeleton { grid-template-columns: 2.25rem minmax(0, 1fr) 5.5rem; gap: .6rem; padding-inline: .7rem; }
  }

  @media (prefers-reduced-motion: reduce) {
    .roll-leaderboard__tabs button,
    .roll-leaderboard__row-skeleton span { transition: none; animation: none; }
  }
</style>
