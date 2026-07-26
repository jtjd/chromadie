export const VALID_VIEWS = Object.freeze(['game', 'shop', 'leaderboard', 'profile', 'prototype'])
export const VALID_LEADERBOARD_TABS = Object.freeze(['today', 'rivals', 'weekly', 'monthly', 'roll', 'recent', 'rising', 'new', 'random'])

const VALID_VIEW_SET = new Set(VALID_VIEWS)
const VALID_LEADERBOARD_TAB_SET = new Set(VALID_LEADERBOARD_TABS)
const CLEAN_APP_PATHS = new Set(['/', '/shop', '/leaderboard', '/profile', '/prototype/profile'])

function decodePathSegment(value) {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function getCleanPathView(pathname) {
  if (pathname === '/shop') return 'shop'
  if (pathname === '/leaderboard') return 'leaderboard'
  if (pathname === '/profile') return 'profile'
  if (pathname === '/prototype/profile') return 'prototype'
  return null
}

/**
 * Parse the browser location without causing navigation or data loading.
 * Side effects for challenge loading remain in App.svelte.
 */
export function parseRouteLocation(pathname = '/', search = '') {
  const params = new URLSearchParams(search)
  const rawPath = String(pathname || '/').replace(/\/+$/, '') || '/'
  const routeView = params.get('view')
  const routeTab = params.get('tab')
  const routeProfileId = params.get('profile')
  const routeChallengeFrom = params.get('from')
  const challengeMatch = rawPath.match(/^\/c\/([^/]+)$/)
  const profileMatch = rawPath.match(/^\/u\/([^/]+)$/)

  let routeMode = 'not-found'
  if (rawPath === '/auth/callback') {
    routeMode = 'auth-callback'
  } else if (rawPath === '/reset-password') {
    routeMode = 'reset-password'
  } else if (rawPath === '/privacy') {
    routeMode = 'privacy'
  } else if (rawPath === '/how-to-play') {
    routeMode = 'how-to-play'
  } else if (CLEAN_APP_PATHS.has(rawPath)) {
    routeMode = 'app'
  }

  if (profileMatch || challengeMatch) routeMode = 'app'

  return {
    rawPath,
    routeMode,
    view: profileMatch
      ? 'profile'
      : challengeMatch
        ? 'game'
        : getCleanPathView(rawPath) || (VALID_VIEW_SET.has(routeView) ? routeView : 'game'),
    leaderboardTab: VALID_LEADERBOARD_TAB_SET.has(routeTab) ? routeTab : 'today',
    profileUsername: profileMatch ? decodePathSegment(profileMatch[1]) : null,
    legacyProfile: params.get('legacy') === '1',
    profileId: (profileMatch || challengeMatch || routeMode !== 'app') ? null : routeProfileId || null,
    challengeId: challengeMatch ? decodePathSegment(challengeMatch[1]) : null,
    challengeFrom: challengeMatch ? routeChallengeFrom || null : null
  }
}
