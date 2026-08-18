<script>
  import { createEventDispatcher } from 'svelte';
  import './homepage/homepage-reference.css';
  import { ACCOUNT_STATES } from './authState.js';
  import SiteFooter from './SiteFooter.svelte';
  import HomepageCommunity from './homepage/HomepageCommunity.svelte';
  import HomepageHeader from './homepage/HomepageHeader.svelte';
  import HomepageHero from './homepage/HomepageHero.svelte';
  import HomepageLoop from './homepage/HomepageLoop.svelte';
  import HomepageShowcase from './homepage/HomepageShowcase.svelte';
  import LazyAtmosphereLayer from './profile-atmosphere/LazyAtmosphereLayer.svelte';
  import { HOMEPAGE_FIXTURES } from './homepage/homepageFixtures.js';

  export let isAuthenticated = false;
  export let accountState = /** @type {string} */ (ACCOUNT_STATES.BOOTING);
  export let username = '';
  export let logoutInProgress = false;

  const dispatch = createEventDispatcher();
  let activeBackground = HOMEPAGE_FIXTURES[0].media.background;
  let activeAccent = HOMEPAGE_FIXTURES[0].accent;
  let activeAtmosphereKey = HOMEPAGE_FIXTURES[0].atmosphereKey || '';
  let dailyLeaderboardRows = [];
  let dailyLeaderboardLoading = true;
  let dailyLeaderboardError = '';

  $: accountReady = accountState === ACCOUNT_STATES.SIGNED_OUT || accountState === ACCOUNT_STATES.AUTHENTICATED;
  $: accountUnavailable = accountState === ACCOUNT_STATES.PROFILE_ERROR;

  function forwardAction(event) {
    dispatch(event.type, event.detail);
  }

  function handleFixtureChange(event) {
    const nextFixture = event.detail.fixture;
    activeBackground = nextFixture.media.background;
    activeAccent = nextFixture.accent;
    activeAtmosphereKey = nextFixture.atmosphereKey || '';
  }

  function handleAccentPreview(event) {
    activeAccent = event.detail.accent;
  }

  function handleDailyLeaderboard(event) {
    dailyLeaderboardRows = event.detail.rows || [];
    dailyLeaderboardLoading = event.detail.loading === true;
    dailyLeaderboardError = event.detail.error || '';
  }
</script>

<div
  class="homepage-reference"
  aria-labelledby="homepage-title"
  style={`--homepage-background-image: url("${activeBackground}"); --homepage-accent: ${activeAccent};`}
>
  <div class="homepage-background" aria-hidden="true"></div>

  {#if activeAtmosphereKey}
    <LazyAtmosphereLayer
      atmosphereKey={activeAtmosphereKey}
      todayColor={activeAccent}
      active={true}
      animated={true}
      mode="profile"
      className="homepage-atmosphere"
    />
  {/if}

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
    <HomepageHero
      {isAuthenticated}
      dailyLeaderboardRows={dailyLeaderboardRows}
      dailyLeaderboardLoading={dailyLeaderboardLoading}
      dailyLeaderboardError={dailyLeaderboardError}
      {accountReady}
      {accountUnavailable}
      on:fixturechange={handleFixtureChange}
      on:accentpreview={handleAccentPreview}
      on:claim={forwardAction}
      on:profile={forwardAction}
    />

    <div class="homepage-content">
      <HomepageLoop />
      <HomepageShowcase />
      <HomepageCommunity on:leaderboard={handleDailyLeaderboard} />

      <section class="homepage-final homepage-section__inner" aria-labelledby="homepage-final-title">
        <h2 id="homepage-final-title">Make it yours.</h2>
        <p>Claim a handle, build the profile, and add a new color to its history tomorrow.</p>
        <a class="homepage-button" href="#claim">Claim your handle</a>
      </section>

      <SiteFooter />
    </div>
  </main>
</div>
