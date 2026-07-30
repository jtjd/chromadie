import { normalizeMediaSource } from './mediaSafety.js';
import { getProfileStorageRef } from './profileExpression.js';
import { supabase } from './supabase.js';

export function getProfileMediaUrl(storedPath, cacheKey = '') {
  const reference = getProfileStorageRef(storedPath);
  if (!reference || !supabase?.storage) return '';
  const publicUrl = supabase.storage.from(reference.bucket).getPublicUrl(reference.objectPath)?.data?.publicUrl || '';
  const safeUrl = normalizeMediaSource(publicUrl);
  if (!safeUrl || !cacheKey) return safeUrl;

  const separator = safeUrl.includes('?') ? '&' : '?';
  return `${safeUrl}${separator}v=${encodeURIComponent(String(cacheKey))}`;
}
