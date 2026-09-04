import { getRankState, RANKS } from './ranks.js';

const MAX_EP = 1_000_000_000_000;
const MAX_RECENT_UNLOCKS = 8;
const MAX_PENDING_UNLOCKS = 16;
const MAX_MILESTONES = 64;
const MAX_TIMESTAMP_LENGTH = 80;
const MAX_TEXT_LENGTH = 220;
const TRACK_ORDER = Object.freeze({ rank: 0, ritual: 1, discovery: 2 });
const VALID_TRACKS = new Set(Object.keys(TRACK_ORDER));
const VALID_METRICS = new Set([
  'lifetime_ep',
  'achievement',
  'total_rolls',
  'current_streak',
  'longest_streak',
  'best_score'
]);
const VALID_PROGRESS_SOURCES = new Set([
  'lifetime_ep',
  'total_rolls',
  'current_streak',
  'longest_streak',
  'best_score',
  'achievement'
]);
const VALID_JOURNEY_STATES = new Set(['ready', 'partial', 'empty', 'unavailable']);
const VALID_PACE_BANDS = new Set(['days', 'weeks', 'months', 'season', 'years', 'lifetime', 'unknown']);
const VALID_ACCESS_TIERS = new Set(['free', 'earned', 'premium']);
// Presentation is server-authored. It separates intentional progress from
// stochastic discoveries without changing how a milestone is earned.
const VALID_PRESENTATION_ROLES = new Set([
  'objective',
  'open_discovery',
  'lifetime_discovery',
  'hidden_discovery',
  'historical'
]);

export const PROGRESSION_TRACKS = Object.freeze([
  Object.freeze({
    id: 'rank',
    key: 'mastery',
    label: 'Rank',
    description: 'Long-term profile mastery through earned EP.'
  }),
  Object.freeze({
    id: 'ritual',
    key: 'ritual',
    label: 'Ritual',
    description: 'The rolls and streaks that build a lasting profile.'
  }),
  Object.freeze({
    id: 'discovery',
    key: 'discovery',
    label: 'Discovery',
    description: 'Rare colors, patterns, and conditions found along the way.'
  })
]);

// This export is retained for existing callers that render only the two
// journey lanes. Rank/mastery is now available through PROGRESSION_TRACKS and
// the normalized tracks/journeyByTrack objects.
export const PROGRESSION_JOURNEY_LANES = Object.freeze([
  Object.freeze({ id: 'ritual', label: 'Ritual', description: 'Rolls and streaks.' }),
  Object.freeze({ id: 'discovery', label: 'Discovery', description: 'Rare colors and patterns.' })
]);

const RANK_BY_ID = new Map(
  RANKS.map(rank => [rank.name.toLowerCase(), Object.freeze({
    id: rank.name.toLowerCase(),
    name: rank.name,
    min: rank.min,
    color: rank.color
  })])
);

const rankThreshold = rankId => RANK_BY_ID.get(rankId)?.min || 0;

