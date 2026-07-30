import { isReservedRouteSegment, normalizeUsernameSegment } from '../src/lib/routeContract.js';
import { renderPublicProfilePage } from './_profilePage.js';

export function onRequestGet(context) {
  const pathname = new URL(context.request.url).pathname;
  const match = pathname.match(/^\/([^/]+)$/);
  const rawUsername = match?.[1] || '';
  const username = !isReservedRouteSegment(rawUsername)
    ? normalizeUsernameSegment(rawUsername)
    : null;

  if (!username) {
    return typeof context.next === 'function'
      ? context.next()
      : new Response('Not found.', { status: 404 });
  }

  return renderPublicProfilePage({
    request: context.request,
    env: context.env,
    username
  });
}
