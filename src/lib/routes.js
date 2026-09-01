import {
  decodeRouteSegment,
  getCanonicalProfilePath,
  getCompatibilityProfilePath,
  isReservedRouteSegment,
  normalizeProfileAliasSegment,
  normalizeUsernameSegment
} from './routeContract.js';

export const VALID_VIEWS = Object.freeze(['home', 'game', 'leaderboard', 'profile', 'profile-settings', 'progression', 'prototype', 'pricing'])
export const VALID_LEADERBOARD_TABS = Object.freeze(['today', 'monthly'])

const VALID_VIEW_SET = new Set(VALID_VIEWS)
const VALID_LEADERBOARD_TAB_SET = new Set(VALID_LEADERBOARD_TABS)
const CLEAN_APP_PATHS = new Set(['/', '/roll', '/shop', '/leaderboard', '/profile', '/profile/settings', '/progression', '/pricing', '/pricing/success'])

export function isPrototypeRouteEnabled() {
  return import.meta.env?.DEV === true;
}

export function viewToCanonicalPath(view, {
  tab = 'today',
  username = null,
  userId = null,
  legacyProfile = false,
  prototypeEnabled = isPrototypeRouteEnabled()
} = {}) {
  switch (view) {
    case 'home':
      return '/';
    case 'game':
      return '/roll';
    case 'leaderboard': {
      const params = new URLSearchParams();
      if (VALID_LEADERBOARD_TAB_SET.has(tab) && tab !== 'today') params.set('tab', tab);
      const search = params.toString();
      return `/leaderboard${search ? `?${search}` : ''}`;
    }
    case 'profile-settings':
      return '/profile/settings';
    case 'progression':
      return '/progression';
    case 'prototype':
      return prototypeEnabled ? '/prototype/profile' : null;
    case 'pricing':
      return '/pricing';
    case 'profile': {
      const profilePath = legacyProfile
        ? getCompatibilityProfilePath(username)
        : getCanonicalProfilePath(username);
      if (profilePath) return legacyProfile ? `${profilePath}?legacy=1` : profilePath;

      const params = new URLSearchParams({ view: 'profile' });
      if (userId !== null && userId !== undefined && String(userId)) {
        params.set('profile', String(userId).slice(0, 128));
      }
      return `/?${params.toString()}`;
    }
    default:
      return null;
  }
}

function getCleanPathView(pathname, prototypeEnabled) {
  if (pathname === '/') return 'home'
  if (pathname === '/roll') return 'game'
  // The former Shop URL is a one-way route alias into the profile studio.
  // There is no Shop view or presentation behind it anymore.
  if (pathname === '/shop') return 'profile-settings'
  if (pathname === '/leaderboard') return 'leaderboard'
  if (pathname === '/profile') return 'profile'
  if (pathname === '/profile/settings') return 'profile-settings'
  if (pathname === '/progression') return 'progression'
  if (prototypeEnabled && pathname === '/prototype/profile') return 'prototype'
  if (pathname === '/pricing' || pathname === '/pricing/success') return 'pricing'
  return null
}

/**
 * Parse the browser location without causing navigation or data loading.
 * Side effects for challenge loading remain in App.svelte.
 */
export function parseRouteLocation(pathname = '/', search = '', {
  prototypeEnabled = isPrototypeRouteEnabled()
} = {}) {
  const params = new URLSearchParams(search)
  const rawPath = String(pathname || '/').replace(/\/+$/, '') || '/'
  const authTab = rawPath === '/signup' ? 'signup' : rawPath === '/login' ? 'login' : null
  const routeView = params.get('view')
  const routeTab = params.get('tab')
  const routeProfileId = params.get('profile')
  const routeChallengeFrom = params.get('from')
  const challengeMatch = rawPath.match(/^\/c\/([^/]+)$/)
  const aliasMatch = rawPath.match(/^\/a\/([^/]+)$/)
  const compatibilityProfileMatch = rawPath.match(/^\/u\/([^/]+)$/)
  const rootProfileMatch = rawPath.match(/^\/([^/]+)$/)
  const compatibilityUsername = compatibilityProfileMatch
    ? normalizeUsernameSegment(compatibilityProfileMatch[1])
    : null
  const profileAlias = aliasMatch
    ? normalizeProfileAliasSegment(aliasMatch[1])
    : null
  const rootUsername = rootProfileMatch && !isReservedRouteSegment(rootProfileMatch[1])
    ? normalizeUsernameSegment(rootProfileMatch[1])
    : null
  const profileUsername = compatibilityUsername || rootUsername
  const profileRouteKind = profileAlias ? 'alias' : compatibilityUsername ? 'compatibility' : rootUsername ? 'root' : null

  let routeMode = 'not-found'
  if (rawPath === '/auth/callback') {
    routeMode = 'auth-callback'
  } else if (authTab) {
    routeMode = 'auth'
  } else if (rawPath === '/reset-password') {
    routeMode = 'reset-password'
  } else if (rawPath === '/privacy') {
    routeMode = 'privacy'
  } else if (rawPath === '/terms') {
    routeMode = 'terms'
  } else if (rawPath === '/how-to-play') {
    routeMode = 'how-to-play'
  } else if (CLEAN_APP_PATHS.has(rawPath) || (prototypeEnabled && rawPath === '/prototype/profile')) {
    routeMode = 'app'
  }

  if (profileRouteKind || challengeMatch) routeMode = 'app'

  return {
    rawPath,
    routeMode,
    view: authTab
      ? 'auth'
      : profileRouteKind
      ? 'profile'
      : challengeMatch
        ? 'game'
        : rawPath === '/' && VALID_VIEW_SET.has(routeView)
          ? routeView
        : getCleanPathView(rawPath, prototypeEnabled) || 'home',
    leaderboardTab: VALID_LEADERBOARD_TAB_SET.has(routeTab) ? routeTab : 'today',
    profileUsername,
    profileRouteKind,
    legacyProfile: params.get('legacy') === '1',
    profileId: (profileRouteKind || challengeMatch || routeMode !== 'app') ? null : routeProfileId || null,
    challengeId: challengeMatch ? decodeRouteSegment(challengeMatch[1]) : null,
    challengeFrom: challengeMatch ? routeChallengeFrom || null : null,
    canonicalProfilePath: profileUsername ? getCanonicalProfilePath(profileUsername) : null,
    ...(profileAlias ? { profileAlias } : {}),
    ...(authTab ? {
      authTab,
      authNext: params.get('next')?.slice(0, 512) || '',
      authUsername: normalizeUsernameSegment(params.get('username')) || ''
    } : {})
  }
}
