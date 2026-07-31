<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import { profile, session, followedUsers, toggleFollow, isAuthenticated } from './stores';
  import { supabase } from './supabase';
  import DiscoveryCard from './DiscoveryCard.svelte';
  import {
    DISCOVERY_PAGE_SIZE,
    DISCOVERY_TABS,
    getDiscoverySurface,
    isDiscoveryRarity,
    normalizeDiscoveryQuery,
    normalizeDiscoveryResponse,
    normalizeRivalItem
  } from './discoveryData.js';
  import { readViewState, writeViewState } from './viewState.js';

  export let initialTab = 'today';

  const dispatch = createEventDispatcher();
  const RARITIES = ['Trash', 'Common', 'Uncommon', 'Rare', 'Epic', 'Anomaly', 'Mythic'];
  const RANK_SOURCES = {
    today: 'leaderboard_view',
    weekly: 'weekly_best_leaderboard_view',
    monthly: 'monthly_best_leaderboard_view',
    roll: 'all_time_leaderboard_view'
  };

  let activeTab = 'today';
  let items = [];
  let loading = true;
  let loadingMore = false;
  let loadError = '';
  let hasMore = false;
  let currentPage = 0;
  let draftSearch = '';
  let activeSearch = '';
  let rarityFilter = '';
  let myRank = null;
  let myScore = null;
  let loadRequestId = 0;
  let viewStateReady = false;

  const VIEW_STATE_NAMESPACE = 'discovery';

  $: visibleItems = items;
  $: meta = getTabMeta(activeTab);
  $: isFiltered = Boolean(activeSearch || rarityFilter);

  function getTabMeta(tab) {
    const labels = {
      today: ['Today’s strongest rolls', 'The best colors claimed today, each one attached to a living profile.'],
      rivals: ['Your rivals', 'Keep an eye on the players you chose to follow.'],
      weekly: ['This week', 'The strongest roll from each player this week.'],
      monthly: ['This month', 'The strongest roll from each player this month.'],
      roll: ['All-time roll', 'Profiles with the most memorable canonical roll on record.'],
      recent: ['Exceptional lately', 'Rare and above rolls from the last thirty days.'],
      rising: ['Rising now', 'Players with recent activity, momentum, and a strong current roll.'],
      new: ['New profiles', 'New color identities worth meeting.'],
      random: ['Random spectrum', 'A fresh daily shuffle of public profiles to explore.']
    };
    const [title, description] = labels[tab] || labels.today;
    return { title, description };
  }

  function getRankSource(tab) {
    return RANK_SOURCES[tab] || null;
  }

  async function fetchDiscovery({ reset = true } = {}) {
    const requestId = ++loadRequestId;
    const requestedPage = reset ? 0 : currentPage + 1;

    if (reset) {
      loading = true;
      items = [];
      currentPage = 0;
      myRank = null;
      myScore = null;
    } else {
      loadingMore = true;
    }
    loadError = '';

    if (activeTab === 'rivals') {
      const { data, error } = await supabase.rpc('get_rivals_scores');
      if (requestId !== loadRequestId) return;
      if (error) {
        items = [];
        loadError = 'Your rivals could not be loaded. Please retry.';
      } else {
        items = (Array.isArray(data) ? data : []).map(normalizeRivalItem).filter(Boolean).slice(0, DISCOVERY_PAGE_SIZE);
        hasMore = false;
      }
      loading = false;
      loadingMore = false;
      return;
    }

    const { data, error } = await supabase.rpc('get_public_discovery', {
      p_surface: getDiscoverySurface(activeTab),
      p_rarity: rarityFilter || null,
      p_query: activeSearch || null,
      p_page: requestedPage,
      p_limit: DISCOVERY_PAGE_SIZE
    });

    if (requestId !== loadRequestId) return;
    if (error) {
      items = reset ? [] : items;
      loadError = 'Discovery could not be loaded. Please retry.';
      loading = false;
      loadingMore = false;
      return;
    }

    const response = normalizeDiscoveryResponse(data);
    items = reset ? response.items : [...items, ...response.items];
    currentPage = response.page;
    hasMore = response.hasMore;
    await fetchMyRank(requestId);
    loading = false;
    loadingMore = false;
  }

  async function fetchMyRank(requestId) {
    if (!$isAuthenticated || requestId !== loadRequestId) return;
    const sourceName = getRankSource(activeTab);
    if (!sourceName || !$session?.user?.id) return;

    let query = supabase
      .from(sourceName)
      .select('score, rank')
      .eq('user_id', $session.user.id);
    if (activeTab === 'today') query = query.eq('roll_date', new Date().toISOString().slice(0, 10));

    const { data } = await query.maybeSingle();
    if (requestId !== loadRequestId || !data) return;
    const ownUsername = $profile?.username || '';
    if (!ownUsername || !items.some(item => item.username === ownUsername)) {
      myRank = Number(data.rank) || null;
      myScore = Number(data.score) || 0;
    }
  }

  function switchTab(tab) {
    if (!DISCOVERY_TABS.includes(tab) || tab === activeTab) return;
    activeTab = tab;
    dispatch('navigate', { view: 'leaderboard', tab });
    void fetchDiscovery({ reset: true });
  }

  function applyFilters() {
    const normalizedSearch = normalizeDiscoveryQuery(draftSearch);
    if (draftSearch.trim() && !normalizedSearch) {
      loadError = 'Search usernames with letters, numbers, or underscores.';
      return;
    }
    if (!isDiscoveryRarity(rarityFilter)) {
      rarityFilter = '';
    }
    activeSearch = normalizedSearch;
    void fetchDiscovery({ reset: true });
  }

  function clearFilters() {
    draftSearch = '';
    activeSearch = '';
    rarityFilter = '';
    void fetchDiscovery({ reset: true });
  }

  function forwardNavigation(event) {
    dispatch('navigate', event.detail);
  }

  function handleFollow(userId) {
    void toggleFollow(userId);
  }

  function canFollow(item) {
    return Boolean($isAuthenticated && item?.userId && item.userId !== $session?.user?.id && ($followedUsers.includes(item.userId) || $followedUsers.length < 5));
  }

  $: if (viewStateReady) {
    writeViewState(VIEW_STATE_NAMESPACE, 'global', {
      draftSearch: draftSearch.slice(0, 20),
      activeSearch: activeSearch.slice(0, 20),
      rarityFilter
    });
  }

  onMount(() => {
    const savedState = readViewState(VIEW_STATE_NAMESPACE, 'global', {});
    draftSearch = typeof savedState?.draftSearch === 'string' ? savedState.draftSearch.slice(0, 20) : '';
    activeSearch = typeof savedState?.activeSearch === 'string'
      ? normalizeDiscoveryQuery(savedState.activeSearch)
      : '';
    rarityFilter = savedState?.rarityFilter === '' || isDiscoveryRarity(savedState?.rarityFilter)
      ? savedState.rarityFilter || ''
      : '';
    activeTab = DISCOVERY_TABS.includes(initialTab) ? initialTab : 'today';
    viewStateReady = true;
    void fetchDiscovery({ reset: true });
  });
