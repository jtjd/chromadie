<script>
  import { createEventDispatcher } from 'svelte';
  import { ACCOUNT_STATES } from './authState';
  import { trackProductEvent } from './productAnalytics.js';
  import { prefetchRouteComponent } from './routeLoaders.js';

  export let activeView = 'game';
  export let accountState = /** @type {string} */ (ACCOUNT_STATES.SIGNED_OUT);
  export let username = '';
  export let isAuthenticated = false;
  export let logoutInProgress = false;
  export let isProfileMode = false;
  export let isProfileSettings = false;
  export let isHomeMode = false;
  // Supporting routes use the homepage header language without inheriting
  // homepage-only account behavior (for example, the signup CTA).
  export let isHomepageStyle = false;
  export let isOwner = false;
  export let accentColor = '#00ffb3';

  const dispatch = createEventDispatcher();
  let mobileMenuOpen = false;
  $: minimalMode = isProfileMode;

  function navigate(view) {
    mobileMenuOpen = false;
    if (view === 'leaderboard' && isHomeMode && !isAuthenticated) trackProductEvent('explore_clicked');
    dispatch('navigate', { view, ...(view === 'leaderboard' ? { tab: 'today' } : {}) });
  }

  function navigateHome() {
    navigate('home');
  }

  function editProfile() {
    mobileMenuOpen = false;
    dispatch('edit');
  }

  function prefetch(view) {
    const loaderKey = view === 'profile' ? 'profileShell' : view;
    if (['profileShell', 'leaderboard', 'profileSettings', 'pricing'].includes(loaderKey)) {
      void prefetchRouteComponent(loaderKey);
    }
  }
</script>

