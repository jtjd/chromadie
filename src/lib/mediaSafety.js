const MAX_MEDIA_SOURCE_LENGTH = 2048;

function hasControlCharacters(value) {
  return [...value].some(character => {
    const codePoint = character.codePointAt(0);
    return codePoint < 0x20 || codePoint === 0x7f;
  });
}

/**
 * Keep media rendering on same-origin paths, loopback development URLs, or
 * explicit HTTPS URLs. Protocol-relative, data, blob, javascript, and public
 * HTTP URLs remain rejected.
 */
export function normalizeMediaSource(value) {
  if (typeof value !== 'string') return '';
  const source = value.trim();
  if (!source || source.length > MAX_MEDIA_SOURCE_LENGTH || hasControlCharacters(source)) return '';
  if (source.startsWith('//')) return '';

  if (!/^[a-z][a-z\d+.-]*:/i.test(source)) return source;

  try {
    const parsed = new URL(source);
    const loopback = ['localhost', '127.0.0.1', '::1'].includes(parsed.hostname);
    // Supabase Storage is not a profile-media provider. Reject its URL shape
    // at the shared media element boundary as well as in the R2 resolver so a
    // legacy reference cannot become a browser request through another leaf.
    if (/(?:^|\.)supabase\.(?:co|in)$/i.test(parsed.hostname)) return '';
    if (/^\/storage\/v1(?:\/|$)/i.test(parsed.pathname)) return '';
    return parsed.protocol === 'https:' || (parsed.protocol === 'http:' && loopback) ? source : '';
  } catch {
    return '';
  }
}

/**
 * Allow a browser-created object URL only for an explicit local preview. The
 * normal media contract continues to reject blob URLs, and the embedded blob
 * origin must match the current page.
 */
export function normalizeLocalMediaPreviewSource(value, expectedOrigin = '') {
  if (typeof value !== 'string') return '';
  const source = value.trim();
  if (!source || source.length > MAX_MEDIA_SOURCE_LENGTH || hasControlCharacters(source)) return '';

  try {
    const parsed = new URL(source);
    const pageOrigin = expectedOrigin
      || (typeof window !== 'undefined' ? window.location.origin : '');
    return parsed.protocol === 'blob:' && pageOrigin && parsed.origin === pageOrigin
      ? source
      : '';
  } catch {
    return '';
  }
}

export function isSafeMediaSource(value) {
  return Boolean(normalizeMediaSource(value));
}
