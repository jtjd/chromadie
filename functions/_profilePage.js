import { getCanonicalProfilePath, normalizeUsernameSegment } from '../src/lib/routeContract.js';
import { resolveProfileMediaReference } from '../src/lib/profileMediaResolver.js';
import { normalizeProfileMetadata } from '../src/lib/profileMetadata.js';
import { baseSecurityHeaders, createHtmlHeaders, fetchAppShell, getSiteOrigin } from './_publicPage.js';
import { getSupabaseCredentials, getSupabasePublicHeaders } from './_supabaseApi.js';

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export async function loadPublicProfile(username, env) {
  const normalizedUsername = normalizeUsernameSegment(username);
  const supabase = getSupabaseCredentials(env);
  const supabaseUrl = supabase.url;
  if (!normalizedUsername || !supabaseUrl || !supabase.publishableKey) return null;

  try {
    const endpoint = new URL('/rest/v1/rpc/get_public_profile_identity', supabaseUrl);
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        ...getSupabasePublicHeaders(env),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ p_username: normalizedUsername })
    });
    if (!response.ok) return null;
    const payload = await response.json();
    const profile = Array.isArray(payload) ? payload[0] || null : payload;
    if (!profile?.id) return profile;
    try {
      const configurationEndpoint = new URL('/rest/v1/rpc/get_public_profile_configuration', supabaseUrl);
      const configurationResponse = await fetch(configurationEndpoint, {
        method: 'POST',
        headers: {
          ...getSupabasePublicHeaders(env),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ p_user_id: profile.id })
      });
      if (configurationResponse.ok) profile.configuration = await configurationResponse.json();
    } catch {
      // Identity metadata remains renderable during additive deployments.
    }
    return profile;
  } catch {
    return null;
  }
}

function getPublicMediaUrl(mediaReference, env) {
  return resolveProfileMediaReference(mediaReference, {
    publicOrigin: env?.MEDIA_PUBLIC_ORIGIN || 'https://media.chm.lol'
  });
}

export function getProfileCacheControl(profile, legacyProfile = false) {
  return profile && !legacyProfile
    ? 'public, max-age=60, s-maxage=300, stale-while-revalidate=60'
    : 'no-cache, must-revalidate';
}

export async function renderPublicProfilePage({ request, env, username, legacyProfile = false }) {
  const normalizedUsername = normalizeUsernameSegment(username);
  if (!normalizedUsername) return new Response('Profile not found.', { status: 404, headers: baseSecurityHeaders });

  const profile = await loadPublicProfile(normalizedUsername, env);
  const origin = getSiteOrigin(request, env);
  const canonicalUsername = profile?.username || normalizedUsername;
  const canonicalPath = getCanonicalProfilePath(canonicalUsername) || `/${encodeURIComponent(normalizedUsername.toLowerCase())}`;
  const canonical = `${origin}${canonicalPath}`;
  const displayName = profile?.display_name || profile?.username || normalizedUsername;
  const metadata = normalizeProfileMetadata(profile?.configuration?.metadata || profile?.metadata);
  const title = profile
    ? (metadata.title || `${displayName} (@${profile.username}) | ChromaDie`)
    : 'Profile Not Found | ChromaDie';
  const description = profile
    ? (metadata.description || profile.bio || `View ${displayName}'s public ChromaDie profile, progress, achievements, and recent rolls.`)
    : 'This ChromaDie profile could not be found.';
  const robots = legacyProfile || !profile ? 'noindex,follow' : 'index,follow';
  const faviconUrl = getPublicMediaUrl(metadata.faviconPath, env);
  const metadataBanner = getPublicMediaUrl(profile?.configuration?.media_references?.banner || metadata.bannerPath, env);
  const ogImage = profile
    ? (metadataBanner || `${origin}/og/profile.svg?username=${encodeURIComponent(profile.username)}`)
    : `${origin}/og-default-v4.png`;
  const summary = profile
    ? `<section><h1>${escapeHtml(displayName)} (@${escapeHtml(profile.username)}) | ChromaDie</h1><p>${escapeHtml(profile.bio || 'A public color identity shaped by daily rolls.')}</p></section>`
    : '<section><h1>Profile not found</h1><p>This player profile is unavailable.</p></section>';
  const profileSchema = profile ? {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    name: title,
    url: canonical,
    isPartOf: { '@type': 'WebSite', name: 'ChromaDie', url: `${origin}/` },
    mainEntity: {
      '@type': 'Person',
      name: displayName,
      alternateName: `@${profile.username}`,
      description: profile.bio || undefined,
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
    .replace(/<meta name="theme-color"[^>]*>/i, `<meta name="theme-color" content="${escapeHtml(metadata.embedColor)}" />`)
    .replace(/<meta name="twitter:title"[^>]*>/i, `<meta name="twitter:title" content="${escapeHtml(title)}" />`)
    .replace(/<meta name="twitter:description"[^>]*>/i, `<meta name="twitter:description" content="${escapeHtml(description)}" />`)
    .replace(/<meta name="twitter:image"[^>]*>/i, `<meta name="twitter:image" content="${escapeHtml(ogImage)}" />`)
    .replace(/<meta name="twitter:url"[^>]*>/i, `<meta name="twitter:url" content="${escapeHtml(canonical)}" />`)
    .replace(/<link rel="icon"[^>]*>/i, faviconUrl
      ? `<link rel="icon" href="${escapeHtml(faviconUrl)}" />`
      : '<link rel="icon" type="image/svg+xml" sizes="any" href="/logo-mark.svg" />')
    .replace('<div id="app"></div>', `<div id="app"><noscript>${summary}</noscript></div>`);

  return new Response(html, {
    status: profile ? 200 : 404,
    headers: await createHtmlHeaders(html, getProfileCacheControl(profile, legacyProfile))
  });
}
