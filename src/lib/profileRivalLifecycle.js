const RIVAL_FIELDS = 'user_id, hex_code, score, rarity, username, current_streak, equipped_cosmetics, equipped_badges, is_staff, rank';

/**
 * Keep the legacy Profile's owner-only Rivals read scoped to the current
 * profile and followed-user list. Svelte continues to own the rendered state.
 * @param {{supabaseClient: any, getTodayString: () => string, onRows?: (rows: any[]) => void, onError?: (...args: any[]) => void}} options
 */
export function createProfileRivalLifecycle({
  supabaseClient,
  getTodayString,
  onRows = () => {},
  onError = (...args) => console.error(...args)
}) {
  let requestGeneration = 0;
  let activeSignature = null;
  let disposed = false;

  function invalidate() {
    requestGeneration += 1;
    activeSignature = null;
  }

  async function fetchRows(followedIds) {
    const { data, error } = await supabaseClient
      .from('leaderboard_view')
      .select(RIVAL_FIELDS)
      .eq('roll_date', getTodayString())
      .in('user_id', followedIds)
      .order('score', { ascending: false })
      .order('user_id', { ascending: true });

    if (error) onError('Error fetching rivals:', error);
    return data || [];
  }

  /** @param {{profileKey?: string, isOwner: boolean, followedIds?: string[]}} options */
  async function sync({ profileKey, isOwner, followedIds }) {
    if (disposed) return { status: 'disposed' };

    const ids = Array.isArray(followedIds) ? [...followedIds] : [];
    const signature = JSON.stringify([profileKey || '', Boolean(isOwner), ids]);
    if (signature === activeSignature) return { status: 'unchanged' };

    activeSignature = signature;
    const requestId = ++requestGeneration;

    if (!isOwner || ids.length === 0) {
      onRows([]);
      return { status: 'cleared' };
    }

    let rows;
    try {
      rows = await fetchRows(ids);
    } catch (error) {
      if (requestId !== requestGeneration || disposed) return { status: 'stale' };
      onError('Error fetching rivals:', error);
      rows = [];
    }

    if (requestId !== requestGeneration || disposed) return { status: 'stale' };
    onRows(rows);
    return { status: 'loaded', rows };
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    invalidate();
  }

  return { sync, invalidate, dispose };
}
