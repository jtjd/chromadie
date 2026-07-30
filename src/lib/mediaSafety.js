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
    return parsed.protocol === 'https:' || (parsed.protocol === 'http:' && loopback) ? source : '';
  } catch {
    return '';
  }
}

export function isSafeMediaSource(value) {
  return Boolean(normalizeMediaSource(value));
}
