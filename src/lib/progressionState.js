import { getRankState, RANKS } from './ranks.js';

const MAX_EP = 1_000_000_000_000;
const MAX_RECENT_UNLOCKS = 8;
const MAX_MILESTONES = 32;
const MAX_TIMESTAMP_LENGTH = 80;
const MAX_TEXT_LENGTH = 220;
const TRACK_ORDER = Object.freeze({ rank: 0, ritual: 1, discovery: 2 });
const VALID_TRACKS = new Set(Object.keys(TRACK_ORDER));
const VALID_METRICS = new Set(['lifetime_ep', 'achievement']);

const RANK_BY_ID = new Map(
  RANKS.map(rank => [rank.name.toLowerCase(), Object.freeze({
    id: rank.name.toLowerCase(),
    name: rank.name,
    min: rank.min,
    color: rank.color
  })])
);

// The server manifest is authoritative. These five entries are retained only
// as a compatibility fallback for older deployments during migration.
const MILESTONE_MANIFEST = Object.freeze([
  Object.freeze({
    id: 'rank_silver',
    rankId: 'silver',
    threshold: 500_000,
    name: 'Silver',
    description: 'Reach Silver and add a precise Type In motion to your identity.',
    reward: Object.freeze({ itemKey: 'name_motion_typewriter_name', name: 'Type In', slot: 'name_motion' })
  }),
  Object.freeze({
    id: 'rank_gold',
    rankId: 'gold',
    threshold: 2_500_000,
    name: 'Gold',
    description: 'Reach Gold and reveal the cut facets of Carbon Vein.',
    reward: Object.freeze({ itemKey: 'name_material_carbon_cut', name: 'Carbon Vein', slot: 'name_material' })
  }),
  Object.freeze({
    id: 'rank_platinum',
    rankId: 'platinum',
    threshold: 7_500_000,
    name: 'Platinum',
    description: 'Reach Platinum and bring a concentrated Glow to your name.',
    reward: Object.freeze({ itemKey: 'name_motion_haunt_glow', name: 'Glow', slot: 'name_motion' })
  }),
  Object.freeze({
    id: 'rank_diamond',
    rankId: 'diamond',
    threshold: 15_000_000,
    name: 'Diamond',
    description: 'Reach Diamond and unlock the refracted edge of Raised Glass.',
    reward: Object.freeze({ itemKey: 'name_material_glass_emboss', name: 'Raised Glass', slot: 'name_material' })
  }),
  Object.freeze({
    id: 'rank_chroma',
    rankId: 'chroma',
    threshold: 30_000_000,
    name: 'Chroma',
    description: 'Reach Chroma and let Scramble rearrange your name before it settles.',
    reward: Object.freeze({ itemKey: 'name_motion_letter_shuffle', name: 'Scramble', slot: 'name_motion' })
  })
]);

const MILESTONE_BY_ID = new Map(MILESTONE_MANIFEST.map(milestone => [milestone.id, milestone]));

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizeInteger(value, maximum = MAX_EP) {
  const numeric = typeof value === 'number'
    ? value
    : typeof value === 'string' && /^\d+$/.test(value)
      ? Number(value)
      : NaN;
  if (!Number.isFinite(numeric)) return null;
  return Math.min(maximum, Math.max(0, Math.trunc(numeric)));
}

function normalizeEp(value) {
  return normalizeInteger(value, MAX_EP);
}

function normalizeText(value, fallback = '', maximum = MAX_TEXT_LENGTH) {
  if (typeof value !== 'string') return fallback;
  const text = [...value]
    .filter(character => {
      const codePoint = character.codePointAt(0);
      return codePoint >= 0x20 && codePoint !== 0x7f;
    })
    .join('')
    .trim()
    .slice(0, maximum);
  return text || fallback;
}

function normalizeTimestamp(value) {
  if (typeof value !== 'string' || value.length === 0 || value.length > MAX_TIMESTAMP_LENGTH) return null;
  const timestamp = new Date(value);
  return Number.isNaN(timestamp.getTime()) ? null : timestamp.toISOString();
}

function normalizeDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  return value;
}

function normalizeRank(value) {
  const candidate = typeof value === 'string'
    ? value
    : isRecord(value)
      ? value.id || value.name
      : '';
  if (typeof candidate !== 'string') return null;
  return RANK_BY_ID.get(candidate.toLowerCase()) || null;
}

function rankSnapshot(rank) {
  if (!rank) return null;
  return { id: rank.name.toLowerCase(), name: rank.name, min: rank.min, color: rank.color };
}

