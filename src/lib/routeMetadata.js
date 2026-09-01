import { getCanonicalProfilePath } from './routeContract.js';

export function resolveRouteMetadata({
  routeMode = 'app',
  view = 'home',
  profileTitle = 'Profile',
  selectedProfileUsername = '',
  authRouteTab = 'login',
  challengeData = null,
  legacyProfile = false,
  profileRouteKind = null,
  profileIndexingAllowed = false,
  pricingSuccess = false
} = {}) {
  const title = routeMode === 'privacy'
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
              : routeMode === 'app' && view === 'progression'
                ? 'Progress | ChromaDie'
                : routeMode === 'app' && view === 'home'
                  ? 'ChromaDie — Daily Random Color Game'
                  : routeMode === 'app' && view === 'prototype'
                    ? 'Profile Canvas Prototype | ChromaDie'
                    : routeMode === 'app' && view === 'leaderboard'
                      ? 'Discovery | ChromaDie'
                      : routeMode === 'app' && view === 'pricing'
                        ? 'Chromadie Plus — $7.99 lifetime | ChromaDie'
                        : routeMode === 'app' && view === 'game' && challengeData
                          ? challengeData.error ? 'Challenge Unavailable | ChromaDie' : 'Challenge | ChromaDie'
                          : routeMode === 'app' && view === 'game'
                            ? 'Roll | ChromaDie'
                            : routeMode === 'not-found'
                              ? 'Page Not Found | ChromaDie'
                              : 'ChromaDie';

  const description = routeMode === 'not-found'
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
                ? 'Shape your ChromaDie identity, collection, cosmetics, public canvas, and privacy from one profile studio.'
                : routeMode === 'app' && view === 'progression'
                  ? 'Follow the rolls, streaks, discoveries, and cosmetic rewards that make your ChromaDie profile yours.'
                  : routeMode === 'app' && view === 'home'
                    ? 'Roll one of 16,777,216 colors once a day. Discover exact RGB and HEX patterns, see how rare your color is, and compare your score.'
                    : routeMode === 'app' && view === 'prototype'
                      ? 'A noindex Phase 1 profile canvas prototype for ChromaDie.'
                      : routeMode === 'app' && view === 'leaderboard'
                        ? 'Explore ChromaDie players, public color stories, exceptional rolls, and leaderboard results.'
                        : routeMode === 'app' && view === 'pricing'
                          ? 'Compare the complete free profile with Chromadie Plus lifetime hosted media.'
                          : 'Roll a new color every day, discover its rarity and traits, earn EP, and compete for the highest score.';

  const canonicalPath = routeMode === 'not-found'
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
                : routeMode === 'app' && view === 'progression'
                  ? '/progression'
                  : routeMode === 'app' && view === 'pricing'
                    ? '/pricing'
                    : routeMode === 'app' && view === 'profile' && selectedProfileUsername
                      ? (getCanonicalProfilePath(selectedProfileUsername) || '/')
                      : routeMode === 'app' && view === 'prototype'
                        ? '/prototype/profile'
                        : routeMode === 'app' && view === 'game' && !challengeData
                          ? '/'
                          : '/';

  const noindexAppRoute = legacyProfile
    || profileRouteKind === 'compatibility'
    || view === 'game'
    || view === 'profile-settings'
    || view === 'progression'
    || (view === 'pricing' && pricingSuccess)
    || (view === 'profile' && (!selectedProfileUsername || !profileIndexingAllowed))
    || view === 'prototype';
  const robots = routeMode === 'not-found'
    ? 'noindex,follow'
    : routeMode === 'app' && noindexAppRoute
      ? 'noindex,follow'
      : routeMode === 'auth' || routeMode === 'auth-callback' || routeMode === 'reset-password'
        ? 'noindex,nofollow'
        : 'index,follow';

  return { title, description, canonicalPath, robots };
}
