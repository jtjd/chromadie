function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export async function fetchAppShell(request, env) {
  try {
    if (env?.ASSETS) {
      return await env.ASSETS.fetch(new URL('/', request.url));
    }
    return await fetch(new URL('/index.html', request.url));
  } catch {
    return new Response('Unable to load app shell.', { status: 502 });
  }
}

const CSP_BASE = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://challenges.cloudflare.com https://cloudflareinsights.com",
  "frame-src https://challenges.cloudflare.com"
];

export const baseSecurityHeaders = Object.freeze({
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), fullscreen=(self)',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
});

export function getSiteOrigin(request, env) {
  const requestOrigin = new URL(request.url).origin;
  const configured = env?.VITE_SITE_URL?.trim();
  if (!configured) return requestOrigin;
  try {
    const url = new URL(configured);
    return ['http:', 'https:'].includes(url.protocol) ? url.origin : requestOrigin;
  } catch {
    return requestOrigin;
  }
}

async function sha256Source(value) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  const bytes = String.fromCharCode(...new Uint8Array(digest));
  return `'sha256-${btoa(bytes)}'`;
}

export async function createHtmlHeaders(html, cacheControl = 'no-cache, must-revalidate') {
  const inlineScripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)];
  const scriptHashes = await Promise.all(inlineScripts.map(match => sha256Source(match[1])));
  const scriptSrc = ["script-src 'self'", ...scriptHashes, 'https://challenges.cloudflare.com', 'https://static.cloudflareinsights.com'].join(' ');
  return {
    ...baseSecurityHeaders,
    'Content-Security-Policy': [...CSP_BASE, scriptSrc].join('; '),
    'Content-Type': 'text/html; charset=UTF-8',
    'Cache-Control': cacheControl
  };
}

export async function renderPublicPage(request, env, { title, description, canonicalPath, fallback }) {
  const shellResponse = await fetchAppShell(request, env);
  if (!shellResponse.ok) return new Response('Unable to load app shell.', { status: 502, headers: baseSecurityHeaders });

  const origin = getSiteOrigin(request, env);
  const canonical = `${origin}${canonicalPath}`;
  let html = await shellResponse.text();
  const fallbackMarkup = `<noscript><main><h1>${escapeHtml(title.replace(' | ChromaDie', ''))}</h1><p>${escapeHtml(fallback)}</p></main></noscript>`;

  html = html
    .replace(/<title>[^<]*<\/title>/i, `<title>${escapeHtml(title)}</title>`)
    .replace(/<meta name="description"[^>]*>/i, `<meta name="description" content="${escapeHtml(description)}" />`)
    .replace(/<meta name="robots"[^>]*>/i, '<meta name="robots" content="index,follow" />')
    .replace(/<link rel="canonical"[^>]*>/i, `<link rel="canonical" href="${escapeHtml(canonical)}" />`)
    .replace(/<meta property="og:title"[^>]*>/i, `<meta property="og:title" content="${escapeHtml(title)}" />`)
    .replace(/<meta property="og:description"[^>]*>/i, `<meta property="og:description" content="${escapeHtml(description)}" />`)
    .replace(/<meta property="og:url"[^>]*>/i, `<meta property="og:url" content="${escapeHtml(canonical)}" />`)
    .replace(/<meta name="twitter:title"[^>]*>/i, `<meta name="twitter:title" content="${escapeHtml(title)}" />`)
    .replace(/<meta name="twitter:description"[^>]*>/i, `<meta name="twitter:description" content="${escapeHtml(description)}" />`)
    .replace('</body>', `${fallbackMarkup}</body>`);

  return new Response(html, { headers: await createHtmlHeaders(html) });
}
