<script>
  import { createEventDispatcher, onDestroy, onMount } from 'svelte';
  import { getCanonicalProfilePath } from '../routeContract.js';
  import { supabase } from '../supabase.js';
  import { normalizeDiscoveryResponse } from '../discoveryData.js';
  import { normalizeHexColor } from '../utils.js';

  const COMMUNITY_LIMIT = 3;
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
      .slice(0, COMMUNITY_LIMIT);
  }

  function normalizeCurrentUser(data) {
    const lookupKey = typeof username === 'string' ? username.trim().toLowerCase() : '';
    if (!lookupKey) return null;

    const item = normalizeDiscoveryResponse(data).items.find(candidate => candidate.username.toLowerCase() === lookupKey);
    const profilePath = getCanonicalProfilePath(item?.username);
    if (!item || !profilePath || !item.rank || item.score === null) return null;
    return { ...item, profilePath, displayRank: item.rank, isLocalEntry: true };
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
        supabase.rpc('get_public_discovery', {
          p_surface: 'today',
          p_rarity: null,
          p_query: null,
          p_page: 0,
          p_limit: COMMUNITY_LIMIT
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
    void loadCommunity();
  });

  onDestroy(() => {
    mounted = false;
    requestId += 1;
  });
</script>

<section class="homepage-section homepage-community" id="community" aria-labelledby="homepage-community-title">
  <div class="homepage-community__copy">
    <div class="homepage-section-kicker">A little competition</div>
    <h2 id="homepage-community-title" class="homepage-section-heading">The roll gives the profile a <span>social pulse.</span></h2>
    <p class="homepage-section-sub">Daily and longer-term leaderboard views make strong rolls visible without turning the profile itself into a game dashboard.</p>
  </div>

  <div class="homepage-leaderboard" aria-label="Today’s public leaderboard" aria-busy={loading} aria-live="polite">
    {#if rows.length}
      {#each rows as row, index (row.username)}
        {@const color = normalizeHexColor(row.hexCode, row.profileAccent || '#6F6F79')}
        <a class="homepage-leader-row" href={row.profilePath} style={`--homepage-row-color: ${color};`} aria-label={`Open ${row.displayName || row.username}'s public profile`}>
          <span class:top={index === 0} class="homepage-leader-rank">{String(row.displayRank).padStart(2, '0')}</span>
          <span class="homepage-leader-name">{row.displayName || row.username}</span>
          <span class="homepage-leader-score">{row.score === null || row.score === undefined ? '—' : `${Number(row.score).toLocaleString()} EP`}</span>
          <span class="homepage-leader-color" style={`background: ${color}; color: ${color};`} aria-label={`Color ${color}`}></span>
        </a>
      {/each}
    {:else if loading}
      <div class="homepage-leaderboard__state" role="status">Loading today’s public profiles.</div>
    {:else if error}
      <div class="homepage-leaderboard__state" role="alert">
        <span>{error}</span>
        <button type="button" on:click={loadCommunity}>Retry</button>
      </div>
    {:else}
      <div class="homepage-leaderboard__state">
        <span>No public profiles are on today’s board yet.</span>
        <a href="#claim">Claim a page</a>
      </div>
    {/if}
  </div>
</section>

<style>
  .homepage-community { display: grid; grid-template-columns: 0.9fr 1.1fr; align-items: center; gap: 80px; padding: 112px 0 120px; }
  .homepage-community__copy .homepage-section-heading { font-size: clamp(2.9rem, 4vw, 4.4rem); }
  .homepage-leaderboard { border-top: 1px solid var(--homepage-border); }
  .homepage-leader-row { display: grid; grid-template-columns: 50px 1fr auto 18px; align-items: center; gap: 16px; min-height: 70px; border-bottom: 1px solid var(--homepage-border); color: inherit; text-decoration: none; }
  .homepage-leader-row:hover,
  .homepage-leader-row:focus-visible { background: rgba(255, 255, 255, 0.025); }
  .homepage-leader-row:focus-visible { outline: 2px solid var(--homepage-accent); outline-offset: -2px; }
  .homepage-leader-rank { color: var(--homepage-muted); font: 400 0.92rem / 1 var(--homepage-display); }
  .homepage-leader-rank.top { color: var(--homepage-accent); }
  .homepage-leader-name { min-width: 0; overflow: hidden; color: var(--homepage-text); font: 500 0.95rem / 1.2 var(--homepage-display); text-overflow: ellipsis; white-space: nowrap; }
  .homepage-leader-score { color: rgba(245, 245, 247, 0.82); font: 600 0.8rem / 1 'Inter', sans-serif; white-space: nowrap; }
  .homepage-leader-color { width: 10px; height: 10px; border-radius: 3px; box-shadow: 0 0 11px currentColor; }
  .homepage-leaderboard__state { display: flex; min-height: 70px; align-items: center; justify-content: space-between; gap: 16px; border-bottom: 1px solid var(--homepage-border); color: var(--homepage-muted); font: 400 0.82rem / 1.45 'Inter', sans-serif; }
  .homepage-leaderboard__state button,
  .homepage-leaderboard__state a { padding: 0; border: 0; background: transparent; color: var(--homepage-accent); font: 600 0.72rem / 1 'Inter', sans-serif; text-decoration: none; cursor: pointer; }

  @media (max-width: 780px) {
    .homepage-community { grid-template-columns: 1fr; gap: 48px; padding: 88px 0 94px; }
  }

  @media (prefers-reduced-motion: reduce) {
    .homepage-leader-row { transition: none; }
  }
</style>