function milestoneKey(value) {
  if (typeof value === 'string') return value;
  if (!isRecord(value)) return '';
  return typeof value.id === 'string'
    ? value.id
    : typeof value.milestone_key === 'string'
      ? value.milestone_key
      : typeof value.key === 'string'
        ? value.key
        : '';
}

function normalizeReward(value) {
  if (!isRecord(value)) return null;
  const itemKey = normalizeText(value.item_key || value.itemKey, '', 100);
  if (!/^[a-z0-9_:-]{1,100}$/i.test(itemKey)) return null;
  return {
    itemKey,
    name: normalizeText(value.name, 'Profile expression', 100),
    slot: normalizeText(value.slot, 'expression', 60)
  };
}

function normalizeProgress(value) {
  if (!isRecord(value)) return null;
  const current = normalizeInteger(value.current, MAX_EP);
  const target = normalizeInteger(value.target, MAX_EP);
  if (current === null || target === null || target <= 0) return null;
  return {
    current: Math.min(current, target),
    target,
    unit: normalizeText(value.unit, '', 24)
  };
}

function fallbackMilestone(manifest, entry = {}) {
  const unlockedAt = normalizeTimestamp(entry.unlocked_at || entry.unlockedAt);
  return {
    id: manifest.id,
    name: manifest.name,
    description: manifest.description,
    threshold: manifest.threshold,
    track: 'rank',
    metric: 'lifetime_ep',
    achievementId: null,
    sortOrder: manifest.threshold,
    rankId: manifest.rankId,
    reward: { ...manifest.reward },
    progress: normalizeProgress(entry.progress),
    unlocked: entry.unlocked === true || Boolean(unlockedAt),
    unlockedAt
  };
}

function normalizeMilestoneEntry(value) {
  const key = milestoneKey(value);
  const manifest = MILESTONE_BY_ID.get(key);
  if (manifest) return fallbackMilestone(manifest, isRecord(value) ? value : {});

  if (!isRecord(value) || !/^[a-z0-9_:-]{1,100}$/i.test(key)) return null;
  const track = normalizeText(value.track, '', 24).toLowerCase();
  const metric = normalizeText(value.metric, '', 24).toLowerCase();
  const reward = normalizeReward(value.reward);
  if (!VALID_TRACKS.has(track) || !VALID_METRICS.has(metric) || !reward) return null;

  const unlockedAt = normalizeTimestamp(value.unlocked_at || value.unlockedAt);
  const threshold = normalizeInteger(value.threshold, MAX_EP) ?? 0;
  const sortOrder = normalizeInteger(value.sort_order ?? value.sortOrder, 100000) ?? 0;
  return {
    id: key,
    name: normalizeText(value.name, key, 100),
    description: normalizeText(value.description, 'A server-published profile milestone.', 220),
    threshold,
    track,
    metric,
    achievementId: normalizeText(value.achievement_id || value.achievementId, '', 100) || null,
    sortOrder,
    rankId: null,
    reward,
    progress: normalizeProgress(value.progress),
    unlocked: value.unlocked === true || Boolean(unlockedAt),
    unlockedAt
  };
}

function sortMilestones(left, right) {
  return (TRACK_ORDER[left.track] ?? 99) - (TRACK_ORDER[right.track] ?? 99)
    || left.sortOrder - right.sortOrder
    || left.id.localeCompare(right.id);
}

function normalizeMilestoneList(entries) {
  const normalized = new Map();
  const source = Array.isArray(entries) ? entries.slice(0, MAX_MILESTONES * 4) : [];

  for (const entry of source) {
    const milestone = normalizeMilestoneEntry(entry);
    if (!milestone) continue;
    const previous = normalized.get(milestone.id);
    if (!previous || milestone.unlocked || milestone.unlockedAt) normalized.set(milestone.id, milestone);
  }

  for (const manifest of MILESTONE_MANIFEST) {
    if (!normalized.has(manifest.id)) normalized.set(manifest.id, fallbackMilestone(manifest));
  }

  return [...normalized.values()].sort(sortMilestones).slice(0, MAX_MILESTONES);
}

export function normalizeNewMilestones(entries) {
  if (!Array.isArray(entries)) return [];

  const seen = new Set();
  const normalized = [];
  for (const entry of entries.slice(0, MAX_MILESTONES * 2)) {
    const milestone = normalizeMilestoneEntry(entry);
    if (!milestone || seen.has(milestone.id)) continue;
    seen.add(milestone.id);
    normalized.push({ ...milestone, unlocked: true });
    if (normalized.length >= MAX_MILESTONES) break;
  }
  return normalized.sort(sortMilestones);
}

