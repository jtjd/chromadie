function escapeHtml(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

async function loadChallenge(id, env) {
  const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
  const supabaseKey = env.VITE_SUPABASE_KEY || env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return null;
  const response = await fetch(`${supabaseUrl.replace(/\/$/, '')}/functions/v1/challenge-link`, {
    method: 'POST', headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'get', id })
  });
  if (!response.ok) return null;
  const data = await response.json();
  return data.success ? data.challenge : null;
}

export async function onRequestGet({ request, params, env }) {
  const id = params.id;
  const challenge = await loadChallenge(id, env);
  const origin = new URL(request.url).origin;
  const canonical = `${origin}/c/${encodeURIComponent(id)}`;
  const title = challenge ? 'Challenge | ChromaDie' : 'Challenge Unavailable | ChromaDie';
  const description = challenge
    ? `${challenge.sender_username || 'A ChromaDie player'} challenged you to beat a ${Number(challenge.target_score).toLocaleString()} EP color roll.`
    : 'This ChromaDie challenge is unavailable or has expired.';
  const ogImage = challenge
    ? `${origin}/og/challenge.svg?score=${encodeURIComponent(challenge.target_score)}&hex=${encodeURIComponent(challenge.target_hex)}&from=${encodeURIComponent(challenge.sender_username || '')}`
    : `${origin}/og-default.png`;
  const shellResponse = await fetch(new URL('/index.html', request.url));
  if (!shellResponse.ok) return new Response('Unable to load app shell.', { status: 502 });
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
  return new Response(html, { status: challenge ? 200 : 404, headers: { 'Content-Type': 'text/html; charset=UTF-8', 'Cache-Control': challenge ? 'public, max-age=300, s-maxage=900' : 'no-store' } });
}
