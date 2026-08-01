<script>
  import { createEventDispatcher, onDestroy, onMount } from 'svelte';
  import HomepageLiveTicker from './HomepageLiveTicker.svelte';
  import HomepageProfilePreview from './HomepageProfilePreview.svelte';
  import HomepageRollSummary from './HomepageRollSummary.svelte';
  import { supabase } from './supabase.js';
  import { loadProfileContext } from './profileData.js';
  import { getCanonicalProfilePath } from './routeContract.js';
  import {
    collectHomepageCandidates,
    collectHomepageRollEvents,
    KNOWN_STAFF_SHOWCASE_USERNAMES,
    selectHomepageProfiles
  } from './homepageDirectory.js';

  const DISCOVERY_SURFACES = ['today', 'recent', 'new', 'all_time'];
  const MAX_HOMEPAGE_PROFILES = 6;
  const REFRESH_INTERVAL_MS = 60_000;

  const dispatch = createEventDispatcher();
  let homepageProfiles = [];
  let tickerEvents = [];
  let loading = true;
  let loadError = '';
  let requestId = 0;
  let refreshTimer;
  let mediaCacheKey = '';

  $: featuredProfiles = homepageProfiles.slice(0, 4);
  $: directoryProfiles = homepageProfiles.slice(4);
  $: primaryProfile = featuredProfiles[0] || null;

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
    loading = homepageProfiles.length === 0;
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

      const hydrated = (await Promise.all(candidates.slice(0, MAX_HOMEPAGE_PROFILES + 2).map(hydrateProfile))).filter(Boolean);
      if (currentRequest !== requestId) return;

      homepageProfiles = selectHomepageProfiles(hydrated, MAX_HOMEPAGE_PROFILES);
      tickerEvents = collectHomepageRollEvents(hydrated);
      mediaCacheKey = String(Date.now());
      loading = false;
      if (!homepageProfiles.length && failedCount === DISCOVERY_SURFACES.length) {
        loadError = 'Public profiles could not be loaded right now.';
      }
    } catch {
      if (currentRequest !== requestId) return;
      homepageProfiles = [];
      tickerEvents = [];
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
    <slot name="intro"></slot>
    <section class="homepage-directory__collage" aria-label="Live public profile directory">
      <div class="homepage-directory__collage-label">Live profile directory</div>
      <div class="homepage-directory__main">
        <HomepageProfilePreview
          model={primaryProfile}
          variant="primary"
          emptyMessage={loading ? 'Loading public profiles.' : loadError || 'No public profiles available yet.'}
          emptyDetail={loading ? 'The directory is checking the public profile feed.' : 'Profiles will appear here after players publish and roll.'}
          {mediaCacheKey}
        />
      </div>

      {#if featuredProfiles[1]}
        <div class="homepage-directory__left">
          <HomepageProfilePreview model={featuredProfiles[1]} variant="side" {mediaCacheKey} />
        </div>
      {/if}
      {#if featuredProfiles[2]}
        <div class="homepage-directory__right">
          <HomepageProfilePreview model={featuredProfiles[2]} variant="side" {mediaCacheKey} />
        </div>
      {/if}
      {#if featuredProfiles[3]}
        <div class="homepage-directory__lower">
          <HomepageProfilePreview model={featuredProfiles[3]} variant="lower" lazyAtmosphere={true} {mediaCacheKey} />
        </div>
      {/if}
    </section>
  </div>

  <div class="homepage-directory__links">
    <button type="button" on:click={() => navigateToDiscovery('random')}>Explore all profiles <span aria-hidden="true">→</span></button>
    <button type="button" on:click={() => navigateToDiscovery('today')}>View today’s leaderboard <span aria-hidden="true">→</span></button>
  </div>

  {#if directoryProfiles.length}
    <section class="homepage-directory__examples" aria-labelledby="homepage-directory-title">
      <div class="homepage-directory__section-heading">
        <div>
          <p>More from the directory</p>
          <h2 id="homepage-directory-title">Profiles are the destination.</h2>
        </div>
        <span>Real public profiles</span>
      </div>
      <div class="homepage-directory__grid">
        {#each directoryProfiles as model (model.context.profileId)}
          <HomepageProfilePreview model={model} variant="directory" lazyAtmosphere={true} {mediaCacheKey} />
        {/each}
      </div>
    </section>
  {/if}

  <section class="homepage-directory__mechanic" aria-labelledby="homepage-roll-title">
    <div class="homepage-directory__mechanic-copy">
      <p>One roll daily</p>
      <h2 id="homepage-roll-title">Roll once a day. Your score changes your position.</h2>
      <span>Higher profiles are seen by more people.</span>
    </div>
    <HomepageRollSummary model={primaryProfile} />
  </section>
</div>

<style>
  .homepage-directory { display: grid; gap: 0; }
  .homepage-directory__hero-layout { display: grid; grid-template-columns: minmax(18rem, 0.72fr) minmax(0, 1.45fr); align-items: start; gap: clamp(2rem, 6vw, 6.5rem); }
  .homepage-directory__hero-layout :global(.homepage-hero-intro) { padding-top: clamp(2rem, 6vh, 4rem); }
  .homepage-directory__collage { position: relative; display: grid; grid-template-columns: minmax(8rem, 0.68fr) minmax(20rem, 1.55fr) minmax(8rem, 0.68fr); grid-template-rows: auto auto; align-items: center; gap: 0.8rem; min-height: 32rem; padding: 2rem 0 1.5rem; }
  .homepage-directory__collage::before { position: absolute; z-index: -1; inset: 10% 8% 15%; content: ''; background: radial-gradient(ellipse at center, rgba(141, 220, 255, 0.09), transparent 62%); filter: blur(2.5rem); pointer-events: none; }
  .homepage-directory__collage-label { position: absolute; top: 0; left: 0; color: rgba(241, 243, 237, 0.42); font: 600 0.58rem / 1 var(--home-mono, 'IBM Plex Mono', monospace); letter-spacing: 0.13em; text-transform: uppercase; }
  .homepage-directory__main { z-index: 3; grid-column: 2; grid-row: 1; width: 100%; }
  .homepage-directory__left { z-index: 2; grid-column: 1; grid-row: 1; width: calc(100% + 3.5rem); margin-left: -4.2rem; }
  .homepage-directory__right { z-index: 2; grid-column: 3; grid-row: 1; width: calc(100% + 3.5rem); margin-right: -4.2rem; }
  .homepage-directory__lower { z-index: 1; grid-column: 2; grid-row: 2; width: 78%; margin: 0.25rem auto 0; transform: translateY(1.2rem); }
  .homepage-directory__links { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 0.95rem 0; border-top: 1px solid rgba(241, 243, 237, 0.12); border-bottom: 1px solid rgba(241, 243, 237, 0.12); }
  .homepage-directory__links button { padding: 0; border: 0; background: transparent; color: var(--color-accent-cyan); font: 600 0.68rem / 1 var(--home-mono, 'IBM Plex Mono', monospace); cursor: pointer; }
  .homepage-directory__links button:hover { color: var(--color-accent-bright); }
  .homepage-directory__links span { padding-left: 0.35rem; }
  .homepage-directory__examples { margin-top: clamp(4rem, 9vw, 7rem); }
  .homepage-directory__section-heading { display: flex; align-items: end; justify-content: space-between; gap: 1rem; padding-bottom: 1rem; border-bottom: 1px solid rgba(241, 243, 237, 0.14); }
  .homepage-directory__section-heading p, .homepage-directory__mechanic-copy p { margin: 0 0 0.55rem; color: rgba(241, 243, 237, 0.42); font: 600 0.59rem / 1 var(--home-mono, 'IBM Plex Mono', monospace); letter-spacing: 0.13em; text-transform: uppercase; }
  .homepage-directory__section-heading h2, .homepage-directory__mechanic-copy h2 { margin: 0; color: rgba(241, 243, 237, 0.93); font: 600 clamp(1.65rem, 3vw, 2.8rem) / 0.98 var(--home-font, 'Instrument Sans', sans-serif); letter-spacing: -0.04em; }
  .homepage-directory__section-heading > span { color: rgba(241, 243, 237, 0.42); font: 600 0.59rem / 1 var(--home-mono, 'IBM Plex Mono', monospace); text-transform: uppercase; }
  .homepage-directory__grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.85rem; padding-top: 0.85rem; }
  .homepage-directory__mechanic { display: grid; grid-template-columns: minmax(0, 1fr) minmax(16rem, 0.72fr); align-items: center; gap: clamp(1.5rem, 6vw, 6rem); margin-top: clamp(4rem, 9vw, 7rem); padding: clamp(1.5rem, 4vw, 2.4rem) 0; border-top: 1px solid rgba(241, 243, 237, 0.14); border-bottom: 1px solid rgba(241, 243, 237, 0.14); }
  .homepage-directory__mechanic-copy { max-width: 35rem; }
  .homepage-directory__mechanic-copy h2 { max-width: 27rem; font-size: clamp(1.55rem, 3vw, 2.45rem); }
  .homepage-directory__mechanic-copy > span { display: block; margin-top: 0.85rem; color: rgba(241, 243, 237, 0.58); font-size: 0.88rem; line-height: 1.45; }

  @media (max-width: 62rem) {
    .homepage-directory__collage { grid-template-columns: minmax(7rem, 0.5fr) minmax(20rem, 2fr) minmax(7rem, 0.5fr); }
    .homepage-directory__left { width: calc(100% + 2rem); margin-left: -2.5rem; }
    .homepage-directory__right { width: calc(100% + 2rem); margin-right: -2.5rem; }
  }

  @media (max-width: 48rem) {
    .homepage-directory__hero-layout { grid-template-columns: 1fr; gap: 1rem; }
    .homepage-directory__hero-layout :global(.homepage-hero-intro) { padding-top: 2rem; }
    .homepage-directory__collage { grid-template-columns: 1fr; grid-template-rows: auto; gap: 0.85rem; min-height: 0; padding-top: 2.25rem; }
    .homepage-directory__main, .homepage-directory__left, .homepage-directory__right, .homepage-directory__lower { grid-column: 1; grid-row: auto; width: 100%; margin: 0; transform: none; }
    .homepage-directory__left, .homepage-directory__right { display: none; }
    .homepage-directory__lower { margin-top: 0.25rem; }
    .homepage-directory__links { align-items: flex-start; flex-direction: column; }
    .homepage-directory__grid { grid-template-columns: 1fr; }
    .homepage-directory__mechanic { grid-template-columns: 1fr; gap: 0.75rem; }
    .homepage-directory__mechanic :global(.homepage-roll-summary) { border-top: 1px solid rgba(241, 243, 237, 0.12); border-left: 0; }
  }

  @media (max-width: 36rem) {
    .homepage-directory__section-heading { align-items: flex-start; flex-direction: column; }
    .homepage-directory__section-heading > span { display: none; }
  }
</style>
