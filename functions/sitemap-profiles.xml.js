const PAGE_SIZE = 1000;

export async function onRequestGet({ env }) {
  const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
  const supabaseKey = env.VITE_SUPABASE_KEY || env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return new Response('Profile sitemap is not configured.', { status: 503 });
  }

  const urls = [];
  let offset = 0;

  while (true) {
    const query = new URL('/rest/v1/profiles', supabaseUrl);
    query.searchParams.set('select', 'username');
    query.searchParams.set('username', 'not.is.null');
    query.searchParams.set('lifetime_ep', 'gt.0');
    query.searchParams.set('order', 'username.asc');
    query.searchParams.set('offset', String(offset));
    query.searchParams.set('limit', String(PAGE_SIZE));

    const response = await fetch(query, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`
      }
    });

    if (!response.ok) {
      return new Response('Unable to load public profiles.', { status: 502 });
    }

    const profiles = await response.json();
    for (const profile of profiles) {
      if (typeof profile.username === 'string' && profile.username.trim()) {
        urls.push(`<url><loc>https://chromadie.com/u/${encodeURIComponent(profile.username)}</loc></url>`);
      }
    }

    if (profiles.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join('')}</urlset>`;
  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml; charset=UTF-8',
      'Cache-Control': 'public, max-age=900, s-maxage=3600'
    }
  });
}
