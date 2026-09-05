const HISTORY_PAGE_SIZE = 40;
const SAFE_ID = /^[a-z0-9][a-z0-9_-]{0,127}$/;
const SAFE_HEX = /^#[0-9A-F]{6}$/;

function safeDate(value) {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) return null;
  return value;
}

function normalizeCollectionItem(item) {
  const id = typeof item?.id === 'string' ? item.id.toLowerCase() : '';
  if (!SAFE_ID.test(id)) return null;
  return {
    id,
    count: Math.max(1, Number(item.count) || 1),
    firstSeen: safeDate(item.firstSeen || item.first_seen),
    lastSeen: safeDate(item.lastSeen || item.last_seen)
  };
}

function normalizeHistoryItem(item) {
  const id = typeof item?.id === 'string' ? item.id : '';
  const eventType = item?.eventType === 'roll' ? 'roll' : item?.eventType === 'profile_created' ? 'profile_created' : '';
  const occurredAt = safeDate(item?.occurredAt);
  if (!id || !eventType || !occurredAt) return null;
  const rawHex = typeof item.hex === 'string' ? item.hex.toUpperCase() : '';
  return {
    id,
    eventType,
    occurredAt,
    hex: SAFE_HEX.test(rawHex) ? rawHex : null,
    score: Math.max(0, Number(item.score) || 0),
    rarity: typeof item.rarity === 'string' ? item.rarity.slice(0, 32) : '',
    identity: typeof item.identity === 'string' ? item.identity.slice(0, 120) : '',
    conditionCount: Math.max(0, Math.min(512, Number(item.conditionCount) || 0))
  };
}

export async function loadOwnerConditionCollection(supabaseClient) {
  const { data, error } = await supabaseClient.rpc('get_my_condition_collection');
  if (error || data?.success === false) {
    return { items: [], error: error || new Error(data?.error || 'Collection could not be loaded.') };
  }
  return {
    items: (Array.isArray(data?.items) ? data.items : []).map(normalizeCollectionItem).filter(Boolean),
    error: null
  };
}

export async function loadOwnerHistoryPage(supabaseClient, cursor = null) {
  const args = { p_limit: HISTORY_PAGE_SIZE };
  if (cursor?.occurredAt && cursor?.id) {
    args.p_before_occurred_at = cursor.occurredAt;
    args.p_before_id = cursor.id;
  }
  const { data, error } = await supabaseClient.rpc('get_my_profile_history', args);
  if (error || data?.success === false) {
    return { items: [], hasMore: false, nextCursor: null, error: error || new Error(data?.error || 'History could not be loaded.') };
  }
  const nextCursor = data?.nextCursor && safeDate(data.nextCursor.occurredAt) && typeof data.nextCursor.id === 'string'
    ? { occurredAt: data.nextCursor.occurredAt, id: data.nextCursor.id }
    : null;
  return {
    items: (Array.isArray(data?.items) ? data.items : []).map(normalizeHistoryItem).filter(Boolean),
    hasMore: Boolean(data?.hasMore && nextCursor),
    nextCursor,
    error: null
  };
}

export { HISTORY_PAGE_SIZE };