function normalizeWeeklyFocus(value) {
  if (!isRecord(value)) return null;
  const targetHex = typeof value.target_hex === 'string' && /^#[0-9a-f]{6}$/i.test(value.target_hex)
    ? value.target_hex.toUpperCase()
    : null;
  return {
    weekStart: normalizeDate(value.week_start || value.weekStart),
    targetHex,
    completed: value.completed === true,
    bonusEp: normalizeInteger(value.bonus_ep ?? value.bonusEp, 1_000_000) ?? 50_000
  };
}

function getJourneyByTrack(nodes) {
  return {
    ritual: nodes.filter(node => node.track === 'ritual'),
    discovery: nodes.filter(node => node.track === 'discovery')
  };
}

function getNextJourney(nodes, track) {
  return nodes.find(node => node.track === track && !node.unlocked) || null;
}

export function createEmptyProgression() {
  return {
    currentEp: null,
    currentRank: null,
    nextRank: null,
    nextReward: null,
    totalRolls: 0,
    currentStreak: 0,
    milestones: [],
    journeyNodes: [],
    journeyByTrack: { ritual: [], discovery: [] },
    nextJourney: { ritual: null, discovery: null },
    recentUnlocks: [],
    weeklyFocus: null
  };
}

export function normalizeProgressionData(value, fallbackEp = null) {
  const root = isRecord(value) && isRecord(value.progression) ? value.progression : value;
  const payload = isRecord(root) ? root : {};
  const currentEp = normalizeEp(payload.current_ep ?? payload.lifetime_ep);
  const safeFallbackEp = normalizeEp(fallbackEp);
  const displayEp = currentEp ?? safeFallbackEp;
  const rankState = displayEp === null ? null : getRankState(displayEp);
  const reportedRank = normalizeRank(payload.current_rank);
  const currentRank = rankSnapshot(rankState?.current) || rankSnapshot(reportedRank);
  const nextRank = rankSnapshot(rankState?.next);
  const nextRewardManifest = MILESTONE_MANIFEST.find(milestone => milestone.rankId === nextRank?.id);
  const milestones = normalizeMilestoneList(payload.milestones || payload.milestone_track);
  const recentSource = Array.isArray(payload.recent_unlocks)
    ? payload.recent_unlocks
    : Array.isArray(payload.recentUnlocks)
      ? payload.recentUnlocks
      : [];
  const recentUnlocks = normalizeNewMilestones(recentSource).slice(0, MAX_RECENT_UNLOCKS);
  const journeyNodes = milestones.filter(milestone => milestone.track === 'ritual' || milestone.track === 'discovery');
  const journeyByTrack = getJourneyByTrack(journeyNodes);

  return {
    currentEp: displayEp,
    currentRank,
    nextRank,
    nextReward: nextRewardManifest ? { ...nextRewardManifest.reward, milestoneId: nextRewardManifest.id } : null,
    totalRolls: normalizeInteger(payload.total_rolls ?? payload.totalRolls, 1_000_000_000) ?? 0,
    currentStreak: normalizeInteger(payload.current_streak ?? payload.currentStreak, 1_000_000) ?? 0,
    milestones,
    journeyNodes,
    journeyByTrack,
    nextJourney: {
      ritual: getNextJourney(journeyNodes, 'ritual'),
      discovery: getNextJourney(journeyNodes, 'discovery')
    },
    recentUnlocks,
    weeklyFocus: normalizeWeeklyFocus(payload.weekly_focus || payload.weeklyFocus)
  };
}

export function getNextRankReward(rank) {
  const normalizedRank = normalizeRank(rank);
  const manifest = normalizedRank
    ? MILESTONE_MANIFEST.find(milestone => milestone.rankId === normalizedRank.id)
    : null;
  return manifest ? { ...manifest.reward, milestoneId: manifest.id } : null;
}

export async function loadMyProgression(supabaseClient, userId = null) {
  const empty = createEmptyProgression();
  if (!supabaseClient || !userId) return { data: empty, error: null };

  try {
    const { data, error } = await supabaseClient.rpc('get_my_progression');
    if (error) return { data: empty, error };
    if (data?.success === false) return { data: empty, error: new Error('Progression data is unavailable.') };
    return { data: normalizeProgressionData(data), error: null };
  } catch (error) {
    return {
      data: empty,
      error: error instanceof Error ? error : new Error('Progression data is unavailable.')
    };
  }
}

export { MILESTONE_MANIFEST };
