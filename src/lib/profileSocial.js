export const PROFILE_REACTION_TYPES = Object.freeze(['spark', 'glow', 'cheer']);

export const PROFILE_REACTION_LABELS = Object.freeze({
  spark: 'Spark',
  glow: 'Glow',
  cheer: 'Cheer'
});

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function createEmptyProfileSocial() {
  return {
    blocked: false,
    interactionsEnabled: true,
    guestbookEnabled: true,
    activityVisible: true,
    socialSummaryVisible: true,
    favoriteCount: 0,
    reactionCounts: { spark: 0, glow: 0, cheer: 0 },
    viewerFavorited: false,
    viewerReactions: [],
    guestbook: []
  };
}

export function createDefaultProfileSocialSettings() {
  return {
    interactionsEnabled: true,
    guestbookEnabled: true,
    activityVisible: true,
    discoverable: true,
    socialSummaryVisible: true
  };
}

function safeBoolean(value, fallback) {
  return typeof value === 'boolean' ? value : fallback;
}

function safeCount(value) {
  const count = Number(value);
  return Number.isFinite(count) && count > 0 ? Math.min(Math.floor(count), 1_000_000_000) : 0;
}

function normalizeEntry(entry) {
  if (!entry || typeof entry !== 'object') return null;
  const entryKey = String(entry.entryKey || '');
  const author = String(entry.author || '').trim();
  const body = String(entry.body || '').trim();
  if (!UUID_PATTERN.test(entryKey) || !author || !body || body.length > 240) return null;
  return {
    entryKey,
    author: author.slice(0, 20),
    body,
    createdAt: entry.createdAt || null,
    canDelete: entry.canDelete === true
  };
}

export function normalizeProfileSocial(value) {
  const source = value && typeof value === 'object' ? value : {};
  const counts = source.reactionCounts && typeof source.reactionCounts === 'object'
    ? source.reactionCounts
    : {};
  const viewerReactions = Array.isArray(source.viewerReactions)
    ? source.viewerReactions.filter(type => PROFILE_REACTION_TYPES.includes(type))
    : [];

  return {
    ...createEmptyProfileSocial(),
    blocked: source.blocked === true,
    interactionsEnabled: safeBoolean(source.interactionsEnabled, true),
    guestbookEnabled: safeBoolean(source.guestbookEnabled, true),
    activityVisible: safeBoolean(source.activityVisible, true),
    socialSummaryVisible: safeBoolean(source.socialSummaryVisible, true),
    favoriteCount: safeCount(source.favoriteCount),
    reactionCounts: {
      spark: safeCount(counts.spark),
      glow: safeCount(counts.glow),
      cheer: safeCount(counts.cheer)
    },
    viewerFavorited: source.viewerFavorited === true,
    viewerReactions: [...new Set(viewerReactions)],
    guestbook: (Array.isArray(source.guestbook) ? source.guestbook : [])
      .map(normalizeEntry)
      .filter(Boolean)
      .slice(0, 20)
  };
}

export function normalizeProfileSocialSettings(value) {
  const source = value?.settings && typeof value.settings === 'object'
    ? value.settings
    : value && typeof value === 'object'
      ? value
      : {};
  return {
    interactionsEnabled: safeBoolean(source.interactionsEnabled, true),
    guestbookEnabled: safeBoolean(source.guestbookEnabled, true),
    activityVisible: safeBoolean(source.activityVisible, true),
    discoverable: safeBoolean(source.discoverable, true),
    socialSummaryVisible: safeBoolean(source.socialSummaryVisible, true)
  };
}

export async function invokeProfileSocialRpc(client, functionName, args = {}) {
  if (!client || typeof client.rpc !== 'function') {
    return { data: null, error: new Error('Social service unavailable.') };
  }
  return client.rpc(functionName, args);
}

export function getProfileSocialError(result, fallback = 'That social action could not be completed.') {
  if (result?.error?.message) return result.error.message;
  if (result?.data?.error) return String(result.data.error);
  return fallback;
}
