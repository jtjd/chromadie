<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import { profile, session, followedUsers, toggleFollow, isAuthenticated } from './stores';
  import { supabase } from './supabase';
  import LeaderboardEntry from './LeaderboardEntry.svelte';
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
  const BOARD_TABS = ['today', 'weekly', 'monthly', 'roll'];
  const EXPLORE_TABS = ['rivals', 'recent', 'rising', 'new', 'random'];
  const RANK_SOURCES = {
    today: 'leaderboard_view',
    weekly: 'weekly_best_leaderboard_view',
    monthly: 'monthly_best_leaderboard_view',
    roll: 'all_time_leaderboard_view'
  };
  const TAB_LABELS = {
    today: 'Today',
    weekly: 'This week',
    monthly: 'This month',
    roll: 'All-time',
    rivals: 'Following',
    recent: 'Exceptional',
    rising: 'Rising',
    new: 'New profiles',
    random: 'Random'
  };
  const TAB_META = {
    today: {
      title: 'Today’s strongest rolls',
      description: 'The highest-scoring colors rolled today.',
      scope: 'Daily / score',
      method: 'A live ranking of today’s public rolls.'
    },
    rivals: {
      title: 'Profiles you follow',
      description: 'Keep an eye on the players you chose to follow.',
      scope: 'Following / live',
      method: 'Your followed profiles, with the latest available roll.'
    },
    weekly: {
      title: 'The week’s strongest identities',
      description: 'The strongest roll from each player this week.',
      scope: 'Weekly / best roll',
      method: 'One best public roll per player for the current week.'
    },
    monthly: {
      title: 'This month’s standouts',
      description: 'The strongest roll from each player this month.',
      scope: 'Monthly / best roll',
      method: 'One best public roll per player for the current month.'
    },
    roll: {
      title: 'All-time roll leaders',
      description: 'Profiles with the strongest roll on record.',
      scope: 'All-time / score',
      method: 'The highest authoritative roll recorded for each player.'
    },
    recent: {
      title: 'Exceptional lately',
      description: 'Rare and higher rolls from the last thirty days.',
      scope: 'Recent / rarity',
      method: 'Public rare-or-better rolls from the last thirty days.'
    },
    rising: {
      title: 'Rising now',
      description: 'Players with recent activity and strong rolls.',
      scope: 'Recent / momentum',
      method: 'Recent public activity ordered by streak and score.'
    },
    new: {
      title: 'New profiles to explore',
      description: 'Recently created profiles with a color story starting to form.',
      scope: 'New / profiles',
      method: 'Public profiles ordered by when they joined.'
    },
    random: {
      title: 'A different color story',
      description: 'A daily shuffle of public profiles worth exploring.',
      scope: 'Random / daily',
      method: 'A server-seeded daily shuffle that stays stable for the day.'
    }
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

  const VIEW_STATE_NAMESPACE = 'leaderboard';

  $: meta = TAB_META[activeTab] || TAB_META.today;
  $: isFiltered = Boolean(activeSearch || rarityFilter);
  $: resultCountLabel = loading
    ? 'Loading profiles'
    : `${items.length} profile${items.length === 1 ? '' : 's'} shown`;

  function tabLabel(tab) {
    return TAB_LABELS[tab] || tab;
  }

  function getRankSource(tab) {
    return RANK_SOURCES[tab] || null;
  }

  async function fetchLeaderboard({ reset = true } = {}) {
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
        loadError = 'The profiles you follow could not be loaded. Please retry.';
      } else {
        items = (Array.isArray(data) ? data : [])
          .map(normalizeRivalItem)
          .filter(Boolean)
          .slice(0, DISCOVERY_PAGE_SIZE);
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
      loadError = 'The public board could not be loaded. Please retry.';
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
    void fetchLeaderboard({ reset: true });
  }

  function applyFilters() {
    const normalizedSearch = normalizeDiscoveryQuery(draftSearch);
    if (draftSearch.trim() && !normalizedSearch) {
      loadError = 'Search usernames with letters, numbers, or underscores.';
      return;
    }
    if (!isDiscoveryRarity(rarityFilter)) rarityFilter = '';
    activeSearch = normalizedSearch;
    void fetchLeaderboard({ reset: true });
  }

  function clearFilters() {
    draftSearch = '';
    activeSearch = '';
    rarityFilter = '';
    void fetchLeaderboard({ reset: true });
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
    activeSearch = typeof savedState?.activeSearch === 'string' ? normalizeDiscoveryQuery(savedState.activeSearch) : '';
    rarityFilter = savedState?.rarityFilter === '' || isDiscoveryRarity(savedState?.rarityFilter)
      ? savedState.rarityFilter || ''
      : '';
    activeTab = DISCOVERY_TABS.includes(initialTab) ? initialTab : 'today';
    viewStateReady = true;
    void fetchLeaderboard({ reset: true });
  });
