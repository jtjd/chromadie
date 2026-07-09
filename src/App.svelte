<script>
  import { session, authUser, profile, authInitialized, authEvent, profileLoading, profileError, equippedItems, selectedUserId, loadShopItems, isAuthenticated } from './lib/stores';
  import { supabase, supabaseError } from './lib/supabase';
  import Auth from './lib/Auth.svelte';
  import AuthCallback from './lib/AuthCallback.svelte';
  import Game from './lib/Game.svelte';
  import Shop from './lib/Shop.svelte';
  import Leaderboard from './lib/Leaderboard.svelte';
  import Profile from './lib/Profile.svelte';
  import ResetPassword from './lib/ResetPassword.svelte';
  import Toast from './lib/Toast.svelte';
  import GuestLock from './lib/GuestLock.svelte';
  import { getNameEffect, getFrameEffect, getTitleText } from './lib/cosmetics';
  import { normalizeHexColor } from './lib/utils';
  import { focusFirstElement, restoreFocus, trapFocus } from './lib/a11y';
  import { onMount, onDestroy, tick } from 'svelte';
  import { SvelteURLSearchParams } from 'svelte/reactivity';

  const VALID_VIEWS = new Set(['game', 'shop', 'leaderboard', 'profile']);
  const VALID_LEADERBOARD_TABS = new Set(['today', 'rivals', 'weekly', 'monthly', 'roll']);
  const VALID_APP_ROUTES = new Set(['app', 'auth-callback', 'reset-password']);
  let view = 'game';
  let leaderboardTab = 'today';
  let routeMode = 'app';
  let showAuthModal = false;
  let challengeData = null;
  let authDialog = null;
  let authOpener = null;
  let mobileMenuOpen = false;

  supabase.auth.getSession().then(({ data }) => session.set(data.session));

  function parseRoute() {
    const params = new SvelteURLSearchParams(window.location.search);
    const rawPath = window.location.pathname.replace(/\/+$/, '') || '/';
    const routeView = params.get('view');
    const routeTab = params.get('tab');
    const routeProfileId = params.get('profile');
    const cScore = params.get('challenge');
    const cHex = params.get('hex');
    const isValidChallengeHex = /^[0-9A-Fa-f]{6}$/.test(cHex || '');

    if (rawPath === '/auth/callback') {
      routeMode = 'auth-callback';
    } else if (rawPath === '/reset-password') {
      routeMode = 'reset-password';
    } else {
      routeMode = 'app';
    }

    view = VALID_VIEWS.has(routeView) ? routeView : 'game';
    leaderboardTab = VALID_LEADERBOARD_TABS.has(routeTab) ? routeTab : 'today';
    selectedUserId.set(routeProfileId || null);

    if (cScore && isValidChallengeHex) {
      const parsedScore = Number.parseInt(cScore, 10);
      challengeData = Number.isFinite(parsedScore) ? { score: parsedScore, hex: normalizeHexColor(cHex) } : null;
    } else {
      challengeData = null;
    }
  }

  function syncRoute() {
    if (typeof window === 'undefined') return;
    if (!VALID_APP_ROUTES.has(routeMode) || routeMode !== 'app') return;

    const params = new SvelteURLSearchParams();
    if (view !== 'game') params.set('view', view);
    if (view === 'leaderboard' && leaderboardTab !== 'today') {
      params.set('tab', leaderboardTab);
    }
    if (view === 'profile' && $selectedUserId) {
      params.set('profile', $selectedUserId);
    }
    if (challengeData?.score != null && challengeData?.hex) {
      params.set('challenge', String(challengeData.score));
      params.set('hex', challengeData.hex.replace('#', ''));
    }

    const nextSearch = params.toString();
    const nextUrl = nextSearch ? `${window.location.pathname}?${nextSearch}` : window.location.pathname;
    const currentUrl = `${window.location.pathname}${window.location.search}`;
    if (nextUrl !== currentUrl) {
      window.history.pushState({}, '', nextUrl);
    }
  }

  function setRoute(nextView, options = {}) {
    if (!VALID_VIEWS.has(nextView)) return;

    view = nextView;
    mobileMenuOpen = false;
    if (nextView !== 'leaderboard') {
      leaderboardTab = options.tab && VALID_LEADERBOARD_TABS.has(options.tab) ? options.tab : leaderboardTab;
    } else if (options.tab && VALID_LEADERBOARD_TABS.has(options.tab)) {
      leaderboardTab = options.tab;
    }

    if (nextView === 'profile') {
      selectedUserId.set(options.userId || null);
    } else {
      selectedUserId.set(null);
    }

    syncRoute();
  }

  function handlePopState() {
    parseRoute();
  }

  onMount(() => {
    void loadShopItems();
    parseRoute();
    window.addEventListener('popstate', handlePopState);
  });

  onDestroy(() => {
    window.removeEventListener('popstate', handlePopState);
  });

  function handleLogout() {
    try {
      localStorage.removeItem('chromadie-roll');
    } catch {
      // Ignore storage failures on hardened/private browsing setups.
    }
    closeMobileMenu();
    supabase.auth.signOut();
    setRoute('game');
  }

  function handleNavClick(newView) {
    setRoute(newView);
  }

  function handleLogoClick(event) {
    event.preventDefault();
    setRoute('game');
  }

  function handleNavigation(event) {
    const { view: nextView, userId = null, tab = null } = event.detail || {};
    if (nextView) {
      setRoute(nextView, { userId, tab });
    }
  }

  async function openAuthModal() {
    authOpener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    mobileMenuOpen = false;
    showAuthModal = true;
    await tick();
    focusFirstElement(authDialog) || authDialog?.focus();
  }

  async function closeAuthModal() {
    if (!showAuthModal) return;
    showAuthModal = false;
    await tick();
    restoreFocus(authOpener);
    authOpener = null;
  }

  function handleAuthModalKeydown(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      void closeAuthModal();
      return;
    }

    trapFocus(event, authDialog);
  }

  function toggleMobileMenu() {
    mobileMenuOpen = !mobileMenuOpen;
  }

  function closeMobileMenu() {
    mobileMenuOpen = false;
  }

  $: userCosmetics = $equippedItems;
  $: nameEff = getNameEffect(userCosmetics);
  $: frameEff = getFrameEffect(userCosmetics);
  $: titleTxt = getTitleText(userCosmetics);
  $: headerUsername = $profile?.username || $authUser?.user_metadata?.username || $authUser?.email?.split('@')[0] || 'Signed in';
  $: username = $session ? ($profile?.username || 'Loading your account...') : 'Guest Mode';
  $: mobileStatusText = $isAuthenticated
    ? username
    : $profileLoading
      ? 'Loading profile'
      : ($authInitialized && $session && $profileError ? 'Account issue' : 'Guest Mode');
  $: mobileStatusActionable = !$isAuthenticated && !$profileLoading && !($authInitialized && $session && $profileError);
  const errorState = supabaseError;

  $: if (($authEvent === 'SIGNED_IN' || $authEvent === 'USER_UPDATED') && showAuthModal) {
    void closeAuthModal();
  }

  $: if (typeof document !== 'undefined') {
    document.body.style.overflow = (showAuthModal || mobileMenuOpen) ? 'hidden' : '';
  }

  onDestroy(() => {
    if (typeof document !== 'undefined') {
      document.body.style.overflow = '';
    }
  });
