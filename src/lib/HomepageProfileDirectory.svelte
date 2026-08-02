<script>
  import { onDestroy, onMount } from 'svelte';
  import HomepageLiveTicker from './HomepageLiveTicker.svelte';
  import { supabase } from './supabase.js';
  import { loadProfileContext } from './profileData.js';
  import { normalizeDiscoveryResponse } from './discoveryData.js';
  import { getCanonicalProfilePath } from './routeContract.js';
  import {
    collectHomepageCandidates,
    collectHomepageRollEvents,
    KNOWN_STAFF_SHOWCASE_USERNAMES
  } from './homepageDirectory.js';

  const DISCOVERY_SURFACES = ['today', 'recent', 'new', 'all_time'];
  const REFRESH_INTERVAL_MS = 60_000;

  const EMPTY_DIRECTORY = Object.freeze({
    loading: true,
    error: '',
    tickerEvents: [],
    leaderboard: [],
    heroRoll: null,
    heroModel: null
  });

  /** @type {any} */
  let directory = EMPTY_DIRECTORY;
  let hasLoaded = false;
  let requestId = 0;
  let refreshTimer;

  async function fetchDiscoverySurface(surface) {
    const response = await supabase.rpc('get_public_discovery', {
      p_surface: surface,
      p_rarity: null,
      p_query: null,
      p_page: 0,
      p_limit: 12
    });
    return { surface, data: response.data, error: response.error };
  }

  async function hydrateProfile(candidate) {
    const context = await loadProfileContext({
      supabaseClient: supabase,
      isAuthenticated: false,
      sessionUserId: null,
      currentUsername: '',
      profileUsername: candidate.username
    });
    if (!context.targetProfile?.username) return null;
    return {
      context,
      discoveryItem: candidate,
      profilePath: getCanonicalProfilePath(context.targetProfile.username) || '#'
    };
  }

  function toHomepageRow(item) {
    const profilePath = getCanonicalProfilePath(item?.username);
    return profilePath ? { ...item, profilePath } : null;
  }

  async function loadDirectory() {
    const currentRequest = ++requestId;
    directory = { ...directory, loading: !hasLoaded, error: '' };
    try {
      const responses = await Promise.all(DISCOVERY_SURFACES.map(fetchDiscoverySurface));
      if (currentRequest !== requestId) return;
      const failedCount = responses.filter(response => response.error).length;
      const normalizedSurfaces = responses.map(response => ({
        ...response,
        normalized: normalizeDiscoveryResponse(response.data)
      }));
      let candidates = collectHomepageCandidates(responses);

      if (!candidates.some(candidate => candidate.isStaff)) {
        candidates = [
          ...KNOWN_STAFF_SHOWCASE_USERNAMES.map(username => ({
            username,
            isStaff: true,
            sourceSurface: 'showcase',
            rank: null
          })),
          ...candidates
        ];
      }

      const hydrated = (await Promise.all(candidates.slice(0, 12).map(hydrateProfile))).filter(Boolean);
      if (currentRequest !== requestId) return;

      const todayItems = normalizedSurfaces
        .find(response => response.surface === 'today')?.normalized.items || [];
      const leaderboard = todayItems
        .map(toHomepageRow)
        .filter(Boolean)
        .slice(0, 3);
      const hydratedByUsername = new Map(hydrated.map(model => [model.discoveryItem.username.toLowerCase(), model]));
      const heroRoll = leaderboard[0] || null;
      const heroModel = heroRoll ? hydratedByUsername.get(heroRoll.username.toLowerCase()) || null : null;
      const tickerEvents = collectHomepageRollEvents(hydrated);
      const error = !tickerEvents.length && failedCount === DISCOVERY_SURFACES.length
        ? 'Public profiles could not be loaded right now.'
        : '';

      directory = {
        loading: false,
        error,
        tickerEvents,
        leaderboard,
        heroRoll,
        heroModel
      };
      hasLoaded = true;
    } catch {
      if (currentRequest !== requestId) return;
      directory = {
        loading: false,
        error: 'Public profiles could not be loaded right now.',
        tickerEvents: [],
        leaderboard: [],
        heroRoll: null,
        heroModel: null
      };
      hasLoaded = true;
    }
  }

  onMount(() => {
    void loadDirectory();
    refreshTimer = window.setInterval(() => void loadDirectory(), REFRESH_INTERVAL_MS);
  });

  onDestroy(() => {
    requestId += 1;
    window.clearInterval(refreshTimer);
  });
</script>

<div class="homepage-directory">
  <HomepageLiveTicker events={directory.tickerEvents} loading={directory.loading} loadError={directory.error} />
  <slot {directory} />
</div>

<style>
  .homepage-directory { display: block; min-width: 0; }
</style>