</script>

<main class="container discovery-hub">
  <section class="discovery-hub__intro" aria-labelledby="discovery-title">
    <div>
      <p class="discovery-hub__kicker">Public spectrum</p>
      <h1 id="discovery-title">Explore profiles.</h1>
      <p class="discovery-hub__copy">Browse public profiles and recent rolls.</p>
    </div>
    <div class="discovery-hub__privacy-note"><span aria-hidden="true">◎</span> Public profile data only</div>
  </section>

  <nav class="discovery-tabs" aria-label="Discovery views">
    <div class="discovery-tabs__group" aria-label="Leaderboards">
      <span class="discovery-tabs__label">Leaderboards</span>
      {#each ['today', 'weekly', 'monthly', 'roll', 'rivals'] as tab (tab)}
        <button type="button" class:active={activeTab === tab} aria-pressed={activeTab === tab} on:click={() => switchTab(tab)}>{tab === 'roll' ? 'All-time' : tab[0].toUpperCase() + tab.slice(1)}</button>
      {/each}
    </div>
    <div class="discovery-tabs__group" aria-label="Explore">
      <span class="discovery-tabs__label">Explore</span>
      {#each ['recent', 'rising', 'new', 'random'] as tab (tab)}
        <button type="button" class:active={activeTab === tab} aria-pressed={activeTab === tab} on:click={() => switchTab(tab)}>{tab === 'recent' ? 'Exceptional' : tab[0].toUpperCase() + tab.slice(1)}</button>
      {/each}
    </div>
  </nav>

  <section class="discovery-heading" aria-live="polite">
    <div>
      <p class="discovery-heading__eyebrow">{activeTab === 'rivals' ? 'Following' : getDiscoverySurface(activeTab)}</p>
      <h2>{meta.title}</h2>
      <p>{meta.description}</p>
    </div>
    {#if activeTab !== 'rivals'}
      <form class="discovery-filters" on:submit|preventDefault={applyFilters}>
        <label>
          <span>Search username</span>
          <input bind:value={draftSearch} inputmode="text" autocomplete="off" maxlength="20" placeholder="e.g. NeonUser" aria-label="Search public usernames" />
        </label>
        <label>
          <span>Rarity</span>
          <select bind:value={rarityFilter} aria-label="Filter by rarity">
            <option value="">Any rarity</option>
            {#each RARITIES as rarity (rarity)}<option value={rarity}>{rarity}</option>{/each}
          </select>
        </label>
        <button type="submit" class="discovery-filter-button">Filter</button>
        {#if isFiltered}<button type="button" class="discovery-clear-button" on:click={clearFilters}>Clear</button>{/if}
      </form>
    {/if}
  </section>

  {#if loading}
    <div class="discovery-grid" aria-busy="true" aria-label="Loading discovery profiles">
      {#each [1, 2, 3, 4] as placeholder (placeholder)}<div class="discovery-skeleton" data-placeholder={placeholder} aria-hidden="true"></div>{/each}
    </div>
  {:else if loadError}
    <section class="discovery-empty" role="alert">
      <p>{loadError}</p>
      <button type="button" class="discovery-filter-button" on:click={() => fetchDiscovery({ reset: true })}>Retry</button>
    </section>
  {:else if visibleItems.length === 0}
    <section class="discovery-empty">
      <p>{isFiltered ? 'No public profiles match those filters.' : activeTab === 'rivals' ? 'Follow a player from a leaderboard to build your rival list.' : 'No public discovery entries are available yet.'}</p>
      {#if isFiltered}<button type="button" class="discovery-clear-button" on:click={clearFilters}>Clear filters</button>{/if}
    </section>
  {:else}
    <div class="discovery-grid">
      {#each visibleItems as item, index (`${item.username}:${item.rollDate || item.profileCreatedAt || 'profile'}:${item.hexCode || index}`)}
        <DiscoveryCard
          item={item}
          featured={activeTab === 'today' && index === 0}
          showFollow={activeTab === 'rivals'}
          isFollowed={Boolean(item.userId && $followedUsers.includes(item.userId))}
          canFollow={canFollow(item)}
          onToggleFollow={handleFollow}
          on:navigate={forwardNavigation}
        />
      {/each}
    </div>

    {#if myRank}
      <section class="discovery-your-rank" aria-label="Your rank">
        <span>#{myRank}</span>
        <div><strong>Your current place</strong><small>{myScore.toLocaleString()} EP in this view</small></div>
      </section>
    {/if}

    {#if hasMore}
      <div class="discovery-load-more">
        <button type="button" class="discovery-filter-button" disabled={loadingMore} on:click={() => fetchDiscovery({ reset: false })}>{loadingMore ? 'Loading more…' : 'Load more profiles'}</button>
      </div>
    {/if}
  {/if}
</main>

<style>
  .discovery-hub { padding-top: 1.6rem; padding-bottom: 3.4rem; }
  .discovery-hub__intro { display: flex; align-items: flex-end; justify-content: space-between; gap: 1.5rem; margin-bottom: 1.4rem; }
  .discovery-hub__kicker, .discovery-heading__eyebrow { margin: 0 0 0.45rem; color: #ffd34f; font: 800 0.68rem/1.2 var(--font-mono-stack); letter-spacing: 0.15em; text-transform: uppercase; }
  .discovery-hub h1 { max-width: 13ch; margin: 0; color: #f5f6ff; font-size: clamp(2rem, 5vw, 3.8rem); line-height: 0.98; letter-spacing: -0.06em; }
  .discovery-hub__copy { max-width: 42rem; margin: 0.85rem 0 0; color: var(--text-muted); font-size: 0.95rem; line-height: 1.6; }
  .discovery-hub__privacy-note { display: inline-flex; align-items: center; gap: 0.45rem; flex: 0 0 auto; padding: 0.55rem 0.72rem; border: 1px solid rgba(94,234,212,0.28); border-radius: 999px; color: #a7eee5; font: 700 0.63rem/1 var(--font-mono-stack); }
  .discovery-tabs { display: flex; flex-wrap: wrap; gap: 0.55rem; margin-bottom: 1.45rem; padding: 0.7rem; border: 1px solid rgba(157,166,194,0.18); border-radius: 1rem; background: rgba(255,255,255,0.035); }
  .discovery-tabs__group { display: flex; flex-wrap: wrap; align-items: center; gap: 0.35rem; }
  .discovery-tabs__group + .discovery-tabs__group { padding-left: 0.7rem; border-left: 1px solid rgba(157,166,194,0.18); }
  .discovery-tabs__label { margin: 0 0.2rem 0 0.2rem; color: var(--text-muted); font: 800 0.58rem/1 var(--font-mono-stack); letter-spacing: 0.11em; text-transform: uppercase; }
  .discovery-tabs button, .discovery-filter-button, .discovery-clear-button { min-height: 2.25rem; padding: 0.52rem 0.75rem; border: 1px solid rgba(157,166,194,0.24); border-radius: 0.65rem; background: rgba(255,255,255,0.035); color: var(--text-muted); cursor: pointer; font: 700 0.68rem/1 var(--font-mono-stack); transition: border-color 160ms ease, background 160ms ease, color 160ms ease; }
  .discovery-tabs button:hover, .discovery-tabs button.active, .discovery-filter-button:hover, .discovery-clear-button:hover { border-color: rgba(139,124,246,0.62); background: rgba(139,124,246,0.14); color: #fff; }
  .discovery-tabs button:focus-visible, .discovery-filter-button:focus-visible, .discovery-clear-button:focus-visible, .discovery-filters input:focus-visible, .discovery-filters select:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
  .discovery-heading { display: flex; align-items: flex-end; justify-content: space-between; gap: 1.5rem; margin-bottom: 1rem; }
  .discovery-heading h2 { margin: 0; color: #eef1ff; font-size: clamp(1.35rem, 3vw, 2rem); letter-spacing: -0.035em; }
  .discovery-heading p:not(.discovery-heading__eyebrow) { max-width: 38rem; margin: 0.35rem 0 0; color: var(--text-muted); font-size: 0.82rem; line-height: 1.5; }
  .discovery-filters { display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: flex-end; gap: 0.5rem; }
  .discovery-filters label { display: flex; flex-direction: column; gap: 0.3rem; }
  .discovery-filters label > span { color: var(--text-muted); font: 700 0.58rem/1 var(--font-mono-stack); letter-spacing: 0.08em; text-transform: uppercase; }
  .discovery-filters input, .discovery-filters select { box-sizing: border-box; min-height: 2.25rem; width: 9rem; padding: 0.5rem 0.65rem; border: 1px solid rgba(157,166,194,0.27); border-radius: 0.65rem; background: rgba(4,7,18,0.72); color: #f3f5ff; font: 600 0.72rem/1 var(--font-mono-stack); }
  .discovery-filters input { width: 11rem; }
  .discovery-filters input::placeholder { color: #68738f; }
  .discovery-clear-button { border-color: transparent; background: transparent; }
  .discovery-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.85rem; }
  .discovery-empty { display: flex; align-items: center; justify-content: space-between; gap: 1rem; min-height: 9rem; padding: 1.3rem; border: 1px dashed rgba(157,166,194,0.3); border-radius: 1rem; color: var(--text-muted); }
  .discovery-empty p { margin: 0; line-height: 1.5; }
  .discovery-skeleton { min-height: 14rem; border: 1px solid rgba(157,166,194,0.13); border-radius: 1.15rem; background: linear-gradient(110deg, rgba(255,255,255,0.035) 25%, rgba(255,255,255,0.08) 37%, rgba(255,255,255,0.035) 63%); background-size: 300% 100%; animation: discovery-shimmer 1.4s ease-in-out infinite; }
  .discovery-your-rank { display: flex; align-items: center; gap: 0.8rem; width: min(100%, 28rem); margin: 1rem auto 0; padding: 0.85rem 1rem; border: 1px dashed rgba(139,124,246,0.5); border-radius: 0.85rem; background: rgba(139,124,246,0.1); }
  .discovery-your-rank > span { color: #d9cbff; font: 900 1.1rem/1 var(--font-mono-stack); }
  .discovery-your-rank div { display: flex; flex-direction: column; gap: 0.2rem; }
  .discovery-your-rank strong { color: #f4f2ff; font-size: 0.78rem; }
  .discovery-your-rank small { color: var(--text-muted); font: 600 0.65rem/1.2 var(--font-mono-stack); }
  .discovery-load-more { display: flex; justify-content: center; padding-top: 1.25rem; }
  @keyframes discovery-shimmer { from { background-position: 100% 0; } to { background-position: -100% 0; } }
  @media (max-width: 760px) {
    .discovery-hub__intro, .discovery-heading { align-items: flex-start; flex-direction: column; }
    .discovery-hub__privacy-note { align-self: flex-start; }
    .discovery-filters { justify-content: flex-start; width: 100%; }
  }
  @media (max-width: 620px) {
    .discovery-grid { grid-template-columns: 1fr; }
    .discovery-tabs__group + .discovery-tabs__group { padding-top: 0.65rem; padding-left: 0; border-top: 1px solid rgba(157,166,194,0.18); border-left: 0; }
  }
  @media (max-width: 440px) {
    .discovery-filters { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 0.85fr); }
    .discovery-filters input, .discovery-filters select { width: 100%; }
    .discovery-filters .discovery-filter-button, .discovery-filters .discovery-clear-button { align-self: end; }
  }
  @media (prefers-reduced-motion: reduce) {
    .discovery-tabs button, .discovery-filter-button, .discovery-clear-button { transition: none; }
    .discovery-skeleton { animation: none; }
  }
</style>
