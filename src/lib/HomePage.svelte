<script>
  import { createEventDispatcher } from 'svelte';
  import './homepage/homepage-reference.css';
  import { ACCOUNT_STATES } from './authState.js';
  import SiteFooter from './SiteFooter.svelte';
  import RollPage from './RollPage.svelte';
  import HomepageCommunity from './homepage/HomepageCommunity.svelte';
  import HomepageHeader from './homepage/HomepageHeader.svelte';
  import HomepageLoop from './homepage/HomepageLoop.svelte';
  import HomepageScoring from './homepage/HomepageScoring.svelte';

  export let isAuthenticated = false;
  export let accountState = /** @type {string} */ (ACCOUNT_STATES.BOOTING);
  export let username = '';
  export let logoutInProgress = false;

  const dispatch = createEventDispatcher();
  let homepageDiscovery = { rows: [], loading: true, error: '' };

  function handleLeaderboard(event) {
    const detail = event?.detail || {};
    homepageDiscovery = {
      rows: Array.isArray(detail.rows) ? detail.rows : [],
      loading: detail.loading !== false,
      error: typeof detail.error === 'string' ? detail.error : ''
    };
  }

  function forwardAction(event) {
    dispatch(event.type, event.detail);
  }
</script>

<div class="homepage-reference homepage-reference--roll-first">
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
    />

    <div class="homepage-content">
      <HomepageLoop />
      <HomepageScoring />
      <HomepageCommunity {isAuthenticated} {username} on:leaderboard={handleLeaderboard} />
      <SiteFooter {isAuthenticated} />
    </div>
  </main>
</div>
