import { getProfileStorageRef } from './profileExpression.js';
import { DEFAULT_PROFILE_MEDIA_ORIGIN, resolveProfileMediaReference } from './profileMediaResolver.js';
import { supabase } from './supabase.js';

function getConfiguredMediaOrigin() {
  return import.meta.env?.VITE_PROFILE_MEDIA_ORIGIN || DEFAULT_PROFILE_MEDIA_ORIGIN;
}

export function getProfileMediaUrl(mediaReference, cacheKey = '', { preview = Boolean(cacheKey) } = {}) {
  const legacyResolver = storedPath => {
    const reference = getProfileStorageRef(storedPath);
    if (!reference || !supabase?.storage) return '';
    return supabase.storage.from(reference.bucket).getPublicUrl(reference.objectPath)?.data?.publicUrl || '';
  };

  return resolveProfileMediaReference(mediaReference, {
    publicOrigin: getConfiguredMediaOrigin(),
    legacyResolver,
    cacheKey,
    allowLegacyCacheBust: preview
  });
}
