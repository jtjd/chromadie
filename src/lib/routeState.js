/**
 * Project the side-effect-free route parser result into App's route state.
 * Browser history changes, request invalidation, and data reads stay outside
 * this pure projection.
 */
export function resolveRouteState(parsed) {
  const state = {
    routeMode: parsed.routeMode,
    view: parsed.view,
    leaderboardTab: parsed.leaderboardTab,
    progressionTab: parsed.progressionTab,
    authRouteTab: 'login',
    authRouteNext: '',
    authRouteUsername: '',
    selectedProfileUsername: null,
    profileRouteKind: null,
    selectedUserId: null,
    aliasResolving: false,
    aliasToResolve: null,
    legacyProfile: false,
    challengeData: null,
    challengeToLoad: null
  };

  if (parsed.routeMode === 'auth') {
    return {
      ...state,
      view: 'auth',
      authRouteTab: parsed.authTab || 'login',
      authRouteNext: parsed.authNext || '',
      authRouteUsername: parsed.authUsername || ''
    };
  }

  if (parsed.profileAlias) {
    return {
      ...state,
      view: 'profile',
      profileRouteKind: 'alias',
      aliasResolving: true,
      aliasToResolve: parsed.profileAlias
    };
  }

  if (parsed.profileUsername !== null) {
    return {
      ...state,
      view: 'profile',
      selectedProfileUsername: parsed.profileUsername,
      profileRouteKind: parsed.profileRouteKind,
      legacyProfile: parsed.legacyProfile
    };
  }

  if (parsed.challengeId !== null) {
    // The route parser supplies a challenge ID only from an explicit /c/<id>
    // path. Legacy query-string score/color fields never trigger a fetch.
    const challengeData = {
      id: parsed.challengeId,
      fromUsername: parsed.challengeFrom,
      loading: true,
      error: null
    };
    return {
      ...state,
      view: 'game',
      challengeData,
      challengeToLoad: {
        challengeId: parsed.challengeId,
        fallbackFrom: parsed.challengeFrom
      }
    };
  }

  return {
    ...state,
    selectedUserId: parsed.routeMode === 'app' ? parsed.profileId : null,
    legacyProfile: parsed.view === 'profile' && parsed.legacyProfile
  };
}
