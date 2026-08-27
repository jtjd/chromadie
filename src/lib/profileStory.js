import { getBadgeMeta } from './badgeData.js';

export const PROFILE_STORY_COLLECTION_ROLLS = 10;
export const PROFILE_STORY_TIMELINE_ROLLS = 3;

const EVENT_TYPES = new Set(['profile_created', 'roll']);
const RARITIES = new Set(['Trash', 'Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Anomaly', 'Mythic']);
const ID_PATTERN = /^[a-z0-9_:-]{1,120}$/i;
const HEX_PATTERN = /^#[0-9A-Fa-f]{6}$/;

function safeText(value, fallback = '', maxLength = 120) {
  const text = String(value ?? '').trim();
  return text && ![...text].some(character => {
    const code = character.codePointAt(0);
    return code < 32 || code === 127;
  })
    ? text.slice(0, maxLength)
    : fallback;
}

function safeDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function safeScore(value) {
  const text = String(value ?? '0');
  return /^\d{1,19}$/.test(text) ? text : '0';
}

function safeConditionIds(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value
    .map(condition => safeText(condition, '', 80))
    .filter(condition => ID_PATTERN.test(condition)))]
    .slice(0, 80);
}

function normalizeRollPayload(value) {
  const payload = value && typeof value === 'object' ? value : {};
  const conditionIds = safeConditionIds(payload.conditionIds || payload.condition_ids);
  const rarity = RARITIES.has(payload.rarity) ? payload.rarity : 'Common';
  return {
    hex: HEX_PATTERN.test(payload.hex) ? String(payload.hex).toUpperCase() : '#8B7CF6',
    score: safeScore(payload.score),
    rarity,
    identity: safeText(payload.identity, '', 120),
    conditionIds,
    traits: Array.isArray(payload.traits)
      ? payload.traits
        .filter(trait => trait && typeof trait === 'object')
        .slice(0, 12)
        .map(trait => ({
          id: safeText(trait.id, '', 80),
          label: safeText(trait.label, '', 80)
        }))
        .filter(trait => trait.id || trait.label)
      : []
  };
}

export function normalizeProfileTimeline(events) {
  if (!Array.isArray(events)) return [];

  return events
    .map((event, index) => {
      if (!event || typeof event !== 'object') return null;
      const eventType = safeText(event.eventType || event.event_type, '', 40);
      const occurredAt = safeDate(event.occurredAt || event.occurred_at);
      if (!EVENT_TYPES.has(eventType) || !occurredAt) return null;

      return {
        id: safeText(event.id || event.eventKey || event.event_key, 'event-' + index, 120),
        eventType,
        occurredAt,
        payload: eventType === 'roll' ? normalizeRollPayload(event.payload) : {}
      };
    })
    .filter(Boolean)
    .sort((left, right) => new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime())
    .slice(0, 40);
}

export function normalizeProfileCollection(items) {
  if (!Array.isArray(items)) return [];

  return items
    .map(item => {
      if (!item || typeof item !== 'object') return null;
      const id = safeText(item.id, '', 80);
      if (!ID_PATTERN.test(id)) return null;
      const fallback = getBadgeMeta(id);
      const count = Number(item.count);
      return {
        id,
        name: safeText(item.name, fallback.name || id, 80),
        icon: safeText(item.icon, fallback.symbol || '✦', 8),
        rarity: RARITIES.has(item.rarity) ? item.rarity : (fallback.rarity || 'Common'),
        count: Number.isFinite(count) ? Math.max(1, Math.min(Math.floor(count), 999999)) : 1,
        firstSeen: safeDate(item.firstSeen || item.first_seen),
        lastSeen: safeDate(item.lastSeen || item.last_seen)
      };
    })
    .filter(Boolean)
    .sort((left, right) => right.count - left.count || String(right.lastSeen).localeCompare(String(left.lastSeen)))
    .slice(0, 30);
}

export function normalizeProfileProgressionProof(value) {
  const root = value && typeof value === 'object' ? value : {};
  const source = Array.isArray(root.recent_unlocks)
    ? root.recent_unlocks
    : Array.isArray(root.recentUnlocks)
      ? root.recentUnlocks
      : [];
  const completedCountValue = Number(root.completed_count ?? root.completedCount);
  const completedCount = Number.isFinite(completedCountValue)
    ? Math.max(0, Math.min(Math.floor(completedCountValue), 1000000))
    : 0;

  return {
    completedCount,
    recentUnlocks: source
      .map(item => {
        if (!item || typeof item !== 'object') return null;
        const id = safeText(item.id, '', 100);
        if (!ID_PATTERN.test(id)) return null;
        const reward = item.reward && typeof item.reward === 'object' ? item.reward : {};
        return {
          id,
          name: safeText(item.name, id, 100),
          description: safeText(item.description, 'A profile cosmetic earned through play.', 220),
          track: ['rank', 'ritual', 'discovery'].includes(item.track) ? item.track : 'rank',
          unlockedAt: safeDate(item.unlockedAt || item.unlocked_at),
          reward: {
            name: safeText(reward.name, 'Profile cosmetic', 100),
            slot: safeText(reward.slot, 'expression', 60)
          }
        };
      })
      .filter(Boolean)
      .slice(0, 2)
  };
}

export function normalizeProfileStory(value) {
  const story = value && typeof value === 'object' ? value : {};
  return {
    timeline: normalizeProfileTimeline(story.timeline),
    collection: normalizeProfileCollection(story.collection || story.collections),
    progressionProof: normalizeProfileProgressionProof(story.progression_proof || story.progressionProof)
  };
}

export function getProfileStoryUnlocks(profile) {
  const totalRolls = Math.max(0, Number(profile?.total_rolls) || 0);
  return {
    totalRolls,
    timelineLimit: totalRolls >= PROFILE_STORY_COLLECTION_ROLLS
      ? 12
      : totalRolls >= PROFILE_STORY_TIMELINE_ROLLS
        ? 6
        : totalRolls >= 1 ? 3 : 1,
    collectionUnlocked: totalRolls >= PROFILE_STORY_COLLECTION_ROLLS,
    collectionRollsRequired: PROFILE_STORY_COLLECTION_ROLLS
  };
}