</script>

<Toast />

  {#if errorState}
    <main class="bootstrap-error-shell">
      <section class="bootstrap-error-card glass-panel" role="alert" aria-live="polite">
      <p class="bootstrap-error-kicker">Configuration error</p>
      <h1>{errorState.title}</h1>
      <p class="bootstrap-error-message">{errorState.message}</p>
      {#if errorState.details}
        <p class="bootstrap-error-details">{errorState.details}</p>
      {/if}
      <p class="bootstrap-error-help">
        Set the required Supabase environment variables, rebuild, and redeploy. In development, check the console for the exact missing setting.
      </p>
      </section>
    </main>
  {:else if routeMode === 'auth-callback'}
    <AuthCallback />
  {:else if routeMode === 'reset-password'}
    <ResetPassword />
  {:else}
  {#if showAuthModal}
    <div class="auth-modal-overlay" role="presentation" on:click|self={closeAuthModal}>
      <div
        class="auth-modal-content"
        bind:this={authDialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-dialog-title"
        aria-describedby="auth-dialog-desc"
        tabindex="-1"
        on:keydown={handleAuthModalKeydown}
      >
        <Auth onClose={closeAuthModal} />
      </div>
    </div>
  {/if}

  {#if challengeData && view === 'game'}
    <div class="challenge-banner">
      <div class="challenge-info">
        <span class="challenge-text">Player challenges you to beat:</span>
        <div class="challenge-stat">
          <span class="challenge-color" style="background-color: {challengeData.hex};"></span>
          <span class="challenge-score">{challengeData.score.toLocaleString()} pts</span>
        </div>
      </div>
      <button
        type="button"
        class="challenge-close"
        aria-label="Dismiss challenge banner"
        on:click={() => challengeData = null}
      >
        ✖
      </button>
    </div>
  {/if}

  <div id="header-mount">
    {#if mobileMenuOpen}
      <button
        type="button"
        class="mobile-nav-backdrop"
        aria-label="Close navigation menu"
        on:click={closeMobileMenu}
      ></button>
    {/if}
    <header class="site-header">
      <a href="/" class="logo" on:click={handleLogoClick}>🎲 ChromaDie</a>
      {#if $authUser}
        <div class="mobile-user-chip {frameEff.cls}" style="{frameEff.style}">
          {#if titleTxt}
            <span class="title-chip">[{titleTxt}]</span>
          {/if}
          <span class="user-name {nameEff.cls}" style="{nameEff.style}" data-text={headerUsername}>
            {headerUsername}
          </span>
        </div>
      {:else if mobileStatusActionable}
        <button type="button" class="mobile-status-pill mobile-status-action" on:click={openAuthModal}>
          {mobileStatusText}
        </button>
      {:else}
        <span class="mobile-status-pill">
          {mobileStatusText}
        </span>
      {/if}
      <button
        type="button"
        class="menu-toggle"
        aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
        aria-expanded={mobileMenuOpen}
        aria-controls="mobile-navigation"
        on:click={toggleMobileMenu}
      >
        <span class="menu-toggle-lines" aria-hidden="true">
          <span></span>
          <span></span>
          <span></span>
        </span>
      </button>

      <nav class="nav-links desktop-nav">
        <button class="nav-link" class:active={view === 'game'} on:click={() => handleNavClick('game')}>Game</button>
        <button class="nav-link" class:active={view === 'shop'} on:click={() => handleNavClick('shop')}>Shop</button>
        <button class="nav-link" class:active={view === 'leaderboard'} on:click={() => setRoute('leaderboard', { tab: 'today' })}>Leaderboard</button>
        <button class="nav-link" class:active={view === 'profile'} on:click={() => handleNavClick('profile')}>Profile</button>

        {#if $authUser}
          <div class="user-chip {frameEff.cls}" style="{frameEff.style}">
            {#if titleTxt}
              <span class="title-chip">[{titleTxt}]</span>
            {/if}
            <span class="user-name {nameEff.cls}" style="{nameEff.style}" data-text={headerUsername}>
              {headerUsername}
            </span>
            <button class="logout-btn" on:click={handleLogout}>Log Out</button>
          </div>
        {:else if $profileLoading}
          <div class="user-chip loading-chip">
            <span class="user-name">Loading account...</span>
          </div>
        {:else if $authInitialized && $session && $profileError}
          <div class="user-chip loading-chip profile-error-chip">
            <span class="user-name">Account unavailable</span>
            <button type="button" class="logout-btn" on:click={() => window.location.reload()}>Retry</button>
            <button type="button" class="logout-btn" on:click={handleLogout}>Log Out</button>
          </div>
        {:else}
          <button type="button" class="login-btn-header" on:click={openAuthModal}>Sign In / Sign Up</button>
        {/if}
      </nav>
    </header>

    <div id="mobile-navigation" class="mobile-nav-panel" class:open={mobileMenuOpen}>
      <div class="mobile-nav-section">
        <button class="nav-link mobile-nav-link" class:active={view === 'game'} on:click={() => setRoute('game')}>Game</button>
        <button class="nav-link mobile-nav-link" class:active={view === 'shop'} on:click={() => setRoute('shop')}>Shop</button>
        <button class="nav-link mobile-nav-link" class:active={view === 'leaderboard'} on:click={() => setRoute('leaderboard', { tab: 'today' })}>Leaderboard</button>
        <button class="nav-link mobile-nav-link" class:active={view === 'profile'} on:click={() => setRoute('profile')}>Profile</button>
      </div>

      <div class="mobile-nav-section mobile-auth-section">
        {#if $authUser}
          <button type="button" class="logout-btn mobile-auth-btn" on:click={handleLogout}>Log Out</button>
        {:else if $profileLoading}
          <div class="mobile-auth-summary loading-chip mobile-loading-summary">
            <span class="user-name">Loading account...</span>
          </div>
        {:else if $authInitialized && $session && $profileError}
          <div class="mobile-auth-summary loading-chip profile-error-chip">
            <span class="user-name">Account unavailable</span>
          </div>
          <button type="button" class="logout-btn mobile-auth-btn" on:click={() => window.location.reload()}>Retry</button>
          <button type="button" class="logout-btn mobile-auth-btn" on:click={handleLogout}>Log Out</button>
        {:else}
          <button type="button" class="login-btn-header mobile-auth-btn" on:click={openAuthModal}>Sign In / Sign Up</button>
        {/if}
      </div>
    </div>
  </div>

  {#if $profileLoading}
    <div class="auth-loading-banner" role="status" aria-live="polite">
      <span class="auth-loading-kicker">Loading account</span>
      <span class="auth-loading-copy">Preparing your account data...</span>
    </div>
  {/if}

  {#if $authInitialized && $session && $profileError}
    <div class="auth-loading-banner auth-error-banner" role="alert" aria-live="polite">
      <span class="auth-loading-kicker">Account load error</span>
      <span class="auth-loading-copy">Your signed-in session could not load account data.</span>
    </div>
  {/if}

  {#if view === 'game'}
    <Game on:promptlogin={openAuthModal} />
  {:else if view === 'leaderboard'}
    {#key `leaderboard:${leaderboardTab}`}
      <Leaderboard initialTab={leaderboardTab} on:navigate={handleNavigation} />
    {/key}
  {:else if $profileLoading && (view === 'shop' || view === 'profile')}
    <div class="container">
      <div class="card">
        <h1>Loading account</h1>
        <p class="info-text">Preparing your account features. Guest play stays available in Game.</p>
      </div>
    </div>
  {:else if $authInitialized && $session && $profileError && (view === 'shop' || view === 'profile')}
    <div class="container">
      <div class="card">
        <h1>Account unavailable</h1>
        <p class="info-text">We could not load your account data. Retry or sign out, then sign in again.</p>
        <div class="button-row">
          <button type="button" class="roll-btn" on:click={() => window.location.reload()}>Retry</button>
          <button type="button" class="roll-btn" on:click={handleLogout}>Log Out</button>
        </div>
      </div>
    </div>
  {:else if view === 'profile' && ($isAuthenticated || $selectedUserId)}
    <Profile userId={$selectedUserId} on:navigate={handleNavigation} />
  {:else if $isAuthenticated}
    {#if view === 'shop'}
      <Shop />
    {/if}
  {:else}
    {#if view === 'shop' || view === 'profile'}
      <GuestLock view={view} on:login={openAuthModal} />
    {/if}
  {/if}
{/if}

<style>
  .bootstrap-error-shell {
    min-height: 100vh;
    display: grid;
    place-items: center;
    padding: 2rem 1rem;
  }

  .bootstrap-error-card {
    width: min(720px, 100%);
    padding: 2rem;
    text-align: left;
    border-color: rgba(249, 115, 22, 0.35);
    background:
      radial-gradient(circle at top right, rgba(249, 115, 22, 0.16), transparent 45%),
      rgba(10, 10, 14, 0.9);
  }

  .bootstrap-error-kicker {
    margin: 0 0 0.65rem 0;
    color: var(--accent-purple);
    text-transform: uppercase;
    letter-spacing: 0.16em;
    font-size: 0.72rem;
    font-weight: 700;
  }

  .bootstrap-error-card h1 {
    margin: 0 0 0.85rem 0;
    font-family: var(--font-display);
    font-size: clamp(2rem, 4vw, 3rem);
    color: #fff;
  }

  .bootstrap-error-message,
  .bootstrap-error-details,
  .bootstrap-error-help {
    margin: 0.6rem 0 0 0;
    color: var(--text-muted);
    line-height: 1.6;
  }

  .bootstrap-error-details {
    font-family: 'JetBrains Mono', monospace;
    color: #f9a8d4;
  }

  .auth-modal-overlay {
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0, 0, 0, 0.8); backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    z-index: 1000; display: flex; align-items: center; justify-content: center;
    padding: 1rem;
  }
  .auth-modal-content {
    width: 100%; max-width: 450px; position: relative; z-index: 1;
    outline: none;
  }

  .loading-chip {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.6rem 0.9rem;
    border-radius: 999px;
    border: 1px solid var(--card-border);
    background: rgba(255,255,255,0.04);
    color: var(--text-muted);
  }

  .auth-loading-banner {
    margin: 0 1rem 1rem;
    padding: 0.8rem 1rem;
    border-radius: 12px;
    border: 1px solid rgba(139, 124, 246, 0.3);
    background: rgba(139, 124, 246, 0.08);
    color: #fff;
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem 0.75rem;
    align-items: center;
    justify-content: center;
  }

  .auth-loading-kicker {
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.15em;
    color: var(--accent-purple);
  }

  .auth-loading-copy {
    font-size: 0.92rem;
    color: var(--text-muted);
  }

  .auth-error-banner {
    border-color: rgba(248, 113, 113, 0.35);
    background: rgba(248, 113, 113, 0.08);
  }

  .profile-error-chip {
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .button-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    justify-content: center;
    margin-top: 1rem;
  }

  .challenge-banner {
    max-width: 650px;
    margin: 20px auto 0;
    padding: 15px 20px;
    background: rgba(139, 124, 246, 0.1);
    border: 1px solid rgba(139, 124, 246, 0.4);
    border-radius: 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 15px;
    animation: slideDown 0.4s ease-out;
  }
  .challenge-info { display: flex; flex-direction: column; gap: 5px; }
  .challenge-text { font-size: 0.8rem; color: var(--text-muted); }
  .challenge-stat { display: flex; align-items: center; gap: 10px; }
  .challenge-color { width: 24px; height: 24px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.2); }
  .challenge-score { font-family: 'JetBrains Mono', monospace; font-weight: 700; color: var(--accent-purple); font-size: 1.1rem; }
  .challenge-close { background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 1.2rem; }
  .challenge-close:hover { color: #fff; }

  .mobile-nav-backdrop {
    display: none;
  }

  .mobile-user-chip {
    display: none;
  }

  .mobile-nav-panel {
    display: none;
  }

  @media (max-width: 600px) {
    .auth-loading-banner {
      margin-left: 0;
      margin-right: 0;
      justify-content: flex-start;
      text-align: left;
    }
    .site-header {
      gap: 0.5rem;
      padding: 10px 12px;
      flex-wrap: nowrap;
      align-items: center;
    }
    .site-header .logo {
      font-size: 1rem;
      letter-spacing: -0.2px;
      flex: 0 0 auto;
    }
    .mobile-user-chip {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      min-width: 0;
      max-width: min(58vw, 320px);
      padding: 4px 10px;
      margin-left: auto;
      margin-right: 0.25rem;
      overflow: hidden;
    }
    .mobile-user-chip .user-name {
      min-width: 0;
      max-width: min(44vw, 180px);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .mobile-status-pill,
    .mobile-user-chip {
      margin-right: 0.25rem;
    }
    .mobile-user-chip {
      flex: 1 1 auto;
      grid-column: 2;
    }
    .menu-toggle {
      width: 42px;
      height: 42px;
      margin-left: 0;
      flex: 0 0 auto;
    }
    .challenge-banner {
      flex-direction: column;
      align-items: stretch;
      padding: 14px 16px;
      margin-top: 12px;
    }
    .challenge-close {
      align-self: flex-end;
    }
    .button-row {
      flex-direction: column;
    }
    .button-row > button {
      width: 100%;
    }
    .mobile-nav-panel {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      padding: 0 14px 12px;
      background: rgba(9, 9, 11, 0.92);
      backdrop-filter: blur(18px);
      -webkit-backdrop-filter: blur(18px);
      border-bottom: 1px solid var(--card-border);
      max-height: 0;
      overflow: hidden;
      opacity: 0;
      transform: translateY(-6px);
      transition: max-height 0.24s ease, opacity 0.2s ease, transform 0.2s ease;
      position: relative;
      z-index: 101;
    }
    .mobile-nav-panel.open {
      max-height: 420px;
      opacity: 1;
      transform: translateY(0);
    }
    .mobile-nav-section {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .mobile-nav-link {
      flex: 1 1 calc(50% - 4px);
      justify-content: flex-start;
      padding: 0.7rem 0.9rem !important;
      border: 1px solid var(--card-border);
      border-radius: 12px;
      background: rgba(255,255,255,0.04);
      min-height: 44px;
      color: #fff;
    }
    .mobile-nav-link.active {
      background: rgba(255,255,255,0.1);
    }
    .mobile-auth-section {
      flex-direction: column;
      align-items: stretch;
    }
    .mobile-auth-btn {
      width: 100%;
    }
    .mobile-nav-backdrop {
      display: block;
      position: fixed;
      inset: 0;
      z-index: 100;
      border: none;
      background: rgba(0, 0, 0, 0.18);
      backdrop-filter: blur(1px);
      -webkit-backdrop-filter: blur(1px);
      padding: 0;
    }
  }

  @keyframes slideDown {
    from { opacity: 0; transform: translateY(-20px); }
    to { opacity: 1; transform: translateY(0); }
  }
</style>
