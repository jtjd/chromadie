import { getCanonicalProfilePath, normalizeProfileAliasSegment } from '../../src/lib/routeContract.js';
import { loadPublicProfileAlias } from '../_profileAlias.js';
import { baseSecurityHeaders, getSiteOrigin } from '../_publicPage.js';

export async function onRequestGet({ request, env }) {
  const rawAlias = new URL(request.url).pathname.split('/').filter(Boolean).at(-1) || '';
  const alias = normalizeProfileAliasSegment(rawAlias);
  if (!alias) return new Response('Profile alias not found.', { status: 404, headers: baseSecurityHeaders });

  const profile = await loadPublicProfileAlias(alias, env);
  const canonicalPath = getCanonicalProfilePath(profile?.username);
  if (!profile || !canonicalPath) return new Response('Profile alias not found.', { status: 404, headers: baseSecurityHeaders });

  const url = new URL(request.url);
  const target = `${getSiteOrigin(request, env)}${canonicalPath}${url.search}`;
  return new Response(null, {
    status: 307,
    headers: {
      ...baseSecurityHeaders,
      location: target,
      'cache-control': 'no-store'
    }
  });
}
