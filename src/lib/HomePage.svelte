<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import './homepage/homepage-reference.css';
  import './homepage/homepage-refinement.css';
  import './homepage/homepage-motion.css';
  import { ACCOUNT_STATES } from './authState.js';
  import { supabase } from './supabase.js';
  import SiteFooter from './SiteFooter.svelte';
  import RollPage from './RollPage.svelte';
  import HomepageHeader from './homepage/HomepageHeader.svelte';
  import { loadHomepageTopRolls } from './homepage/topRollDiscovery.js';

  export let isAuthenticated = false;
  export let accountState = /** @type {string} */ (ACCOUNT_STATES.BOOTING);
  export let username = '';
  export let logoutInProgress = false;

  const dispatch = createEventDispatcher();
  let homepageRoot;
  let homepageDiscovery = { rows: [], loading: true, error: '' };
  let discoveryRequestId = 0;
  let discoveryActive = false;
  let rolloverTimeout;

  async function refreshTopRoll() {
    if (!discoveryActive) return;
    const requestId = ++discoveryRequestId;
    homepageDiscovery = { ...homepageDiscovery, loading: true, error: '' };
    const nextState = await loadHomepageTopRolls((...args) => supabase.rpc(...args));
    if (!discoveryActive || requestId !== discoveryRequestId) return;
    homepageDiscovery = nextState;
  }

  function scheduleDailyTopRollRefresh() {
    const now = new Date();
    const nextUtcReset = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
    rolloverTimeout = setTimeout(() => {
      void refreshTopRoll();
      scheduleDailyTopRollRefresh();
    }, Math.max(500, nextUtcReset - now.getTime() + 50));
  }

  function stopTopRollDiscovery() {
    discoveryActive = false;
    discoveryRequestId += 1;
    if (rolloverTimeout) clearTimeout(rolloverTimeout);
  }

  function forwardAction(event) {
    dispatch(event.type, event.detail);
  }

  onMount(() => {
    discoveryActive = true;
    void refreshTopRoll();
    scheduleDailyTopRollRefresh();

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduceMotion) {
      homepageRoot.classList.add('homepage-motion-ready', 'homepage-motion-active');
      return stopTopRollDiscovery;
    }

    homepageRoot.classList.add('homepage-motion-ready');
    const activationFrame = requestAnimationFrame(() => homepageRoot.classList.add('homepage-motion-active'));

    return () => {
      cancelAnimationFrame(activationFrame);
      stopTopRollDiscovery();
    };
  });
</script>

<div id="chromadie-homepage" class="homepage-reference homepage-reference--roll-first" bind:this={homepageRoot}>
  <HomepageHeader
    {accountState}
    {isAuthenticated}
    {username}
    {logoutInProgress}
    on:navigate={forwardAction}
    on:login={forwardAction}
    on:logout={forwardAction}
    on:retry={forwardAction}
  />

  <main>
    <RollPage
      surface="homepage"
      signupNext="/"
      showAcquisitionActions={true}
      homepage={true}
      bestRollRows={homepageDiscovery.rows}
      bestRollLoading={homepageDiscovery.loading}
      bestRollError={homepageDiscovery.error}
      on:navigate={forwardAction}
      on:promptlogin={forwardAction}
      on:resultready={refreshTopRoll}
      on:discoveryretry={refreshTopRoll}
    />

    <div class="homepage-content">
      <SiteFooter {isAuthenticated} variant="home-compact" />
    </div>
  </main>
</div>
