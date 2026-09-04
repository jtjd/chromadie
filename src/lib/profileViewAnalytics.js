import { recordProfileInsightEvent } from './profileInsightAnalytics.js';

// Kept as a stable export for extensions that cleared the previous local key.
export const PROFILE_VIEW_RECENCY_KEY = 'chromadie-profile-view-recency-v1';

function getStorage() {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

export function normalizeProfileViewUsername(value) {
  const username = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return /^[a-z0-9_]{1,20}$/.test(username) ? username : '';
}

export function getProfileViewDateKey(now = new Date()) {
  const date = now instanceof Date ? now : new Date(now);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
}

/**
 * Compatibility adapter for the original view recorder. Recording is now
 * edge-only; browser clients never fall back to the aggregate RPC.
 *
 * @param {{storage?: Storage|null, now?: Date|string, edge?: boolean, fetcher?: Function|null}} options
 */
export async function recordPublicProfileView(client, profileUsername, options = {}) {
  // Preserve the old adapter signature while deliberately ignoring its RPC
  // client: direct browser writes are no longer an accepted transport.
  void client;
  const { storage = getStorage(), now = new Date(), edge = false, fetcher } = options;
  const username = normalizeProfileViewUsername(profileUsername);
  if (!username) return { accepted: false, recorded: false, reason: 'invalid_profile' };
  if (!edge) return { accepted: false, recorded: false, reason: 'edge_required' };
  return recordProfileInsightEvent({
    profileUsername: username,
    metric: 'view',
    storage,
    now,
    fetcher
  });
}
