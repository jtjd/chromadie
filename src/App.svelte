<script>
  import { session, authUser, profile, authInitialized, authEvent, profileLoading, profileError, equippedItems, selectedUserId, userInventory, loadShopItems, isAuthenticated, clearUserState, clearLocalAccountCache, addToast } from './lib/stores';
  import { supabase, supabaseError } from './lib/supabase';
  import Auth from './lib/Auth.svelte';
  import AuthCallback from './lib/AuthCallback.svelte';
  import Game from './lib/Game.svelte';
  import Shop from './lib/Shop.svelte';
  import Leaderboard from './lib/Leaderboard.svelte';
  import Profile from './lib/Profile.svelte';
  import PrivacyPolicy from './lib/PrivacyPolicy.svelte';
  import FAQ from './lib/FAQ.svelte';
  import ResetPassword from './lib/ResetPassword.svelte';
  import Toast from './lib/Toast.svelte';
  import GuestLock from './lib/GuestLock.svelte';
  import { loadChallengeLink } from './lib/challenges';
  import { getNameEffect, getFrameEffect, getTitleText } from './lib/cosmetics';
  import { getRankState } from './lib/ranks';
  import { normalizeHexColor } from './lib/utils';
  import { focusFirstElement, restoreFocus, trapFocus } from './lib/a11y';
  import { onMount, onDestroy, tick } from 'svelte';
  import { SvelteURLSearchParams } from 'svelte/reactivity';

  const VALID_VIEWS = new Set(['game', 'shop', 'leaderboard', 'profile']);
  const VALID_LEADERBOARD_TABS = new Set(['today', 'rivals', 'weekly', 'monthly', 'roll']);
  const VALID_APP_ROUTES = new Set(['app', 'privacy', 'how-to-play', 'auth-callback', 'reset-password']);
  let view = 'game';
  let leaderboardTab = 'today';
  let routeMode = 'app';
  let showAuthModal = false;
  let challengeData = null;
  let challengeLoadRequestId = 0;
  let authDialog = null;
  let authOpener = null;
  let mobileMenuOpen = false;
  let selectedProfileUsername = null;
  let founderLaunchWindowActive = false;

  supabase.auth.getSession().then(({ data }) => session.set(data.session));

  function parseRoute() {
    challengeLoadRequestId += 1;
    const params = new SvelteURLSearchParams(window.location.search);
    const rawPath = window.location.pathname.replace(/\/+$/, '') || '/';
    const routeView = params.get('view');
    const routeTab = params.get('tab');
    const routeProfileId = params.get('profile');
    const routeChallengeFrom = params.get('from');
    const cScore = params.get('challenge');
    const cHex = params.get('hex');
    const isValidChallengeHex = /^[0-9A-Fa-f]{6}$/.test(cHex || '');
    const challengeMatch = rawPath.match(/^\/c\/([^/]+)$/);
    const profileMatch = rawPath.match(/^\/u\/([^/]+)$/);
    const decodePathSegment = value => {
      try {
        return decodeURIComponent(value);
      } catch {
        return value;
      }
    };

    if (rawPath === '/auth/callback') {
      routeMode = 'auth-callback';
    } else if (rawPath === '/reset-password') {
      routeMode = 'reset-password';
    } else if (rawPath === '/privacy') {
      routeMode = 'privacy';
    } else if (rawPath === '/how-to-play') {
      routeMode = 'how-to-play';
    } else {
      routeMode = 'app';
    }

    if (profileMatch) {
      challengeData = null;
      view = 'profile';
      selectedProfileUsername = decodePathSegment(profileMatch[1]);
      selectedUserId.set(null);
    } else if (challengeMatch) {
      view = 'game';
      selectedProfileUsername = null;
      selectedUserId.set(null);
      challengeData = {
        id: decodePathSegment(challengeMatch[1]),
        fromUsername: routeChallengeFrom || null,
        loading: true,
        error: null
      };
      void loadChallengeById(challengeData.id, routeChallengeFrom || null);
    } else {
      view = VALID_VIEWS.has(routeView) ? routeView : 'game';
      selectedProfileUsername = null;
      selectedUserId.set(routeMode === 'app' ? routeProfileId || null : null);
      if (cScore && isValidChallengeHex) {
        const parsedScore = Number.parseInt(cScore, 10);
        challengeData = Number.isFinite(parsedScore)
          ? {
              id: null,
              score: parsedScore,
              hex: normalizeHexColor(cHex),
              fromUsername: routeChallengeFrom || null,
              loading: false,
              error: null
            }
          : null;
      } else {
        challengeData = null;
      }
    }
    leaderboardTab = VALID_LEADERBOARD_TABS.has(routeTab) ? routeTab : 'today';
  }

  function syncRoute() {
    if (typeof window === 'undefined') return;
    if (!VALID_APP_ROUTES.has(routeMode) || routeMode !== 'app') return;

    const currentProfileUsername = $profile?.username || $authUser?.user_metadata?.username || null;
    if (view === 'game' && challengeData) {
      return;
    }

    if (view === 'profile') {
      const routeUsername = selectedProfileUsername
        || ($selectedUserId && $session?.user?.id && $selectedUserId === $session.user.id ? currentProfileUsername : null)
        || (!$selectedUserId ? currentProfileUsername : null);
      const currentUrl = `${window.location.pathname}${window.location.search}`;
      if (routeUsername) {
        const nextUrl = `/u/${encodeURIComponent(routeUsername)}`;
        if (nextUrl !== currentUrl) {
          window.history.pushState({}, '', nextUrl);
        }
        return;
      }
    }

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

  async function loadChallengeById(challengeId, fallbackFrom = null) {
    const requestId = ++challengeLoadRequestId;
    const result = await loadChallengeLink(supabase, challengeId);

    if (requestId !== challengeLoadRequestId) return;

    if (!result.success || !result.challenge) {
      challengeData = {
        id: challengeId,
        fromUsername: fallbackFrom || null,
        loading: false,
        error: result.error?.message || 'Challenge not found.'
      };
      return;
    }

    challengeData = {
      id: result.challenge.id,
      score: result.challenge.target_score,
      hex: result.challenge.target_hex,
      fromUsername: result.challenge.sender_username || fallbackFrom || null,
      loading: false,
      error: null
    };
  }

  async function loadFounderAnnouncementState() {
    const fallbackLaunchAt = new Date('2026-07-11T00:00:00Z');
    const fallbackWindowEndsAt = new Date('2026-08-11T00:00:00Z');

    try {
      const { data, error } = await supabase
        .from('meta')
        .select('key, value')
        .in('key', ['official_launch_at', 'founder_window_ends_at']);

      if (error) throw error;

      const meta = new Map((data || []).map(entry => [entry.key, entry.value]));
      const launchAt = new Date(meta.get('official_launch_at') || fallbackLaunchAt);
      const windowEndsAt = new Date(meta.get('founder_window_ends_at') || fallbackWindowEndsAt);
      const now = new Date();

      founderLaunchWindowActive = Number.isFinite(launchAt.getTime())
        && Number.isFinite(windowEndsAt.getTime())
        && now >= launchAt
        && now < windowEndsAt;
    } catch {
      const now = new Date();
      founderLaunchWindowActive = now >= fallbackLaunchAt && now < fallbackWindowEndsAt;
    }
  }

  function setRoute(nextView, options = {}) {
    if (!VALID_VIEWS.has(nextView)) return;

    routeMode = 'app';
    if (typeof window !== 'undefined' && window.location.pathname !== '/') {
      window.history.pushState({}, '', '/');
    }
    view = nextView;
    mobileMenuOpen = false;
    if (nextView !== 'leaderboard') {
      leaderboardTab = options.tab && VALID_LEADERBOARD_TABS.has(options.tab) ? options.tab : leaderboardTab;
    } else if (options.tab && VALID_LEADERBOARD_TABS.has(options.tab)) {
      leaderboardTab = options.tab;
    }

    if (nextView === 'profile') {
      selectedProfileUsername = options.username || options.profileUsername || $profile?.username || $authUser?.user_metadata?.username || null;
      selectedUserId.set(options.userId || null);
    } else {
      selectedProfileUsername = null;
      selectedUserId.set(null);
    }

    syncRoute();
  }

  function navigateToPath(pathname) {
    if (typeof window === 'undefined') return;
    const normalized = pathname || '/';
    const nextUrl = new URL(normalized, window.location.origin);
    if (routeMode === 'app' && view === 'game' && challengeData && !nextUrl.pathname.startsWith('/c/')) {
      clearChallengeState();
    }
    window.history.pushState({}, '', `${nextUrl.pathname}${nextUrl.search}`);
    parseRoute();
  }

  function clearChallengeState() {
    if (typeof window === 'undefined') return;

    challengeLoadRequestId += 1;
    challengeData = null;
    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.delete('challenge');
    nextUrl.searchParams.delete('hex');
    nextUrl.searchParams.delete('from');

    if (nextUrl.pathname.startsWith('/c/')) {
      window.history.replaceState({}, '', '/');
      return;
    }

    window.history.replaceState({}, '', `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`);
  }

  function handlePopState() {
    parseRoute();
  }

  onMount(() => {
    void loadShopItems();
    void loadFounderAnnouncementState();
    parseRoute();
    window.addEventListener('popstate', handlePopState);
  });

  onDestroy(() => {
    window.removeEventListener('popstate', handlePopState);
  });

  function handleLogout() {
    clearLocalAccountCache();
    clearUserState();
    session.set(null);
    selectedUserId.set(null);
    selectedProfileUsername = null;
    challengeData = null;
    closeMobileMenu();
    void supabase.auth.signOut();
    setRoute('game');
  }

  function handleNavClick(newView) {
    if (routeMode === 'app' && view === 'game' && challengeData && newView !== 'game') {
      clearChallengeState();
    }
    if (newView === 'profile') {
      setRoute(newView, { username: $profile?.username || $authUser?.user_metadata?.username || null });
    } else {
      setRoute(newView);
    }
  }

  function handleLogoClick(event) {
    event.preventDefault();
    clearChallengeState();
    setRoute('game');
  }

  function handleNavigation(event) {
    const { view: nextView, userId = null, username = null, tab = null } = event.detail || {};
    if (nextView) {
      if (routeMode === 'app' && view === 'game' && challengeData && nextView !== 'game') {
        clearChallengeState();
      }
      setRoute(nextView, { userId, username, tab });
    }
  }

  async function handleAccountDeleted(event) {
    const { alreadyDeleted = false, message = 'Account deleted.', cleanup = null } = event.detail || {};
    clearLocalAccountCache({ clearShopCache: true });
    clearUserState();
    session.set(null);
    selectedUserId.set(null);
    selectedProfileUsername = null;
    challengeData = null;
    mobileMenuOpen = false;
    showAuthModal = false;
    challengeData = null;
    routeMode = 'app';
    setRoute('game');

    try {
      await supabase.auth.signOut();
    } catch {
      // Sign-out failure should not block local cleanup after deletion.
    }

    const toastMessage = cleanup?.missing_profile && !alreadyDeleted
      ? 'Account deleted. Some account rows were already missing.'
      : (alreadyDeleted ? 'Account already removed.' : message);

    addToast(toastMessage, 'success');
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

  $: if (challengeData && routeMode === 'app' && view !== 'game') {
    clearChallengeState();
  }

  $: userCosmetics = $equippedItems;
  $: nameEff = getNameEffect(userCosmetics);
  $: frameEff = getFrameEffect(userCosmetics);
  $: titleTxt = getTitleText(userCosmetics);
  $: headerRank = $profile ? getRankState($profile.lifetime_ep || 0) : null;
  $: headerUsername = $profile?.username || $authUser?.user_metadata?.username || $authUser?.email?.split('@')[0] || 'Signed in';
  $: launchEditionOwned = $profile?.equipped_badges?.includes('launch_edition');
  $: founderAnnouncementVisible = founderLaunchWindowActive && !launchEditionOwned && (!$authUser || !$profileLoading);
  $: username = $session ? ($profile?.username || 'Loading your account...') : 'Guest Mode';
  $: mobileStatusText = $isAuthenticated
    ? username
    : $profileLoading
      ? 'Loading profile'
      : ($authInitialized && $session && $profileError ? 'Account issue' : 'Guest Mode');
  $: mobileStatusActionable = !$isAuthenticated && !$profileLoading && !($authInitialized && $session && $profileError);
  $: profileTitle = selectedProfileUsername || $profile?.username || $authUser?.user_metadata?.username || 'Profile';
  $: pageTitle = routeMode === 'privacy'
    ? 'Privacy Policy | ChromaDie'
    : routeMode === 'how-to-play'
      ? 'How to Play | ChromaDie'
      : routeMode === 'app' && view === 'profile'
        ? `${profileTitle} | ChromaDie`
        : routeMode === 'app' && view === 'game' && challengeData
          ? challengeData.error
            ? 'Challenge Unavailable | ChromaDie'
            : 'Challenge | ChromaDie'
        : routeMode === 'app' && view === 'game'
        ? 'Roll | ChromaDie'
      : 'ChromaDie';
  const errorState = supabaseError;

  $: if (($authEvent === 'SIGNED_IN' || $authEvent === 'USER_UPDATED') && showAuthModal) {
    void closeAuthModal();
  }

  $: if (typeof document !== 'undefined') {
    document.body.style.overflow = (showAuthModal || mobileMenuOpen) ? 'hidden' : '';
  }

  $: if (typeof document !== 'undefined') {
    document.title = pageTitle;
  }

  $: if (routeMode === 'app') {
    syncRoute();
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
  <div class="app-shell">
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
      <div class="header-brand">
        <a href="/" class="logo" on:click={handleLogoClick}>🎲 ChromaDie</a>
        <a
          href="/how-to-play"
          class="header-guide-link"
          aria-label="Open How to Play"
          on:click|preventDefault={() => navigateToPath('/how-to-play')}
        >
          How to Play
        </a>
      </div>
      {#if $authUser}
        <div class="mobile-user-chip {frameEff.cls}" style="{frameEff.style}">
          {#if titleTxt}
            <span class="title-chip">[{titleTxt}]</span>
          {/if}
          {#if headerRank}
            <span
              class="rank-pill"
              style={`color: ${headerRank.current.color}; border-color: ${headerRank.current.color === 'var(--spectrum)' ? '#a15cff' : headerRank.current.color};`}
              aria-label={`${headerRank.current.name} rank`}
            >
              {headerRank.current.name}
            </span>
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
        <button class="nav-link" class:active={routeMode === 'app' && view === 'game'} on:click={() => handleNavClick('game')}>Roll</button>
        <button class="nav-link" class:active={routeMode === 'app' && view === 'shop'} on:click={() => handleNavClick('shop')}>Shop</button>
        <button class="nav-link" class:active={routeMode === 'app' && view === 'leaderboard'} on:click={() => setRoute('leaderboard', { tab: 'today' })}>Leaderboard</button>
        <button class="nav-link" class:active={routeMode === 'app' && view === 'profile'} on:click={() => handleNavClick('profile')}>Profile</button>

        {#if $authUser}
          <div class="user-chip {frameEff.cls}" style="{frameEff.style}">
            {#if titleTxt}
              <span class="title-chip">[{titleTxt}]</span>
            {/if}
            {#if headerRank}
              <span
                class="rank-pill"
                style={`color: ${headerRank.current.color}; border-color: ${headerRank.current.color === 'var(--spectrum)' ? '#a15cff' : headerRank.current.color};`}
                aria-label={`${headerRank.current.name} rank`}
              >
                {headerRank.current.name}
              </span>
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

    {#if founderAnnouncementVisible}
      <section class="founder-banner" aria-label="Launch announcement" role="status" aria-live="polite">
        <div class="founder-banner-copy">
          <p class="founder-banner-kicker">Launch month</p>
          <p class="founder-banner-title">Thanks for playing.</p>
          <p class="founder-banner-text">
            {#if $authUser}
              During the first month after launch, authenticated rolls permanently grant the <strong>Launch Edition badge</strong>.
            {:else}
              <button type="button" class="founder-inline-link" on:click={openAuthModal}>Sign in</button>
              before you roll during the first month after launch to permanently earn the <strong>Launch Edition badge</strong>.
            {/if}
          </p>
        </div>
      </section>
    {/if}

    <div id="mobile-navigation" class="mobile-nav-panel" class:open={mobileMenuOpen}>
      <div class="mobile-nav-section">
        <button class="nav-link mobile-nav-link" class:active={routeMode === 'app' && view === 'game'} on:click={() => setRoute('game')}>Roll</button>
        <button class="nav-link mobile-nav-link" class:active={routeMode === 'app' && view === 'shop'} on:click={() => setRoute('shop')}>Shop</button>
        <button class="nav-link mobile-nav-link" class:active={routeMode === 'app' && view === 'leaderboard'} on:click={() => setRoute('leaderboard', { tab: 'today' })}>Leaderboard</button>
        <button class="nav-link mobile-nav-link" class:active={routeMode === 'app' && view === 'profile'} on:click={() => setRoute('profile')}>Profile</button>
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

  {#if challengeData && view === 'game'}
    <section class="challenge-banner" aria-label="Challenge prompt">
      <div class="challenge-copy">
        <p class="challenge-kicker">Challenge</p>
        <h2>
          {#if challengeData.loading}
            Opening challenge
          {:else if challengeData.error}
            Challenge unavailable
          {:else}
            Beat this roll
          {/if}
        </h2>
        {#if challengeData.fromUsername && !challengeData.loading}
          <p class="challenge-source">From {challengeData.fromUsername}</p>
        {/if}
        <p class="challenge-text">
          {#if challengeData.loading}
            Checking the shared link.
          {:else if challengeData.error}
            This link may have expired or been removed.
          {:else if challengeData.fromUsername}
            Roll as close as you can to the target color.
          {:else}
            Roll as close as you can to the target color.
          {/if}
        </p>
      </div>
      <div class="challenge-meta">
        {#if challengeData.loading}
          <div class="challenge-stat challenge-stat-loading">
            <div>
              <p class="challenge-score">Loading</p>
              <p class="challenge-subtext">Challenge link</p>
            </div>
          </div>
        {:else if challengeData.error}
          <div class="challenge-stat challenge-stat-error">
            <div>
              <p class="challenge-score">Unavailable</p>
              <p class="challenge-subtext">Try a newer link</p>
            </div>
          </div>
        {:else}
          <div class="challenge-stat" aria-label={`Target score ${challengeData.score.toLocaleString()} points`}>
            <span class="challenge-color" style="background-color: {challengeData.hex};"></span>
            <div>
              <p class="challenge-score">{challengeData.score.toLocaleString()} pts</p>
              <p class="challenge-subtext">Target score</p>
            </div>
          </div>
        {/if}
        <button
          type="button"
          class="challenge-close"
          aria-label="Dismiss challenge"
          on:click={clearChallengeState}
        >
          Close
        </button>
      </div>
    </section>
  {/if}

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

  <div class="app-main">
  {#if routeMode === 'privacy'}
    <PrivacyPolicy />
  {:else if routeMode === 'how-to-play'}
    <FAQ />
  {:else}
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
          <p class="info-text">Preparing your account features. Guest play stays available in Roll.</p>
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
    {:else if view === 'profile' && ($isAuthenticated || selectedProfileUsername || $selectedUserId)}
      <Profile profileUsername={selectedProfileUsername} userId={$selectedUserId} on:navigate={handleNavigation} on:accountdeleted={handleAccountDeleted} />
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
  </div>

  <footer class="site-footer">
    <div class="site-footer-inner">
      <p>ChromaDie</p>
      <nav aria-label="Footer">
        <a href="/privacy" on:click|preventDefault={() => navigateToPath('/privacy')}>Privacy Policy</a>
        <a href="/how-to-play" on:click|preventDefault={() => navigateToPath('/how-to-play')}>How to Play</a>
        <a href="/" on:click|preventDefault={() => navigateToPath('/')}>Roll</a>
      </nav>
    </div>
  </footer>
  </div>
{/if}

<style>
  .bootstrap-error-shell {
    min-height: 100vh;
    display: grid;
    place-items: center;
    padding: 2rem 1rem;
  }

  .app-shell {
    min-height: 100dvh;
    width: 100%;
    align-self: stretch;
    display: flex;
    flex-direction: column;
  }

  .app-main {
    flex: 1 0 auto;
    width: 100%;
    display: flex;
    flex-direction: column;
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
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.8); backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    overflow-y: auto;
    overscroll-behavior: contain;
  }
  .auth-modal-content {
    width: 100%;
    max-width: 450px;
    max-height: calc(100dvh - 2rem);
    position: relative;
    z-index: 1;
    outline: none;
    display: flex;
    min-height: 0;
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
    width: min(980px, calc(100% - 2rem));
    margin: 0 auto 12px;
    padding: 1rem 1.1rem;
    background:
      radial-gradient(circle at top right, rgba(161, 92, 255, 0.16), transparent 32%),
      rgba(255,255,255,0.03);
    border: 1px solid rgba(161, 92, 255, 0.22);
    border-radius: 18px;
    box-shadow: 0 16px 34px rgba(0,0,0,0.25);
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
  }

  .founder-banner {
    width: min(980px, calc(100% - 2rem));
    margin: 0 auto 12px;
    padding: 0.9rem 1rem;
    border-radius: 18px;
    border: 1px solid rgba(255, 198, 87, 0.28);
    background:
      radial-gradient(circle at top right, rgba(255, 198, 87, 0.18), transparent 34%),
      linear-gradient(135deg, rgba(41, 26, 10, 0.96), rgba(18, 17, 32, 0.96));
    box-shadow: 0 16px 34px rgba(0, 0, 0, 0.25);
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.85rem;
  }

  .founder-banner-copy {
    display: grid;
    gap: 0.3rem;
    align-items: center;
    min-width: 0;
    text-align: center;
  }

  .founder-banner-kicker {
    margin: 0;
    justify-self: center;
    width: fit-content;
    padding: 0.28rem 0.55rem;
    border-radius: 999px;
    background: rgba(255, 198, 87, 0.14);
    border: 1px solid rgba(255, 198, 87, 0.32);
    color: #ffd77d;
    text-transform: uppercase;
    letter-spacing: 0.16em;
    font-size: 0.67rem;
    font-weight: 800;
    white-space: nowrap;
    line-height: 1;
  }

  .founder-banner-title {
    margin: 0;
    font-family: var(--font-display);
    font-size: 1.02rem;
    letter-spacing: -0.01em;
  }

  .founder-banner-text {
    margin: 0;
    color: var(--text-muted);
    font-size: 0.92rem;
    line-height: 1.5;
  }

  .founder-banner-text strong {
    color: #fff;
    font-weight: 700;
  }

  .founder-inline-link {
    display: inline;
    padding: 0;
    margin: 0;
    border: 0;
    background: transparent;
    color: #ffd77d;
    font: inherit;
    font-weight: 700;
    text-decoration: underline;
    text-underline-offset: 2px;
    cursor: pointer;
  }

  .founder-inline-link:hover,
  .founder-inline-link:focus-visible {
    color: #fff;
  }

  .challenge-copy {
    display: grid;
    gap: 0.35rem;
    min-width: 0;
  }
  .challenge-kicker {
    margin: 0;
    color: var(--accent-purple);
    text-transform: uppercase;
    letter-spacing: 0.15em;
    font-size: 0.68rem;
    font-weight: 700;
  }
  .challenge-banner h2 {
    margin: 0;
    font-family: var(--font-display);
    font-size: 1.05rem;
    color: #fff;
  }
  .challenge-source {
    margin: 0;
    color: #fff;
    font-size: 0.84rem;
    font-weight: 600;
    letter-spacing: 0.01em;
    opacity: 0.95;
  }
  .challenge-text {
    margin: 0;
    color: var(--text-muted);
    line-height: 1.5;
    font-size: 0.92rem;
  }
  .challenge-meta {
    display: flex;
    align-items: center;
    gap: 0.85rem;
    flex-wrap: wrap;
    justify-content: flex-end;
  }
  .challenge-stat {
    display: flex;
    align-items: center;
    gap: 0.85rem;
    padding: 0.7rem 0.85rem;
    border-radius: 14px;
    background: rgba(0,0,0,0.18);
    border: 1px solid rgba(255,255,255,0.07);
  }
  .challenge-stat-loading,
  .challenge-stat-error {
    min-width: 220px;
    justify-content: flex-start;
  }
  .challenge-color {
    width: 40px;
    height: 40px;
    border-radius: 12px;
    border: 1px solid rgba(255,255,255,0.22);
    box-shadow: 0 0 0 1px rgba(0,0,0,0.12) inset;
    flex-shrink: 0;
  }
  .challenge-score {
    margin: 0;
    font-family: 'JetBrains Mono', monospace;
    font-weight: 700;
    color: #fff;
    font-size: 1rem;
    line-height: 1.1;
  }
  .challenge-subtext {
    margin: 0.15rem 0 0;
    color: var(--text-muted);
    font-size: 0.75rem;
  }
  .challenge-close {
    border: 1px solid rgba(255,255,255,0.08);
    background: rgba(255,255,255,0.05);
    color: #fff;
    cursor: pointer;
    font-size: 0.85rem;
    font-weight: 600;
    padding: 0.72rem 0.95rem;
    border-radius: 12px;
    transition: background 0.18s ease, border-color 0.18s ease, transform 0.18s ease;
  }
  .challenge-close:hover {
    background: rgba(255,255,255,0.09);
    border-color: rgba(255,255,255,0.14);
    transform: translateY(-1px);
  }

  .site-footer {
    width: 100%;
    margin-top: auto;
    padding: 0 0 28px;
    border-top: 1px solid rgba(255,255,255,0.08);
    color: var(--text-muted);
    font-size: 0.84rem;
  }

  .site-footer-inner {
    width: 100%;
    max-width: none;
    margin: 0 auto;
    padding: 0.9rem 40px 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem 1rem;
    flex-wrap: wrap;
  }

  .site-footer p {
    margin: 0;
    color: rgba(255,255,255,0.7);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    font-size: 0.72rem;
    font-weight: 700;
  }

  .site-footer nav {
    display: flex;
    flex-wrap: wrap;
    gap: 0.9rem 1rem;
  }

  .site-footer a {
    color: var(--text-muted);
    text-decoration: none;
  }

  .site-footer a:hover {
    color: #fff;
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  .rank-pill {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.28rem 0.55rem;
    border: 1px solid;
    border-radius: 999px;
    background: rgba(255,255,255,0.05);
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    white-space: nowrap;
    line-height: 1;
    box-shadow: 0 0 0 1px rgba(0,0,0,0.15) inset;
  }

  .header-brand {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    min-width: 0;
    flex: 0 1 auto;
  }

  .header-guide-link {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.5rem 0.78rem;
    border-radius: 999px;
    border: 1px solid rgba(255,255,255,0.12);
    background: rgba(255,255,255,0.04);
    color: var(--text-muted);
    text-decoration: none;
    font-size: 0.86rem;
    font-weight: 600;
    white-space: nowrap;
    transition: background 0.18s ease, border-color 0.18s ease, color 0.18s ease, transform 0.18s ease;
  }

  .header-guide-link:hover,
  .header-guide-link:focus-visible {
    color: #fff;
    border-color: rgba(161, 92, 255, 0.38);
    background: rgba(161, 92, 255, 0.12);
    transform: translateY(-1px);
  }

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
    .auth-modal-overlay {
      align-items: flex-start;
      padding:
        calc(0.75rem + env(safe-area-inset-top))
        0.75rem
        calc(0.75rem + env(safe-area-inset-bottom));
    }
    .auth-modal-content {
      max-height: calc(100dvh - 1.5rem - env(safe-area-inset-top) - env(safe-area-inset-bottom));
      width: 100%;
      align-self: flex-start;
    }
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
    .header-brand {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      min-width: 0;
      flex: 1 1 auto;
    }
    .site-header .logo {
      font-size: 1rem;
      letter-spacing: -0.2px;
      flex: 0 0 auto;
    }
    .header-guide-link {
      display: none;
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
      width: calc(100% - 1rem);
      padding: 0.9rem;
      margin: 0 auto 12px;
      gap: 0.85rem;
    }
    .founder-banner {
      flex-direction: column;
      align-items: stretch;
      width: calc(100% - 1rem);
      padding: 0.9rem;
      margin: 0 auto 12px;
      gap: 0.55rem;
    }
    .challenge-meta {
      justify-content: stretch;
    }
    .challenge-stat,
    .challenge-stat-loading,
    .challenge-stat-error {
      width: 100%;
      justify-content: flex-start;
    }
    .challenge-close {
      width: 100%;
    }
    .button-row {
      flex-direction: column;
    }
    .button-row > button {
      width: 100%;
    }
    .site-footer {
      padding-bottom: 14px;
    }
    .site-footer-inner {
      width: calc(100% - 1rem);
      max-width: none;
      padding: 0.8rem 0.25rem 0;
      justify-content: center;
      text-align: center;
    }
    .site-footer nav {
      justify-content: center;
      gap: 0.55rem 0.8rem;
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
