import { baseSecurityHeaders } from './_publicPage.js';

const PAGE_SIZE = 1000;

export async function onRequestGet({ env }) {
  const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
  const supabaseKey = env.VITE_SUPABASE_KEY || env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return new Response('Profile sitemap is not configured.', { status: 503, headers: baseSecurityHeaders });
  }

  const urls = [];
  let lastUsername = null;
  let siteOrigin = 'https://chromadie.com';
  try {
    const configured = new URL(env.VITE_SITE_URL || siteOrigin);
    if (configured.protocol === 'https:') siteOrigin = configured.origin;
  } catch {
    // Keep the production domain fallback for malformed optional configuration.
  }

  try {
    while (true) {
      const query = new URL('/rest/v1/profiles', supabaseUrl);
      query.searchParams.set('select', 'username');
      query.searchParams.set('lifetime_ep', 'gt.0');
      query.searchParams.set('order', 'username.asc');
      query.searchParams.set('limit', String(PAGE_SIZE));
      if (lastUsername) query.searchParams.set('username', `gt.${lastUsername}`);

      const response = await fetch(query, {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`
        }
      });

      if (!response.ok) {
        return new Response('Unable to load public profiles.', { status: 502, headers: baseSecurityHeaders });
      }

      const profiles = await response.json();
      for (const profile of profiles) {
        if (typeof profile.username === 'string' && /^[A-Za-z0-9_]{3,20}$/.test(profile.username)) {
          urls.push(`<url><loc>${siteOrigin}/u/${encodeURIComponent(profile.username)}</loc></url>`);
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
