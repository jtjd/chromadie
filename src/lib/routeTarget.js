import { ACCOUNT_STATES } from './authState.js';

/**
 * Resolve route and account state into the presentation target for RouteOutlet.
 * Static components are injected so this module stays independently testable
 * without importing Svelte component files.
 */
export function resolveRouteTarget({
  routeMode,
  view,
  tab,
  progressionTab,
  isAuthenticated,
  sessionState,
  authInitialized,
  accountState,
  profileError,
  selectedUsername,
  selectedId,
  legacyProfile,
  visualFixture,
  guestActive,
  challenge,
  authTab,
  authNext,
  authUsername,
  aliasResolving,
  username,
  logoutInProgress
}, notFound, accountUnavailable, routeLoading) {
  if (routeMode === 'not-found') {
    return { componentKey: 'not-found', staticComponent: notFound, componentProps: {}, loadingLabel: 'Opening page' };
  }

  if (routeMode === 'auth') {
    return {
      loaderKey: 'authPage',
      componentKey: `auth-page:${authTab}:${authNext}:${authUsername}`,
      componentProps: { initialTab: authTab, next: authNext, initialUsername: authUsername },
      loadingLabel: authTab === 'signup' ? 'Opening sign up' : 'Opening sign in'
    };
  }

  if (routeMode === 'privacy' || routeMode === 'terms' || routeMode === 'how-to-play') {
    return {
      loaderKey: routeMode === 'how-to-play' ? 'howToPlay' : routeMode,
      componentKey: routeMode,
      componentProps: {},
      loadingLabel: 'Opening information'
    };
  }

  if (aliasResolving) {
    return {
      componentKey: 'profile-alias-loading',
      staticComponent: routeLoading,
      componentProps: { label: 'Opening profile alias' },
      loadingLabel: 'Opening profile alias'
    };
  }

  if (view === 'home') {
    return {
      loaderKey: 'home',
      componentKey: 'home',
      componentProps: {
        isAuthenticated,
        accountState,
        username,
        logoutInProgress
      },
      loadingLabel: 'Opening ChromaDie'
    };
  }

  if (view === 'pricing') {
    return {
      loaderKey: 'pricing',
      componentKey: 'pricing',
      componentProps: {},
      loadingLabel: 'Opening pricing'
    };
  }

  if (view === 'game') {
    if (!challenge) {
      return { componentKey: 'not-found', staticComponent: notFound, componentProps: {}, loadingLabel: 'Opening page' };
    }

    return {
      loaderKey: 'game',
      componentKey: `game:${challenge.id}`,
      componentProps: {},
      loadingLabel: 'Opening challenge'
    };
  }

  if (view === 'prototype') {
    return {
      loaderKey: 'prototype',
      componentKey: 'prototype',
      componentProps: {},
      loadingLabel: 'Opening prototype'
    };
  }

  if (view === 'leaderboard') {
    return {
      loaderKey: 'leaderboard',
      componentKey: `leaderboard:${tab}`,
      componentProps: { initialTab: tab },
      loadingLabel: 'Opening discovery'
    };
  }

  if (view === 'progression') {
    return {
      loaderKey: 'progression',
      componentKey: `progression:${progressionTab}`,
      componentProps: { initialTab: progressionTab },
      loadingLabel: 'Opening progress'
    };
  }

  if (view === 'profile-settings') {
    if (isAuthenticated) {
      return {
        loaderKey: 'profileSettings',
        componentKey: 'profile-settings',
        componentProps: { logoutInProgress },
        loadingLabel: 'Opening profile settings'
      };
    }

    if (accountState === ACCOUNT_STATES.PROFILE_ERROR) {
      return {
        componentKey: 'profile-settings-error',
        staticComponent: accountUnavailable,
        componentProps: {},
        loadingLabel: 'Loading account'
      };
    }

    return {
      componentKey: 'profile-settings-loading',
      staticComponent: routeLoading,
      componentProps: { label: 'Loading your account' },
      loadingLabel: 'Loading your account'
    };
  }

  if (authInitialized && sessionState && profileError && view === 'profile') {
    return {
      componentKey: `account-error:${view}`,
      staticComponent: accountUnavailable,
      componentProps: {},
      loadingLabel: 'Loading account'
    };
  }

  if (view === 'profile' && (isAuthenticated || sessionState || selectedUsername || selectedId)) {
    const loaderKey = legacyProfile ? 'profileLegacy' : 'profileShell';
    const profileKey = selectedUsername || selectedId || 'self';
    return {
      loaderKey,
      componentKey: `profile:${legacyProfile ? 'legacy' : 'shell'}:${profileKey}:${visualFixture}`,
      componentProps: legacyProfile
        ? { profileUsername: selectedUsername, userId: selectedId }
        : { profileUsername: selectedUsername, userId: selectedId, visualFixture },
      loadingLabel: 'Opening profile'
    };
  }

  if (view === 'profile' && accountState === ACCOUNT_STATES.SIGNED_OUT) {
    return {
      loaderKey: 'guestProfile',
      componentKey: `guest-profile:${guestActive}`,
      componentProps: { guestActive },
      loadingLabel: 'Opening a profile preview'
    };
  }

  return {
    componentKey: `route-loading:${view}`,
    staticComponent: routeLoading,
    componentProps: { label: authInitialized ? 'Loading page' : 'Loading your account' },
    loadingLabel: 'Loading page'
  };
}
