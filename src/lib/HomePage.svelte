<script>
  import { createEventDispatcher } from 'svelte';
  import './homepage/homepage-reference.css';
  import { ACCOUNT_STATES } from './authState.js';
  import HomepageCommunity from './homepage/HomepageCommunity.svelte';
  import HomepageHeader from './homepage/HomepageHeader.svelte';
  import HomepageHero from './homepage/HomepageHero.svelte';
  import HomepageLoop from './homepage/HomepageLoop.svelte';
  import HomepageShowcase from './homepage/HomepageShowcase.svelte';

  export let isAuthenticated = false;
  export let accountState = /** @type {string} */ (ACCOUNT_STATES.BOOTING);
  export let username = '';
  export let logoutInProgress = false;

  const dispatch = createEventDispatcher();

  $: accountReady = accountState === ACCOUNT_STATES.SIGNED_OUT || accountState === ACCOUNT_STATES.AUTHENTICATED;
  $: accountUnavailable = accountState === ACCOUNT_STATES.PROFILE_ERROR;

  function forwardAction(event) {
    dispatch(event.type, event.detail);
  }
</script>

<div class="homepage-reference" aria-labelledby="homepage-title">
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
      {accountReady}
      {accountUnavailable}
      on:claim={forwardAction}
      on:profile={forwardAction}
    />

    <div class="homepage-fade-to-content" aria-hidden="true"></div>

    <div class="homepage-content">
      <HomepageLoop />
      <HomepageShowcase />
      <HomepageCommunity />

      <section class="homepage-final homepage-section__inner" aria-labelledby="homepage-final-title">
        <h2 id="homepage-final-title">Make it yours.</h2>
        <p>Claim a handle, build the profile, and add a new color to its history tomorrow.</p>
        <a class="homepage-button" href="#claim">Claim your handle</a>
      </section>

      <footer class="homepage-footer">
        <span>chm.lol</span>
        <span>A public profile that changes every day.</span>
      </footer>
    </div>
  </main>
</div>
