<script>
  import { createEventDispatcher, onDestroy, onMount } from 'svelte';
  import HomepageDailyLeaderboard from './HomepageDailyLeaderboard.svelte';
  import { getCanonicalProfilePath } from '../routeContract.js';
  import { supabase } from '../supabase.js';
  import { normalizeDiscoveryResponse } from '../discoveryData.js';

  const DAILY_LEADERBOARD_LIMIT = 5;
  const CURRENT_USER_LOOKUP_LIMIT = 12;
  const dispatch = createEventDispatcher();
  export let isAuthenticated = false;
  export let username = '';
  let rows = [];
  let currentUser = null;
  let loading = true;
  let error = '';
  let requestId = 0;
  let mounted = false;
  let loadedIdentityKey = null;
  let resetLabel = '—';
  let resetInterval;

  $: identityKey = isAuthenticated && typeof username === 'string' ? username.trim().toLowerCase() : '';
  $: if (mounted && identityKey !== loadedIdentityKey) {
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
    const nextReset = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
    const seconds = Math.max(0, Math.floor((nextReset - now.getTime()) / 1000));
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    resetLabel = [hours, minutes, remainingSeconds].map(value => String(value).padStart(2, '0')).join(':');
  }

  async function loadCommunity() {
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

<section class="homepage-section homepage-community" id="community" aria-labelledby="homepage-community-title">
  <div class="homepage-community__copy">
    <div class="homepage-section-kicker">Today’s board</div>
    <h2 id="homepage-community-title" class="homepage-section-heading">See what everyone else <span>rolled.</span></h2>
    <p class="homepage-section-sub">Today’s five strongest public results come directly from real account rolls. Player names open the profiles behind those results.</p>
  </div>

  <div class="homepage-community__board">
    <HomepageDailyLeaderboard
      {rows}
      {currentUser}
      {loading}
      {error}
      {resetLabel}
    />
  </div>
</section>

<style>
  .homepage-community { display: grid; grid-template-columns: 0.9fr 1.1fr; align-items: center; gap: 80px; padding: 112px 0 120px; }
  .homepage-community__copy .homepage-section-heading { font-size: clamp(2.9rem, 4vw, 4.4rem); }
  .homepage-community__board { min-width: 0; display: flex; justify-content: flex-end; }
  .homepage-community__board :global(.homepage-daily-leaderboard) { width: min(100%, 480px); transform: none; }

  @media (max-width: 780px) {
    .homepage-community { grid-template-columns: 1fr; gap: 48px; padding: 88px 0 94px; }
    .homepage-community__board { justify-content: stretch; }
    .homepage-community__board :global(.homepage-daily-leaderboard) { width: 100%; }
  }
</style>
