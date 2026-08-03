<script>
  import { createEventDispatcher, onDestroy, onMount } from 'svelte';
  import HomepageLiveTicker from './HomepageLiveTicker.svelte';
  import { supabase } from './supabase.js';
  import { loadProfileContext } from './profileData.js';
  import { normalizeDiscoveryResponse } from './discoveryData.js';
  import { getCanonicalProfilePath } from './routeContract.js';
  import { normalizeHexColor } from './utils.js';
  import { guestRollFixture } from './guestRollFixture.js';
  import {
    buildHomepageFeaturedProfiles,
    collectHomepageCandidates,
    collectHomepageRollEvents,
    KNOWN_STAFF_SHOWCASE_USERNAMES
  } from './homepageDirectory.js';

  const DISCOVERY_SURFACES = ['today', 'recent', 'new', 'all_time'];
  const REFRESH_INTERVAL_MS = 60_000;
  const LOCAL_PREVIEW_HOSTS = new Set(['127.0.0.1', 'localhost']);
  const HOMEPAGE_DAILY_PREVIEW = Object.freeze({
    hexCode: guestRollFixture.hex,
    score: 78890,
    rarity: 'Rare',
    identity: 'Vivid violet'
  });

  const EMPTY_DIRECTORY = Object.freeze({
    loading: true,
    error: '',
    tickerEvents: [],
    leaderboard: [],
    featuredProfiles: [],
    heroRoll: null,
    heroModel: null,
    previewRoll: null,
    previewAvailable: false
  });

  /** @type {any} */
  let directory = EMPTY_DIRECTORY;
  let hasLoaded = false;
  let requestId = 0;
  let refreshTimer;
  let previewRoll = null;
  let previewAvailable = false;
  const dispatch = createEventDispatcher();

  $: activeColor = normalizeHexColor((directory.heroRoll || directory.previewRoll)?.hexCode, '#8B7CF6');
  $: dispatch('activecolor', { color: activeColor });

  function canUseLocalPreview() {
    return typeof window !== 'undefined'
      && LOCAL_PREVIEW_HOSTS.has(window.location.hostname);
  }

  function getLocalPreviewRoll() {
    if (!previewAvailable) return null;
    return new URLSearchParams(window.location.search).get('home_preview') === 'empty'
      ? null
      : HOMEPAGE_DAILY_PREVIEW;
  }

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
      const featuredProfiles = buildHomepageFeaturedProfiles(hydrated, 3);
      const error = !leaderboard.length && !featuredProfiles.length && failedCount > 0
        ? 'Public profiles could not be loaded right now.'
        : '';

      directory = {
        loading: false,
        error,
        tickerEvents,
        leaderboard,
        featuredProfiles,
        heroRoll,
        heroModel,
        previewRoll,
        previewAvailable
      };
      hasLoaded = true;
    } catch {
      if (currentRequest !== requestId) return;
      directory = {
        loading: false,
        error: 'Public profiles could not be loaded right now.',
        tickerEvents: [],
        leaderboard: [],
        featuredProfiles: [],
        heroRoll: null,
        heroModel: null,
        previewRoll,
        previewAvailable
      };
      hasLoaded = true;
    }
  }

  onMount(() => {
    previewAvailable = canUseLocalPreview();
    previewRoll = getLocalPreviewRoll();
    directory = { ...directory, previewRoll, previewAvailable };
    void loadDirectory();
    refreshTimer = window.setInterval(() => void loadDirectory(), REFRESH_INTERVAL_MS);
  });

  onDestroy(() => {
    requestId += 1;
    window.clearInterval(refreshTimer);
  });
</script>

<div class="homepage-directory">
  <HomepageLiveTicker events={directory.tickerEvents} />
  <slot {directory} />
</div>

<style>
  .homepage-directory { display: block; min-width: 0; }
</style>
