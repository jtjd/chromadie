import { normalizeCanonicalRoll } from './rollState.js';

/**
 * Call the server-authoritative roll RPC and return its bounded presentation
 * model. The service never computes score, rarity, eligibility, or rewards.
 */
export async function requestRoll(supabaseClient, isReroll = false) {
  try {
    const { data, error } = await supabaseClient.rpc('roll_die', { p_is_reroll: isReroll });
    if (error || !data || !data.success) {
      return {
        success: false,
        data: null,
        canonical: null,
        error: error || new Error(data?.error || 'The server could not complete this roll.')
      };
    }

    return {
      success: true,
      data,
      canonical: normalizeCanonicalRoll(data),
      error: null
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      canonical: null,
      error: error instanceof Error ? error : new Error('The server could not complete this roll.')
    };
  }
}

/** Optional ranking data must never invalidate a confirmed roll. */
export async function requestRollPercentile(supabaseClient, score) {
  try {
    const { data, error } = await supabaseClient.rpc('get_score_percentile', { p_score: score });
    return error ? null : data;
  } catch {
    return null;
  }
}