// The server manifest is authoritative. These five entries are retained only
// as a compatibility fallback for older deployments during migration.
const MILESTONE_MANIFEST = Object.freeze([
  Object.freeze({
    id: 'rank_silver',
    rankId: 'silver',
    threshold: rankThreshold('silver'),
    name: 'Silver',
    description: 'Reach Silver.',
    reward: Object.freeze({ itemKey: 'name_motion_typewriter_name', name: 'Type In', slot: 'name_motion' })
  }),
  Object.freeze({
    id: 'rank_gold',
    rankId: 'gold',
    threshold: rankThreshold('gold'),
    name: 'Gold',
    description: 'Reach Gold.',
    reward: Object.freeze({ itemKey: 'name_material_carbon_cut', name: 'Carbon Vein', slot: 'name_material' })
  }),
  Object.freeze({
    id: 'rank_platinum',
    rankId: 'platinum',
    threshold: rankThreshold('platinum'),
    name: 'Platinum',
    description: 'Reach Platinum.',
    reward: Object.freeze({ itemKey: 'name_motion_haunt_glow', name: 'Glow', slot: 'name_motion' })
  }),
  Object.freeze({
    id: 'rank_diamond',
    rankId: 'diamond',
    threshold: rankThreshold('diamond'),
    name: 'Diamond',
    description: 'Reach Diamond.',
    reward: Object.freeze({ itemKey: 'name_material_glass_emboss', name: 'Raised Glass', slot: 'name_material' })
  }),
  Object.freeze({
    id: 'rank_chroma',
    rankId: 'chroma',
    threshold: rankThreshold('chroma'),
    name: 'Chroma',
    description: 'Reach Chroma.',
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
    : typeof value.milestone_id === 'string'
      ? value.milestone_id
      : typeof value.milestone_key === 'string'
        ? value.milestone_key
        : typeof value.key === 'string'
          ? value.key
          : '';
}

function normalizeTrack(value) {
  const track = normalizeText(value, '', 24).toLowerCase();
  if (track === 'mastery') return 'rank';
  return VALID_TRACKS.has(track) ? track : '';
}

function normalizeMetric(value) {
  const metric = normalizeText(value, '', 32).toLowerCase();
  return VALID_METRICS.has(metric) ? metric : '';
}

function normalizeProgressSource(value) {
  const source = normalizeText(value, '', 32).toLowerCase();
  return VALID_PROGRESS_SOURCES.has(source) ? source : null;
}

function inferProgressSource(track, metric) {
  if (track === 'rank') return 'lifetime_ep';
  if (VALID_PROGRESS_SOURCES.has(metric)) return metric;
  return metric === 'achievement' ? 'achievement' : null;
}

function normalizePublished(value) {
  if (!isRecord(value)) return true;
  const status = normalizeText(value.status, '', 24).toLowerCase();
  if (['unpublished', 'inactive', 'retired', 'legacy'].includes(status)) return false;
  const published = value.published ?? value.is_published ?? value.isPublished;
  return published !== false;
}

function normalizePresentationRole(value, track, published) {
  const role = normalizeText(
    isRecord(value)
      ? value.presentation_role ?? value.presentationRole
      : value,
    '',
    32
  ).toLowerCase();
  if (VALID_PRESENTATION_ROLES.has(role)) return role;
  if (published === false) return 'historical';
  return track === 'discovery' ? 'open_discovery' : 'objective';
}

function normalizePaceBand(value, expectedRolls = null) {
  const raw = normalizeText(value, '', 24).toLowerCase();
  const aliases = {
    day: 'days',
    daily: 'days',
    week: 'weeks',
    weekly: 'weeks',
    month: 'months',
    monthly: 'months',
    seasonal: 'season',
    year: 'years',
    yearly: 'years',
    rare: 'lifetime',
    lifetime_event: 'lifetime'
  };
  const normalized = aliases[raw] || raw;
  if (VALID_PACE_BANDS.has(normalized)) return normalized;
  if (expectedRolls === null) return 'unknown';
  if (expectedRolls <= 14) return 'days';
  if (expectedRolls <= 90) return 'weeks';
  if (expectedRolls <= 730) return 'months';
  if (expectedRolls <= 2_000) return 'years';
  return 'lifetime';
}

function normalizePreviewMetadata(value) {
  if (!isRecord(value)) return null;
  const allowed = ['type', 'renderer', 'category', 'itemKey', 'item_key', 'slot', 'name', 'variant'];
  const preview = {};
  for (const key of allowed) {
    const normalized = normalizeText(value[key], '', key === 'name' ? 100 : 80);
    if (normalized) preview[key === 'item_key' ? 'itemKey' : key] = normalized;
  }
  return Object.keys(preview).length ? preview : null;
}

function normalizeReward(value, fallback = null) {
  const source = isRecord(value) ? value : null;
  const fallbackSource = isRecord(fallback) ? fallback : null;
  const itemKey = normalizeText(
    source?.item_key
      || source?.itemKey
      || source?.key
      || fallbackSource?.itemKey
      || fallbackSource?.item_key,
    '',
    100
  );
  if (!/^[a-z0-9_:-]{1,100}$/i.test(itemKey)) return null;

  const reward = {
    itemKey,
    name: normalizeText(source?.name || fallbackSource?.name, 'Profile cosmetic', 100),
    slot: normalizeText(source?.slot || fallbackSource?.slot, 'expression', 60)
  };
  const category = normalizeText(source?.category || source?.kind, '', 60);
  const accessTierCandidate = normalizeText(
    source?.access_tier || source?.accessTier || fallbackSource?.accessTier,
    '',
    24
  ).toLowerCase();
  const accessTier = VALID_ACCESS_TIERS.has(accessTierCandidate) ? accessTierCandidate : null;
  const renderer = normalizeText(source?.renderer || source?.rendererKey, '', 100);
  const description = normalizeText(source?.description, '', 220);
  const preview = normalizePreviewMetadata(source?.preview || source?.preview_metadata);

  if (category) reward.category = category;
  if (accessTier) reward.accessTier = accessTier;
  if (renderer) reward.renderer = renderer;
  if (description) reward.description = description;
  if (preview) reward.preview = preview;

  return reward;
}

function normalizeProgress(value) {
  if (!isRecord(value)) return null;
  const current = normalizeInteger(value.current, MAX_EP);
  const target = normalizeInteger(value.target, MAX_EP);
  if (current === null || target === null || target <= 0) return null;
  const boundedCurrent = Math.min(current, target);
  return {
    current: boundedCurrent,
    target,
    unit: normalizeText(value.unit, '', 24),
    percent: Math.round((boundedCurrent / target) * 100)
  };
}

function normalizeUnlockSource(value) {
  const source = normalizeText(value, '', 32).toLowerCase();
  return source === 'live' || source === 'historical_backfill' ? source : null;
}

function normalizeUnlockFields(value) {
  const source = isRecord(value) ? value : {};
  const unlockedAt = normalizeTimestamp(source.unlocked_at || source.unlockedAt);
  const presentedAt = normalizeTimestamp(source.presented_at || source.presentedAt);
  const acknowledgedAt = normalizeTimestamp(source.acknowledged_at || source.acknowledgedAt);
  return {
    unlockedAt,
    unlockSource: normalizeUnlockSource(source.unlock_source || source.unlockSource),
    presentedAt,
    acknowledgedAt,
    explicitlyNew: source.is_new === true
      || source.isNew === true
      || source.pending === true
      || source.pending_presentation === true
  };
}

function fallbackMilestone(manifest, entry = {}) {
  const source = isRecord(entry) ? entry : {};
  const unlock = normalizeUnlockFields(source);
  const progress = normalizeProgress(source.progress);
  const published = normalizePublished(source);
  return {
    id: manifest.id,
    name: normalizeText(source.name, manifest.name, 100),
    description: normalizeText(source.description, manifest.description, 220),
    threshold: manifest.threshold,
    track: 'rank',
    dimension: 'mastery',
    metric: 'lifetime_ep',
    achievementId: null,
    sortOrder: manifest.threshold,
    rankId: manifest.rankId,
    progressSource: 'lifetime_ep',
    progressTarget: manifest.threshold,
    expectedRolls: null,
    paceBand: 'unknown',
    published,
    presentationRole: normalizePresentationRole(source, 'rank', published),
    reward: normalizeReward(source.reward, manifest.reward) || { ...manifest.reward },
    progress,
    unlocked: source.unlocked === true || Boolean(unlock.unlockedAt),
    ...unlock,
    isNew: unlock.explicitlyNew
  };
}

function normalizeMilestoneEntry(value) {
  const key = milestoneKey(value);
  const manifest = MILESTONE_BY_ID.get(key);
  if (manifest) return fallbackMilestone(manifest, isRecord(value) ? value : {});

  if (!isRecord(value) || !/^[a-z0-9_:-]{1,100}$/i.test(key)) return null;
  const track = normalizeTrack(value.track || value.dimension);
  const metric = normalizeMetric(value.metric);
  const rewardValue = isRecord(value.reward)
    ? {
      ...value.reward,
      ...(isRecord(value.reward_metadata)
        ? value.reward_metadata
        : isRecord(value.rewardMetadata) ? value.rewardMetadata : {})
    }
    : {
      ...(isRecord(value.reward_metadata)
        ? value.reward_metadata
        : isRecord(value.rewardMetadata) ? value.rewardMetadata : {}),
      item_key: value.reward_item_key || value.rewardItemKey,
      name: value.reward_name || value.rewardName,
      slot: value.reward_slot || value.rewardSlot,
      access_tier: value.reward_access_tier || value.rewardAccessTier,
      renderer: value.reward_renderer || value.rewardRenderer
    };
  const reward = normalizeReward(rewardValue);
  if (!VALID_TRACKS.has(track) || !reward) return null;

  const threshold = normalizeInteger(
    value.threshold ?? value.progress_target ?? value.progressTarget,
    MAX_EP
  ) ?? 0;
  const sortOrder = normalizeInteger(value.sort_order ?? value.sortOrder, 100000) ?? 0;
  const achievementId = normalizeText(value.achievement_id || value.achievementId, '', 100) || null;
  const progressSource = normalizeProgressSource(
    value.progress_source
      || value.progressSource
      || inferProgressSource(track, metric)
  );
  const progressTarget = progressSource
    ? normalizeInteger(
      value.progress_target
        ?? value.progressTarget
        ?? (progressSource === 'lifetime_ep' ? threshold : null),
      MAX_EP
    )
    : null;
  const expectedRolls = normalizeInteger(
    value.expected_rolls ?? value.expectedRolls,
    100_000_000
  );
  const unlock = normalizeUnlockFields(value);
  const published = normalizePublished(value);
  const unlocked = value.unlocked === true
    || value.is_unlocked === true
    || Boolean(unlock.unlockedAt);

  if (!track || (!metric && !progressSource)) return null;
  if (track === 'rank' && progressSource !== 'lifetime_ep') return null;
  if (progressSource && progressTarget === null && progressSource !== 'achievement') return null;

  return {
    id: key,
    name: normalizeText(value.name, key, 100),
    description: normalizeText(value.description, 'A server-published profile milestone.', 220),
    threshold,
    track,
    dimension: track === 'rank' ? 'mastery' : track,
    metric: metric || progressSource,
    achievementId,
    sortOrder,
    rankId: normalizeRank(value.rank_id || value.rankId)?.id || null,
    progressSource,
    progressTarget,
    expectedRolls,
    paceBand: normalizePaceBand(value.pace_band || value.paceBand, expectedRolls),
    published,
    presentationRole: normalizePresentationRole(value, track, published),
    reward,
    progress: normalizeProgress(value.progress),
    unlocked,
    ...unlock,
    isNew: unlock.explicitlyNew
  };
}

function sortMilestones(left, right) {
  return (TRACK_ORDER[left.track] ?? 99) - (TRACK_ORDER[right.track] ?? 99)
    || left.sortOrder - right.sortOrder
    || left.id.localeCompare(right.id);
}

function shouldReplaceMilestone(previous, next) {
  if (!previous) return true;
  if (next.unlocked && !previous.unlocked) return true;
  if (next.isNew && !previous.isNew) return true;
  if (!next.published && previous.published && !previous.unlocked) return false;
  return true;
}

function normalizeMilestoneList(entries) {
  const normalized = new Map();
  const source = Array.isArray(entries) ? entries.slice(0, MAX_MILESTONES * 4) : [];

  for (const entry of source) {
    const milestone = normalizeMilestoneEntry(entry);
    if (!milestone) continue;
    const previous = normalized.get(milestone.id);
    if (shouldReplaceMilestone(previous, milestone)) normalized.set(milestone.id, milestone);
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
  for (const entry of entries.slice(0, MAX_PENDING_UNLOCKS * 2)) {
    const milestone = normalizeMilestoneEntry(entry);
    if (!milestone || seen.has(milestone.id)) continue;
    seen.add(milestone.id);
    normalized.push({
      ...milestone,
      unlocked: true,
      isNew: true,
      presentationState: 'new'
    });
    if (normalized.length >= MAX_PENDING_UNLOCKS) break;
  }
  return normalized.sort(sortMilestones);
}

function normalizeWeeklyFocus(value) {
  if (!isRecord(value)) return null;
  const targetHex = typeof value.target_hex === 'string' && /^#[0-9a-f]{6}$/i.test(value.target_hex)
    ? value.target_hex.toUpperCase()
    : typeof value.targetHex === 'string' && /^#[0-9a-f]{6}$/i.test(value.targetHex)
      ? value.targetHex.toUpperCase()
      : null;
  if (!targetHex) return null;
  return {
    weekStart: normalizeDate(value.week_start || value.weekStart),
    targetHex,
    completed: value.completed === true,
    bonusEp: normalizeInteger(value.bonus_ep ?? value.bonusEp, 1_000_000) ?? 50_000
  };
}

function createTrackGroups(nodes) {
  const rank = nodes.filter(node => node.track === 'rank');
  const ritual = nodes.filter(node => node.track === 'ritual');
  const discovery = nodes.filter(node => node.track === 'discovery');
  return {
    rank,
    mastery: rank,
    ritual,
    discovery
  };
}

function getNextJourney(nodes, track) {
  // Discoveries are independent events, not a queue of required objectives.
  if (track === 'discovery') return null;
  const trackNodes = nodes.filter(node => node.track === track && node.published !== false);
  return trackNodes.find(node => node.presentationState === 'active')
    || trackNodes.find(node => !node.unlocked)
    || null;
}

function mergePendingMilestones(milestones, pendingUnlocks) {
  const merged = new Map(milestones.map(milestone => [milestone.id, milestone]));
  for (const pending of pendingUnlocks) {
    const existing = merged.get(pending.id);
    merged.set(pending.id, existing
      ? { ...existing, ...pending, reward: pending.reward || existing.reward }
      : pending);
  }
  return [...merged.values()].sort(sortMilestones).slice(0, MAX_MILESTONES);
}

function derivePresentationState(milestone, trackNodes, pendingIds) {
  if (milestone.published === false) return 'unpublished';
  const isNew = pendingIds.has(milestone.id)
    || milestone.isNew
    || (milestone.unlocked
      && milestone.unlockSource === 'live'
      && !milestone.presentedAt
      && !milestone.acknowledgedAt);
  if (isNew && milestone.unlocked) return 'new';
  if (milestone.unlocked) return 'completed';

  // Discovery conditions are independent stochastic facts. Every still-locked
  // visible discovery remains an honest unfound opportunity; it must not be
  // presented as blocked behind an earlier random result or as the next task.
  if (milestone.track === 'discovery') return 'active';

  const firstLocked = trackNodes.find(node => !node.unlocked);
  return firstLocked?.id === milestone.id ? 'active' : 'future';
}

function withPresentationState(milestones, pendingUnlocks) {
  const pendingIds = new Set(pendingUnlocks.map(milestone => milestone.id));
  const visible = milestones.filter(milestone => milestone.published !== false);
  const groups = createTrackGroups(visible);
  return milestones.map(milestone => {
    const presentationState = derivePresentationState(
      milestone,
      groups[milestone.track] || [],
      pendingIds
    );
    return {
      ...milestone,
      presentationState,
      state: presentationState,
      isCompleted: milestone.unlocked === true,
      isActive: presentationState === 'active',
      isFuture: presentationState === 'future',
      isNew: presentationState === 'new'
    };
  });
}

export function createEmptyProgression() {
  const emptyTracks = { rank: [], mastery: [], ritual: [], discovery: [] };
  return {
    progressionVersion: null,
    journeyState: 'unavailable',
    currentEp: null,
    currentRank: null,
    nextRank: null,
    nextReward: null,
    totalRolls: 0,
    currentStreak: 0,
    longestStreak: 0,
    milestones: [],
    publishedMilestones: [],
    unpublishedMilestones: [],
    journeyNodes: [],
    journeyByTrack: { ...emptyTracks },
    tracks: { ...emptyTracks },
    trackProgress: {},
    nextJourney: { rank: null, mastery: null, ritual: null, discovery: null },
    activeGoals: [],
    activeObjectives: [],
    completedGoals: [],
    futureGoals: [],
    newGoals: [],
    goalsByState: {
      completed: [],
      active: [],
      future: [],
      new: []
    },
    pendingUnlocks: [],
    newUnlocks: [],
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

  const milestones = normalizeMilestoneList(
    payload.milestones
      || payload.milestone_track
      || payload.progression_milestones
      || []
  );
  const pendingSource = Array.isArray(payload.pending_unlocks)
    ? payload.pending_unlocks
    : Array.isArray(payload.pendingUnlocks)
      ? payload.pendingUnlocks
      : Array.isArray(payload.new_progression_unlocks)
        ? payload.new_progression_unlocks
        : Array.isArray(payload.new_milestones)
          ? payload.new_milestones
          : [];
  const pendingUnlocks = normalizeNewMilestones(pendingSource).slice(0, MAX_PENDING_UNLOCKS);
  const allMilestones = withPresentationState(
    mergePendingMilestones(milestones, pendingUnlocks),
    pendingUnlocks
  );
  const publishedMilestones = allMilestones.filter(milestone => milestone.published !== false);
  const unpublishedMilestones = allMilestones.filter(milestone => milestone.published === false);
  const journeyNodes = publishedMilestones.filter(
    milestone => milestone.track === 'ritual' || milestone.track === 'discovery'
  );
  const journeyByTrack = createTrackGroups(publishedMilestones);
  const recentSource = Array.isArray(payload.recent_unlocks)
    ? payload.recent_unlocks
    : Array.isArray(payload.recentUnlocks)
      ? payload.recentUnlocks
      : [];
  const recentUnlocks = normalizeNewMilestones(recentSource).slice(0, MAX_RECENT_UNLOCKS);
  const reportedJourneyStateCandidate = normalizeText(
    payload.journey_state || payload.journeyState,
    '',
    24
  ).toLowerCase();
  const reportedJourneyState = VALID_JOURNEY_STATES.has(reportedJourneyStateCandidate)
    ? reportedJourneyStateCandidate
    : '';
  const inferredJourneyState = journeyNodes.length
    ? journeyByTrack.ritual.length && journeyByTrack.discovery.length ? 'ready' : 'partial'
    : reportedJourneyState === 'empty' ? 'empty' : 'unavailable';
  const journeyState = journeyNodes.length
    ? inferredJourneyState
    : reportedJourneyState === 'empty' ? 'empty' : 'unavailable';
  const nextRankMilestone = nextRank
    ? journeyByTrack.rank.find(milestone => milestone.rankId === nextRank.id)
    : journeyByTrack.rank.find(milestone => milestone.presentationState === 'active');
  const activeGoals = publishedMilestones.filter(milestone => milestone.isActive);
  const activeObjectives = activeGoals.filter(milestone => milestone.presentationRole === 'objective');
  const completedGoals = publishedMilestones.filter(milestone => milestone.isCompleted);
  const futureGoals = publishedMilestones.filter(milestone => milestone.isFuture);
  const newGoals = publishedMilestones.filter(milestone => milestone.isNew);
  const trackProgress = Object.fromEntries(
    PROGRESSION_TRACKS.map(track => {
      const nodes = journeyByTrack[track.id] || [];
      const completed = nodes.filter(node => node.isCompleted).length;
      return [track.id, {
        completed,
        total: nodes.length,
        percent: nodes.length ? Math.round((completed / nodes.length) * 100) : 0
      }];
    })
  );
  trackProgress.mastery = trackProgress.rank;
  const emptyOrUnavailable = payload.success === false ? 'unavailable' : journeyState;

  return {
    progressionVersion: normalizeInteger(
      payload.progression_version ?? payload.progressionVersion,
      100
    ) ?? null,
    journeyState: emptyOrUnavailable,
    currentEp: displayEp,
    currentRank,
    nextRank,
    nextReward: nextRankMilestone
      ? { ...nextRankMilestone.reward, milestoneId: nextRankMilestone.id }
      : null,
    totalRolls: normalizeInteger(payload.total_rolls ?? payload.totalRolls, 1_000_000_000) ?? 0,
    currentStreak: normalizeInteger(payload.current_streak ?? payload.currentStreak, 1_000_000) ?? 0,
    longestStreak: normalizeInteger(payload.longest_streak ?? payload.longestStreak, 1_000_000) ?? 0,
    milestones: allMilestones,
    publishedMilestones,
    unpublishedMilestones,
    journeyNodes,
    journeyByTrack,
    tracks: journeyByTrack,
    trackProgress,
    nextJourney: {
      rank: getNextJourney(publishedMilestones, 'rank'),
      mastery: getNextJourney(publishedMilestones, 'rank'),
      ritual: getNextJourney(journeyNodes, 'ritual'),
      discovery: getNextJourney(journeyNodes, 'discovery')
    },
    nextObjective: activeObjectives[0] || null,
    activeObjectives,
    activeGoals,
    completedGoals,
    futureGoals,
    newGoals,
    goalsByState: {
      completed: completedGoals,
      active: activeGoals,
      future: futureGoals,
      new: newGoals
    },
    pendingUnlocks,
    newUnlocks: pendingUnlocks,
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

/**
 * Compatibility wrapper for the old import path. The narrow loader owns the
 * authenticated rpc('get_my_progression') boundary; this dynamic import keeps
 * the state module free of a circular dependency while older callers migrate.
 */
export async function loadMyProgression(supabaseClient, userId = null, fallbackEp = null) {
  const { loadProgressionData } = await import('./progressionData.js');
  return loadProgressionData(supabaseClient, userId, fallbackEp);
}

export { MILESTONE_MANIFEST };
