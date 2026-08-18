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

<header class="site-mode-header" class:site-mode-header--profile={isProfileMode} class:site-mode-header--profile-settings={isProfileSettings} class:site-mode-header--home={isHomeMode || isHomepageStyle} class:site-mode-header--leaderboard={isLeaderboardMode} data-site-chrome="header" style={`--site-header-accent: ${accentColor};`}>
  <div class="site-mode-header__inner">
    <a class="site-mode-header__brand" href="/" on:click|preventDefault={navigateHome} aria-label="ChromaDie home">
      <span class="site-mode-header__brand-mark" aria-hidden="true"></span>
      <span class="site-mode-header__wordmark">chm<span>.lol</span></span>
    </a>

    {#if !minimalMode}
      <nav class="site-mode-header__nav" aria-label="Primary application navigation">
        <button type="button" class:active={activeView === 'leaderboard'} aria-current={activeView === 'leaderboard' ? 'page' : undefined} on:mouseenter={() => prefetch('leaderboard')} on:focus={() => prefetch('leaderboard')} on:click={() => navigate('leaderboard')}>Leaderboard</button>
        <button type="button" class:active={activeView === 'profile-settings'} aria-current={activeView === 'profile-settings' ? 'page' : undefined} on:mouseenter={() => prefetch('profileSettings')} on:focus={() => prefetch('profileSettings')} on:click={() => navigate('profile-settings')}>Customize</button>
        <button type="button" class:active={activeView === 'pricing'} aria-current={activeView === 'pricing' ? 'page' : undefined} on:mouseenter={() => prefetch('pricing')} on:focus={() => prefetch('pricing')} on:click={() => navigate('pricing')}>Pricing</button>
        <button type="button" class="site-mode-header__claim-link" on:click={() => dispatch('claim')}>Claim handle</button>
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
            <button type="button" class:active={activeView === 'profile-settings'} on:mouseenter={() => prefetch('profileSettings')} on:focus={() => prefetch('profileSettings')} on:click={() => navigate('profile-settings')}>Customize</button>
            <button type="button" class:active={activeView === 'pricing'} on:mouseenter={() => prefetch('pricing')} on:focus={() => prefetch('pricing')} on:click={() => navigate('pricing')}>Pricing</button>
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
  </div>
</header>

<style>
  .site-mode-header {
    --site-header-control-size: 0.84rem;
    --site-header-control-weight: 500;
    --site-header-font: 'Inter', ui-sans-serif, system-ui, sans-serif;
    --site-header-display: 'Clash Display', ui-sans-serif, system-ui, sans-serif;
    --site-header-accent: #00ffb3;
    position: relative;
    z-index: 20;
    width: 100%;
    height: 88px;
    color: #8f9099;
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
    color: #282433;
  }

  /* Public profiles keep their own atmosphere behind a quiet account bar. */
  .site-mode-header--profile {
    height: auto;
    min-height: 3.5rem;
    border: 0;
    background: transparent !important;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
  }

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
    gap: 11px;
    color: #f5f5f7;
    font: 600 1.28rem / 1 var(--site-header-display);
    letter-spacing: -0.025em;
    text-decoration: none;
    white-space: nowrap;
  }

  .site-mode-header__brand-mark {
    position: relative;
    width: 24px;
    height: 24px;
    border: 2px solid color-mix(in srgb, var(--site-header-accent) 36%, transparent);
    border-radius: 999px;
    box-shadow: 0 0 18px color-mix(in srgb, var(--site-header-accent) 28%, transparent);
  }

  .site-mode-header__brand-mark::after {
    position: absolute;
    inset: 6px;
    content: '';
    border-radius: 999px;
    background: var(--site-header-accent);
  }

  .site-mode-header__wordmark { color: #f5f5f7; }
  .site-mode-header__wordmark > span { color: var(--site-header-accent); }

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
    color: rgba(245, 245, 247, 0.6);
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
    color: #f5f5f7;
  }

  .site-mode-header__nav button.active {
    color: var(--site-header-accent);
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
  .site-mode-header__account-name { max-width: 10rem; overflow: hidden; color: rgba(245, 245, 247, 0.8) !important; text-overflow: ellipsis; white-space: nowrap; }
  .site-mode-header__account-action { color: rgba(245, 245, 247, 0.6) !important; }
  .site-mode-header__account-action--light { color: #f5f5f7 !important; }
  .site-mode-header__account-action--signup {
    display: none;
    min-height: 38px !important;
    padding: 0 14px !important;
    border-radius: 9px !important;
    background: #f5f5f7 !important;
    color: #08080a !important;
    font: 600 0.8rem / 1 var(--site-header-display) !important;
  }
  .site-mode-header__account-action--signup:hover { background: var(--site-header-accent) !important; }
  .site-mode-header__account-action:disabled { cursor: wait; opacity: 0.55; }

  .site-mode-header--leaderboard .site-mode-header__brand,
  .site-mode-header--leaderboard .site-mode-header__wordmark,
  .site-mode-header--leaderboard .site-mode-header__nav button,
  .site-mode-header--leaderboard .site-mode-header__context button,
  .site-mode-header--leaderboard .site-mode-header__account-name,
  .site-mode-header--leaderboard .site-mode-header__account-action {
    color: rgba(40, 36, 51, .78) !important;
  }

  .site-mode-header--leaderboard .site-mode-header__wordmark > span,
  .site-mode-header--leaderboard .site-mode-header__nav button.active {
    color: var(--site-header-accent) !important;
  }

  .site-mode-header--leaderboard .site-mode-header__nav button:hover,
  .site-mode-header--leaderboard .site-mode-header__nav button:focus-visible,
  .site-mode-header--leaderboard .site-mode-header__account-name:hover,
  .site-mode-header--leaderboard .site-mode-header__account-action:hover {
    color: #282433 !important;
  }

  .site-mode-header--leaderboard .site-mode-header__claim-link {
    border: 1px solid rgba(40, 36, 51, .14) !important;
    background: rgba(255, 255, 255, .62) !important;
    color: #282433 !important;
    box-shadow: 0 0.5rem 1.25rem rgba(61, 44, 93, .08);
  }

  .site-mode-header--leaderboard .site-mode-header__claim-link:hover {
    background: rgba(255, 255, 255, .86) !important;
  }

  .site-mode-header--leaderboard .site-mode-header__mobile-menu summary {
    border-color: rgba(40, 36, 51, .2);
    color: #282433;
  }

  .site-mode-header__claim-link {
    display: inline-flex;
    min-height: 42px !important;
    align-items: center;
    justify-content: center;
    padding: 0 18px !important;
    border-radius: 9px !important;
    background: #f5f5f7 !important;
    color: #08080a !important;
    font: 600 0.88rem / 1 var(--site-header-display) !important;
    transition: transform 0.18s ease, background 0.18s ease;
  }

  .site-mode-header__claim-link:hover {
    transform: translateY(-1px);
    background: var(--site-header-accent) !important;
  }

  .site-mode-header__mobile-menu { display: none; position: relative; }
  .site-mode-header__mobile-menu summary {
    min-height: 38px;
    padding: 0 12px;
    border: 1px solid rgba(255, 255, 255, 0.16);
    border-radius: 9px;
    color: #f5f5f7;
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
    .site-mode-header__account-action:not(.site-mode-header__account-action--signup),
    .site-mode-header__account-name { display: none; }
    .site-mode-header__claim-link { min-height: 38px !important; padding-inline: 14px !important; font-size: 0.8rem !important; }
    .site-mode-header__account { gap: 10px; }
    .site-mode-header--home .site-mode-header__account-action--signup { display: inline-flex; }
    .site-mode-header--home .site-mode-header__mobile-menu { display: none; }
    .site-mode-header--profile .site-mode-header__inner { width: 100%; padding-inline: clamp(1rem, 4vw, 3rem); }
    .site-mode-header--profile .site-mode-header__right { display: flex; gap: 0.25rem; }
    .site-mode-header--profile .site-mode-header__account { display: none; }
    .site-mode-header--profile .site-mode-header__context .site-mode-header__account-action { display: inline-flex; }
    .site-mode-header--profile .site-mode-header__mobile-menu { display: block; }
    .site-mode-header--profile .site-mode-header__mobile-context { display: none; }
    .site-mode-header:not(.site-mode-header--home) .site-mode-header__mobile-menu { display: block; }
  }

  @media (max-width: 460px) {
    .site-mode-header__brand { gap: 8px; font-size: 1.1rem; }
    .site-mode-header__brand-mark { width: 20px; height: 20px; }
    .site-mode-header__brand-mark::after { inset: 5px; }
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
