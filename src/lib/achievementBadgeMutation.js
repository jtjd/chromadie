import { rpcWithAccessToken } from './rpcWithAccessToken.js';

/** Save profile-pinned achievements under the account that initiated the action. */
export async function saveAchievementPins({
  supabaseClient,
  badgeIds = [],
  accessToken = '',
  isCurrent = () => true
}) {
  if (!isCurrent()) return { success: false, stale: true, badges: [] };
  let response;
  try {
    response = await rpcWithAccessToken(supabaseClient, 'equip_badges', { p_badge_ids: [...badgeIds] }, accessToken);
  } catch (error) {
    response = { error };
  }
  if (!isCurrent()) return { success: false, stale: true, badges: [] };
  const data = response?.data;
  if (response?.error || data?.success !== true) {
    return {
      success: false,
      stale: false,
      badges: [],
      error: data?.error || response?.error?.message || 'Pinned achievements could not be updated.'
    };
  }
  return {
    success: true,
    stale: false,
    badges: Array.isArray(data.badges) ? data.badges : [...badgeIds]
  };
}
