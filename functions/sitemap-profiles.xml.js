import { baseSecurityHeaders, getSiteOrigin } from './_publicPage.js';
import { getCanonicalProfilePath, normalizeUsernameSegment } from '../src/lib/routeContract.js';
import { getSupabaseCredentials, getSupabasePublicHeaders } from './_supabaseApi.js';

const PAGE_SIZE = 1000;

export async function onRequestGet({ request, env }) {
  const supabase = getSupabaseCredentials(env);
  const supabaseUrl = supabase.url;

  if (!supabaseUrl || !supabase.publishableKey) {
    return new Response('Profile sitemap is not configured.', { status: 503, headers: baseSecurityHeaders });
  }

  const urls = [];
  let lastUsername = null;
  const siteOrigin = getSiteOrigin(request, env);

  try {
    while (true) {
      const query = new URL('/rest/v1/rpc/get_public_profile_sitemap_page', supabaseUrl);

      const response = await fetch(query, {
        method: 'POST',
        headers: {
          ...getSupabasePublicHeaders(env),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ p_after: lastUsername, p_limit: PAGE_SIZE })
      });

      if (!response.ok) {
        return new Response('Unable to load public profiles.', { status: 502, headers: baseSecurityHeaders });
      }

      const profiles = await response.json();
      for (const profile of profiles) {
        const username = normalizeUsernameSegment(profile.username);
        const path = username ? getCanonicalProfilePath(username) : null;
        if (path) {
          urls.push(`<url><loc>${siteOrigin}${path}</loc></url>`);
        }
      }

      if (profiles.length < PAGE_SIZE) break;
      lastUsername = profiles.at(-1)?.username || null;
      if (!lastUsername) break;
    }
  } catch {
    return new Response('Unable to load public profiles.', { status: 502, headers: baseSecurityHeaders });
  }

  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join('')}</urlset>`;
  return new Response(body, {
    headers: {
      ...baseSecurityHeaders,
      'Content-Type': 'application/xml; charset=UTF-8',
      'Cache-Control': 'public, max-age=900, s-maxage=3600'
    }
  });
}
