export const ACHIEVEMENT_SELECT = 'id, name, description, icon, ep_reward, rarity, season_id, season_start, season_end';

let definitionsCache = null;
let definitionsRequest = null;

export async function loadAchievementDefinitions(supabaseClient) {
  if (definitionsCache) return { data: definitionsCache, error: null };
  if (!definitionsRequest) {
    definitionsRequest = supabaseClient
      .from('achievements')
      .select(ACHIEVEMENT_SELECT)
      .then(response => {
        if (Array.isArray(response.data)) definitionsCache = response.data;
        definitionsRequest = null;
        return response;
      });
  }
  return definitionsRequest;
}

export async function loadOwnerAchievementRecord(supabaseClient, userId) {
  if (!supabaseClient || !userId) {
    return { definitions: [], unlocked: {}, error: new Error('Achievement record requires an authenticated account.') };
  }

  const [definitionsResponse, unlocksResponse] = await Promise.all([
    loadAchievementDefinitions(supabaseClient),
    supabaseClient
      .from('user_achievements')
      .select('achievement_id, count, unlocked_at')
      .eq('user_id', userId)
  ]);

  const error = definitionsResponse.error || unlocksResponse.error || null;
  const unlocked = Object.fromEntries((unlocksResponse.data || [])
    .filter(row => typeof row?.achievement_id === 'string')
    .map(row => [row.achievement_id, {
      count: Math.max(1, Number(row.count) || 1),
      unlockedAt: typeof row.unlocked_at === 'string' ? row.unlocked_at : null
    }]));

  return {
    definitions: Array.isArray(definitionsResponse.data) ? definitionsResponse.data : [],
    unlocked,
    error
  };
}

export function clearAchievementDefinitionsCache() {
  definitionsCache = null;
  definitionsRequest = null;
}
