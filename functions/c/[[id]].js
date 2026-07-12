import { loadAuthoritativeChallenge } from '../_challenge.js';

function escapeHtml(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

export async function onRequestGet({ request, params, env }) {
  const id = params.id;
  const challenge = await loadAuthoritativeChallenge(id, env);
  const { fetchAppShell, createHtmlHeaders, baseSecurityHeaders, getSiteOrigin } = await import('../_publicPage.js');
  const origin = getSiteOrigin(request, env);
  const canonical = `${origin}/c/${encodeURIComponent(id)}`;
  const title = challenge ? 'Challenge | ChromaDie' : 'Challenge Unavailable | ChromaDie';
  const description = challenge
    ? `${challenge.sender_username || 'A ChromaDie player'} challenged you to beat a ${Number(challenge.target_score).toLocaleString()} EP color roll.`
    : 'This ChromaDie challenge is unavailable or has expired.';
  const ogImage = challenge
    ? `${origin}/og/challenge.svg?id=${encodeURIComponent(challenge.id)}`
    : `${origin}/og-default.png`;
  const shellResponse = await fetchAppShell(request, env);
  if (!shellResponse.ok) return new Response('Unable to load app shell.', { status: 502, headers: baseSecurityHeaders });
  let html = await shellResponse.text();
  html = html
    .replace(/<title>[^<]*<\/title>/i, `<title>${escapeHtml(title)}</title>`)
    .replace(/<meta name="description"[^>]*>/i, `<meta name="description" content="${escapeHtml(description)}" />`)
    .replace(/<meta name="robots"[^>]*>/i, '<meta name="robots" content="noindex,follow" />')
    .replace(/<link rel="canonical"[^>]*>/i, `<link rel="canonical" href="${escapeHtml(canonical)}" />`)
    .replace(/<meta property="og:title"[^>]*>/i, `<meta property="og:title" content="${escapeHtml(title)}" />`)
    .replace(/<meta property="og:description"[^>]*>/i, `<meta property="og:description" content="${escapeHtml(description)}" />`)
    .replace(/<meta property="og:url"[^>]*>/i, `<meta property="og:url" content="${escapeHtml(canonical)}" />`)
    .replace(/<meta property="og:image"[^>]*>/i, `<meta property="og:image" content="${escapeHtml(ogImage)}" />`)
    .replace(/<meta name="twitter:title"[^>]*>/i, `<meta name="twitter:title" content="${escapeHtml(title)}" />`)
    .replace(/<meta name="twitter:description"[^>]*>/i, `<meta name="twitter:description" content="${escapeHtml(description)}" />`)
    .replace(/<meta name="twitter:image"[^>]*>/i, `<meta name="twitter:image" content="${escapeHtml(ogImage)}" />`);
  // Always serve the app shell here. The client-side challenge loader provides
  // the definitive expired/missing state after hydration; a metadata lookup
  // failure should not prevent the game route from booting.
  return new Response(html, { status: 200, headers: await createHtmlHeaders(html) });
}
