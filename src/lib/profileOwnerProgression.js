import { createEmptyProgression, loadMyProgression } from './progressionState.js';

/**
 * Owner-only progression hydration for profile routes. Keeping this boundary
 * in a dynamically imported module prevents public profiles and Profile
 * Studio's configuration-only bootstrap from loading the progression runtime.
 */
export async function loadOwnerProfileProgression(supabaseClient, userId) {
  const response = await loadMyProgression(supabaseClient, userId);
  return {
    data: response?.data || createEmptyProgression(),
    error: response?.error || null
  };
}
