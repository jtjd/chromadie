<script>
  import { createEventDispatcher, onDestroy, onMount } from 'svelte';
  import HomepagePlayerCard from './HomepagePlayerCard.svelte';
  import { getCanonicalProfilePath } from '../routeContract.js';
  import { supabase } from '../supabase.js';
  import { normalizeDiscoveryResponse } from '../discoveryData.js';

  const DAILY_LEADERBOARD_LIMIT = 5;
  const CURRENT_USER_LOOKUP_LIMIT = 12;
  const dispatch = createEventDispatcher();
  export let isAuthenticated = false;
  export let username = '';
  export let refreshKey = 0;
  let rows = [];
  let currentUser = null;
  let loading = true;
  let error = '';
  let requestId = 0;
  let mounted = false;
  let loadedIdentityKey = null;
  let resetInterval;
  let loadedRefreshKey = -1;
  let lastDay = '';

  $: identityKey = isAuthenticated && typeof username === 'string' ? username.trim().toLowerCase() : '';
  $: if (mounted && (identityKey !== loadedIdentityKey || refreshKey !== loadedRefreshKey)) {
    void loadCommunity();
  }

  function normalizeRows(data) {
    return normalizeDiscoveryResponse(data).items
      .map((item, index) => {
        const profilePath = getCanonicalProfilePath(item.username);
        return profilePath ? { ...item, profilePath, displayRank: item.rank || index + 1 } : null;
      })
      .filter(Boolean)
      .slice(0, DAILY_LEADERBOARD_LIMIT);
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
    error = '';
    currentUser = null;
    dispatch('leaderboard', { rows, currentUser, loading, error });

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
      if (leaderboardResult.error) {
        rows = [];
        currentUser = normalizeCurrentUser(currentUserResult.data);
        error = 'Public profiles could not be loaded right now.';
      } else {
        rows = normalizeRows(leaderboardResult.data);
        currentUser = normalizeCurrentUser(currentUserResult.data);
      }
    } catch {
      if (currentRequestId !== requestId) return;
      rows = [];
      error = 'Public profiles could not be loaded right now.';
    } finally {
      if (currentRequestId === requestId) {
        loading = false;
        dispatch('leaderboard', { rows, currentUser, loading, error });
      }
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

<section class="homepage-section homepage-community" class:homepage-community--empty={!loading && !error && !rows.length} id="community" aria-labelledby="homepage-community-title" aria-busy={loading}>
  <div class="homepage-community__copy">
    <div>
    <h2 id="homepage-community-title" class="homepage-section-heading">See who’s rolling.</h2>
    <p class="homepage-section-sub">Players from today’s top rolls. Open their profiles to see their layouts, links, and collections.</p></div>
    <a href="/leaderboard">View the leaderboard</a>
  </div>
  {#if loading}<p class="homepage-community__state" role="status">Loading public profiles…</p>
  {:else if error}<div class="homepage-community__state" role="alert"><p>{error}</p><button type="button" on:click={loadCommunity}>Try again</button></div>
  {:else if rows.length}<div class="homepage-community__players">{#each rows.slice(0, 3) as player (player.username)}<HomepagePlayerCard {player} />{/each}</div>
  {:else}<p class="homepage-community__state">No public rolls yet today. Profiles will appear here as players roll.</p>
  {/if}
</section>

<style>
  .homepage-community { padding-block: 80px; border-top: 1px solid var(--homepage-border); }
  .homepage-community__copy { display: flex; justify-content: space-between; align-items: end; gap: 32px; }
  .homepage-community__copy > a { display: inline-flex; align-items: center; min-height: 44px; flex-shrink: 0; font-size: 1rem; text-underline-offset: 5px; }
  .homepage-community__players { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 24px; margin-top: 36px; }
  .homepage-community__state { margin: 32px 0 0; padding: 24px; border: 1px solid var(--homepage-border); border-radius: var(--homepage-radius); color: var(--homepage-secondary-muted); font-size: .95rem; line-height: 1.6; }
  .homepage-community__state p { margin: 0 0 12px; }
  .homepage-community__state button { min-height: 44px; }
  a:focus-visible, button:focus-visible { outline: 2px solid currentColor; outline-offset: 5px; }
  @media (max-width: 780px) {
    .homepage-community { padding-block: 56px; }
    .homepage-community__copy { align-items: start; flex-direction: column; gap: 16px; }
    .homepage-community__players { grid-template-columns: 1fr; gap: 16px; margin-top: 24px; }
  }
</style>
