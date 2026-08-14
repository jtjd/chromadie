import { normalizeLocalMediaPreviewSource, normalizeMediaSource } from './mediaSafety.js';

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

function resolveExplicitMediaUrl(value, publicOrigin) {
  const localPreview = normalizeLocalMediaPreviewSource(value);
  if (localPreview) return localPreview;

  try {
    const parsed = new URL(String(value));
    if (!['https:', 'http:'].includes(parsed.protocol)) return '';
    if (parsed.origin !== normalizeOrigin(publicOrigin)) return '';
    if (parsed.search || parsed.hash) return '';
    return normalizeMediaSource(parsed.toString());
  } catch {
    return '';
  }
}

/**
 * Resolve only provider-aware R2 references or an explicitly supplied local
 * object URL. Legacy storage paths intentionally fail closed. An immutable
 * R2 object key is the cache identity; render state never participates in the
 * returned URL.
 */
export function resolveProfileMediaReference(value, {
  publicOrigin = DEFAULT_PROFILE_MEDIA_ORIGIN
} = {}) {
  const source = typeof value === 'string' ? { path: value } : (value && typeof value === 'object' ? value : {});
  const previewUrl = getReferenceValue(source, ['preview_url', 'previewUrl']);
  if (previewUrl) return resolveExplicitMediaUrl(previewUrl, publicOrigin);

  const publicKey = getReferenceValue(source, ['r2_public_key', 'public_key', 'publicKey']);
  if (publicKey) return buildPublicObjectUrl(publicOrigin, publicKey);

  const explicitUrl = getReferenceValue(source, ['url', 'public_url', 'publicUrl']);
  if (explicitUrl) return resolveExplicitMediaUrl(explicitUrl, publicOrigin);

  // storage_path and other legacy references are metadata only. They must
  // never become a network URL, including through a compatibility resolver.
  return '';
}
