import {
  decodeRouteSegment,
  getCanonicalProfilePath,
  getCompatibilityProfilePath,
  isReservedRouteSegment,
  normalizeProfileAliasSegment,
  normalizeUsernameSegment
} from './routeContract.js';

export const VALID_VIEWS = Object.freeze(['home', 'leaderboard', 'profile', 'profile-settings', 'progression', 'prototype', 'pricing'])
export const VALID_LEADERBOARD_TABS = Object.freeze(['today', 'monthly', 'rivals'])
export const VALID_PROGRESSION_TABS = Object.freeze(['journey', 'achievements', 'collection', 'history'])

const VALID_VIEW_SET = new Set(VALID_VIEWS)
const VALID_LEADERBOARD_TAB_SET = new Set(VALID_LEADERBOARD_TABS)
const VALID_PROGRESSION_TAB_SET = new Set(VALID_PROGRESSION_TABS)
const CLEAN_APP_PATHS = new Set(['/', '/shop', '/leaderboard', '/profile', '/profile/settings', '/progression', '/pricing', '/pricing/success'])

export function isPrototypeRouteEnabled() {
  return import.meta.env?.DEV === true;
}

export function viewToCanonicalPath(view, {
  tab = 'today',
  progressionTab = 'journey',
  username = null,
  userId = null,
  legacyProfile = false,
  prototypeEnabled = isPrototypeRouteEnabled()
} = {}) {
  switch (view) {
    case 'home':
      return '/';
    case 'leaderboard': {
      const params = new URLSearchParams();
      if (VALID_LEADERBOARD_TAB_SET.has(tab) && tab !== 'today') params.set('tab', tab);
      const search = params.toString();
      return `/leaderboard${search ? `?${search}` : ''}`;
    }
    case 'profile-settings':
      return '/profile/settings';
    case 'progression': {
      const params = new URLSearchParams();
      if (VALID_PROGRESSION_TAB_SET.has(progressionTab) && progressionTab !== 'journey') {
        params.set('tab', progressionTab);
      }
      const search = params.toString();
      return `/progression${search ? `?${search}` : ''}`;
    }
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

/**
 * @param {string} href
 * @returns {string}
 */
export function getChallengeClearPath(href) {
  const nextUrl = new URL(href);
  nextUrl.searchParams.delete('challenge');
  nextUrl.searchParams.delete('hex');
  nextUrl.searchParams.delete('from');
  if (nextUrl.searchParams.get('view') === 'game') nextUrl.searchParams.delete('view');

  if (nextUrl.pathname.startsWith('/c/')) return '/';
  return `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`;
}

/**
 * Resolve the URL used by App's reactive route synchronization.
 *
 * Browser access and history writes stay in App.svelte so this decision can
 * be tested without a window. A null result means synchronization should not
 * write a URL for the current state.
 * @param {string} routeMode
 * @param {string} view
 * @param {boolean} aliasResolving
 * @param {string} pathname
 * @param {string} search
 * @param {string | null | undefined} selectedProfileUsername
 * @param {string | null | undefined} selectedUserId
 * @param {string | null | undefined} sessionUserId
 * @param {string | null | undefined} accountUsername
 * @param {object | null | undefined} challengeData
 * @param {string | undefined} tab
 * @param {string | undefined} progressionTab
 * @param {boolean | undefined} legacyProfile
 * @returns {string | null}
 */
export function resolveRouteSyncPath(
  routeMode,
  view,
  aliasResolving,
  pathname,
  search,
  selectedProfileUsername,
  selectedUserId,
  sessionUserId,
  accountUsername,
  challengeData,
  tab,
  progressionTab,
  legacyProfile
) {
  const normalizedPathname = pathname.replace(/\/+$/, '');
  if (
    aliasResolving
    || routeMode !== 'app'
    || view === 'prototype' && pathname === '/prototype/profile'
    || view === 'game' && challengeData
  ) return null;

  const routeUsername = selectedProfileUsername || (selectedUserId === sessionUserId || !selectedUserId ? accountUsername : null);
  if (view === 'profile' && !routeUsername && !selectedUserId) return null;

  // Pricing owns these return URLs and their search params. Leave them intact
  // so checkout restoration and cancellation feedback see their input.
  if (
    view === 'pricing'
    && (
      normalizedPathname === '/pricing/success'
      || normalizedPathname === '/pricing' && new URLSearchParams(search).get('checkout') === 'cancelled'
    )
  ) return null;

  const nextUrl = viewToCanonicalPath(view, {
    tab,
    progressionTab,
    username: routeUsername,
    userId: selectedUserId,
    legacyProfile
  });

  if (!nextUrl || nextUrl === `${pathname}${search}`) return null;
  return nextUrl;
}

function getCleanPathView(pathname, prototypeEnabled) {
  if (pathname === '/') return 'home'
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
    progressionTab: VALID_PROGRESSION_TAB_SET.has(routeTab) ? routeTab : 'journey',
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
