function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export async function renderPublicPage(request, { title, description, canonicalPath, fallback }) {
  const shellResponse = await fetch(new URL('/index.html', request.url));
  if (!shellResponse.ok) return new Response('Unable to load app shell.', { status: 502 });

  const origin = new URL(request.url).origin;
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

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=UTF-8',
      'Cache-Control': 'public, max-age=300, s-maxage=900'
    }
  });
}
