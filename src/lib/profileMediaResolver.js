import { normalizeMediaSource } from './mediaSafety.js';

export const DEFAULT_PROFILE_MEDIA_ORIGIN = 'https://media.chm.lol';

function normalizeOrigin(value, fallback = DEFAULT_PROFILE_MEDIA_ORIGIN) {
  try {
    const parsed = new URL(String(value || fallback));
    if (!['https:', 'http:'].includes(parsed.protocol)) return fallback;
    return parsed.origin;
  } catch {
    return fallback;
  }
}

function normalizeObjectKey(value) {
  const key = String(value || '').trim().replace(/^\/+/, '');
  if (!key || key.length > 1024 || key.split('/').some(segment => segment === '.' || segment === '..') || [...key].some(character => {
    const code = character.codePointAt(0);
    return code < 32 || code === 127;
  })) return '';
  return key;
}

function getReferenceValue(value, keys) {
  if (!value || typeof value !== 'object') return '';
  for (const key of keys) {
    if (typeof value[key] === 'string' && value[key].trim()) return value[key].trim();
  }
  return '';
}

function buildPublicObjectUrl(origin, objectKey) {
  const normalizedKey = normalizeObjectKey(objectKey);
  if (!normalizedKey) return '';
  const encodedPath = normalizedKey.split('/').map(segment => encodeURIComponent(segment)).join('/');
  return normalizeMediaSource(`${normalizeOrigin(origin)}/${encodedPath}`);
}

function appendPreviewCacheKey(url, cacheKey) {
  if (!url || !cacheKey) return url;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}v=${encodeURIComponent(String(cacheKey))}`;
}

/**
 * Resolve either the new provider-aware media reference or a legacy Storage
 * path. Public R2 URLs are immutable and never receive cache-busting query
 * parameters. Legacy cache-busting is available only to explicit editor
 * preview callers during the migration window.
 */
export function resolveProfileMediaReference(value, {
  publicOrigin = DEFAULT_PROFILE_MEDIA_ORIGIN,
  legacyResolver = null,
  cacheKey = '',
  allowLegacyCacheBust = false
} = {}) {
  const source = typeof value === 'string' ? { path: value } : (value && typeof value === 'object' ? value : {});
  const previewUrl = getReferenceValue(source, ['preview_url', 'previewUrl']);
  if (previewUrl) return normalizeMediaSource(previewUrl);

  const publicKey = getReferenceValue(source, ['r2_public_key', 'public_key', 'publicKey']);
  if (publicKey) return buildPublicObjectUrl(publicOrigin, publicKey);

  const explicitUrl = getReferenceValue(source, ['url', 'public_url', 'publicUrl']);
  if (explicitUrl) return normalizeMediaSource(explicitUrl);

  const legacyPath = getReferenceValue(source, ['storage_path', 'storagePath', 'path', 'legacy_path', 'legacyPath']);
  if (!legacyPath || typeof legacyResolver !== 'function') return '';
  const legacyUrl = normalizeMediaSource(legacyResolver(legacyPath));
  return allowLegacyCacheBust ? appendPreviewCacheKey(legacyUrl, cacheKey) : legacyUrl;
}
