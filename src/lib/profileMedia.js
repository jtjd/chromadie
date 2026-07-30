import { normalizeMediaSource } from './mediaSafety.js';
import { getProfileStorageRef } from './profileExpression.js';
import { supabase } from './supabase.js';

export function getProfileMediaUrl(storedPath) {
  const reference = getProfileStorageRef(storedPath);
  if (!reference || !supabase?.storage) return '';
  const publicUrl = supabase.storage.from(reference.bucket).getPublicUrl(reference.objectPath)?.data?.publicUrl || '';
  return normalizeMediaSource(publicUrl);
}