<header class="site-mode-header" class:site-mode-header--profile={isProfileMode} class:site-mode-header--profile-settings={isProfileSettings} class:site-mode-header--home={isHomeMode || isHomepageStyle} style={`--site-header-accent: ${accentColor};`}>
  <a class="site-mode-header__brand" href="/" on:click|preventDefault={navigateHome} aria-label="ChromaDie home">
    <span class="site-mode-header__brand-mark" aria-hidden="true"><span></span></span>
    <span class="site-mode-header__wordmark">chm<span>.lol</span></span>
  </a>

  {#if !minimalMode}
    <nav class="site-mode-header__nav" aria-label="Primary application navigation">
      <button type="button" class:active={activeView === 'leaderboard'} aria-current={activeView === 'leaderboard' ? 'page' : undefined} on:mouseenter={() => prefetch('leaderboard')} on:focus={() => prefetch('leaderboard')} on:click={() => navigate('leaderboard')}>Leaderboard</button>
      <button type="button" class:active={activeView === 'pricing'} aria-current={activeView === 'pricing' ? 'page' : undefined} on:mouseenter={() => prefetch('pricing')} on:focus={() => prefetch('pricing')} on:click={() => navigate('pricing')}>Pricing</button>
      {#if isAuthenticated}
        <button type="button" class:active={activeView === 'profile-settings'} aria-current={activeView === 'profile-settings' ? 'page' : undefined} on:mouseenter={() => prefetch('profileSettings')} on:focus={() => prefetch('profileSettings')} on:click={() => navigate('profile-settings')}>Customize</button>
      {/if}
    </nav>
  {:else}
    <div class="site-mode-header__nav-space" aria-hidden="true"></div>
  {/if}

  <div class="site-mode-header__right">
    {#if isProfileMode}
      <div class="site-mode-header__context" aria-label="Profile actions">
        {#if isOwner}
          <button type="button" class="site-mode-header__account-action" aria-label="Edit your profile" on:click={editProfile}>Edit</button>
        {/if}
      </div>
    {/if}

    <div class="site-mode-header__account">
      {#if accountState === ACCOUNT_STATES.AUTHENTICATED && isAuthenticated}
        <button type="button" class="site-mode-header__account-name" on:click={() => navigate('profile')} aria-label="Open your profile">
          {username || 'Your profile'}
        </button>
        <button type="button" class="site-mode-header__account-action" on:click={() => dispatch('logout')} disabled={logoutInProgress}>
          {logoutInProgress ? 'Signing out…' : 'Sign out'}
        </button>
      {:else if accountState === ACCOUNT_STATES.PROFILE_ERROR}
        <button type="button" class="site-mode-header__account-action" on:click={() => dispatch('retry')}>Retry account</button>
      {:else if accountState === ACCOUNT_STATES.BOOTING || accountState === ACCOUNT_STATES.PROFILE_LOADING}
        <!-- Keep account controls visually quiet while session data hydrates. -->
      {:else if (isHomeMode || isHomepageStyle || isProfileMode) && !isAuthenticated}
        <button type="button" class="site-mode-header__account-action" on:click={() => dispatch('login', { mode: 'login' })}>Sign in</button>
        {#if isHomeMode || isHomepageStyle}<button type="button" class="site-mode-header__account-action site-mode-header__account-action--signup" on:click={() => dispatch('login', { mode: 'signup' })}>Sign up</button>{/if}
      {:else}
        <button type="button" class="site-mode-header__account-action site-mode-header__account-action--light" on:click={() => dispatch('login', { mode: 'login' })}>Sign in / Sign up</button>
      {/if}
    </div>
  </div>

  <details class="site-mode-header__mobile-menu" bind:open={mobileMenuOpen}>
    <summary aria-expanded={mobileMenuOpen} aria-label={isProfileMode ? 'Open profile actions' : isHomeMode || isHomepageStyle ? 'Open account actions' : 'Open application navigation'}>Menu</summary>
    <div class="site-mode-header__mobile-panel" aria-hidden={!mobileMenuOpen}>
      {#if !minimalMode}
        <div class="site-mode-header__mobile-primary" aria-label="Primary application navigation">
          <button type="button" class:active={activeView === 'leaderboard'} on:mouseenter={() => prefetch('leaderboard')} on:focus={() => prefetch('leaderboard')} on:click={() => navigate('leaderboard')}>Leaderboard</button>
          <button type="button" class:active={activeView === 'pricing'} on:mouseenter={() => prefetch('pricing')} on:focus={() => prefetch('pricing')} on:click={() => navigate('pricing')}>Pricing</button>
          {#if isAuthenticated}
            <button type="button" class:active={activeView === 'profile-settings'} on:mouseenter={() => prefetch('profileSettings')} on:focus={() => prefetch('profileSettings')} on:click={() => navigate('profile-settings')}>Customize</button>
          {/if}
        </div>
      {/if}

      {#if isProfileMode}
        <div class="site-mode-header__mobile-context" aria-label="Profile actions">
          {#if isOwner}<button type="button" class="site-mode-header__account-action" aria-label="Edit your profile" on:click={editProfile}>Edit</button>{/if}
        </div>
      {/if}

      <div class="site-mode-header__mobile-account">
        {#if accountState === ACCOUNT_STATES.AUTHENTICATED && isAuthenticated}
          <button type="button" on:click={() => { mobileMenuOpen = false; dispatch('logout'); }} disabled={logoutInProgress}>{logoutInProgress ? 'Signing out…' : 'Sign out'}</button>
        {:else if accountState === ACCOUNT_STATES.PROFILE_ERROR}
          <button type="button" on:click={() => { mobileMenuOpen = false; dispatch('retry'); }}>Retry account</button>
        {:else if accountState === ACCOUNT_STATES.BOOTING || accountState === ACCOUNT_STATES.PROFILE_LOADING}
          <!-- Keep account controls visually quiet while session data hydrates. -->
        {:else if (isHomeMode || isHomepageStyle || isProfileMode) && !isAuthenticated}
          <button type="button" on:click={() => { mobileMenuOpen = false; dispatch('login', { mode: 'login' }); }}>Sign in</button>
          {#if isHomeMode || isHomepageStyle}<button type="button" on:click={() => { mobileMenuOpen = false; dispatch('login', { mode: 'signup' }); }}>Sign up</button>{/if}
        {:else}
          <button type="button" on:click={() => { mobileMenuOpen = false; dispatch('login', { mode: 'login' }); }}>Sign in / Sign up</button>
        {/if}
      </div>
    </div>
  </details>
</header>

<style>
  .site-mode-header {
    --site-header-control-size: 0.82rem;
    --site-header-control-weight: 500;
    --site-header-font: 'Inter', ui-sans-serif, system-ui, sans-serif;
    --site-header-display: 'Clash Display', ui-sans-serif, system-ui, sans-serif;
    --site-header-accent: #00ffb3;
    position: relative;
    z-index: 20;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    gap: 2rem;
    width: 100%;
    min-height: 4rem;
    padding: 0 1.5rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    color: #8f9099;
    background: rgba(5, 5, 6, 0.94);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
  }

  .site-mode-header--home {
    min-height: 4rem;
    margin: 0;
    border: 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 0;
    background: rgba(5, 5, 6, 0.94);
  }

  /* Public profiles keep their own atmosphere behind a quiet account bar. */
  .site-mode-header--profile {
    grid-template-columns: auto auto;
    justify-content: space-between;
    min-height: 3.5rem;
    padding-inline: clamp(1rem, 4vw, 3rem);
    border: 0;
    background: transparent !important;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
  }

  .site-mode-header--profile .site-mode-header__nav-space { display: none; }
  .site-mode-header--profile .site-mode-header__context { display: flex; align-items: center; }
  .site-mode-header--profile .site-mode-header__right {
    padding: 0;
    border: 0;
    background: transparent;
    box-shadow: none;
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }
  .site-mode-header--profile .site-mode-header__account { gap: 0.35rem; }
  .site-mode-header--profile .site-mode-header__account button { min-height: 2rem; }
  .site-mode-header--profile .site-mode-header__mobile-menu { display: none; }

  .site-mode-header__brand {
    display: inline-flex;
    align-items: center;
    gap: 0.6rem;
    min-width: 0;
    color: #f8f8f8;
    font: 600 1rem / 1 var(--site-header-display);
    letter-spacing: -0.035em;
    text-decoration: none;
    white-space: nowrap;
  }

  .site-mode-header__brand-mark {
    position: relative;
    display: grid;
    place-items: center;
    width: 1.35rem;
    height: 1.35rem;
    flex: 0 0 auto;
    border: 1px solid color-mix(in srgb, var(--site-header-accent) 56%, transparent);
    border-radius: 50%;
    box-shadow: 0 0 1.2rem color-mix(in srgb, var(--site-header-accent) 20%, transparent);
  }

  .site-mode-header__brand-mark span {
    width: 0.36rem;
    height: 0.36rem;
    border-radius: 50%;
    background: var(--site-header-accent);
  }

  .site-mode-header__wordmark { color: #f8f8f8; }
  .site-mode-header__wordmark > span { color: var(--site-header-accent); }

  .site-mode-header__nav,
  .site-mode-header__right,
  .site-mode-header__account,
  .site-mode-header__context {
    display: flex;
    align-items: center;
    gap: 1.1rem;
  }

  .site-mode-header__nav {
    justify-content: center;
    width: fit-content;
    justify-self: center;
  }

  .site-mode-header__nav-space { min-width: 0; }
  .site-mode-header__context { flex: 0 0 auto; }
  .site-mode-header__right { justify-content: flex-end; min-width: 0; }

  .site-mode-header__nav,
  .site-mode-header__context,
  .site-mode-header__account {
    font: var(--site-header-control-weight) var(--site-header-control-size) / 1 var(--site-header-font);
  }

  .site-mode-header__nav button,
  .site-mode-header__context button,
  .site-mode-header__account button,
  .site-mode-header__mobile-panel button,
  .site-mode-header__mobile-menu summary {
    min-height: 2.2rem;
    padding: 0.45rem 0;
    border: 0;
    border-radius: 0;
    background: transparent;
    color: #8f9099;
    font: inherit;
    letter-spacing: 0;
    text-transform: none;
    cursor: pointer;
    transition: color 180ms ease, border-color 180ms ease, background-color 180ms ease;
  }

  .site-mode-header__nav button:hover,
  .site-mode-header__nav button.active,
  .site-mode-header__context button:hover:not(:disabled),
  .site-mode-header__account button:hover,
  .site-mode-header__mobile-panel button:hover,
  .site-mode-header__mobile-panel button.active {
    color: #f8f8f8;
  }

  .site-mode-header__nav button.active {
    color: var(--site-header-accent);
    box-shadow: inset 0 -2px 0 var(--site-header-accent);
  }

  .site-mode-header__nav button:focus-visible,
  .site-mode-header__context button:focus-visible,
  .site-mode-header__account button:focus-visible,
  .site-mode-header__mobile-panel button:focus-visible,
  .site-mode-header__mobile-menu summary:focus-visible {
    outline: 2px solid var(--site-header-accent);
    outline-offset: 4px;
    border-radius: 0.25rem;
  }

  .site-mode-header__account { justify-content: flex-end; min-width: 0; }
  .site-mode-header__account-name { max-width: 10rem; overflow: hidden; color: #f8f8f8 !important; text-overflow: ellipsis; white-space: nowrap; }
  .site-mode-header__account-action { color: #8f9099 !important; }
  .site-mode-header__account-action--light { color: #f8f8f8 !important; }
  .site-mode-header__account-action--signup {
    min-height: 2.25rem !important;
    padding: 0.65rem 0.9rem !important;
    border-radius: 0.45rem !important;
    background: var(--site-header-accent) !important;
    color: #06110d !important;
    font-weight: 700 !important;
  }
  .site-mode-header__account-action--signup:hover { background: #8affd4 !important; }
  .site-mode-header__account-action:disabled { cursor: wait; opacity: 0.55; }

  .site-mode-header__mobile-menu { display: none; position: relative; }
  .site-mode-header__mobile-menu summary {
    min-height: 2.35rem;
    padding: 0.6rem 0.75rem;
    border: 1px solid rgba(255, 255, 255, 0.16);
    border-radius: 0.45rem;
    color: #f8f8f8;
    list-style: none;
  }
  .site-mode-header__mobile-menu summary::-webkit-details-marker { display: none; }

  .site-mode-header__mobile-panel {
    position: absolute;
    top: calc(100% + 0.7rem);
    right: 0;
    display: grid;
    min-width: 14rem;
    padding: 0.55rem;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 0.65rem;
    background: rgba(10, 10, 12, 0.98);
    box-shadow: 0 1.5rem 3rem rgba(0, 0, 0, 0.42);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
  }
  .site-mode-header__mobile-panel button {
    min-height: 2.7rem;
    padding: 0.75rem;
    border-radius: 0.4rem;
    color: #8f9099;
    text-align: left;
  }
  .site-mode-header__mobile-panel button:hover,
  .site-mode-header__mobile-panel button.active { background: rgba(255, 255, 255, 0.06); }
  .site-mode-header__mobile-primary,
  .site-mode-header__mobile-context,
  .site-mode-header__mobile-account { display: grid; gap: 0.25rem; }
  .site-mode-header__mobile-primary { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .site-mode-header__mobile-context,
  .site-mode-header__mobile-account { margin-top: 0.35rem; padding-top: 0.55rem; border-top: 1px solid rgba(255, 255, 255, 0.1); }
  .site-mode-header__mobile-panel > .site-mode-header__mobile-context:first-child { margin-top: 0; padding-top: 0; border-top: 0; }
  .site-mode-header__mobile-context button,
  .site-mode-header__mobile-account button { width: 100%; }

  @media (max-width: 48rem) {
    .site-mode-header { grid-template-columns: auto minmax(0, 1fr) auto; gap: 1rem; padding-inline: 1rem; }
    .site-mode-header__nav,
    .site-mode-header__right { display: none; }
    .site-mode-header__mobile-menu { display: block; justify-self: end; }
    .site-mode-header--profile .site-mode-header__right { display: flex; gap: 0.25rem; }
    .site-mode-header--profile .site-mode-header__account { display: none; }
    .site-mode-header--profile .site-mode-header__mobile-menu { display: block; }
    .site-mode-header--profile .site-mode-header__mobile-context { display: none; }
  }

  @media (max-width: 36rem) {
    .site-mode-header { min-height: 3.75rem; }
    .site-mode-header__brand { font-size: 0.95rem; }
  }

  @media (prefers-reduced-motion: reduce) {
    .site-mode-header__nav button,
    .site-mode-header__context button,
    .site-mode-header__account button,
    .site-mode-header__mobile-panel button { transition-duration: 0.001ms; }
  }
</style>
