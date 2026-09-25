<script>
  import { session, authUser, profile, authInitialized, accountState, guestProgressActive, profileLoading, profileError, selectedUserId, isAuthenticated, clearUserState, clearLocalAccountCache, addToast } from './lib/stores';
  import { signOutCurrentBrowser } from './lib/authSession';
  import { supabase, supabaseError } from './lib/supabase';
  import SiteModeHeader from './lib/SiteModeHeader.svelte';
  import ChallengeBanner from './lib/ChallengeBanner.svelte';
  import SiteFooter from './lib/SiteFooter.svelte';
  import Toast from './lib/Toast.svelte';
  import AccountUnavailable from './lib/AccountUnavailable.svelte';
  import NotFound from './lib/NotFound.svelte';
  import RouteLoading from './lib/RouteLoading.svelte';
  import RouteOutlet from './lib/RouteOutlet.svelte';
  import { getAppOrigin } from './lib/authUrls';
  import { VALID_VIEWS, getChallengeClearPath, parseRouteLocation, resolveRouteSyncPath, viewToCanonicalPath } from './lib/routes';
  import { resolveRouteTarget } from './lib/routeTarget.js';
  import { resolveRouteState } from './lib/routeState.js';
  import { createRouteNavigationController } from './lib/routeNavigation.js';
  import { resolveRouteMetadata } from './lib/routeMetadata.js';
  import { trackProductEvent } from './lib/productAnalytics.js';
  import { ACCOUNT_STATES } from './lib/authState';
  import { onMount, onDestroy, tick } from 'svelte';
  import { SvelteURLSearchParams } from 'svelte/reactivity';

  // Resolve the browser location before the first RouteOutlet pass. Starting
  // every document as Home briefly imports the homepage tree even when a
  // visitor directly opens /pricing or an information route. The
  // mount-time parse below still owns side effects such as challenge and
  // alias resolution; this first pass only prevents the wrong lazy split
  // point from entering the network graph.
  const initialRoute = typeof window !== 'undefined'
    ? parseRouteLocation(window.location.pathname, window.location.search)
    : null;
  const initialRouteState = initialRoute ? resolveRouteState(initialRoute) : null;

  let view = initialRouteState?.view || 'home';
  let leaderboardTab = initialRouteState?.leaderboardTab || 'today';
  let progressionTab = initialRouteState?.progressionTab || 'journey';
  let routeMode = initialRouteState?.routeMode || 'app';
  let authRouteTab = initialRouteState?.authRouteTab || 'login';
  let authRouteNext = initialRouteState?.authRouteNext || '';
  let authRouteUsername = initialRouteState?.authRouteUsername || '';
  let logoutInProgress = false;
  let challengeData = initialRouteState?.challengeData || null;
  let challengeLifecycle = null;
  let challengeLifecyclePromise = null;
  let challengeLifecycleGeneration = 0;
  let profileAliasLifecycle = null;
  let profileAliasLifecyclePromise = null;
  let aliasResolutionGeneration = 0;
  let selectedProfileUsername = initialRouteState?.selectedProfileUsername || null;
  let profileRouteKind = initialRouteState?.profileRouteKind || null;
  let aliasResolving = initialRouteState?.aliasResolving || false;
  let legacyProfile = initialRouteState?.legacyProfile || false;
  let founderLaunchWindowActive = false;
  let routeInitialized = false;
  let mainContent = null;
  let routeFocusRequest = 0;
  let lastTrackedRouteKey = '';
  let profileVisualFixture = getProfileVisualFixture();
  let routeTarget;
  let homepageHeaderTransitionPending = false;
  // Public profile data arrives after the route shell. Keep a profile noindex
  // until its bounded identity projection explicitly allows discovery.
  let profileIndexingAllowed = false;

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

  function redirectSignedOutRivals() {
    const nextPath = '/leaderboard?tab=rivals';
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
      window.history.replaceState({}, '', `/login?next=${encodeURIComponent(nextPath)}`);
    }
    trackCurrentRoute();
  }

  $: if (
    routeInitialized
    && $authInitialized
    && $accountState === ACCOUNT_STATES.SIGNED_OUT
    && routeMode === 'app'
    && view === 'leaderboard'
    && leaderboardTab === 'rivals'
  ) redirectSignedOutRivals();
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
    const activeTab = route === 'leaderboard' ? leaderboardTab : route === 'progression' ? progressionTab : '';
    const routeKey = `${route}:${surfaceKey}:${activeTab}`;
    if (routeKey === lastTrackedRouteKey) return;
    lastTrackedRouteKey = routeKey;
    trackProductEvent('route_view', { route });
  }

  function updateHomepageHeaderTransition(nextRoute) {
    const currentIsHomepage = routeMode === 'app' && view === 'home';
    const nextIsAppRoute = nextRoute?.routeMode === 'app';
    const nextIsNonHomepage = nextIsAppRoute && nextRoute.view !== 'home';

    // HomePage owns the header while its lazy route remains mounted. Keep the
    // app-shell header out of the DOM until the destination replaces it.
    // Preserve the guard if a visitor clicks another destination during the
    // same in-flight transition.
    if ((currentIsHomepage || homepageHeaderTransitionPending) && nextIsNonHomepage) {
      homepageHeaderTransitionPending = true;
      return;
    }

    if (!nextIsAppRoute || nextRoute.view === 'home') {
      homepageHeaderTransitionPending = false;
    }
  }

  function parseRoute() {
    invalidateChallengeLoad();
    invalidateProfileAliasLoad();
    profileVisualFixture = getProfileVisualFixture();
    const parsed = parseRouteLocation(window.location.pathname, window.location.search);
    updateHomepageHeaderTransition(parsed);
    const nextRouteState = resolveRouteState(parsed);
    routeMode = nextRouteState.routeMode;
    view = nextRouteState.view;
    leaderboardTab = nextRouteState.leaderboardTab;
    progressionTab = nextRouteState.progressionTab;
    authRouteTab = nextRouteState.authRouteTab;
    authRouteNext = nextRouteState.authRouteNext;
    authRouteUsername = nextRouteState.authRouteUsername;
    selectedProfileUsername = nextRouteState.selectedProfileUsername;
    profileRouteKind = nextRouteState.profileRouteKind;
    aliasResolving = nextRouteState.aliasResolving;
    legacyProfile = nextRouteState.legacyProfile;
    challengeData = nextRouteState.challengeData;
    selectedUserId.set(nextRouteState.selectedUserId);
    profileIndexingAllowed = false;

    if (typeof window !== 'undefined' && window.location.pathname === '/shop') {
      window.history.replaceState({}, '', '/profile/settings#customize-appearance');
    }

    if (nextRouteState.aliasToResolve) void loadProfileAlias(nextRouteState.aliasToResolve);
    if (nextRouteState.challengeToLoad) {
      void loadChallengeById(
        nextRouteState.challengeToLoad.challengeId,
        nextRouteState.challengeToLoad.fallbackFrom
      );
    }
    routeInitialized = true;
    trackCurrentRoute();
  }

  function invalidateProfileAliasLoad() {
    aliasResolutionGeneration += 1;
    profileAliasLifecycle?.invalidate();
  }

  function getProfileAliasLifecycle() {
    if (!profileAliasLifecyclePromise) {
      profileAliasLifecyclePromise = import('./lib/profileAliasLifecycle.js')
        .then(({ createProfileAliasLifecycle }) => {
          profileAliasLifecycle = createProfileAliasLifecycle({ supabaseClient: supabase });
          return profileAliasLifecycle;
        })
        .catch(error => {
          profileAliasLifecyclePromise = null;
          throw error;
        });
    }
    return profileAliasLifecyclePromise;
  }

  async function loadProfileAlias(alias) {
    const generation = aliasResolutionGeneration;
    let result = { status: 'not-found' };
    try {
      const lifecycle = await getProfileAliasLifecycle();
      if (generation !== aliasResolutionGeneration) return;
      result = await lifecycle.load(alias);
    } catch {
      // The existing alias route has no separate transport-error surface.
      // Failed module or lookup loading resolves to its normal not-found state.
    }
    if (generation !== aliasResolutionGeneration || result.status === 'stale') return;

    aliasResolving = false;
    if (result.status !== 'resolved') {
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

    window.history.replaceState({}, '', `${result.canonicalPath}${window.location.search}${window.location.hash}`);
    parseRoute();
  }

  function invalidateChallengeLoad() {
    challengeLifecycleGeneration += 1;
    challengeLifecycle?.invalidate();
  }

  function getChallengeLifecycle() {
    if (!challengeLifecyclePromise) {
      challengeLifecyclePromise = import('./lib/challengeLifecycle.js')
        .then(({ createChallengeLifecycle }) => {
          challengeLifecycle = createChallengeLifecycle({
            supabaseClient: supabase,
            setChallengeData: value => { challengeData = value; }
          });
          return challengeLifecycle;
        })
        .catch(error => {
          challengeLifecyclePromise = null;
          throw error;
        });
    }
    return challengeLifecyclePromise;
  }

  async function loadChallengeById(challengeId, fallbackFrom = null) {
    const generation = challengeLifecycleGeneration;
    let lifecycle;
    try {
      lifecycle = await getChallengeLifecycle();
    } catch {
      if (generation !== challengeLifecycleGeneration) return;
      challengeData = {
        id: challengeId,
        fromUsername: fallbackFrom || null,
        loading: false,
        error: 'Challenge could not be loaded. Refresh and try again.'
      };
      return;
    }
    if (generation !== challengeLifecycleGeneration) return;
    await lifecycle.load(challengeId, fallbackFrom);
  }

  function syncRoute() {
    if (typeof window === 'undefined') return;
    const nextUrl = resolveRouteSyncPath(
      routeMode,
      view,
      aliasResolving,
      window.location.pathname,
      window.location.search,
      selectedProfileUsername,
      $selectedUserId,
      $session?.user?.id,
      $profile?.username || $authUser?.user_metadata?.username || null,
      challengeData,
      leaderboardTab,
      progressionTab,
      legacyProfile
    );
    if (!nextUrl) return;
    // Reactive synchronization normalizes the address after state/data
    // changes; it must not create another Back-stack entry.
    window.history.replaceState({}, '', nextUrl);
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

    updateHomepageHeaderTransition({ routeMode: 'app', view: nextView });
    const nextPath = viewToCanonicalPath(nextView, {
      tab: options.tab || leaderboardTab,
      progressionTab: nextView === 'progression' ? options.tab || progressionTab : progressionTab,
      username: options.username || options.profileUsername || $profile?.username || $authUser?.user_metadata?.username || null,
      userId: options.userId || null,
      legacyProfile: Boolean(options.legacyProfile)
    });
    if (nextPath) {
      routeNavigation.navigateToPath(nextPath, { view: nextView, ...options });
    }
  }

  async function focusRouteContent() {
    const requestId = ++routeFocusRequest;
    await tick();
    if (requestId !== routeFocusRequest || !mainContent) return;
    mainContent.focus({ preventScroll: true });
  }

  function clearChallengeState() {
    if (typeof window === 'undefined') return;

    invalidateChallengeLoad();
    challengeData = null;
    window.history.replaceState({}, '', getChallengeClearPath(window.location.href));
  }

  function shouldClearChallengeBeforeNavigation(pathname) {
    return routeMode === 'app' && view === 'game' && Boolean(challengeData) && !pathname.startsWith('/c/');
  }

  const routeNavigation = createRouteNavigationController(
    typeof window !== 'undefined' ? window : null,
    shouldClearChallengeBeforeNavigation,
    parseRoute,
    focusRouteContent,
    clearChallengeState
  );

  onMount(() => {
    import('./styles/site-atmosphere.css');
    void loadFounderAnnouncementState();
    parseRoute();
    routeNavigation.start();
  });

  onDestroy(() => {
    routeNavigation.stop();
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

  function handleRouteSettled(event) {
    if (!homepageHeaderTransitionPending) return;

    const settledComponentKey = event.detail?.componentKey;
    if (settledComponentKey && routeTarget?.componentKey && settledComponentKey !== routeTarget.componentKey) return;

    homepageHeaderTransitionPending = false;
  }

  function handleProfileMetadata(event) {
    profileIndexingAllowed = event.detail?.robots === 'index,follow';
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
    const requestedNext = typeof eventDetail?.next === 'string' ? eventDetail.next.slice(0, 512) : '';
    const next = requestedNext.startsWith('/') && !requestedNext.startsWith('//') && !requestedNext.includes('\\')
      ? requestedNext
      : '';
    const params = new SvelteURLSearchParams();
    if (requestedMode === 'signup' && username) params.set('username', username);
    if (next) params.set('next', next);
    const query = params.toString();
    routeNavigation.navigateToPath(`/${requestedMode === 'signup' ? 'signup' : 'login'}${query ? `?${query}` : ''}`);
  }

  $: if (challengeData && routeMode === 'app' && view !== 'game') {
    clearChallengeState();
  }

  $: routeTarget = resolveRouteTarget({
    routeMode,
    view,
    tab: leaderboardTab,
    progressionTab,
    isAuthenticated: $isAuthenticated,
    sessionState: $session,
    authInitialized: $authInitialized,
    accountState: $accountState,
    profileError: $profileError,
    selectedUsername: selectedProfileUsername,
    selectedId: $selectedUserId,
    legacyProfile,
    visualFixture: profileVisualFixture,
    guestActive: $guestProgressActive,
    challenge: challengeData,
    authTab: authRouteTab,
    authNext: authRouteNext,
    authUsername: authRouteUsername,
    aliasResolving,
    username: headerUsername,
    logoutInProgress
  }, NotFound, AccountUnavailable, RouteLoading);

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
  $: routeMetadata = resolveRouteMetadata({
    routeMode,
    view,
    profileTitle,
    selectedProfileUsername,
    authRouteTab,
    challengeData,
    legacyProfile,
    profileRouteKind,
    profileIndexingAllowed,
    pricingSuccess: typeof window !== 'undefined' && window.location.pathname.replace(/\/+$/, '') === '/pricing/success'
  });
  $: pageTitle = routeMetadata.title;
  $: pageDescription = routeMetadata.description;
  $: canonicalPath = routeMetadata.canonicalPath;
  $: pageRobots = routeMetadata.robots;
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
  <div class="app-shell" class:app-shell--site={!['auth', 'auth-callback', 'reset-password'].includes(routeMode) && view !== 'profile' && !homeModeVisible && !profileSettingsModeVisible} class:app-shell--home={homeModeVisible} class:app-shell--leaderboard={leaderboardModeVisible}>
  <a class="skip-link" href="#main-content">Skip to main content</a>

  <div id="header-mount">
    {#if profileModeOwner && !homepageHeaderTransitionPending}
      {#await import('./lib/ProfileOwnerHeader.svelte') then headerModule}
        <svelte:component this={headerModule.default} />
      {/await}
    {/if}
    {#if !profileModeVisible && !homeModeVisible && !profileSettingsModeVisible && !homepageHeaderTransitionPending}
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
    <ChallengeBanner challengeData={challengeData} on:dismiss={clearChallengeState} />
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
    on:loaded={handleRouteSettled}
    on:error={handleRouteSettled}
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
    on:metadata={handleProfileMetadata}
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

  /* Site surfaces use the bundled Inter/Manrope contract. Keep the profile
     default Spline face available to profile renderers without making the
     hidden skip link pull it onto every public route. */
  .app-shell--site,
  .app-shell--home,
  .app-shell--site .skip-link,
  .app-shell--home .skip-link {
    font-family: 'Inter', ui-sans-serif, system-ui, sans-serif;
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

  @media (max-width: 600px) {
    .account-error-banner {
      width: calc(100% - 2rem);
      margin-inline: auto;
      justify-content: flex-start;
      text-align: left;
    }
    .founder-banner {
      flex-direction: column;
      align-items: stretch;
      width: calc(100% - 1rem);
      padding: 0.9rem;
      margin: 0 auto 12px;
      gap: 0.55rem;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .skip-link { transition: none; }
  }

</style>
