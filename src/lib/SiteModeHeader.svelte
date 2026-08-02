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
  export let isHomeMode = false;
  export let isOwner = false;

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
    if (['profileShell', 'leaderboard', 'shop'].includes(loaderKey)) {
      void prefetchRouteComponent(loaderKey);
    }
  }
</script>

<header class="site-mode-header" class:site-mode-header--profile={isProfileMode} class:site-mode-header--home={isHomeMode}>
  <a class="site-mode-header__brand" href="/" on:click|preventDefault={navigateHome} aria-label="ChromaDie home">
    <span class="site-mode-header__wordmark">chm<span>.lol</span></span>
  </a>

  {#if !minimalMode}
    <nav class="site-mode-header__nav" aria-label="Primary application navigation">
      {#if isHomeMode && !isAuthenticated}
        <button type="button" class:active={activeView === 'leaderboard'} aria-current={activeView === 'leaderboard' ? 'page' : undefined} on:mouseenter={() => prefetch('leaderboard')} on:focus={() => prefetch('leaderboard')} on:click={() => navigate('leaderboard')}>Explore</button>
        <span aria-hidden="true">/</span>
        <button type="button" class:active={activeView === 'leaderboard'} aria-current={activeView === 'leaderboard' ? 'page' : undefined} on:mouseenter={() => prefetch('leaderboard')} on:focus={() => prefetch('leaderboard')} on:click={() => navigate('leaderboard')}>Leaderboard</button>
      {:else}
        <button type="button" class:active={activeView === 'profile'} aria-current={activeView === 'profile' ? 'page' : undefined} on:mouseenter={() => prefetch('profile')} on:focus={() => prefetch('profile')} on:click={() => navigate('profile')}>Profile</button>
      <span aria-hidden="true">/</span>
      <button type="button" class:active={activeView === 'leaderboard'} aria-current={activeView === 'leaderboard' ? 'page' : undefined} on:mouseenter={() => prefetch('leaderboard')} on:focus={() => prefetch('leaderboard')} on:click={() => navigate('leaderboard')}>Leaderboard</button>
      {#if isAuthenticated}
        <span aria-hidden="true">/</span>
        <button type="button" class:active={activeView === 'shop'} aria-current={activeView === 'shop' ? 'page' : undefined} on:mouseenter={() => prefetch('shop')} on:focus={() => prefetch('shop')} on:click={() => navigate('shop')}>Studio</button>
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
          <button type="button" on:click={editProfile}>Edit</button>
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
      {:else if isHomeMode && !isAuthenticated}
        <button type="button" class="site-mode-header__account-action" on:click={() => dispatch('login', { mode: 'login' })}>Sign in</button>
        <button type="button" class="site-mode-header__account-action site-mode-header__account-action--signup" on:click={() => dispatch('login', { mode: 'signup' })}>Sign up</button>
      {:else}
        <button type="button" class="site-mode-header__account-action site-mode-header__account-action--light" on:click={() => dispatch('login', { mode: 'login' })}>Sign in / Sign up</button>
      {/if}
    </div>
  </div>

  <details class="site-mode-header__mobile-menu" bind:open={mobileMenuOpen}>
    <summary aria-expanded={mobileMenuOpen} aria-label={isProfileMode ? 'Open profile actions' : isHomeMode ? 'Open account actions' : 'Open application navigation'}>Menu</summary>
    <div class="site-mode-header__mobile-panel" aria-hidden={!mobileMenuOpen}>
      {#if !minimalMode}
        <div class="site-mode-header__mobile-primary" aria-label="Primary application navigation">
          {#if isHomeMode && !isAuthenticated}
            <button type="button" class:active={activeView === 'leaderboard'} on:mouseenter={() => prefetch('leaderboard')} on:focus={() => prefetch('leaderboard')} on:click={() => navigate('leaderboard')}>Explore</button>
            <button type="button" class:active={activeView === 'leaderboard'} on:mouseenter={() => prefetch('leaderboard')} on:focus={() => prefetch('leaderboard')} on:click={() => navigate('leaderboard')}>Leaderboard</button>
          {:else}
            <button type="button" class:active={activeView === 'profile'} on:mouseenter={() => prefetch('profile')} on:focus={() => prefetch('profile')} on:click={() => navigate('profile')}>Profile</button>
          <button type="button" class:active={activeView === 'leaderboard'} on:mouseenter={() => prefetch('leaderboard')} on:focus={() => prefetch('leaderboard')} on:click={() => navigate('leaderboard')}>Leaderboard</button>
          {#if isAuthenticated}
            <button type="button" class:active={activeView === 'shop'} on:mouseenter={() => prefetch('shop')} on:focus={() => prefetch('shop')} on:click={() => navigate('shop')}>Studio</button>
          {/if}
          {/if}
        </div>
      {/if}

      {#if isProfileMode}
        <div class="site-mode-header__mobile-context" aria-label="Profile actions">
          {#if isOwner}<button type="button" on:click={editProfile}>Edit profile</button>{/if}
        </div>
      {/if}

      <div class="site-mode-header__mobile-account">
        {#if accountState === ACCOUNT_STATES.AUTHENTICATED && isAuthenticated}
          <button type="button" on:click={() => { mobileMenuOpen = false; dispatch('logout'); }} disabled={logoutInProgress}>{logoutInProgress ? 'Signing out…' : 'Sign out'}</button>
        {:else if accountState === ACCOUNT_STATES.PROFILE_ERROR}
          <button type="button" on:click={() => { mobileMenuOpen = false; dispatch('retry'); }}>Retry account</button>
        {:else if accountState === ACCOUNT_STATES.BOOTING || accountState === ACCOUNT_STATES.PROFILE_LOADING}
          <!-- Keep account controls visually quiet while session data hydrates. -->
        {:else if isHomeMode && !isAuthenticated}
          <button type="button" on:click={() => { mobileMenuOpen = false; dispatch('login', { mode: 'login' }); }}>Sign in</button>
          <button type="button" on:click={() => { mobileMenuOpen = false; dispatch('login', { mode: 'signup' }); }}>Sign up</button>
        {:else}
          <button type="button" on:click={() => { mobileMenuOpen = false; dispatch('login', { mode: 'login' }); }}>Sign in / Sign up</button>
        {/if}
      </div>
    </div>
  </details>
</header>

<style>
  .site-mode-header {
    --site-header-control-size: 0.78rem;
    --site-header-control-weight: 500;
    --site-header-control-spacing: 0.01em;
    --site-header-font: 'Satoshi', ui-sans-serif, system-ui, sans-serif;
    position: relative;
    z-index: 20;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    gap: 1rem;
    width: 100%;
    min-height: 4.75rem;
    margin-inline: auto;
    padding: 1rem clamp(1.25rem, 4vw, 3rem);
    color: rgba(235, 240, 252, 0.72);
    background: transparent;
  }

  .site-mode-header--home {
    position: sticky;
    top: 0.5rem;
    grid-template-columns: 1fr auto 1fr;
    width: min(calc(100% - 2.5rem), 86.25rem);
    height: 2.75rem;
    min-height: 2.75rem;
    margin: 0.625rem auto 0.625rem;
    padding: 0 0.5rem 0 1rem;
    border: 1px solid rgba(255, 255, 255, 0.09);
    border-radius: 999px;
    background: rgba(17, 18, 23, 0.9);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
  }

  .site-mode-header--home .site-mode-header__brand {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 0.75rem;
  }

  .site-mode-header--home .site-mode-header__wordmark > span { color: #cdd2ff; }

  .site-mode-header--home .site-mode-header__right {
    padding: 0;
    border: 0;
    background: transparent;
    box-shadow: none;
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }

  .site-mode-header--home .site-mode-header__nav,
  .site-mode-header--home .site-mode-header__right { justify-self: center; }

  .site-mode-header--home .site-mode-header__right { justify-self: end; }

  .site-mode-header--home .site-mode-header__nav {
    gap: 0.25rem;
    padding: 0.2rem 0.35rem;
  }

  .site-mode-header--home .site-mode-header__nav button,
  .site-mode-header--home .site-mode-header__account button {
    min-height: 0;
    padding: 0.5rem 0.8rem;
  }

  .site-mode-header__brand {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    color: rgba(246, 248, 255, 0.94);
    font: 600 0.72rem / 1 var(--site-header-font);
    letter-spacing: 0.08em;
    text-transform: lowercase;
    text-decoration: none;
    white-space: nowrap;
  }

  .site-mode-header__wordmark { color: rgba(246, 248, 255, 0.94); }
  .site-mode-header__wordmark > span { color: var(--color-accent-cyan); }

  .site-mode-header__nav,
  .site-mode-header__right,
  .site-mode-header__account,
  .site-mode-header__context {
    display: flex;
    align-items: center;
    gap: 0.8rem;
  }

  .site-mode-header__nav,
  .site-mode-header__context,
  .site-mode-header__account {
    font: var(--site-header-control-weight) var(--site-header-control-size) / 1 var(--site-header-font);
    letter-spacing: var(--site-header-control-spacing);
  }

  .site-mode-header__right {
    justify-content: flex-end;
    min-width: 0;
    padding: 0.25rem 0.35rem;
    border: 1px solid rgba(255, 255, 255, 0.09);
    border-radius: var(--radius-pill);
    background: rgba(7, 8, 11, 0.52);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.035), 0 0.75rem 2rem rgba(0, 0, 0, 0.18);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
  }
  .site-mode-header__nav-space { min-width: 0; }
  .site-mode-header__context { flex: 0 0 auto; }

  .site-mode-header__nav {
    justify-content: center;
    width: fit-content;
    justify-self: center;
    padding: 0.25rem 0.35rem;
    border: 1px solid rgba(255, 255, 255, 0.09);
    border-radius: var(--radius-pill);
    background: rgba(7, 8, 11, 0.52);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.035), 0 0.75rem 2rem rgba(0, 0, 0, 0.18);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
  }

  .site-mode-header__nav > span {
    color: rgba(232, 238, 250, 0.24);
    user-select: none;
  }

  .site-mode-header__nav button,
  .site-mode-header__context button,
  .site-mode-header__account button,
  .site-mode-header__mobile-panel button,
  .site-mode-header__mobile-menu summary {
    min-height: 2.05rem;
    padding: 0.55rem 0.75rem;
    border: 0;
    border-radius: var(--radius-pill);
    background: transparent;
    color: inherit;
    font: var(--site-header-control-weight) var(--site-header-control-size) / 1 var(--site-header-font);
    letter-spacing: var(--site-header-control-spacing);
    text-transform: lowercase;
    cursor: pointer;
    transition: color var(--motion-base) var(--motion-ease-standard), background-color var(--motion-base) var(--motion-ease-standard), border-color var(--motion-base) var(--motion-ease-standard);
  }

  .site-mode-header__nav button:hover,
  .site-mode-header__nav button.active,
  .site-mode-header__context button:hover:not(:disabled),
  .site-mode-header__account button:hover,
  .site-mode-header__mobile-panel button:hover,
  .site-mode-header__mobile-panel button.active { color: rgba(246, 248, 255, 0.96); }

  .site-mode-header__nav button.active { background: rgba(255, 255, 255, 0.07); }

  .site-mode-header__nav button:focus-visible,
  .site-mode-header__context button:focus-visible,
  .site-mode-header__account button:focus-visible,
  .site-mode-header__mobile-panel button:focus-visible,
  .site-mode-header__mobile-menu summary:focus-visible {
    outline: 2px solid var(--color-accent-bright);
    outline-offset: 4px;
    border-radius: 0.25rem;
  }

  .site-mode-header__account {
    justify-content: flex-end;
    min-width: 0;
  }

  .site-mode-header__account-name {
    max-width: 10rem;
    overflow: hidden;
    color: rgba(246, 248, 255, 0.88) !important;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .site-mode-header__account-action { color: rgba(232, 238, 250, 0.62) !important; }
  .site-mode-header__account-action--light { color: rgba(246, 248, 255, 0.9) !important; }
  .site-mode-header__account-action--signup { color: #101116 !important; background: #efede7 !important; font-weight: 700 !important; }
  .site-mode-header__account-action--signup:hover { background: #fff !important; }
  .site-mode-header__account-action:disabled { cursor: wait; opacity: 0.55; }

  .site-mode-header__mobile-menu { display: none; position: relative; }
  .site-mode-header__mobile-menu summary {
    min-height: 2.5rem;
    padding: 0.7rem 0.8rem;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 999px;
    color: rgba(246, 248, 255, 0.88);
    cursor: pointer;
    list-style: none;
  }

  .site-mode-header__mobile-menu summary::-webkit-details-marker { display: none; }

  .site-mode-header__mobile-panel {
    position: absolute;
    top: calc(100% + 0.75rem);
    right: 0;
    display: grid;
    min-width: 12rem;
    padding: 0.55rem;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 1rem;
    background: rgba(8, 12, 20, 0.94);
    box-shadow: 0 1.5rem 3rem rgba(0, 0, 0, 0.35);
    backdrop-filter: blur(1.2rem);
    -webkit-backdrop-filter: blur(1.2rem);
  }

  .site-mode-header__mobile-panel button {
    min-height: 2.75rem;
    padding: 0.8rem 0.75rem;
    border-radius: 0.65rem;
    color: rgba(232, 238, 250, 0.7);
    text-align: left;
  }

  .site-mode-header__mobile-panel button:hover,
  .site-mode-header__mobile-panel button.active { background: rgba(255, 255, 255, 0.06); }

  .site-mode-header__mobile-primary,
  .site-mode-header__mobile-context,
  .site-mode-header__mobile-account { display: grid; gap: 0.25rem; }
  .site-mode-header__mobile-primary { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .site-mode-header__mobile-context,
  .site-mode-header__mobile-account { margin-top: 0.35rem; padding-top: 0.55rem; border-top: 1px solid rgba(255, 255, 255, 0.08); }
  .site-mode-header__mobile-panel > .site-mode-header__mobile-context:first-child { margin-top: 0; padding-top: 0; border-top: 0; }
  .site-mode-header__mobile-context button,
  .site-mode-header__mobile-account button { width: 100%; }

  @media (max-width: 48rem) {
    .site-mode-header { grid-template-columns: auto minmax(0, 1fr) auto; }
    .site-mode-header--home { width: calc(100% - 1.5rem); height: 2.625rem; min-height: 2.625rem; margin: 0.5rem auto; padding: 0 0.8rem; }
    .site-mode-header__nav,
    .site-mode-header__right { display: none; }
    .site-mode-header__mobile-menu { display: block; justify-self: end; }
  }

  @media (max-width: 36rem) {
    .site-mode-header { min-height: 2.625rem; padding: 0 0.8rem; }
    .site-mode-header__brand { font-size: 0.75rem; }
  }

  @media (prefers-reduced-motion: reduce) {
    .site-mode-header__nav button,
    .site-mode-header__context button,
    .site-mode-header__account button,
    .site-mode-header__mobile-panel button { transition-duration: 0.001ms; }
  }

</style>
