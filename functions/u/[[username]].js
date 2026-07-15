function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

async function loadProfile(username, env) {
  const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
  const supabaseKey = env.VITE_SUPABASE_KEY || env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return null;

  const query = new URL('/rest/v1/profiles', supabaseUrl);
  query.searchParams.set('select', 'username,lifetime_ep,best_roll_score');
  if (!/^[A-Za-z0-9_]{3,20}$/.test(username)) return null;
  // Validation excludes PostgREST wildcard/filter syntax and mirrors the
  // database username contract.
  query.searchParams.set('username', `ilike.${username}`);
  query.searchParams.set('limit', '1');

  try {
    const response = await fetch(query, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`
      }
    });

    if (!response.ok) return null;
    const profiles = await response.json();
    return profiles[0] || null;
  } catch {
    return null;
  }
}

export async function onRequestGet({ request, params, env }) {
  const username = params.username;
  const profile = await loadProfile(username, env);
  const { fetchAppShell, createHtmlHeaders, baseSecurityHeaders, getSiteOrigin } = await import('../_publicPage.js');
  const origin = getSiteOrigin(request, env);
  const profilePath = `/u/${encodeURIComponent(username)}`;
  const canonical = `${origin}${profilePath}`;
  const title = profile ? `${profile.username} | ChromaDie` : 'Profile Not Found | ChromaDie';
  const description = profile
    ? `View ${profile.username}'s public ChromaDie profile, progress, achievements, and recent rolls.`
    : 'This ChromaDie profile could not be found.';
  const robots = profile ? 'index,follow' : 'noindex,follow';
  const ogImage = profile ? `${origin}/og/profile.svg?username=${encodeURIComponent(profile.username)}` : `${origin}/og-default-v4.png`;
  const summary = profile
    ? `<section><h1>${escapeHtml(profile.username)} | ChromaDie</h1><p>Public player profile with ${Number(profile.lifetime_ep || 0).toLocaleString()} lifetime EP${profile.best_roll_score ? ` and a best roll of ${Number(profile.best_roll_score).toLocaleString()} EP` : ''}.</p></section>`
    : '<section><h1>Profile not found</h1><p>This player profile is unavailable.</p></section>';
  const profileSchema = profile ? {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    name: `${profile.username} | ChromaDie`,
    url: canonical,
    isPartOf: { '@type': 'WebSite', name: 'ChromaDie', url: `${origin}/` },
    mainEntity: {
      '@type': 'Person',
      name: profile.username,
      url: canonical
    }
  } : null;

  const shellResponse = await fetchAppShell(request, env);
  if (!shellResponse.ok) return new Response('Unable to load app shell.', { status: 502, headers: baseSecurityHeaders });
  let html = await shellResponse.text();
  if (profileSchema) {
    const schemaTag = `<script type="application/ld+json">${JSON.stringify(profileSchema).replaceAll('<', '\\u003c')}</script>`;
    html = html.replace('</head>', `${schemaTag}</head>`);
  }
  html = html
    .replace(/<title>[^<]*<\/title>/i, `<title>${escapeHtml(title)}</title>`)
    .replace(/<meta name="description"[^>]*>/i, `<meta name="description" content="${escapeHtml(description)}" />`)
    .replace(/<meta name="robots"[^>]*>/i, `<meta name="robots" content="${robots}" />`)
    .replace(/<link rel="canonical"[^>]*>/i, `<link rel="canonical" href="${escapeHtml(canonical)}" />`)
    .replace(/<meta property="og:title"[^>]*>/i, `<meta property="og:title" content="${escapeHtml(title)}" />`)
    .replace(/<meta property="og:description"[^>]*>/i, `<meta property="og:description" content="${escapeHtml(description)}" />`)
    .replace(/<meta property="og:url"[^>]*>/i, `<meta property="og:url" content="${escapeHtml(canonical)}" />`)
    .replace(/<meta property="og:image"[^>]*>/i, `<meta property="og:image" content="${escapeHtml(ogImage)}" />`)
    .replace(/<meta name="twitter:title"[^>]*>/i, `<meta name="twitter:title" content="${escapeHtml(title)}" />`)
    .replace(/<meta name="twitter:description"[^>]*>/i, `<meta name="twitter:description" content="${escapeHtml(description)}" />`)
    .replace(/<meta name="twitter:image"[^>]*>/i, `<meta name="twitter:image" content="${escapeHtml(ogImage)}" />`)
    // Keep the crawler-readable profile summary available when JavaScript is
    // disabled without leaving it in the live app DOM after Svelte mounts.
    .replace('<div id="app"></div>', `<div id="app"><noscript>${summary}</noscript></div>`);

  return new Response(html, {
    status: profile ? 200 : 404,
    headers: await createHtmlHeaders(html)
  });
}
