import { normalizeUsernameSegment } from '../../src/lib/routeContract.js';
import { renderPublicProfilePage } from '../_profilePage.js';
import { baseSecurityHeaders, getSiteOrigin } from '../_publicPage.js';

export { getProfileCacheControl } from '../_profilePage.js';

export function onRequestGet({ request, env }) {
  const rawUsername = new URL(request.url).pathname.split('/').filter(Boolean).at(-1) || '';
  const username = normalizeUsernameSegment(rawUsername);
  if (!username) return new Response('Profile not found.', { status: 404, headers: baseSecurityHeaders });

  const url = new URL(request.url);
  if (url.searchParams.get('legacy') === '1') {
    return renderPublicProfilePage({ request, env, username, legacyProfile: true });
  }

  const target = `${getSiteOrigin(request, env)}/${encodeURIComponent(username.toLowerCase())}`;
  return new Response(null, {
    status: 307,
    headers: {
      ...baseSecurityHeaders,
      location: target,
      'cache-control': 'no-store'
    }
  });
}
