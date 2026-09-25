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
  <section class="homepage-section homepage-community" id="community" data-homepage-reveal aria-labelledby="homepage-community-title" aria-busy={loading}>
    <div class="homepage-community__copy">
      <div>
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
        {#each visibleRows as player (player.username)}
          <HomepagePlayerCard {player} />
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
  .homepage-community__copy { display: flex; justify-content: space-between; align-items: end; gap: 40px; }
  .homepage-community__copy > div { max-width: 720px; }
  .homepage-community__copy > a { display: inline-flex; min-height: 44px; align-items: center; flex-shrink: 0; font-size: .875rem; text-underline-offset: 5px; text-decoration-color: var(--homepage-muted); }
  .homepage-community__players { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); margin-top: 36px; border-top: 1px solid var(--homepage-border); border-bottom: 1px solid var(--homepage-border); }
  .homepage-community__players :global(.homepage-player + .homepage-player) { border-left: 1px solid var(--homepage-border); }
  .homepage-community__loading, .homepage-community__error { margin: 32px 0 0; padding-block: 24px; border-block: 1px solid var(--homepage-border); color: var(--homepage-secondary-muted); font-size: .9375rem; line-height: 1.6; }
  .homepage-community__error { display: flex; flex-wrap: wrap; align-items: center; gap: 12px 24px; }
  .homepage-community__error button { min-height: 44px; border: 0; background: transparent; color: var(--homepage-text); text-decoration: underline; text-underline-offset: 4px; cursor: pointer; }
  .homepage-community__note { margin: 18px 0 0; color: var(--homepage-muted); font-size: .8125rem; line-height: 1.6; }
  a:focus-visible, button:focus-visible { outline: 2px solid currentColor; outline-offset: 5px; }
  @media (max-width: 980px) { .homepage-community__players { grid-template-columns: 1fr; } .homepage-community__players :global(.homepage-player + .homepage-player) { border-left: 0; border-top: 1px solid var(--homepage-border); } }
  @media (max-width: 700px) { .homepage-community__copy { align-items: start; flex-direction: column; gap: 16px; } .homepage-community__players { margin-top: 24px; } }
</style>
