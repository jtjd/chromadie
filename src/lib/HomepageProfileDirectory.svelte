<script>
  import { createEventDispatcher, onDestroy, onMount } from 'svelte';
  import HomepageLiveTicker from './HomepageLiveTicker.svelte';
  import HomepageScreenshotShowcase from './HomepageScreenshotShowcase.svelte';
  import { supabase } from './supabase.js';
  import { loadProfileContext } from './profileData.js';
  import { getCanonicalProfilePath } from './routeContract.js';
  import {
    collectHomepageCandidates,
    collectHomepageRollEvents,
    KNOWN_STAFF_SHOWCASE_USERNAMES
  } from './homepageDirectory.js';

  const DISCOVERY_SURFACES = ['today', 'recent', 'new', 'all_time'];
  const REFRESH_INTERVAL_MS = 60_000;

  const dispatch = createEventDispatcher();
  let tickerEvents = [];
  let loading = true;
  let loadError = '';
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

  async function loadDirectory() {
    const currentRequest = ++requestId;
    loading = !hasLoaded;
    loadError = '';
    try {
      const responses = await Promise.all(DISCOVERY_SURFACES.map(fetchDiscoverySurface));
      if (currentRequest !== requestId) return;
      const failedCount = responses.filter(response => response.error).length;
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

      const hydrated = (await Promise.all(candidates.slice(0, 8).map(hydrateProfile))).filter(Boolean);
      if (currentRequest !== requestId) return;

      tickerEvents = collectHomepageRollEvents(hydrated);
      hasLoaded = true;
      loading = false;
      if (!tickerEvents.length && failedCount === DISCOVERY_SURFACES.length) {
        loadError = 'Public profiles could not be loaded right now.';
      }
    } catch {
      if (currentRequest !== requestId) return;
      tickerEvents = [];
      hasLoaded = true;
      loading = false;
      loadError = 'Public profiles could not be loaded right now.';
    }
  }

  function navigateToDiscovery(tab) {
    dispatch('navigate', { view: 'leaderboard', tab });
  }

  onMount(() => {
    void loadDirectory();
    refreshTimer = window.setInterval(() => void loadDirectory(), REFRESH_INTERVAL_MS);
    return () => window.clearInterval(refreshTimer);
  });

  onDestroy(() => window.clearInterval(refreshTimer));
</script>

<div class="homepage-directory">
  <HomepageLiveTicker events={tickerEvents} {loading} loadError={loadError} />

  <div class="homepage-directory__hero-layout">
    <div class="homepage-directory__hero-copy"><slot name="intro"></slot></div>
    <section class="homepage-directory__collage" aria-label="Curated public profile screenshots">
      <HomepageScreenshotShowcase mode="collage" />
    </section>
  </div>

  <div class="homepage-directory__links">
    <button type="button" on:click={() => navigateToDiscovery('random')}>Explore all profiles <span aria-hidden="true">→</span></button>
    <button type="button" on:click={() => navigateToDiscovery('today')}>View today’s leaderboard <span aria-hidden="true">→</span></button>
  </div>

  <HomepageScreenshotShowcase mode="profiles" />

</div>

<style>
  .homepage-directory { display: grid; gap: 0; }
  .homepage-directory__hero-layout { display: grid; grid-template-columns: minmax(22rem, 0.82fr) minmax(0, 1.6fr); align-items: start; gap: clamp(2rem, 4vw, 4rem); }
  .homepage-directory__hero-copy { min-width: 0; }
  .homepage-directory__hero-layout :global(.homepage-hero-intro) { padding-top: clamp(2rem, 6vh, 4rem); }
  .homepage-directory__links { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 0.95rem 0; border-top: 1px solid rgba(241, 243, 237, 0.12); border-bottom: 1px solid rgba(241, 243, 237, 0.12); }
  .homepage-directory__links button { padding: 0; border: 0; background: transparent; color: var(--color-accent-cyan); font: 600 0.68rem / 1 var(--home-mono, 'IBM Plex Mono', monospace); cursor: pointer; }
  .homepage-directory__links button:hover { color: var(--color-accent-bright); }
  .homepage-directory__links span { padding-left: 0.35rem; }

  @media (max-width: 48rem) {
    .homepage-directory__hero-layout { grid-template-columns: 1fr; gap: 1rem; }
    .homepage-directory__hero-layout :global(.homepage-hero-intro) { padding-top: 2rem; }
    .homepage-directory__links { align-items: flex-start; flex-direction: column; }
  }
</style>
