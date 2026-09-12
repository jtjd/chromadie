<script>
  import { createEventDispatcher, onDestroy, onMount } from 'svelte';
  import HomepagePlayerCard from './HomepagePlayerCard.svelte';
  import { getCanonicalProfilePath } from '../routeContract.js';
  import { supabase } from '../supabase.js';
  import { normalizeDiscoveryResponse } from '../discoveryData.js';

  const DAILY_LEADERBOARD_LIMIT = 5;
  const COMMUNITY_FALLBACK_LIMIT = 12;
  const CURRENT_USER_LOOKUP_LIMIT = 12;
  const dispatch = createEventDispatcher();
  export let isAuthenticated = false;
  export let username = '';
  export let refreshKey = 0;

  let todayRows = [];
  let communityRows = [];
  let currentUser = null;
  let loading = true;
  let todayError = '';
  let communityError = '';
  let requestId = 0;
  let mounted = false;
  let loadedIdentityKey = null;
  let resetInterval;
  let loadedRefreshKey = -1;
  let lastDay = '';
  let communityMode = 'today';

  $: identityKey = isAuthenticated && typeof username === 'string' ? username.trim().toLowerCase() : '';
  $: visibleRows = communityRows.slice(0, 3);
  $: showSection = loading || visibleRows.length > 0 || Boolean(communityError);
  $: if (mounted && (identityKey !== loadedIdentityKey || refreshKey !== loadedRefreshKey)) {
    void loadCommunity();
  }

  function normalizeRows(data, limit = DAILY_LEADERBOARD_LIMIT) {
    return normalizeDiscoveryResponse(data).items
      .map((item, index) => {
        const profilePath = getCanonicalProfilePath(item.username);
        return profilePath ? { ...item, profilePath, displayRank: item.rank || index + 1 } : null;
      })
      .filter(Boolean)
      .slice(0, limit);
  }

  function normalizeCurrentUser(data) {
    const lookupKey = typeof username === 'string' ? username.trim().toLowerCase() : '';
    if (!lookupKey) return null;

    const item = normalizeDiscoveryResponse(data).items.find(candidate => candidate.username.toLowerCase() === lookupKey);
    const profilePath = getCanonicalProfilePath(item?.username);
    if (!item || !profilePath || !item.rank || item.score === null) return null;
    return { ...item, profilePath, displayRank: item.rank, isLocalEntry: true };
  }

  function updateResetLabel() {
    const now = new Date();
    const day = now.toISOString().slice(0, 10);
    if (lastDay && day !== lastDay) void loadCommunity();
    lastDay = day;
  }

  async function loadCommunity() {
    loadedRefreshKey = refreshKey;
    loadedIdentityKey = identityKey;
    const currentRequestId = ++requestId;
    loading = true;
    todayError = '';
    communityError = '';
    currentUser = null;
    dispatch('leaderboard', { rows: todayRows, currentUser, loading: true, error: '' });

    const lookupUsername = typeof username === 'string' ? username.trim() : '';
    const currentUserRequest = isAuthenticated && getCanonicalProfilePath(lookupUsername)
      ? supabase.rpc('get_public_discovery', {
        p_surface: 'today',
        p_rarity: null,
        p_query: lookupUsername,
        p_page: 0,
        p_limit: CURRENT_USER_LOOKUP_LIMIT
      })
      : Promise.resolve({ data: null, error: null });

    try {
      const [leaderboardResult, currentUserResult] = await Promise.all([
        supabase.rpc('get_public_discovery_spotlight', {
          p_limit: DAILY_LEADERBOARD_LIMIT
        }),
        currentUserRequest
      ]);

      if (currentRequestId !== requestId) return;

      currentUser = normalizeCurrentUser(currentUserResult.data);
      if (leaderboardResult.error) {
        todayRows = [];
        todayError = 'Public profiles could not be loaded right now.';
      } else {
        todayRows = normalizeRows(leaderboardResult.data);
      }

      dispatch('leaderboard', {
        rows: todayRows,
        currentUser,
        loading: false,
        error: todayError
      });

      if (todayRows.length) {
        communityRows = todayRows;
        communityMode = 'today';
        return;
      }

      const fallbackResult = await supabase.rpc('get_public_discovery', {
        p_surface: 'all',
        p_rarity: null,
        p_query: null,
        p_page: 0,
        p_limit: COMMUNITY_FALLBACK_LIMIT
      });

      if (currentRequestId !== requestId) return;
      if (fallbackResult.error) {
        communityRows = [];
        communityError = todayError || 'Community profiles could not be loaded right now.';
        communityMode = 'recent';
      } else {
        communityRows = normalizeRows(fallbackResult.data, COMMUNITY_FALLBACK_LIMIT);
        communityMode = 'recent';
      }
    } catch {
      if (currentRequestId !== requestId) return;
      todayRows = [];
      communityRows = [];
      todayError = 'Public profiles could not be loaded right now.';
      communityError = 'Community profiles could not be loaded right now.';
      dispatch('leaderboard', { rows: [], currentUser, loading: false, error: todayError });
    } finally {
      if (currentRequestId === requestId) loading = false;
    }
  }

  onMount(() => {
    mounted = true;
    updateResetLabel();
    resetInterval = setInterval(updateResetLabel, 1000);
    void loadCommunity();
  });

  onDestroy(() => {
    mounted = false;
    if (resetInterval) clearInterval(resetInterval);
    requestId += 1;
  });
