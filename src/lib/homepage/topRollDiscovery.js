import { normalizeDiscoveryResponse } from '../discoveryData.js';
import { getCanonicalProfilePath } from '../routeContract.js';

const DAILY_TOP_ROLL_LIMIT = 5;
const LOAD_ERROR = 'Public profiles could not be loaded right now.';

export async function loadHomepageTopRolls(rpc) {
  try {
    const { data, error } = await rpc('get_public_discovery_spotlight', {
      p_limit: DAILY_TOP_ROLL_LIMIT
    });

    if (error) return { rows: [], loading: false, error: LOAD_ERROR };

    const rows = normalizeDiscoveryResponse(data).items
      .map((item, index) => {
        const profilePath = getCanonicalProfilePath(item.username);
        return profilePath ? { ...item, profilePath, displayRank: item.rank || index + 1 } : null;
      })
      .filter(Boolean)
      .slice(0, DAILY_TOP_ROLL_LIMIT);

    return { rows, loading: false, error: '' };
  } catch {
    return { rows: [], loading: false, error: LOAD_ERROR };
  }
}
