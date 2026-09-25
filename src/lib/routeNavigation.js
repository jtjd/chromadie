import { parseRouteLocation } from './routes.js';

const SPA_ROUTE_MODES = ['app', 'auth', 'privacy', 'terms', 'how-to-play'];

/**
 * @param {(Window & typeof globalThis) | null} windowRef
 * @param {(pathname: string) => boolean} shouldClearChallenge
 * @param {() => void} parseRoute
 * @param {() => void | Promise<unknown>} focusRouteContent
 * @param {() => void} clearChallengeState
 */
export function createRouteNavigationController(windowRef, shouldClearChallenge, parseRoute, focusRouteContent, clearChallengeState) {
  let listening = false;

  function navigateToPath(pathname, navigation = null) {
    if (!windowRef) return;
    const nextUrl = new URL(pathname || '/', windowRef.location.origin);
    const nextPath = nextUrl.pathname + nextUrl.search + nextUrl.hash;
    const navigationGuard = new windowRef.CustomEvent('chromadie:navigation-request', {
      detail: {
        nextPath,
        ...(navigation ? { navigation } : {})
      },
      cancelable: true
    });
    if (!windowRef.dispatchEvent(navigationGuard)) return;
    if (shouldClearChallenge(nextUrl.pathname)) clearChallengeState();
    windowRef.history.pushState({}, '', nextPath);
    parseRoute();
    focusRouteContent();
  }

  function handleInternalLinkClick(event) {
    if (!windowRef || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    const target = event.target;
    if (!(target instanceof windowRef.Element)) return;

    const link = target.closest('a[href]');
    if (!(link instanceof windowRef.HTMLAnchorElement) || link.target && link.target !== '_self' || link.hasAttribute('download')) return;

    const nextUrl = new URL(link.href, windowRef.location.href);
    if (nextUrl.origin !== windowRef.location.origin || !['http:', 'https:'].includes(nextUrl.protocol)) return;

    const nextPath = nextUrl.pathname + nextUrl.search + nextUrl.hash;

    // Keep same-page fragments native so page-level controllers receive
    // hashchange and can apply their own dirty-state guard.
    if (nextUrl.pathname === windowRef.location.pathname
      && nextUrl.search === windowRef.location.search) return;

    const nextRoute = parseRouteLocation(nextUrl.pathname, nextUrl.search);
    if (!SPA_ROUTE_MODES.includes(nextRoute.routeMode)) return;

    event.preventDefault();
    navigateToPath(nextPath);
  }

  function handlePopState() {
    parseRoute();
    focusRouteContent();
  }

  function start() {
    if (!windowRef || listening) return;
    listening = true;
    windowRef.addEventListener('popstate', handlePopState);
    windowRef.addEventListener('click', handleInternalLinkClick);
  }

  function stop() {
    if (!windowRef || !listening) return;
    listening = false;
    windowRef.removeEventListener('popstate', handlePopState);
    windowRef.removeEventListener('click', handleInternalLinkClick);
  }

  return { navigateToPath, start, stop };
}