</script>

{#if showSection}
  <section class="homepage-section homepage-community" id="community" aria-labelledby="homepage-community-title" aria-busy={loading}>
    <div class="homepage-community__copy">
      <div>
        <p class="homepage-community__eyebrow">COMMUNITY</p>
        <h2 id="homepage-community-title" class="homepage-section-heading">See who’s rolling.</h2>
        <p class="homepage-section-sub">
          {communityMode === 'today'
            ? 'Players from today’s top rolls.'
            : 'Recent public profiles from the community. Open one to see its layout, links, effects, and latest color.'}
        </p>
      </div>
      <a href="/leaderboard">View the leaderboard</a>
    </div>

    {#if loading && !visibleRows.length}
      <p class="homepage-community__loading" role="status">Loading public profiles…</p>
    {:else if visibleRows.length}
      <div class="homepage-community__players">
        {#each visibleRows as player, index (player.username)}
          <HomepagePlayerCard {player} position={index} />
        {/each}
      </div>
      {#if communityMode === 'recent'}
        <p class="homepage-community__note">No public rolls are on today’s board yet, so these are recent community profiles.</p>
      {/if}
    {:else if communityError}
      <div class="homepage-community__error" role="alert">
        <span>Community profiles are unavailable right now.</span>
        <button type="button" on:click={loadCommunity}>Try again</button>
      </div>
    {/if}
  </section>
{/if}

<style>
  .homepage-community {
    position: relative;
    padding-block: 104px 112px;
  }

  .homepage-community::before {
    position: absolute;
    inset: 14% -8% auto 46%;
    height: 260px;
    content: '';
    background: radial-gradient(ellipse, rgba(255,255,255,.035), transparent 70%);
    pointer-events: none;
  }

  .homepage-community__copy {
    position: relative;
    z-index: 1;
    display: flex;
    justify-content: space-between;
    align-items: end;
    gap: 40px;
  }

  .homepage-community__eyebrow {
    margin: 0 0 16px;
    color: var(--homepage-muted);
    font: 600 .68rem / 1.2 'Inter', sans-serif;
    letter-spacing: .13em;
  }

  .homepage-community__copy > div { max-width: 720px; }
  .homepage-community__copy > a {
    display: inline-flex;
    min-height: 44px;
    align-items: center;
    flex-shrink: 0;
    font-size: 1rem;
    text-underline-offset: 5px;
  }

  .homepage-community__players {
    position: relative;
    z-index: 1;
    display: grid;
    grid-template-columns: 1.08fr .92fr .92fr;
    gap: 18px;
    margin-top: 44px;
    align-items: stretch;
  }

  .homepage-community__loading,
  .homepage-community__error {
    margin: 32px 0 0;
    color: var(--homepage-secondary-muted);
    font-size: .95rem;
    line-height: 1.6;
  }

  .homepage-community__error {
    display: flex;
    align-items: center;
    gap: 18px;
  }

  .homepage-community__error button {
    min-height: 42px;
    border: 0;
    background: transparent;
    color: var(--homepage-text);
    text-decoration: underline;
    text-underline-offset: 4px;
    cursor: pointer;
  }

  .homepage-community__note {
    margin: 18px 0 0;
    color: var(--homepage-muted);
    font-size: .8rem;
    line-height: 1.5;
  }

  a:focus-visible,
  button:focus-visible { outline: 2px solid currentColor; outline-offset: 5px; }

  @media (max-width: 980px) {
    .homepage-community__players { grid-template-columns: 1fr 1fr; }
    .homepage-community__players :global(.homepage-player:nth-child(3)) { grid-column: 1 / -1; }
  }

  @media (max-width: 780px) {
    .homepage-community { padding-block: 64px 72px; }
    .homepage-community__copy { align-items: start; flex-direction: column; gap: 18px; }
    .homepage-community__players { grid-template-columns: 1fr; gap: 14px; margin-top: 30px; }
    .homepage-community__players :global(.homepage-player:nth-child(3)) { grid-column: auto; }
  }
</style>
