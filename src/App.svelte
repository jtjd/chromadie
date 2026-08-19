<script>
  import { session, authUser, profile, authInitialized, accountState, guestProgressActive, profileLoading, profileError, selectedUserId, isAuthenticated, clearUserState, clearLocalAccountCache, addToast } from './lib/stores';
  import { signOutCurrentBrowser } from './lib/authSession';
  import { supabase, supabaseError } from './lib/supabase';
  import SiteModeHeader from './lib/SiteModeHeader.svelte';
  import SiteFooter from './lib/SiteFooter.svelte';
  import Toast from './lib/Toast.svelte';
  import AccountUnavailable from './lib/AccountUnavailable.svelte';
  import NotFound from './lib/NotFound.svelte';
  import RouteLoading from './lib/RouteLoading.svelte';
  import RouteOutlet from './lib/RouteOutlet.svelte';
  import { prefetchRouteComponent } from './lib/routeLoaders.js';
  import { loadChallengeLink } from './lib/challenges';
  import { getAppOrigin } from './lib/authUrls';
  import { VALID_VIEWS, VALID_LEADERBOARD_TABS, parseRouteLocation } from './lib/routes';
  import { getCanonicalProfilePath } from './lib/routeContract.js';
  import { resolveProfileAlias } from './lib/profileAliases.js';
  import { trackProductEvent } from './lib/productAnalytics.js';
  import { ACCOUNT_STATES } from './lib/authState';
  import { onMount, onDestroy, tick } from 'svelte';
  import { SvelteURLSearchParams } from 'svelte/reactivity';

  const VALID_APP_ROUTES = new Set(['app', 'privacy', 'terms', 'how-to-play', 'auth', 'auth-callback', 'reset-password']);
  let view = 'home';
  let leaderboardTab = 'today';
  let routeMode = 'app';
  let authRouteTab = 'login';
  let authRouteNext = '';
  let authRouteUsername = '';
  let logoutInProgress = false;
  let challengeData = null;
  let challengeLoadRequestId = 0;
  let selectedProfileUsername = null;
  let profileRouteKind = null;
  let aliasResolving = false;
  let aliasResolutionRequestId = 0;
  let legacyProfile = false;
  let founderLaunchWindowActive = false;
  let routeInitialized = false;
  let mainContent = null;
  let routeFocusRequest = 0;
  let lastTrackedRouteKey = '';
  let profileVisualFixture = '';
  let cancelIdlePrefetch = null;
  let routeTarget;

  function redirectSignedOutProfileSettings() {
    const nextPath = '/profile/settings';
    routeMode = 'auth';
    view = 'home';
    authRouteTab = 'login';
    authRouteNext = nextPath;
    authRouteUsername = '';
    selectedProfileUsername = null;
    profileRouteKind = null;
    selectedUserId.set(null);
    legacyProfile = false;
    challengeData = null;

    if (typeof window !== 'undefined') {
      const nextUrl = `/login?next=${encodeURIComponent(nextPath)}`;
      const currentUrl = `${window.location.pathname}${window.location.search}`;
      if (currentUrl !== nextUrl) window.history.replaceState({}, '', nextUrl);
    }

    trackCurrentRoute();
  }
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
    aliasResolutionRequestId += 1;
    aliasResolving = false;
    profileVisualFixture = getProfileVisualFixture();
    const parsed = parseRouteLocation(window.location.pathname, window.location.search);
    routeMode = parsed.routeMode;

    if (typeof window !== 'undefined' && window.location.pathname === '/shop') {
      window.history.replaceState({}, '', '/profile/settings#customize-appearance');
    }

    if (parsed.routeMode === 'auth') {
      view = 'auth';
      authRouteTab = parsed.authTab || 'login';
      authRouteNext = parsed.authNext || '';
      authRouteUsername = parsed.authUsername || '';
      selectedProfileUsername = null;
      profileRouteKind = null;
      selectedUserId.set(null);
      legacyProfile = false;
      challengeData = null;
    } else if (parsed.profileAlias) {
      challengeData = null;
      view = 'profile';
      selectedProfileUsername = null;
      profileRouteKind = 'alias';
      aliasResolving = true;
      selectedUserId.set(null);
      legacyProfile = false;
      void loadProfileAlias(parsed.profileAlias);
    } else if (parsed.profileUsername !== null) {
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

  async function loadProfileAlias(alias) {
    const requestId = aliasResolutionRequestId;
    const { profile, error } = await resolveProfileAlias(supabase, alias);
    if (requestId !== aliasResolutionRequestId) return;

    aliasResolving = false;
    const canonicalPath = getCanonicalProfilePath(profile?.username);
    if (error || !canonicalPath) {
      routeMode = 'not-found';
      view = 'home';
      selectedProfileUsername = null;
      profileRouteKind = null;
      selectedUserId.set(null);
      legacyProfile = false;
      challengeData = null;
      trackCurrentRoute();
      return;
    }

    window.history.replaceState({}, '', `${canonicalPath}${window.location.search}${window.location.hash}`);
    parseRoute();
  }

  function syncRoute() {
    if (typeof window === 'undefined') return;
    if (aliasResolving) return;
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

    if (view === 'pricing') {
      const pricingPath = window.location.pathname === '/pricing/success' ? '/pricing/success' : '/pricing';
      if (window.location.pathname !== pricingPath) window.history.pushState({}, '', pricingPath);
      return;
    }

    if (view === 'game') {
      const currentUrl = `${window.location.pathname}${window.location.search}`;
      if (currentUrl !== '/roll') window.history.pushState({}, '', '/roll');
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
      const nextPath = nextView === 'profile-settings'
        ? '/profile/settings'
        : nextView === 'pricing'
          ? '/pricing'
          : nextView === 'game'
            ? '/roll'
            : '/';
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
    const navigationGuard = new CustomEvent('chromadie:navigation-request', {
      detail: { nextPath: `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}` },
      cancelable: true
    });
    if (!window.dispatchEvent(navigationGuard)) return;
    if (routeMode === 'app' && view === 'game' && challengeData && !nextUrl.pathname.startsWith('/c/')) {
      clearChallengeState();
    }
    window.history.pushState({}, '', `${nextUrl.pathname}${nextUrl.search}`);
    parseRoute();
    void focusRouteContent();
  }

  function handleInternalLinkClick(event) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    const target = event.target;
    const link = target instanceof Element ? target.closest('a[href]') : null;
    if (!(link instanceof HTMLAnchorElement) || link.target && link.target !== '_self' || link.hasAttribute('download')) return;

    const nextUrl = new URL(link.href, window.location.href);
    if (nextUrl.origin !== window.location.origin || !['http:', 'https:'].includes(nextUrl.protocol)) return;

    const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    const nextPath = `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`;
    if (currentUrl === nextPath) return;

    const nextRoute = parseRouteLocation(nextUrl.pathname, nextUrl.search);
    const isSpaRoute = nextRoute.routeMode === 'app'
      || nextRoute.routeMode === 'auth'
      || ['privacy', 'terms', 'how-to-play'].includes(nextRoute.routeMode);
    if (!isSpaRoute) return;

    event.preventDefault();
    navigateToPath(nextPath);
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
    void loadFounderAnnouncementState();
    parseRoute();
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('click', handleInternalLinkClick);

    const prefetchCommonRoutes = () => {
      for (const key of ['game', 'leaderboard', 'profileShell', 'authPage']) {
        void prefetchRouteComponent(key);
      }
    };

    const idleWindow = /** @type {any} */ (window);
    if (typeof idleWindow.requestIdleCallback === 'function') {
      const idleId = idleWindow.requestIdleCallback(prefetchCommonRoutes, { timeout: 1800 });
      cancelIdlePrefetch = () => idleWindow.cancelIdleCallback(idleId);
    } else {
      const timerId = window.setTimeout(prefetchCommonRoutes, 1200);
      cancelIdlePrefetch = () => window.clearTimeout(timerId);
    }
  });

  onDestroy(() => {
    cancelIdlePrefetch?.();
    window.removeEventListener('popstate', handlePopState);
    window.removeEventListener('click', handleInternalLinkClick);
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
    if (typeof window !== 'undefined') {
      const navigationGuard = new CustomEvent('chromadie:navigation-request', {
        detail: { navigation: event.detail || {} },
        cancelable: true
      });
      if (!window.dispatchEvent(navigationGuard)) return;
    }
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
    clearLocalAccountCache({ clearCatalogCache: true });
    clearUserState();
    session.set(null);
    selectedUserId.set(null);
    selectedProfileUsername = null;
    challengeData = null;
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

  /** @param {any} modeOrEvent */
  function navigateToAuth(modeOrEvent = 'login') {
    const eventDetail = typeof modeOrEvent === 'object' && modeOrEvent
      ? modeOrEvent.detail || modeOrEvent
      : null;
    const requestedMode = typeof modeOrEvent === 'string'
      ? modeOrEvent
      : eventDetail?.mode || 'login';
    const username = eventDetail?.username ? String(eventDetail.username).trim().slice(0, 20) : '';
    const query = requestedMode === 'signup' && username
      ? `username=${encodeURIComponent(username)}`
      : '';
    navigateToPath(`/${requestedMode === 'signup' ? 'signup' : 'login'}${query ? `?${query}` : ''}`);
  }

  function getRouteTarget({
    routeMode: currentRouteMode,
    view: currentView,
    tab,
    isAuthenticated: authenticated,
    sessionState,
    authInitialized: initialized,
    accountState: currentAccountState,
    profileError: accountError,
    selectedUsername,
    selectedId,
    currentLegacyProfile,
    visualFixture,
    guestActive,
    challenge,
    authTab,
    authNext,
    authUsername,
    aliasResolving: resolvingAlias,
    username: currentUsername,
    logoutInProgress: currentLogoutInProgress
  }) {
    if (currentRouteMode === 'not-found') {
      return { componentKey: 'not-found', staticComponent: NotFound, componentProps: {}, loadingLabel: 'Opening page' };
    }

    if (currentRouteMode === 'auth') {
      return {
        loaderKey: 'authPage',
        componentKey: `auth-page:${authTab}:${authNext}:${authUsername}`,
        componentProps: { initialTab: authTab, next: authNext, initialUsername: authUsername },
        loadingLabel: authTab === 'signup' ? 'Opening sign up' : 'Opening sign in'
      };
    }

    if (currentRouteMode === 'privacy' || currentRouteMode === 'terms' || currentRouteMode === 'how-to-play') {
      return {
        loaderKey: currentRouteMode === 'how-to-play' ? 'howToPlay' : currentRouteMode,
        componentKey: currentRouteMode,
        componentProps: {},
        loadingLabel: 'Opening information'
      };
    }

    if (resolvingAlias) {
      return {
        componentKey: 'profile-alias-loading',
        staticComponent: RouteLoading,
        componentProps: { label: 'Opening profile alias' },
        loadingLabel: 'Opening profile alias'
      };
    }

    if (currentView === 'home') {
      return {
        loaderKey: 'home',
        componentKey: 'home',
        componentProps: {
          isAuthenticated: authenticated,
          accountState: currentAccountState,
          username: currentUsername,
          logoutInProgress: currentLogoutInProgress
        },
        loadingLabel: 'Opening ChromaDie'
      };
    }

    if (currentView === 'pricing') {
      return {
        loaderKey: 'pricing',
        componentKey: 'pricing',
        componentProps: {},
        loadingLabel: 'Opening pricing'
      };
    }

    if (currentView === 'game') {
      return {
        loaderKey: 'game',
        componentKey: `game:${challenge?.id || 'daily'}`,
        componentProps: {},
        loadingLabel: 'Opening today’s roll'
      };
    }

    if (currentView === 'prototype') {
      return {
        loaderKey: 'prototype',
        componentKey: 'prototype',
        componentProps: {},
        loadingLabel: 'Opening prototype'
      };
    }

    if (currentView === 'leaderboard') {
      return {
        loaderKey: 'leaderboard',
        componentKey: `leaderboard:${tab}`,
        componentProps: { initialTab: tab },
        loadingLabel: 'Opening discovery'
      };
    }

    if (currentView === 'profile-settings') {
      if (authenticated) {
        return {
          loaderKey: 'profileSettings',
          componentKey: 'profile-settings',
          componentProps: { logoutInProgress },
          loadingLabel: 'Opening profile settings'
        };
      }

      if (currentAccountState === ACCOUNT_STATES.PROFILE_ERROR) {
        return {
          componentKey: 'profile-settings-error',
          staticComponent: AccountUnavailable,
          componentProps: {},
          loadingLabel: 'Loading account'
        };
      }

      return {
        componentKey: 'profile-settings-loading',
        staticComponent: RouteLoading,
        componentProps: { label: 'Loading your account' },
        loadingLabel: 'Loading your account'
      };
    }

    if (initialized && sessionState && accountError && currentView === 'profile') {
      return {
        componentKey: `account-error:${currentView}`,
        staticComponent: AccountUnavailable,
        componentProps: {},
        loadingLabel: 'Loading account'
      };
    }

    if (currentView === 'profile' && (authenticated || sessionState || selectedUsername || selectedId)) {
      const loaderKey = currentLegacyProfile ? 'profileLegacy' : 'profileShell';
      const profileKey = selectedUsername || selectedId || 'self';
      return {
        loaderKey,
        componentKey: `profile:${currentLegacyProfile ? 'legacy' : 'shell'}:${profileKey}:${visualFixture}`,
        componentProps: currentLegacyProfile
          ? { profileUsername: selectedUsername, userId: selectedId }
          : { profileUsername: selectedUsername, userId: selectedId, visualFixture },
        loadingLabel: 'Opening profile'
      };
    }

    if (currentView === 'profile' && currentAccountState === ACCOUNT_STATES.SIGNED_OUT) {
      return {
        loaderKey: 'guestProfile',
        componentKey: `guest-profile:${guestActive}`,
        componentProps: { guestActive },
        loadingLabel: 'Opening a profile preview'
      };
    }

    return {
      componentKey: `route-loading:${currentView}`,
      staticComponent: RouteLoading,
      componentProps: { label: initialized ? 'Loading page' : 'Loading your account' },
      loadingLabel: 'Loading page'
    };
  }

  $: if (challengeData && routeMode === 'app' && view !== 'game') {
    clearChallengeState();
  }

  $: routeTarget = getRouteTarget({
    routeMode,
    view,
    tab: leaderboardTab,
    isAuthenticated: $isAuthenticated,
    sessionState: $session,
    authInitialized: $authInitialized,
    accountState: $accountState,
    profileError: $profileError,
    selectedUsername: selectedProfileUsername,
    selectedId: $selectedUserId,
    currentLegacyProfile: legacyProfile,
    visualFixture: profileVisualFixture,
    guestActive: $guestProgressActive,
    challenge: challengeData,
    authTab: authRouteTab,
    authNext: authRouteNext,
    authUsername: authRouteUsername,
    aliasResolving,
    username: headerUsername,
    logoutInProgress
  });

  $: headerUsername = $profile?.username || $authUser?.user_metadata?.username || $authUser?.email?.split('@')[0] || 'Signed in';
  $: launchEditionOwned = $profile?.equipped_badges?.includes('launch_edition');
  $: founderAnnouncementVisible = founderLaunchWindowActive && !launchEditionOwned && view !== 'home' && view !== 'profile' && view !== 'profile-settings' && (!$authUser || !$profileLoading);
  $: profileTitle = selectedProfileUsername || $profile?.username || $authUser?.user_metadata?.username || 'Profile';
  $: profileModeVisible = routeMode === 'app' && view === 'profile' && !legacyProfile && !aliasResolving;
  $: profileSettingsModeVisible = routeMode === 'app' && view === 'profile-settings';
  $: homeModeVisible = routeMode === 'app' && view === 'home';
  $: leaderboardModeVisible = routeMode === 'app' && view === 'leaderboard';
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
    : routeMode === 'terms'
      ? 'Terms of Service | ChromaDie'
    : routeMode === 'how-to-play'
      ? 'How to Play | ChromaDie'
    : routeMode === 'auth'
      ? authRouteTab === 'signup' ? 'Create your account | ChromaDie' : 'Sign in | ChromaDie'
      : routeMode === 'app' && view === 'profile'
        ? `${profileTitle} | ChromaDie`
        : routeMode === 'app' && view === 'profile-settings'
          ? 'Profile Studio | ChromaDie'
        : routeMode === 'app' && view === 'home'
          ? 'ChromaDie — A daily color identity'
        : routeMode === 'app' && view === 'prototype'
          ? 'Profile Canvas Prototype | ChromaDie'
        : routeMode === 'app' && view === 'leaderboard'
          ? 'Discovery | ChromaDie'
        : routeMode === 'app' && view === 'pricing'
          ? 'Chromadie Plus — $7.99 lifetime | ChromaDie'
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
    : routeMode === 'terms'
      ? 'Read the ChromaDie Terms of Service for profiles, uploads, customization, and community safety.'
    : routeMode === 'how-to-play'
      ? 'Learn how ChromaDie works: roll a color every day, discover rarity and traits, earn EP, and compete on the leaderboard.'
    : routeMode === 'auth'
      ? authRouteTab === 'signup'
        ? 'Create a ChromaDie account and keep building your public color identity.'
        : 'Sign in to keep your ChromaDie profile, rolls, and cosmetics in sync.'
      : routeMode === 'app' && view === 'profile'
        ? `View ${profileTitle}'s public ChromaDie profile, progress, achievements, and recent rolls.`
        : routeMode === 'app' && view === 'profile-settings'
          ? 'Shape your ChromaDie identity, collection, progression, public canvas, and privacy from one profile studio.'
        : routeMode === 'app' && view === 'home'
          ? 'Roll one color each day and build a personal profile that grows through rarity, conditions, collections, and time.'
        : routeMode === 'app' && view === 'prototype'
          ? 'A noindex Phase 1 profile canvas prototype for ChromaDie.'
        : routeMode === 'app' && view === 'leaderboard'
          ? 'Explore ChromaDie players, public color stories, exceptional rolls, and leaderboard results.'
        : routeMode === 'app' && view === 'pricing'
          ? 'Compare the complete free profile with Chromadie Plus lifetime profile expression.'
          : 'Roll a new color every day, discover its rarity and traits, earn EP, and compete for the highest score.';
  $: canonicalPath = routeMode === 'not-found'
    ? '/'
    : routeMode === 'privacy'
    ? '/privacy'
    : routeMode === 'terms'
      ? '/terms'
    : routeMode === 'how-to-play'
      ? '/how-to-play'
      : routeMode === 'auth'
        ? `/${authRouteTab}`
      : routeMode === 'app' && view === 'leaderboard'
        ? '/leaderboard'
        : routeMode === 'app' && view === 'profile-settings'
          ? '/profile/settings'
        : routeMode === 'app' && view === 'pricing'
          ? '/pricing'
        : routeMode === 'app' && view === 'profile' && selectedProfileUsername
          ? (getCanonicalProfilePath(selectedProfileUsername) || '/')
          : routeMode === 'app' && view === 'prototype'
            ? '/prototype/profile'
          : routeMode === 'app' && view === 'game' && !challengeData
            ? '/roll'
          : '/';
  $: pageRobots = routeMode === 'not-found'
    ? 'noindex,follow'
    : routeMode === 'app' && (legacyProfile || profileRouteKind === 'compatibility' || view === 'game' || view === 'profile-settings' || view === 'pricing' && typeof window !== 'undefined' && window.location.pathname === '/pricing/success' || view === 'profile' && !selectedProfileUsername || view === 'prototype')
    ? 'noindex,follow'
    : routeMode === 'auth' || routeMode === 'auth-callback' || routeMode === 'reset-password'
      ? 'noindex,nofollow'
      : 'index,follow';
  const errorState = supabaseError;

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

  $: if (routeInitialized && routeMode === 'app' && view === 'profile-settings' && $accountState === ACCOUNT_STATES.SIGNED_OUT) {
    redirectSignedOutProfileSettings();
  }

</script>

<Toast />

  {#if errorState}
    <main class="bootstrap-error-shell site-atmosphere-page">
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
    <RouteOutlet
      loaderKey="authCallback"
      componentKey="auth-callback"
      loadingLabel="Confirming your account"
    />
  {:else if routeMode === 'reset-password'}
    <RouteOutlet
      loaderKey="resetPassword"
      componentKey="reset-password"
      loadingLabel="Opening password reset"
    />
  {:else if routeMode === 'auth'}
    <RouteOutlet
      loaderKey="authPage"
      componentKey={routeTarget.componentKey}
      componentProps={routeTarget.componentProps}
      loadingLabel={routeTarget.loadingLabel}
    />
  {:else}
  <div class="app-shell" class:app-shell--site={!['auth', 'auth-callback', 'reset-password'].includes(routeMode) && view !== 'profile' && !homeModeVisible} class:app-shell--home={homeModeVisible} class:app-shell--leaderboard={leaderboardModeVisible}>
  <a class="skip-link" href="#main-content">Skip to main content</a>

  <div id="header-mount">
    {#if !profileModeVisible && !homeModeVisible && !profileSettingsModeVisible}
      <SiteModeHeader
        activeView={routeMode === 'app' ? view : routeMode}
        accountState={$accountState}
        username={headerUsername}
        isAuthenticated={$isAuthenticated}
        logoutInProgress={logoutInProgress}
        isProfileMode={profileModeVisible}
        isLeaderboardMode={leaderboardModeVisible}
        isHomeMode={homeModeVisible}
        isHomepageStyle={!profileModeVisible && !profileSettingsModeVisible}
        isProfileSettings={profileSettingsModeVisible}
        isOwner={profileModeOwner}
        on:navigate={handleNavigation}
        on:login={navigateToAuth}
        on:claim={() => navigateToAuth('signup')}
        on:logout={handleLogout}
        on:retry={() => window.location.reload()}
        on:edit={handleProfileHeaderEdit}
      />
    {/if}

    {#if founderAnnouncementVisible}
      <section class="founder-banner" aria-label="Launch announcement" role="status" aria-live="polite">
        <div class="founder-banner-copy">
          <p class="founder-banner-kicker">Launch exclusive</p>
          <p class="founder-banner-title">Earn the Launch Edition badge.</p>
          <p class="founder-banner-text">
            {#if $isAuthenticated}
              Roll during the first month to claim yours.
            {:else}
              <button type="button" class="founder-inline-link" on:click={() => navigateToAuth('login')}>Sign in</button> and roll during the first month to claim yours.
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

  {#if $authInitialized && $session && $profileError && !profileModeVisible && !profileSettingsModeVisible}
    <div class="account-error-banner" role="alert" aria-live="polite">
      <span class="account-error-kicker">Account load error</span>
      <span class="account-error-copy">Your signed-in session could not load account data.</span>
    </div>
  {/if}

  <div class={'app-main ' + (profileModeVisible ? 'app-main--profile' : profileSettingsModeVisible ? 'app-main--profile-settings' : 'app-main--site') + (homeModeVisible ? ' app-main--home' : '') + (leaderboardModeVisible ? ' app-main--leaderboard' : '')} id="main-content" role={routeMode === 'app' ? 'main' : undefined} tabindex="-1" bind:this={mainContent}>
  <RouteOutlet
    loaderKey={routeTarget.loaderKey}
    staticComponent={routeTarget.staticComponent}
    componentKey={routeTarget.componentKey}
    componentProps={routeTarget.componentProps}
    loadingLabel={routeTarget.loadingLabel}
    on:navigate={handleNavigation}
    on:promptlogin={navigateToAuth}
    on:accountdeleted={handleAccountDeleted}
    on:login={navigateToAuth}
    on:logout={handleLogout}
    on:retry={() => window.location.reload()}
    on:signup={() => navigateToAuth('signup')}
    on:claim={event => navigateToAuth({ detail: { mode: 'signup', username: event.detail?.username } })}
    on:profile={() => setRoute('profile', { username: $profile?.username || $authUser?.user_metadata?.username || null })}
    on:roll={() => setRoute('profile', { username: $profile?.username || $authUser?.user_metadata?.username || null })}
  />
  </div>

  {#if view !== 'profile' && !homeModeVisible && !profileSettingsModeVisible}
    <SiteFooter isAuthenticated={$isAuthenticated} />
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

  .app-shell--home {
    background: #080908;
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
    background: #080908;
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
    width: min(760px, 100%);
    padding: clamp(1.5rem, 4vw, 3rem);
    text-align: left;
    border-color: rgba(255, 255, 255, .1);
    border-radius: 18px;
    background: rgba(10, 10, 12, .58);
    box-shadow: 0 1.5rem 4rem rgba(0, 0, 0, .16);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
  }

  .bootstrap-error-kicker {
    margin: 0 0 0.65rem 0;
    color: var(--white, #ffffff);
    text-transform: uppercase;
    letter-spacing: 0.16em;
    font-size: 0.72rem;
    font-weight: 700;
  }

  .bootstrap-error-card h1 {
    margin: 0 0 0.85rem 0;
    font-family: 'Manrope Variable', ui-sans-serif, system-ui, sans-serif;
    font-size: clamp(3rem, 6vw, 5.25rem);
    line-height: .94;
    letter-spacing: -.048em;
    color: #f8f8f8;
  }

  .bootstrap-error-message,
  .bootstrap-error-details,
  .bootstrap-error-help {
    margin: 1.15rem 0 0;
    color: #8f9099;
    line-height: 1.6;
  }

  .bootstrap-error-details {
    font-family: var(--font-mono-stack);
    color: #f9a8d4;
  }

  .account-error-banner {
    width: min(1160px, calc(100% - 48px));
    margin: 0 auto 12px;
    padding: 0.8rem 1rem;
    border-radius: 18px;
    border: 1px solid rgba(248, 113, 113, .28);
    background: rgba(248, 113, 113, .06);
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
    color: #ff8b9f;
  }

  .account-error-copy {
    font-size: 0.92rem;
    color: var(--text-muted);
  }

  .challenge-banner {
    width: min(1160px, calc(100% - 48px));
    margin: 0 auto 12px;
    padding: 1rem 1.1rem;
    background: rgba(10, 10, 12, .58);
    border: 1px solid rgba(255, 255, 255, .1);
    border-radius: 18px;
    box-shadow: 0 1.5rem 4rem rgba(0, 0, 0, .16);
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
  }

  .founder-banner {
    width: min(1160px, calc(100% - 48px));
    margin: 0 auto 12px;
    padding: 0.9rem 1rem;
    border-radius: 18px;
    border: 1px solid rgba(255, 198, 87, 0.28);
    background: rgba(10, 10, 12, .58);
    box-shadow: 0 1.5rem 4rem rgba(0, 0, 0, .16);
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
    font-family: 'Manrope Variable', ui-sans-serif, system-ui, sans-serif;
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
    color: var(--white, #ffffff);
    text-transform: uppercase;
    letter-spacing: 0.15em;
    font-size: 0.68rem;
    font-weight: 700;
  }
  .challenge-banner h2 {
    margin: 0;
    font-family: 'Manrope Variable', ui-sans-serif, system-ui, sans-serif;
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
    border-radius: 9px;
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
    font-family: 'Inter', ui-sans-serif, system-ui, sans-serif;
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
    min-height: 42px;
    border: 1px solid rgba(255,255,255,.2);
    border-radius: 9px;
    background: transparent;
    color: #f8f8f8;
    cursor: pointer;
    font-size: 0.85rem;
    font-weight: 600;
    padding: 0 18px;
    transition: background 0.18s ease, border-color 0.18s ease, transform 0.18s ease;
  }
  .challenge-close:hover {
    background: color-mix(in srgb, var(--white, #ffffff) 9%, transparent);
    border-color: var(--border, rgba(255, 255, 255, .09));
    transform: translateY(-1px);
  }

  @media (max-width: 600px) {
    .account-error-banner {
      width: calc(100% - 2rem);
      margin-inline: auto;
      justify-content: flex-start;
      text-align: left;
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
  }

  @media (prefers-reduced-motion: reduce) {
    .skip-link { transition: none; }
  }

</style>