</script>

<main class="leaderboard-studio" data-leaderboard-tab={activeTab}>
  <div class="leaderboard-studio__workspace">
    <header class="leaderboard-studio__header" aria-labelledby="leaderboard-title">
      <div class="leaderboard-studio__header-copy">
        <p class="leaderboard-studio__eyebrow">Public discovery / leaderboard</p>
        <h1 id="leaderboard-title">Profiles worth following.</h1>
        <p class="leaderboard-studio__lede">Explore the people behind the rolls, find a color story that stays with you, and make your next profile visit count.</p>
      </div>
      <div class="leaderboard-studio__visibility" role="note">
        <span class="leaderboard-studio__visibility-mark" aria-hidden="true">◎</span>
        <div><strong>Public board</strong><span>Only public profile data appears here.</span></div>
      </div>
    </header>

    <section class="leaderboard-studio__module leaderboard-studio__controls" aria-labelledby="board-controls-title">
      <div class="leaderboard-studio__module-heading">
        <div>
          <p class="leaderboard-studio__module-label">Choose a signal</p>
          <h2 id="board-controls-title">Shape the board</h2>
          <p>Switch between ranked timeframes and open discovery views without leaving the public surface.</p>
        </div>
        <span class="leaderboard-studio__mode-chip">{meta.scope}</span>
      </div>

      <div class="leaderboard-studio__tab-rail">
        <div class="leaderboard-studio__tab-group">
          <span class="leaderboard-studio__tab-label">Ranked boards</span>
          <div class="leaderboard-studio__tab-list" role="tablist" aria-label="Ranked boards">
            {#each BOARD_TABS as tab (tab)}
              <button type="button" role="tab" aria-selected={activeTab === tab} class:active={activeTab === tab} on:click={() => switchTab(tab)}>{tabLabel(tab)}</button>
            {/each}
          </div>
        </div>
        <div class="leaderboard-studio__tab-group">
          <span class="leaderboard-studio__tab-label">Explore</span>
          <div class="leaderboard-studio__tab-list" role="tablist" aria-label="Explore profiles">
            {#each EXPLORE_TABS as tab (tab)}
              <button type="button" role="tab" aria-selected={activeTab === tab} class:active={activeTab === tab} on:click={() => switchTab(tab)}>{tabLabel(tab)}</button>
            {/each}
          </div>
        </div>
      </div>

      {#if activeTab !== 'rivals'}
        <form class="leaderboard-studio__filters" on:submit|preventDefault={applyFilters}>
          <label class="leaderboard-studio__field leaderboard-studio__field--search">
            <span>Search username</span>
            <input bind:value={draftSearch} inputmode="text" autocomplete="off" maxlength="20" placeholder="e.g. NeonUser" aria-label="Search public usernames" />
          </label>
          <label class="leaderboard-studio__field">
            <span>Rarity</span>
            <select bind:value={rarityFilter} aria-label="Filter by rarity">
              <option value="">Any rarity</option>
              {#each RARITIES as rarity (rarity)}<option value={rarity}>{rarity}</option>{/each}
            </select>
          </label>
          <button type="submit" class="leaderboard-studio__button leaderboard-studio__button--solid">Apply filters</button>
          {#if isFiltered}<button type="button" class="leaderboard-studio__button" on:click={clearFilters}>Clear</button>{/if}
        </form>
      {/if}
    </section>

    <div class="leaderboard-studio__body">
      <section class="leaderboard-studio__results leaderboard-studio__module" aria-labelledby="leaderboard-results-title" aria-live="polite">
        <header class="leaderboard-studio__results-heading">
          <div>
            <p class="leaderboard-studio__module-label">{activeTab === 'rivals' ? 'Following' : getDiscoverySurface(activeTab)}</p>
            <h2 id="leaderboard-results-title">{meta.title}</h2>
            <p>{meta.description}</p>
          </div>
          <span class="leaderboard-studio__result-count">{resultCountLabel}</span>
        </header>

        {#if loading}
          <div class="leaderboard-studio__list" aria-busy="true" aria-label="Loading leaderboard profiles">
            {#each [1, 2, 3, 4, 5] as placeholder (placeholder)}
              <div class="leaderboard-studio__skeleton" data-placeholder={placeholder} aria-hidden="true">
                <span></span><span></span><span></span><span></span>
              </div>
            {/each}
          </div>
        {:else if loadError}
          <div class="leaderboard-studio__state" role="alert">
            <div><strong>Board unavailable</strong><p>{loadError}</p></div>
            <button type="button" class="leaderboard-studio__button leaderboard-studio__button--solid" on:click={() => fetchLeaderboard({ reset: true })}>Retry</button>
          </div>
        {:else if items.length === 0}
          <div class="leaderboard-studio__state">
            <div><strong>{isFiltered ? 'No matching profiles' : activeTab === 'rivals' ? 'Your following list is empty' : 'No profiles on this board yet'}</strong><p>{isFiltered ? 'Try a different username or rarity.' : activeTab === 'rivals' ? 'Follow a player from a ranked board to build this list.' : 'Check back after the next public roll.'}</p></div>
            {#if isFiltered}<button type="button" class="leaderboard-studio__button" on:click={clearFilters}>Clear filters</button>{/if}
          </div>
        {:else}
          <ol class="leaderboard-studio__list" aria-label={`${meta.title} profiles`}>
            {#each items as item, index (`${item.username}:${item.rollDate || item.profileCreatedAt || 'profile'}:${item.hexCode || index}`)}
              <li class="leaderboard-studio__list-item">
                <LeaderboardEntry
                  item={item}
                  position={index}
                  featured={activeTab === 'today' && index === 0}
                  showFollow={activeTab === 'rivals'}
                  isFollowed={Boolean(item.userId && $followedUsers.includes(item.userId))}
                  canFollow={canFollow(item)}
                  onToggleFollow={handleFollow}
                  on:navigate={forwardNavigation}
                />
              </li>
            {/each}
          </ol>

          {#if hasMore}
            <div class="leaderboard-studio__load-more">
              <button type="button" class="leaderboard-studio__button" disabled={loadingMore} on:click={() => fetchLeaderboard({ reset: false })}>{loadingMore ? 'Loading more…' : 'Load more profiles'}</button>
            </div>
          {/if}
        {/if}
      </section>

      <aside class="leaderboard-studio__aside" aria-label="Leaderboard context">
        <section class="leaderboard-studio__module leaderboard-studio__side-module">
          <p class="leaderboard-studio__module-label">Board notes</p>
          <h2>{meta.scope}</h2>
          <p>{meta.method}</p>
          <dl class="leaderboard-studio__facts">
            <div><dt>Visibility</dt><dd>Public profiles</dd></div>
            <div><dt>Data source</dt><dd>Authoritative rolls</dd></div>
            <div><dt>Page size</dt><dd>{DISCOVERY_PAGE_SIZE} profiles</dd></div>
          </dl>
        </section>

        {#if myRank}
          <section class="leaderboard-studio__module leaderboard-studio__rank-module" aria-label="Your rank">
            <div class="leaderboard-studio__rank-badge">#{myRank}</div>
            <div><p class="leaderboard-studio__module-label">Your place</p><h2>You’re on the board.</h2><p>{myScore.toLocaleString()} EP in this view.</p></div>
          </section>
        {:else}
          <section class="leaderboard-studio__module leaderboard-studio__next-module">
            <span class="leaderboard-studio__next-mark" aria-hidden="true">+</span>
            <div><p class="leaderboard-studio__module-label">Make a mark</p><h2>Your profile is the next story.</h2><p>Roll daily, build your identity, and give people a reason to visit you back.</p></div>
            <a href="/?view=game">Roll today <span aria-hidden="true">↗</span></a>
          </section>
        {/if}
      </aside>
    </div>
  </div>
</main>

<style>
  .leaderboard-studio {
    --studio-background: #050506;
    --studio-panel: rgba(12, 12, 15, .78);
    --studio-panel-card: rgba(10, 10, 12, .58);
    --studio-control: rgba(255, 255, 255, .035);
    --studio-border: rgba(255, 255, 255, .1);
    --studio-border-strong: rgba(255, 255, 255, .2);
    --studio-text: #f8f8f8;
    --studio-secondary: #bfc0c5;
    --studio-muted: #8f9099;
    --studio-faint: #686971;
    --studio-accent: #00ffb3;
    position: relative;
    isolation: isolate;
    min-height: calc(100dvh - 4.25rem);
    box-sizing: border-box;
    overflow: hidden;
    background: var(--studio-background);
    color: var(--studio-text);
    font-family: 'Inter', var(--font-body-stack, sans-serif);
    color-scheme: dark;
  }
  .leaderboard-studio::before { position: absolute; inset: 0; z-index: -1; background: linear-gradient(90deg, transparent 0 49.95%, rgba(255,255,255,.025) 50%, transparent 50.05%), linear-gradient(rgba(255,255,255,.018) 1px, transparent 1px); background-size: 100% 100%, 100% 4.5rem; mask-image: linear-gradient(to bottom, rgba(0,0,0,.65), transparent 70%); content: ''; pointer-events: none; }
  .leaderboard-studio__workspace { width: min(calc(100% - 3rem), 78rem); margin-inline: auto; padding: 4rem 0 5.5rem; }
  .leaderboard-studio__header { display: flex; align-items: flex-end; justify-content: space-between; gap: 2rem; padding-bottom: 2.75rem; }
  .leaderboard-studio__header-copy { max-width: 47rem; }
  .leaderboard-studio__eyebrow,
  .leaderboard-studio__module-label,
  .leaderboard-studio__tab-label { margin: 0; color: var(--studio-faint); font: 500 .66rem/1 'Inter', var(--font-body-stack, sans-serif); letter-spacing: .13em; text-transform: uppercase; }
  .leaderboard-studio__header h1 { max-width: 12ch; margin: .75rem 0 0; color: var(--studio-text); font: 600 clamp(3.2rem, 7vw, 6rem)/.9 'Clash Display', var(--font-display-stack, sans-serif) !important; letter-spacing: -.055em; }
  .leaderboard-studio__lede { max-width: 38rem; margin: 1.35rem 0 0; color: var(--studio-muted); font: 400 .95rem/1.6 'Inter', var(--font-body-stack, sans-serif); }
  .leaderboard-studio__visibility { display: flex; align-items: flex-start; gap: .7rem; min-width: 14rem; padding-top: .2rem; color: var(--studio-secondary); }
  .leaderboard-studio__visibility-mark { display: grid; place-items: center; width: 1.65rem; height: 1.65rem; border: 1px solid color-mix(in srgb, var(--studio-accent) 56%, transparent); border-radius: 50%; color: var(--studio-accent); font-size: 1rem; }
  .leaderboard-studio__visibility div { display: grid; gap: .32rem; }
  .leaderboard-studio__visibility strong { color: var(--studio-text); font: 600 .76rem/1 'Inter', var(--font-body-stack, sans-serif); }
  .leaderboard-studio__visibility span:not(.leaderboard-studio__visibility-mark) { color: var(--studio-muted); font: 400 .68rem/1.35 'Inter', var(--font-body-stack, sans-serif); }

  .leaderboard-studio__module { border: 1px solid var(--studio-border); background: var(--studio-panel); box-shadow: 0 1.5rem 4rem rgba(0,0,0,.16); }
  .leaderboard-studio__controls { padding: 1.45rem; }
  .leaderboard-studio__module-heading,
  .leaderboard-studio__results-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 1.5rem; }
  .leaderboard-studio__module-heading h2,
  .leaderboard-studio__results-heading h2,
  .leaderboard-studio__side-module h2,
  .leaderboard-studio__rank-module h2,
  .leaderboard-studio__next-module h2 { margin: .55rem 0 0; color: var(--studio-text); font: 600 1.35rem/1.05 'Clash Display', var(--font-display-stack, sans-serif) !important; letter-spacing: -.035em; }
  .leaderboard-studio__module-heading p:not(.leaderboard-studio__module-label),
  .leaderboard-studio__results-heading p:not(.leaderboard-studio__module-label),
  .leaderboard-studio__side-module > p:not(.leaderboard-studio__module-label),
  .leaderboard-studio__rank-module p:not(.leaderboard-studio__module-label),
  .leaderboard-studio__next-module p:not(.leaderboard-studio__module-label) { max-width: 38rem; margin: .55rem 0 0; color: var(--studio-muted); font: 400 .77rem/1.5 'Inter', var(--font-body-stack, sans-serif); }
  .leaderboard-studio__mode-chip { flex: 0 0 auto; padding: .42rem .58rem; border: 1px solid var(--studio-border-strong); color: var(--studio-secondary); font: 500 .61rem/1 'Inter', var(--font-body-stack, sans-serif); letter-spacing: .04em; text-transform: uppercase; }
  .leaderboard-studio__tab-rail { display: grid; grid-template-columns: 1fr 1fr; gap: 1.4rem; margin-top: 1.5rem; padding: .85rem 0 .35rem; border-top: 1px solid var(--studio-border); border-bottom: 1px solid var(--studio-border); }
  .leaderboard-studio__tab-group { min-width: 0; }
  .leaderboard-studio__tab-label { display: block; margin-bottom: .55rem; font-size: .58rem; }
  .leaderboard-studio__tab-list { display: flex; flex-wrap: wrap; gap: .25rem .95rem; }
  .leaderboard-studio__tab-list button { position: relative; min-height: 2.45rem; padding: .55rem 0; border: 0; border-bottom: 2px solid transparent; background: transparent; color: var(--studio-muted); cursor: pointer; font: 500 .74rem/1 'Inter', var(--font-body-stack, sans-serif); }
  .leaderboard-studio__tab-list button:hover,
  .leaderboard-studio__tab-list button:focus-visible,
  .leaderboard-studio__tab-list button.active { color: var(--studio-text); }
  .leaderboard-studio__tab-list button.active { border-bottom-color: var(--studio-accent); }
  .leaderboard-studio__filters { display: flex; flex-wrap: wrap; align-items: flex-end; gap: .55rem; margin-top: 1.1rem; }
  .leaderboard-studio__field { display: grid; gap: .35rem; min-width: 8.5rem; }
  .leaderboard-studio__field--search { width: min(100%, 15rem); }
  .leaderboard-studio__field > span { color: var(--studio-faint); font: 500 .58rem/1 'Inter', var(--font-body-stack, sans-serif); letter-spacing: .08em; text-transform: uppercase; }
  .leaderboard-studio__field :is(input, select) { box-sizing: border-box; width: 100%; min-height: 2.55rem; padding: .55rem .65rem; border: 1px solid var(--studio-border); border-radius: .4rem; background: var(--studio-control); color: var(--studio-text); color-scheme: dark; font: 500 .72rem/1 'Inter', var(--font-body-stack, sans-serif); }
  .leaderboard-studio__field input::placeholder { color: var(--studio-faint); }
  .leaderboard-studio__button { display: inline-flex; align-items: center; justify-content: center; min-height: 2.55rem; padding: .55rem .8rem; border: 1px solid var(--studio-border-strong); border-radius: .4rem; background: transparent; color: var(--studio-secondary); cursor: pointer; font: 500 .7rem/1 'Inter', var(--font-body-stack, sans-serif); }
  .leaderboard-studio__button:hover:not(:disabled),
  .leaderboard-studio__button:focus-visible { border-color: var(--studio-accent); color: var(--studio-text); }
  .leaderboard-studio__button--solid { border-color: var(--studio-accent); background: var(--studio-accent); color: #050506; font-weight: 600; }
  .leaderboard-studio__button--solid:hover:not(:disabled),
  .leaderboard-studio__button--solid:focus-visible { border-color: #8affd4; background: #8affd4; color: #050506; }
  .leaderboard-studio__button:disabled { cursor: wait; opacity: .55; }
  :global(.leaderboard-studio button:focus-visible), :global(.leaderboard-studio a:focus-visible), :global(.leaderboard-studio input:focus-visible), :global(.leaderboard-studio select:focus-visible) { outline: 2px solid var(--studio-accent); outline-offset: 3px; }

  .leaderboard-studio__body { display: grid; grid-template-columns: minmax(0, 1fr) minmax(16rem, 20rem); gap: 1rem; align-items: start; margin-top: 1rem; }
  .leaderboard-studio__results { min-width: 0; overflow: hidden; }
  .leaderboard-studio__results-heading { padding: 1.35rem 1.45rem; border-bottom: 1px solid var(--studio-border); background: rgba(255,255,255,.02); }
  .leaderboard-studio__results-heading h2 { margin-top: .5rem; font-size: 1.55rem; }
  .leaderboard-studio__results-heading p:not(.leaderboard-studio__module-label) { max-width: 32rem; }
  .leaderboard-studio__result-count { flex: 0 0 auto; padding-top: .15rem; color: var(--studio-faint); font: 500 .62rem/1 'Inter', var(--font-body-stack, sans-serif); }
  .leaderboard-studio__list { margin: 0; padding: 0; list-style: none; }
  .leaderboard-studio__list-item { min-width: 0; }
  .leaderboard-studio__list-item :global(.leaderboard-entry-border) { border-top: 0; }
  .leaderboard-studio__load-more { display: flex; justify-content: center; padding: 1rem; border-top: 1px solid var(--studio-border); }
  .leaderboard-studio__state { display: flex; align-items: center; justify-content: space-between; gap: 1.25rem; min-height: 10rem; padding: 1.4rem; }
  .leaderboard-studio__state strong { color: var(--studio-text); font: 600 .9rem/1 'Inter', var(--font-body-stack, sans-serif); }
  .leaderboard-studio__state p { max-width: 28rem; margin: .45rem 0 0; color: var(--studio-muted); font: 400 .76rem/1.5 'Inter', var(--font-body-stack, sans-serif); }
  .leaderboard-studio__skeleton { display: grid; grid-template-columns: 3rem minmax(4rem, .25fr) minmax(10rem, 1fr) minmax(6rem, .4fr); gap: 1rem; align-items: center; min-height: 8rem; padding: 1rem 1.15rem; border-top: 1px solid var(--studio-border); }
  .leaderboard-studio__skeleton:first-child { border-top: 0; }
  .leaderboard-studio__skeleton span { display: block; height: .72rem; border-radius: .2rem; background: linear-gradient(90deg, rgba(255,255,255,.035), rgba(255,255,255,.1), rgba(255,255,255,.035)); background-size: 240% 100%; animation: leaderboard-studio-shimmer 1.5s ease-in-out infinite; }
  .leaderboard-studio__skeleton span:nth-child(2) { width: 3.25rem; height: 3.25rem; border-radius: .5rem; }
  .leaderboard-studio__skeleton span:nth-child(3) { width: 70%; }
  .leaderboard-studio__skeleton span:nth-child(4) { width: 80%; justify-self: end; }
  .leaderboard-studio__aside { display: grid; gap: 1rem; }
  .leaderboard-studio__side-module,
  .leaderboard-studio__rank-module,
  .leaderboard-studio__next-module { padding: 1.25rem; }
  .leaderboard-studio__side-module h2 { margin-top: .65rem; font-size: 1.05rem; }
  .leaderboard-studio__facts { display: grid; gap: .75rem; margin: 1.3rem 0 0; padding-top: 1rem; border-top: 1px solid var(--studio-border); }
  .leaderboard-studio__facts div { display: flex; justify-content: space-between; gap: .7rem; }
  .leaderboard-studio__facts dt { color: var(--studio-faint); font: 500 .65rem/1.2 'Inter', var(--font-body-stack, sans-serif); }
  .leaderboard-studio__facts dd { margin: 0; color: var(--studio-secondary); font: 500 .65rem/1.2 'Inter', var(--font-body-stack, sans-serif); text-align: right; }
  .leaderboard-studio__rank-module { display: flex; align-items: flex-start; gap: .8rem; border-color: color-mix(in srgb, var(--studio-accent) 36%, var(--studio-border)); }
  .leaderboard-studio__rank-badge { flex: 0 0 auto; display: grid; place-items: center; width: 3.1rem; height: 3.1rem; border: 1px solid var(--studio-accent); color: var(--studio-accent); font: 600 1rem/1 'Clash Display', var(--font-display-stack, sans-serif); }
  .leaderboard-studio__rank-module h2 { margin-top: .45rem; font-size: 1rem; }
  .leaderboard-studio__next-module { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: .75rem; }
  .leaderboard-studio__next-mark { display: grid; place-items: center; width: 1.65rem; height: 1.65rem; border: 1px solid var(--studio-border-strong); color: var(--studio-accent); font: 400 1.1rem/1 'Inter', sans-serif; }
  .leaderboard-studio__next-module a { grid-column: 2; width: fit-content; margin-top: .35rem; color: var(--studio-accent); font: 600 .7rem/1 'Inter', var(--font-body-stack, sans-serif); text-decoration: none; }
  .leaderboard-studio__next-module a:hover { color: var(--studio-text); }
  @keyframes leaderboard-studio-shimmer { 0% { background-position: 100% 0; } 100% { background-position: -100% 0; } }

  @media (max-width: 980px) {
    .leaderboard-studio__workspace { width: min(calc(100% - 2rem), 48rem); padding-top: 3rem; }
    .leaderboard-studio__header { align-items: flex-start; flex-direction: column; gap: 1.25rem; }
    .leaderboard-studio__visibility { min-width: 0; }
    .leaderboard-studio__body { grid-template-columns: minmax(0, 1fr); }
    .leaderboard-studio__aside { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  }

  @media (max-width: 700px) {
    .leaderboard-studio__workspace { width: calc(100% - 1.25rem); padding-top: 2.25rem; padding-bottom: 3.5rem; }
    .leaderboard-studio__header { padding-bottom: 2rem; }
    .leaderboard-studio__header h1 { font-size: clamp(2.9rem, 14vw, 4.5rem) !important; }
    .leaderboard-studio__lede { font-size: .86rem; }
    .leaderboard-studio__controls { padding: 1rem; }
    .leaderboard-studio__module-heading { gap: .8rem; }
    .leaderboard-studio__mode-chip { font-size: .55rem; }
    .leaderboard-studio__tab-rail { grid-template-columns: 1fr; gap: .8rem; }
    .leaderboard-studio__tab-group + .leaderboard-studio__tab-group { padding-top: .8rem; border-top: 1px solid var(--studio-border); }
    .leaderboard-studio__filters { align-items: stretch; }
    .leaderboard-studio__field--search { width: 100%; }
    .leaderboard-studio__filters .leaderboard-studio__field:not(.leaderboard-studio__field--search) { flex: 1 1 8rem; }
    .leaderboard-studio__filters .leaderboard-studio__button { flex: 1 1 auto; }
    .leaderboard-studio__results-heading { padding: 1.1rem; }
    .leaderboard-studio__state { align-items: flex-start; flex-direction: column; }
    .leaderboard-studio__aside { grid-template-columns: 1fr; }
  }

  @media (max-width: 420px) {
    .leaderboard-studio__module-heading, .leaderboard-studio__results-heading { flex-direction: column; }
    .leaderboard-studio__mode-chip, .leaderboard-studio__result-count { align-self: flex-start; }
    .leaderboard-studio__filters { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, .85fr); }
    .leaderboard-studio__field--search { grid-column: 1 / -1; }
    .leaderboard-studio__filters .leaderboard-studio__button { width: 100%; }
  }

  @media (prefers-reduced-motion: reduce) {
    .leaderboard-studio__skeleton span { animation: none; }
  }
</style>
