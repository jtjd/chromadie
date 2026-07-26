const MAX_MEDIA_SOURCE_LENGTH = 2048;

function hasControlCharacters(value) {
  return [...value].some(character => {
    const codePoint = character.codePointAt(0);
    return codePoint < 0x20 || codePoint === 0x7f;
  });
}

/**
 * Keep media rendering on same-origin paths or explicit HTTPS URLs.
 * Relative URLs are useful for the existing branded assets; protocol-relative,
 * data, blob, javascript, and HTTP URLs are intentionally rejected.
 */
export function normalizeMediaSource(value) {
  if (typeof value !== 'string') return '';
  const source = value.trim();
  if (!source || source.length > MAX_MEDIA_SOURCE_LENGTH || hasControlCharacters(source)) return '';
  if (source.startsWith('//')) return '';

  if (!/^[a-z][a-z\d+.-]*:/i.test(source)) return source;

  try {
    return new URL(source).protocol === 'https:' ? source : '';
  } catch {
    return '';
  }
}

export function isSafeMediaSource(value) {
  return Boolean(normalizeMediaSource(value));
}
