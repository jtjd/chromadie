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
  export let isLeaderboardMode = false;
  // Supporting routes use the homepage header language while keeping their
  // application navigation and account event contracts.
  export let isHomepageStyle = false;
  export let isOwner = false;
  export let claimHref = '';
  export let showClaim = true;

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
    if (['game', 'profileShell', 'leaderboard', 'progression', 'profileSettings', 'pricing'].includes(loaderKey)) {
      void prefetchRouteComponent(loaderKey);
    }
  }
</script>

<header class="site-mode-header" class:site-mode-header--profile={isProfileMode} class:site-mode-header--profile-settings={isProfileSettings} class:site-mode-header--home={isHomeMode || isHomepageStyle} class:site-mode-header--home-route={isHomeMode} class:site-mode-header--leaderboard={isLeaderboardMode} data-site-chrome="header" style="--site-header-accent: var(--white, #ffffff);">
  <div class="site-mode-header__inner">
    <a class="site-mode-header__brand" href="/" on:click|preventDefault={navigateHome} aria-label="ChromaDie home">
      <img class="site-mode-header__brand-logo" src="/brand/am-mark-v1.webp" alt="" width="72" height="58" decoding="async" />
    </a>

    {#if !minimalMode}
      <nav class="site-mode-header__nav" aria-label="Primary application navigation">
        {#if !isHomeMode}<button type="button" class:active={activeView === 'game'} aria-current={activeView === 'game' ? 'page' : undefined} on:mouseenter={() => prefetch('game')} on:focus={() => prefetch('game')} on:click={() => navigate('game')}>Roll</button>{/if}
        <button type="button" class:active={activeView === 'leaderboard'} aria-current={activeView === 'leaderboard' ? 'page' : undefined} on:mouseenter={() => prefetch('leaderboard')} on:focus={() => prefetch('leaderboard')} on:click={() => navigate('leaderboard')}>Leaderboard</button>
        {#if isAuthenticated}<button type="button" class:active={activeView === 'progression'} aria-current={activeView === 'progression' ? 'page' : undefined} on:mouseenter={() => prefetch('progression')} on:focus={() => prefetch('progression')} on:click={() => navigate('progression')}>Progression</button>{/if}
        {#if isAuthenticated}<button type="button" class:active={activeView === 'profile-settings'} aria-current={activeView === 'profile-settings' ? 'page' : undefined} on:mouseenter={() => prefetch('profileSettings')} on:focus={() => prefetch('profileSettings')} on:click={() => navigate('profile-settings')}>Customize</button>{/if}
        <button type="button" class:active={activeView === 'pricing'} aria-current={activeView === 'pricing' ? 'page' : undefined} on:mouseenter={() => prefetch('pricing')} on:focus={() => prefetch('pricing')} on:click={() => navigate('pricing')}>Pricing</button>
        {#if !isAuthenticated && showClaim}
          {#if claimHref}
            <a class="site-mode-header__claim-link" href={claimHref}>Claim handle</a>
          {:else}
            <button type="button" class="site-mode-header__claim-link" on:click={() => dispatch('claim')}>Claim handle</button>
          {/if}
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
            {#if !isHomeMode}<button type="button" class:active={activeView === 'game'} on:mouseenter={() => prefetch('game')} on:focus={() => prefetch('game')} on:click={() => navigate('game')}>Roll</button>{/if}
            <button type="button" class:active={activeView === 'leaderboard'} on:mouseenter={() => prefetch('leaderboard')} on:focus={() => prefetch('leaderboard')} on:click={() => navigate('leaderboard')}>Leaderboard</button>
            {#if isAuthenticated}<button type="button" class:active={activeView === 'progression'} on:mouseenter={() => prefetch('progression')} on:focus={() => prefetch('progression')} on:click={() => navigate('progression')}>Progression</button>{/if}
            {#if isAuthenticated}<button type="button" class:active={activeView === 'profile-settings'} on:mouseenter={() => prefetch('profileSettings')} on:focus={() => prefetch('profileSettings')} on:click={() => navigate('profile-settings')}>Customize</button>{/if}
            <button type="button" class:active={activeView === 'pricing'} on:mouseenter={() => prefetch('pricing')} on:focus={() => prefetch('pricing')} on:click={() => navigate('pricing')}>Pricing</button>
            {#if !isAuthenticated && showClaim && claimHref}
              <a class="site-mode-header__claim-link" href={claimHref}>Claim handle</a>
            {:else if !isAuthenticated && showClaim}
              <button type="button" class="site-mode-header__claim-link" on:click={() => { mobileMenuOpen = false; dispatch('claim'); }}>Claim handle</button>
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
          {:else}
            <button type="button" on:click={() => { mobileMenuOpen = false; dispatch('login', { mode: 'login' }); }}>Sign in / Sign up</button>
          {/if}
        </div>
      </div>
    </details>
  </div>
</header>

<style>
  .site-mode-header {
    --site-header-control-size: 0.84rem;
    --site-header-control-weight: 500;
    --site-header-font: 'Inter', ui-sans-serif, system-ui, sans-serif;
    --site-header-display: 'Manrope Variable', ui-sans-serif, system-ui, sans-serif;
    --site-header-accent: var(--white, #ffffff);
    position: relative;
    z-index: 20;
    width: 100%;
    height: 88px;
    color: var(--text-muted, #8d8c92);
  }

  .site-mode-header__inner {
    display: flex;
    width: min(1480px, calc(100% - 64px));
    height: 100%;
    align-items: center;
    justify-content: space-between;
    gap: 28px;
    margin-inline: auto;
  }

  .site-mode-header--home {
    height: 88px;
    margin: 0;
    border: 0;
    background: transparent;
  }

  .site-mode-header--leaderboard {
    background: transparent !important;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
    color: var(--text-muted);
  }

  /* Public profiles keep their own atmosphere behind a quiet account bar. */
  .site-mode-header--profile {
    height: auto;
    min-height: 3.5rem;
    border: 0;
    background: transparent !important;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
    --site-header-display: 'Clash Display', ui-sans-serif, system-ui, sans-serif;
  }

  .site-mode-header--profile-settings { background: transparent; }

  .site-mode-header--profile .site-mode-header__inner {
    width: 100%;
    padding-inline: clamp(1rem, 4vw, 3rem);
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
    flex: 0 0 auto;
    color: var(--text, #f5f5f6);
    text-decoration: none;
    white-space: nowrap;
  }

  .site-mode-header__brand-logo {
    display: block;
    width: 72px;
    height: auto;
    object-fit: contain;
    opacity: 0.96;
    filter: drop-shadow(0 0 14px rgba(255, 255, 255, 0.14));
  }

  .site-mode-header__nav,
  .site-mode-header__right,
  .site-mode-header__account,
  .site-mode-header__context {
    display: flex;
    align-items: center;
    gap: 28px;
  }

  .site-mode-header__nav { margin-left: auto; }
  .site-mode-header__nav-space { flex: 1 1 auto; min-width: 0; }
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
    min-height: 0;
    padding: 0;
    border: 0;
    border-radius: 0;
    background: transparent;
    color: var(--text-muted, #8d8c92);
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
    color: var(--text, #f5f5f6);
  }

  .site-mode-header__nav button.active {
    color: var(--site-header-accent);
  }

  /* The homepage-style header sits over photographic backgrounds. Keep its
   * navigation and account labels bright enough to read without hover. */
  .site-mode-header--home .site-mode-header__nav button:not(.site-mode-header__claim-link),
  .site-mode-header--home .site-mode-header__context button,
  .site-mode-header--home .site-mode-header__account-name,
  .site-mode-header--home .site-mode-header__account-action,
  .site-mode-header--home .site-mode-header__mobile-menu summary,
  .site-mode-header--home .site-mode-header__mobile-panel button:not(.site-mode-header__claim-link) {
    color: rgba(255, 255, 255, 0.94) !important;
    text-shadow: 0 1px 12px rgba(0, 0, 0, 0.2);
  }

  .site-mode-header--home .site-mode-header__nav button:hover:not(.site-mode-header__claim-link),
  .site-mode-header--home .site-mode-header__nav button.active:not(.site-mode-header__claim-link),
  .site-mode-header--home .site-mode-header__account-name:hover,
  .site-mode-header--home .site-mode-header__account-action:hover,
  .site-mode-header--home .site-mode-header__mobile-panel button:hover:not(.site-mode-header__claim-link),
  .site-mode-header--home .site-mode-header__mobile-panel button.active {
    color: var(--white, #ffffff) !important;
  }

  .site-mode-header--home-route .site-mode-header__nav .site-mode-header__claim-link {
    min-height: 0 !important;
    padding: 0 !important;
    border-radius: 0 !important;
    background: transparent !important;
    color: rgba(255, 255, 255, .94) !important;
    font: var(--site-header-control-weight) var(--site-header-control-size) / 1 var(--site-header-font) !important;
    text-shadow: none !important;
    -webkit-text-fill-color: currentColor !important;
    transform: none;
  }

  .site-mode-header--home-route .site-mode-header__nav .site-mode-header__claim-link:hover {
    background: transparent !important;
    color: #fff !important;
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
  .site-mode-header__account-name { max-width: 10rem; overflow: hidden; color: var(--text) !important; text-overflow: ellipsis; white-space: nowrap; }
  .site-mode-header__account-action { color: var(--text-muted) !important; }
  .site-mode-header__account-action--light { color: var(--text) !important; }
  .site-mode-header__account-action:disabled { cursor: wait; opacity: 0.55; }

  .site-mode-header--leaderboard .site-mode-header__brand,
  .site-mode-header--leaderboard .site-mode-header__nav button,
  .site-mode-header--leaderboard .site-mode-header__context button,
  .site-mode-header--leaderboard .site-mode-header__account-name,
  .site-mode-header--leaderboard .site-mode-header__account-action {
    color: var(--text) !important;
  }

  .site-mode-header--leaderboard .site-mode-header__nav button.active {
    color: var(--site-header-accent) !important;
  }

  .site-mode-header--leaderboard .site-mode-header__nav button:hover,
  .site-mode-header--leaderboard .site-mode-header__nav button:focus-visible,
  .site-mode-header--leaderboard .site-mode-header__account-name:hover,
  .site-mode-header--leaderboard .site-mode-header__account-action:hover {
    color: var(--text) !important;
  }

  .site-mode-header--leaderboard .site-mode-header__claim-link {
    border: 0 !important;
    background: var(--white) !important;
    color: var(--bg) !important;
    box-shadow: none;
  }

  .site-mode-header--leaderboard .site-mode-header__nav .site-mode-header__claim-link {
    color: var(--bg) !important;
  }

  .site-mode-header--leaderboard .site-mode-header__claim-link:hover {
    background: var(--site-header-accent) !important;
  }

  .site-mode-header--leaderboard .site-mode-header__mobile-menu summary {
    border-color: rgba(255, 255, 255, .16);
    color: var(--text);
  }

  .site-mode-header__claim-link {
    display: inline-flex;
    min-height: 42px !important;
    align-items: center;
    justify-content: center;
    padding: 0 18px !important;
    border-radius: 9px !important;
    background: var(--white) !important;
    color: var(--bg, #0e0e10) !important;
    font: 600 0.88rem / 1 var(--site-header-display) !important;
    transition: transform 0.18s ease, background 0.18s ease;
    text-decoration: none;
  }

  .site-mode-header__claim-link:hover {
    transform: translateY(-1px);
    background: var(--site-header-accent) !important;
  }

  .site-mode-header__claim-link:focus-visible {
    outline: 2px solid var(--site-header-accent);
    outline-offset: 4px;
  }

  .site-mode-header__mobile-menu { display: none; position: relative; }
  .site-mode-header__mobile-menu summary {
    min-height: 38px;
    padding: 0 12px;
    border: 1px solid rgba(255, 255, 255, 0.16);
    border-radius: 9px;
    color: var(--text);
    list-style: none;
  }
  .site-mode-header__mobile-menu summary::-webkit-details-marker { display: none; }

  .site-mode-header__mobile-panel {
    position: absolute;
    top: calc(100% + 10px);
    right: 0;
    display: grid;
    min-width: 14rem;
    padding: 0.55rem;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 0.65rem;
    background: var(--surface-2, #1e1e22);
    box-shadow: 0 1.5rem 3rem rgba(0, 0, 0, 0.42);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
  }
  .site-mode-header__mobile-panel button {
    min-height: 2.7rem;
    padding: 0.75rem;
    border-radius: 0.4rem;
    color: var(--text-muted, #8d8c92);
    text-align: left;
  }
  .site-mode-header__mobile-panel .site-mode-header__claim-link {
    width: 100%;
    justify-content: flex-start;
    min-height: 2.7rem !important;
    padding: 0.75rem !important;
  }
  .site-mode-header--home-route .site-mode-header__mobile-panel .site-mode-header__claim-link {
    background: transparent !important;
    color: rgba(255, 255, 255, .94) !important;
    -webkit-text-fill-color: currentColor !important;
    font: inherit !important;
  }
  .site-mode-header__mobile-panel button:hover,
  .site-mode-header__mobile-panel button.active,
  .site-mode-header__mobile-panel .site-mode-header__claim-link:hover { background: var(--surface-3, #28282c); }
  .site-mode-header__mobile-primary,
  .site-mode-header__mobile-context,
  .site-mode-header__mobile-account { display: grid; gap: 0.25rem; }
  .site-mode-header__mobile-primary { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .site-mode-header__mobile-context,
  .site-mode-header__mobile-account { margin-top: 0.35rem; padding-top: 0.55rem; border-top: 1px solid rgba(255, 255, 255, 0.1); }
  .site-mode-header__mobile-panel > .site-mode-header__mobile-context:first-child { margin-top: 0; padding-top: 0; border-top: 0; }
  .site-mode-header__mobile-context button,
  .site-mode-header__mobile-account button { width: 100%; }

  @media (max-width: 1100px) {
    .site-mode-header__inner { width: min(calc(100% - 40px), 980px); }
  }

  @media (max-width: 980px) {
    .site-mode-header__nav { gap: 20px; }
    .site-mode-header__account { gap: 14px; }
  }

  @media (max-width: 780px) {
    .site-mode-header,
    .site-mode-header--home { height: 70px; }
    .site-mode-header__inner { width: calc(100% - 30px); }
    .site-mode-header__nav { gap: 10px; }
    .site-mode-header__nav button:not(.site-mode-header__claim-link),
    .site-mode-header__account-action,
    .site-mode-header__account-name { display: none; }
    .site-mode-header__claim-link { min-height: 38px !important; padding-inline: 14px !important; font-size: 0.8rem !important; }
    .site-mode-header__account { gap: 10px; }
    /* Keep the full navigation and account actions available on small home
     * screens through the same menu used by supporting routes. */
    .site-mode-header--home-route .site-mode-header__nav,
    .site-mode-header--home-route .site-mode-header__account { display: none; }
    .site-mode-header--home-route .site-mode-header__mobile-menu { display: block; }
    .site-mode-header--profile .site-mode-header__inner { width: 100%; padding-inline: clamp(1rem, 4vw, 3rem); }
    .site-mode-header--profile .site-mode-header__right { display: flex; gap: 0.25rem; }
    .site-mode-header--profile .site-mode-header__account { display: none; }
    .site-mode-header--profile .site-mode-header__context .site-mode-header__account-action { display: inline-flex; }
    .site-mode-header--profile .site-mode-header__mobile-menu { display: block; }
    .site-mode-header--profile .site-mode-header__mobile-context { display: none; }
    .site-mode-header:not(.site-mode-header--home-route) .site-mode-header__mobile-menu { display: block; }
  }

  @media (max-width: 460px) {
    .site-mode-header__brand-logo { width: 58px; }
    .site-mode-header__claim-link { padding-inline: 11px !important; }
  }

  @media (prefers-reduced-motion: reduce) {
    .site-mode-header__claim-link,
    .site-mode-header__nav button,
    .site-mode-header__context button,
    .site-mode-header__account button,
    .site-mode-header__mobile-panel button { transition-duration: 0.001ms; }
  }
</style>
