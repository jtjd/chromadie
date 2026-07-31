<script>
  import { session, authUser, profile, authInitialized, authEvent, accountState, guestProgressActive, profileLoading, profileError, selectedUserId, loadShopItems, isAuthenticated, clearUserState, clearLocalAccountCache, addToast } from './lib/stores';
  import { signOutCurrentBrowser } from './lib/authSession';
  import { supabase, supabaseError } from './lib/supabase';
  import Auth from './lib/Auth.svelte';
  import AuthCallback from './lib/AuthCallback.svelte';
  import HomePage from './lib/HomePage.svelte';
  import Game from './lib/Game.svelte';
  import Shop from './lib/Shop.svelte';
  import Leaderboard from './lib/Leaderboard.svelte';
  import Profile from './lib/Profile.svelte';
  import ProfileShell from './lib/ProfileShell.svelte';
  import ProfileSettings from './lib/ProfileSettings.svelte';
  import SiteModeHeader from './lib/SiteModeHeader.svelte';
  import ProfileAtmosphere from './lib/ProfileAtmosphere.svelte';
  import ProfileCanvasPrototype from './lib/ProfileCanvasPrototype.svelte';
  import PrivacyPolicy from './lib/PrivacyPolicy.svelte';
  import FAQ from './lib/FAQ.svelte';
  import ResetPassword from './lib/ResetPassword.svelte';
  import Toast from './lib/Toast.svelte';
  import GuestLock from './lib/GuestLock.svelte';
  import { loadChallengeLink } from './lib/challenges';
  import { getAppOrigin } from './lib/authUrls';
  import { focusFirstElement, restoreFocus, trapFocus } from './lib/a11y';
  import { VALID_VIEWS, VALID_LEADERBOARD_TABS, parseRouteLocation } from './lib/routes';
  import { getCanonicalProfilePath } from './lib/routeContract.js';
  import { trackProductEvent } from './lib/productAnalytics.js';
  import { normalizeHexColor } from './lib/utils';
  import { onMount, onDestroy, tick } from 'svelte';
  import { SvelteURLSearchParams } from 'svelte/reactivity';

  const VALID_APP_ROUTES = new Set(['app', 'privacy', 'how-to-play', 'auth-callback', 'reset-password']);
  let view = 'home';
  let leaderboardTab = 'today';
  let routeMode = 'app';
  let showAuthModal = false;
  let authInitialTab = 'login';
  let logoutInProgress = false;
  let challengeData = null;
  let challengeLoadRequestId = 0;
  let authDialog = null;
  let authOpener = null;
  let selectedProfileUsername = null;
  let profileRouteKind = null;
  let legacyProfile = false;
  let founderLaunchWindowActive = false;
  let routeInitialized = false;
  let mainContent = null;
  let routeFocusRequest = 0;
  let lastTrackedRouteKey = '';
  let profileVisualFixture = '';

  function getProfileVisualFixture() {
    if (!import.meta.env.DEV || typeof window === 'undefined' || window.location.hostname !== '127.0.0.1') return '';
    const value = new URLSearchParams(window.location.search).get('profile_fixture');
    return ['owner', 'pre-roll', 'music'].includes(value) ? value : '';
  }

  function trackCurrentRoute() {
    if (typeof window === 'undefined') return;
    const route = routeMode !== 'app'
      ? routeMode
      : view === 'game' && challengeData
        ? 'challenge'
        : view;
    const surfaceKey = route === 'profile'
      ? selectedProfileUsername ? 'username' : $selectedUserId ? 'id' : 'self'
      : '';
    const routeKey = `${route}:${surfaceKey}:${leaderboardTab}`;
    if (routeKey === lastTrackedRouteKey) return;
    lastTrackedRouteKey = routeKey;
    trackProductEvent('route_view', { route });
  }

  function parseRoute() {
    challengeLoadRequestId += 1;
    profileVisualFixture = getProfileVisualFixture();
    const parsed = parseRouteLocation(window.location.pathname, window.location.search);
    routeMode = parsed.routeMode;

    if (parsed.profileUsername !== null) {
      challengeData = null;
      view = 'profile';
      selectedProfileUsername = parsed.profileUsername;
      profileRouteKind = parsed.profileRouteKind;
      selectedUserId.set(null);
      legacyProfile = parsed.legacyProfile;
    } else if (parsed.challengeId !== null) {
      view = 'game';
      selectedProfileUsername = null;
      profileRouteKind = null;
      selectedUserId.set(null);
      legacyProfile = false;
      challengeData = {
        id: parsed.challengeId,
        fromUsername: parsed.challengeFrom,
        loading: true,
        error: null
      };
      void loadChallengeById(challengeData.id, parsed.challengeFrom);
    } else {
      view = parsed.view;
      selectedProfileUsername = null;
      selectedUserId.set(parsed.routeMode === 'app' ? parsed.profileId : null);
      legacyProfile = parsed.view === 'profile' && parsed.legacyProfile;
      // Challenge values are accepted only from an authoritative /c/<id>
      // lookup. Legacy query-string score/hex inputs are intentionally ignored.
      challengeData = null;
    }
    leaderboardTab = parsed.leaderboardTab;
    routeInitialized = true;
    trackCurrentRoute();
  }

  function syncRoute() {
    if (typeof window === 'undefined') return;
    if (!VALID_APP_ROUTES.has(routeMode) || routeMode !== 'app') return;
    if (view === 'prototype' && window.location.pathname === '/prototype/profile') return;

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
        const canonicalProfilePath = getCanonicalProfilePath(routeUsername);
        const nextPath = legacyProfile
          ? `/u/${encodeURIComponent(routeUsername)}`
          : canonicalProfilePath;
        const legacySuffix = legacyProfile ? '?legacy=1' : '';
        const nextUrl = `${nextPath || '/'}${legacySuffix}`;
        if (nextUrl !== currentUrl) {
          window.history.pushState({}, '', nextUrl);
        }
        return;
      }
    }

    if (view === 'home') {
      if (`${window.location.pathname}${window.location.search}` !== '/') {
        window.history.pushState({}, '', '/');
      }
      return;
    }

    if (view === 'profile-settings') {
      const currentUrl = `${window.location.pathname}${window.location.search}`;
      if (currentUrl !== '/profile/settings') {
        window.history.pushState({}, '', '/profile/settings');
      }
      return;
    }

    const params = new SvelteURLSearchParams();
    params.set('view', view);
    if (view === 'leaderboard' && leaderboardTab !== 'today') {
      params.set('tab', leaderboardTab);
    }
    if (view === 'profile' && $selectedUserId) {
      params.set('profile', $selectedUserId);
    }
    if (view === 'profile' && legacyProfile) params.set('legacy', '1');
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
    if (!VALID_VIEWS.includes(nextView)) return;

    routeMode = 'app';
    if (typeof window !== 'undefined') {
      const nextPath = nextView === 'profile-settings' ? '/profile/settings' : '/';
      if (window.location.pathname !== nextPath || window.location.search) {
        window.history.pushState({}, '', nextPath);
      }
    }
    view = nextView;
    if (nextView !== 'leaderboard') {
      leaderboardTab = options.tab && VALID_LEADERBOARD_TABS.includes(options.tab) ? options.tab : leaderboardTab;
    } else if (options.tab && VALID_LEADERBOARD_TABS.includes(options.tab)) {
      leaderboardTab = options.tab;
    }

    if (nextView === 'profile') {
      selectedProfileUsername = options.username || options.profileUsername || $profile?.username || $authUser?.user_metadata?.username || null;
      selectedUserId.set(options.userId || null);
      legacyProfile = Boolean(options.legacyProfile);
      profileRouteKind = legacyProfile ? 'compatibility' : 'root';
    } else {
      selectedProfileUsername = null;
      profileRouteKind = null;
      selectedUserId.set(null);
      legacyProfile = false;
    }

    syncRoute();
    trackCurrentRoute();
    void focusRouteContent();
  }

  async function focusRouteContent() {
    const requestId = ++routeFocusRequest;
    await tick();
    if (requestId !== routeFocusRequest || !mainContent) return;
    mainContent.focus({ preventScroll: true });
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
    void focusRouteContent();
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
    void focusRouteContent();
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

  async function handleLogout() {
    if (logoutInProgress) return;
    logoutInProgress = true;

    const { error } = await signOutCurrentBrowser(supabase.auth);
    if (error) {
      addToast('Could not securely sign out. Check your connection and try again.', 'error');
      logoutInProgress = false;
      return;
    }

    clearLocalAccountCache();
    clearUserState();
    session.set(null);
    selectedUserId.set(null);
    selectedProfileUsername = null;
    challengeData = null;
    setRoute('home');
    logoutInProgress = false;
  }

  function handleProfileHeaderEdit() {
    setRoute('profile-settings');
  }

  function handleNavigation(event) {
    const { view: nextView, userId = null, username = null, tab = null } = event.detail || {};
    if (nextView) {
      if (routeMode === 'app' && view === 'game' && challengeData && nextView !== 'game') {
        clearChallengeState();
      }
      setRoute(nextView, { userId, username, tab, legacyProfile: legacyProfile && nextView === 'profile' });
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
    showAuthModal = false;
    routeMode = 'app';
    setRoute('home');

    const signOutResult = await signOutCurrentBrowser(supabase.auth);

    const toastMessage = cleanup?.missing_profile && !alreadyDeleted
      ? 'Account deleted. Some account rows were already missing.'
      : (alreadyDeleted ? 'Account already removed.' : message);

    addToast(toastMessage, 'success');
    if (signOutResult.error) {
      addToast('The account was deleted, but this browser could not clear its cached session. Clear site data before using a shared device.', 'error');
    }
  }

  /** @param {string | MouseEvent | CustomEvent<{mode?: string}>} modeOrEvent */
  async function openAuthModal(modeOrEvent = 'login') {
    const requestedMode = typeof modeOrEvent === 'string'
      ? modeOrEvent
      : modeOrEvent instanceof CustomEvent
        ? modeOrEvent.detail?.mode
        : 'login';
    authInitialTab = requestedMode === 'signup' ? 'signup' : 'login';
    const activeElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    authOpener = activeElement;
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

  $: if (challengeData && routeMode === 'app' && view !== 'game') {
    clearChallengeState();
  }

  $: headerUsername = $profile?.username || $authUser?.user_metadata?.username || $authUser?.email?.split('@')[0] || 'Signed in';
  $: siteAtmosphereColor = normalizeHexColor($profile?.mood_color, '#8B7CF6');
  $: launchEditionOwned = $profile?.equipped_badges?.includes('launch_edition');
  $: founderAnnouncementVisible = founderLaunchWindowActive && !launchEditionOwned && view !== 'home' && view !== 'profile' && view !== 'profile-settings' && (!$authUser || !$profileLoading);
  $: profileTitle = selectedProfileUsername || $profile?.username || $authUser?.user_metadata?.username || 'Profile';
  $: profileModeVisible = routeMode === 'app' && view === 'profile' && !legacyProfile;
  $: profileSettingsModeVisible = routeMode === 'app' && view === 'profile-settings';
  $: homeModeVisible = routeMode === 'app' && view === 'home';
  $: profileModeUsername = selectedProfileUsername || $profile?.username || $authUser?.user_metadata?.username || '';
  $: currentAccountUsername = $profile?.username || $authUser?.user_metadata?.username || '';
  $: profileModeOwner = Boolean(
    profileModeVisible
      && (
        profileVisualFixture
        || (
          $isAuthenticated
          && profileModeUsername
          && currentAccountUsername
          && profileModeUsername.toLowerCase() === currentAccountUsername.toLowerCase()
          && (!$selectedUserId || $selectedUserId === $session?.user?.id)
        )
      )
  );
  $: pageTitle = routeMode === 'privacy'
    ? 'Privacy Policy | ChromaDie'
    : routeMode === 'how-to-play'
      ? 'How to Play | ChromaDie'
      : routeMode === 'app' && view === 'profile'
        ? `${profileTitle} | ChromaDie`
        : routeMode === 'app' && view === 'profile-settings'
          ? 'Profile Settings | ChromaDie'
        : routeMode === 'app' && view === 'home'
          ? 'ChromaDie — A daily color identity'
        : routeMode === 'app' && view === 'prototype'
          ? 'Profile Canvas Prototype | ChromaDie'
        : routeMode === 'app' && view === 'leaderboard'
          ? 'Discovery | ChromaDie'
        : routeMode === 'app' && view === 'shop'
          ? 'Decoration Studio | ChromaDie'
        : routeMode === 'app' && view === 'game' && challengeData
          ? challengeData.error
            ? 'Challenge Unavailable | ChromaDie'
            : 'Challenge | ChromaDie'
      : routeMode === 'app' && view === 'game'
        ? 'Roll | ChromaDie'
      : routeMode === 'not-found'
        ? 'Page Not Found | ChromaDie'
        : 'ChromaDie';
  $: pageDescription = routeMode === 'not-found'
    ? 'The ChromaDie page you requested could not be found.'
    : routeMode === 'privacy'
    ? 'Read the ChromaDie privacy policy and learn how account and gameplay data is handled.'
    : routeMode === 'how-to-play'
      ? 'Learn how ChromaDie works: roll a color every day, discover rarity and traits, earn EP, and compete on the leaderboard.'
      : routeMode === 'app' && view === 'profile'
        ? `View ${profileTitle}'s public ChromaDie profile, progress, achievements, and recent rolls.`
        : routeMode === 'app' && view === 'profile-settings'
          ? 'Edit your ChromaDie profile, public story visibility, links, expression, and interaction settings.'
        : routeMode === 'app' && view === 'home'
          ? 'Roll one color each day and build a personal profile that grows through rarity, conditions, collections, and time.'
        : routeMode === 'app' && view === 'prototype'
          ? 'A noindex Phase 1 profile canvas prototype for ChromaDie.'
        : routeMode === 'app' && view === 'leaderboard'
          ? 'Explore ChromaDie players, public color stories, exceptional rolls, and leaderboard results.'
        : routeMode === 'app' && view === 'shop'
          ? 'Shape a beautiful ChromaDie profile with free foundations, earned cosmetics, and safe premium expression.'
          : 'Roll a new color every day, discover its rarity and traits, earn EP, and compete for the highest score.';
  $: canonicalPath = routeMode === 'not-found'
    ? '/'
    : routeMode === 'privacy'
    ? '/privacy'
    : routeMode === 'how-to-play'
      ? '/how-to-play'
      : routeMode === 'app' && view === 'leaderboard'
        ? '/leaderboard'
        : routeMode === 'app' && view === 'profile-settings'
          ? '/profile/settings'
        : routeMode === 'app' && view === 'profile' && selectedProfileUsername
          ? (getCanonicalProfilePath(selectedProfileUsername) || '/')
          : routeMode === 'app' && view === 'prototype'
            ? '/prototype/profile'
          : routeMode === 'app' && view === 'game' && !challengeData
            ? '/?view=game'
          : '/';
  $: pageRobots = routeMode === 'not-found'
    ? 'noindex,follow'
    : routeMode === 'app' && (legacyProfile || profileRouteKind === 'compatibility' || view === 'game' || view === 'shop' || view === 'profile-settings' || view === 'profile' && !selectedProfileUsername || view === 'prototype')
    ? 'noindex,follow'
    : routeMode === 'auth-callback' || routeMode === 'reset-password'
      ? 'noindex,nofollow'
      : 'index,follow';
  const errorState = supabaseError;

  $: if (($authEvent === 'SIGNED_IN' || $authEvent === 'USER_UPDATED') && showAuthModal) {
    void closeAuthModal();
  }

  $: if (typeof document !== 'undefined') {
    document.body.style.overflow = showAuthModal ? 'hidden' : '';
  }

  $: if (typeof document !== 'undefined') {
    document.title = pageTitle;
    const origin = getAppOrigin();
    const canonical = new URL(canonicalPath, origin).toString();
    const setMeta = (selector, attribute, value) => {
      const element = document.querySelector(selector);
      if (element) element.setAttribute(attribute, value);
    };
    setMeta('meta[name="description"]', 'content', pageDescription);
    setMeta('meta[name="robots"]', 'content', pageRobots);
    setMeta('link[rel="canonical"]', 'href', canonical);
    setMeta('meta[property="og:title"]', 'content', pageTitle);
    setMeta('meta[property="og:description"]', 'content', pageDescription);
    setMeta('meta[property="og:url"]', 'content', canonical);
    setMeta('meta[name="twitter:title"]', 'content', pageTitle);
    setMeta('meta[name="twitter:description"]', 'content', pageDescription);
  }

  $: if (routeMode === 'app' && routeInitialized) {
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
  <a class="skip-link" href="#main-content">Skip to main content</a>
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
        <Auth onClose={closeAuthModal} initialTab={authInitialTab} />
      </div>
    </div>
  {/if}

  <div id="header-mount">
    <SiteModeHeader
      activeView={routeMode === 'app' ? view : routeMode}
      accountState={$accountState}
      username={headerUsername}
      isAuthenticated={$isAuthenticated}
      logoutInProgress={logoutInProgress}
      isProfileMode={profileModeVisible}
      isHomeMode={homeModeVisible}
      isOwner={profileModeOwner}
      on:navigate={handleNavigation}
      on:login={openAuthModal}
      on:logout={handleLogout}
      on:retry={() => window.location.reload()}
      on:edit={handleProfileHeaderEdit}
    />

    {#if founderAnnouncementVisible}
      <section class="founder-banner" aria-label="Launch announcement" role="status" aria-live="polite">
        <div class="founder-banner-copy">
          <p class="founder-banner-kicker">Launch exclusive</p>
          <p class="founder-banner-title">Earn the Launch Edition badge.</p>
          <p class="founder-banner-text">
            {#if $isAuthenticated}
              Roll during the first month to claim yours.
            {:else}
              <button type="button" class="founder-inline-link" on:click={openAuthModal}>Sign in</button> and roll during the first month to claim yours.
            {/if}
          </p>
        </div>
      </section>
    {/if}
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
            Beat the target score with your next daily roll.
          {:else}
            Beat the target score with your next daily roll.
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

  {#if $authInitialized && $session && $profileError && !profileModeVisible}
    <div class="account-error-banner" role="alert" aria-live="polite">
      <span class="account-error-kicker">Account load error</span>
      <span class="account-error-copy">Your signed-in session could not load account data.</span>
    </div>
  {/if}

  {#if !profileModeVisible}
    <ProfileAtmosphere accent={siteAtmosphereColor} secondaryAccent="#2ED3C9" />
  {/if}

  <div class={'app-main ' + (profileModeVisible ? 'app-main--profile' : 'app-main--site') + (homeModeVisible ? ' app-main--home' : '') + (profileSettingsModeVisible ? ' app-main--profile-settings' : '')} id="main-content" role={routeMode === 'app' ? 'main' : undefined} tabindex="-1" bind:this={mainContent}>
  {#if routeMode === 'not-found'}
    <main class="container" aria-labelledby="not-found-title">
      <section class="card bootstrap-error-card">
        <p class="bootstrap-error-kicker">404</p>
        <h1 id="not-found-title">Page not found</h1>
        <p class="info-text">That ChromaDie page does not exist or may have moved.</p>
        <a class="roll-btn" href="/" on:click|preventDefault={() => navigateToPath('/')}>Back home</a>
      </section>
    </main>
  {:else if routeMode === 'privacy'}
    <PrivacyPolicy />
  {:else if routeMode === 'how-to-play'}
    <FAQ />
  {:else}
    {#if view === 'home'}
      <HomePage
        isAuthenticated={$isAuthenticated}
        on:signup={() => openAuthModal('signup')}
        on:profile={() => setRoute('profile', { username: $profile?.username || $authUser?.user_metadata?.username || null })}
      />
    {:else if view === 'game'}
      <Game on:promptlogin={openAuthModal} on:navigate={handleNavigation} />
    {:else if view === 'prototype'}
      <ProfileCanvasPrototype />
    {:else if view === 'leaderboard'}
      {#key `leaderboard:${leaderboardTab}`}
        <Leaderboard initialTab={leaderboardTab} on:navigate={handleNavigation} />
      {/key}
    {:else if view === 'profile-settings'}
      {#if $isAuthenticated}
        <ProfileSettings on:navigate={handleNavigation} />
      {:else}
        <GuestLock view="profile" guestActive={$guestProgressActive} on:login={openAuthModal} />
      {/if}
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
      {#if legacyProfile}
        <Profile profileUsername={selectedProfileUsername} userId={$selectedUserId} on:navigate={handleNavigation} on:accountdeleted={handleAccountDeleted} />
      {:else}
        <ProfileShell profileUsername={selectedProfileUsername} userId={$selectedUserId} visualFixture={profileVisualFixture} on:navigate={handleNavigation} on:accountdeleted={handleAccountDeleted} />
      {/if}
    {:else if $isAuthenticated}
      {#if view === 'shop'}
        <Shop />
      {/if}
    {:else}
      {#if view === 'shop' || view === 'profile'}
        <GuestLock view={view} guestActive={$guestProgressActive} on:login={openAuthModal} />
      {/if}
    {/if}
  {/if}
  </div>

  {#if view !== 'profile'}
    <footer class="site-footer">
      <div class="site-footer-inner">
        <p>ChromaDie</p>
        <nav aria-label="Footer">
          <a href="/privacy" on:click|preventDefault={() => navigateToPath('/privacy')}>Privacy Policy</a>
          <a href="/how-to-play" on:click|preventDefault={() => navigateToPath('/how-to-play')}>How to Play</a>
          <a href="mailto:support@chromadie.com">Support</a>
          <a href="mailto:business@chromadie.com">Business</a>
        </nav>
      </div>
    </footer>
  {/if}
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

  .app-main--site {
    position: relative;
    isolation: isolate;
    min-height: calc(100dvh - 4.25rem);
  }

  .app-main--home {
    min-height: calc(100dvh - 9.75rem);
  }

  .app-main--site > * {
    position: relative;
    z-index: 1;
  }

  .app-main:focus {
    outline: none;
  }

  .skip-link {
    position: fixed;
    top: 0.75rem;
    left: 0.75rem;
    z-index: 1200;
    transform: translateY(-220%);
    padding: 0.7rem 0.9rem;
    border: 1px solid var(--color-line-strong);
    border-radius: var(--radius-sm);
    background: var(--color-canvas-raised);
    color: var(--color-ink-strong);
    font-weight: 800;
    text-decoration: none;
    box-shadow: var(--shadow-panel);
    transition: transform var(--motion-fast) var(--motion-ease-standard);
  }

  .skip-link:focus-visible {
    transform: translateY(0);
    outline: 2px solid var(--color-accent-bright);
    outline-offset: 3px;
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
    font-family: var(--font-mono-stack);
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

  .account-error-banner {
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

  .account-error-kicker {
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.15em;
    color: var(--accent-purple);
  }

  .account-error-copy {
    font-size: 0.92rem;
    color: var(--text-muted);
  }

  .account-error-banner {
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
    font-family: var(--font-mono-stack);
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
    position: relative;
    z-index: 1;
    width: 100%;
    margin-top: auto;
    padding: 0 0 1.5rem;
    border-top: 1px solid rgba(255,255,255,0.08);
    color: var(--text-muted);
    font: 500 0.72rem / 1.4 var(--font-mono-stack);
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
    letter-spacing: 0.04em;
    text-transform: lowercase;
    font-weight: 500;
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

  .wallet-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    min-height: 34px;
    padding: 0.4rem 0.65rem;
    border: 1px solid rgba(94, 234, 212, 0.24);
    border-radius: 999px;
    background: rgba(94, 234, 212, 0.07);
    color: #fff;
    cursor: pointer;
    white-space: nowrap;
  }

  .wallet-pill:hover,
  .wallet-pill:focus-visible {
    border-color: rgba(94, 234, 212, 0.5);
    background: rgba(94, 234, 212, 0.12);
  }

  .wallet-pill-label {
    color: var(--text-muted);
    font-size: 0.68rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .wallet-pill-value {
    color: #8ff7df;
    font-family: var(--font-mono-stack);
    font-size: 0.76rem;
    font-weight: 700;
  }

  .mobile-wallet-card {
    display: none;
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
    .account-error-banner {
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
    .mobile-wallet-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      width: 100%;
      min-height: 48px;
      padding: 0.75rem 0.9rem;
      border: 1px solid rgba(94, 234, 212, 0.24);
      border-radius: 12px;
      background: rgba(94, 234, 212, 0.07);
      color: #fff;
      cursor: pointer;
    }
    .mobile-wallet-label {
      color: var(--text-muted);
      font-size: 0.78rem;
      font-weight: 600;
    }
    .mobile-wallet-value {
      color: #8ff7df;
      font-family: var(--font-mono-stack);
      font-size: 0.88rem;
      font-weight: 700;
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

  @media (prefers-reduced-motion: reduce) {
    .skip-link { transition: none; }
  }

  @keyframes slideDown {
    from { opacity: 0; transform: translateY(-20px); }
    to { opacity: 1; transform: translateY(0); }
  }
</style>
