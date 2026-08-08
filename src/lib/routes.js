import {
  decodeRouteSegment,
  getCanonicalProfilePath,
  isReservedRouteSegment,
  normalizeProfileAliasSegment,
  normalizeUsernameSegment
} from './routeContract.js';

export const VALID_VIEWS = Object.freeze(['home', 'game', 'shop', 'leaderboard', 'profile', 'profile-settings', 'prototype', 'pricing'])
export const VALID_LEADERBOARD_TABS = Object.freeze(['today', 'rivals', 'weekly', 'monthly', 'roll', 'recent', 'rising', 'new', 'random'])

const VALID_VIEW_SET = new Set(VALID_VIEWS)
const VALID_LEADERBOARD_TAB_SET = new Set(VALID_LEADERBOARD_TABS)
const CLEAN_APP_PATHS = new Set(['/', '/shop', '/leaderboard', '/profile', '/profile/settings', '/prototype/profile', '/pricing', '/pricing/success'])

function getCleanPathView(pathname) {
  if (pathname === '/') return 'home'
  if (pathname === '/shop') return 'shop'
  if (pathname === '/leaderboard') return 'leaderboard'
  if (pathname === '/profile') return 'profile'
  if (pathname === '/profile/settings') return 'profile-settings'
  if (pathname === '/prototype/profile') return 'prototype'
  if (pathname === '/pricing' || pathname === '/pricing/success') return 'pricing'
  return null
}

/**
 * Parse the browser location without causing navigation or data loading.
 * Side effects for challenge loading remain in App.svelte.
 */
export function parseRouteLocation(pathname = '/', search = '') {
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
  } else if (CLEAN_APP_PATHS.has(rawPath)) {
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
          : getCleanPathView(rawPath) || 'home',
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
