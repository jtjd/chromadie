import { normalizeDiscoveryResponse } from './discoveryData.js';
import { getCanonicalProfilePath } from './routeContract.js';

const VALID_ROLL_RARITIES = new Set(['Trash', 'Common', 'Uncommon', 'Rare', 'Epic', 'Anomaly', 'Mythic']);

// Approved staff-owned fallback identity. It is only hydrated through the
// public profile contract; an absent account produces the normal empty state.
export const KNOWN_STAFF_SHOWCASE_USERNAMES = Object.freeze(['Admin']);

function candidateKey(username) {
  return String(username || '').trim().toLowerCase();
}

function hasPublicExpression(context) {
  const config = context?.profileConfig?.published;
  return Boolean(config?.audio_path || (config?.spotify_type && config?.spotify_id));
}

function hasPublicRoll(context) {
  return Array.isArray(context?.targetScores) && context.targetScores.length > 0;
}

function profileRichness(model) {
  const context = model?.context;
  const profile = context?.targetProfile;
  const config = context?.profileConfig?.published;
  return [
    profile?.is_staff,
    Boolean(config?.background_path),
    Boolean(config?.avatar_path),
    Boolean(profile?.bio?.trim()),
    Boolean(config?.links?.length),
    hasPublicExpression(context),
    hasPublicRoll(context),
    Boolean(profile?.equipped_cosmetics && Object.keys(profile.equipped_cosmetics).length),
    model?.discoveryItem?.rank
  ].reduce((total, value) => total + (value ? 1 : 0), 0);
}

export function collectHomepageCandidates(responses = []) {
  const byUsername = new Map();

  for (const response of responses) {
    const surface = response?.surface || 'recent';
    const normalized = normalizeDiscoveryResponse(response?.data);
    for (const item of normalized.items) {
      const key = candidateKey(item.username);
      if (!key) continue;
      const next = { ...item, sourceSurface: surface };
      const previous = byUsername.get(key);
      if (!previous || (next.isStaff && !previous.isStaff) || (surface === 'today' && previous.sourceSurface !== 'today')) {
        byUsername.set(key, next);
      }
    }
  }

  return [...byUsername.values()]
    .sort((left, right) => Number(right.isStaff) - Number(left.isStaff)
      || (left.sourceSurface === 'today' ? -1 : 0) - (right.sourceSurface === 'today' ? -1 : 0)
      || (left.rank || Number.MAX_SAFE_INTEGER) - (right.rank || Number.MAX_SAFE_INTEGER)
      || String(left.username).localeCompare(String(right.username)));
}

export function selectHomepageProfiles(models = [], limit = 6) {
  const valid = models.filter(model => model?.context?.targetProfile?.username);
  const staff = valid.filter(model => model.context.targetProfile.is_staff === true);
  const sortByRichness = (left, right) => profileRichness(right) - profileRichness(left)
    || (left.discoveryItem?.rank || Number.MAX_SAFE_INTEGER) - (right.discoveryItem?.rank || Number.MAX_SAFE_INTEGER);
  const ordered = staff.length
    ? [...staff].sort(sortByRichness).concat(valid.filter(model => !staff.includes(model)).sort(sortByRichness))
    : [...valid].sort(sortByRichness);

  return ordered.slice(0, limit).map((model, index) => ({
    ...model,
    label: model.context.targetProfile.is_staff === true ? 'Example profile' : 'Public profile',
    placement: ['primary', 'left', 'right', 'lower'][index] || 'directory'
  }));
}

export function buildHomepageFeaturedProfiles(models = [], limit = 3) {
  return selectHomepageProfiles(models, limit)
    .map(model => {
      const context = model.context;
      const profile = context.targetProfile;
      const config = context.profileConfig?.published;
      const latestRoll = getLatestHomepageRoll(context);
      const profilePath = getCanonicalProfilePath(profile.username);
      if (!profilePath) return null;

      return {
        username: profile.username,
        displayName: profile.display_name || profile.username,
        bio: profile.bio || '',
        avatarPath: config?.avatar_path || null,
        profileAccent: config?.signatureColor || profile.mood_color || '#8B7CF6',
        equippedCosmetics: profile.equipped_cosmetics || {},
        hexCode: latestRoll?.hex_code || profile.best_roll_hex || null,
        score: latestRoll?.score ?? profile.best_roll_score ?? null,
        rarity: latestRoll?.rarity || profile.best_roll_rarity || null,
        identity: latestRoll?.identity || '',
        profilePath
      };
    })
    .filter(Boolean);
}

export function getLatestHomepageRoll(context) {
  const scores = Array.isArray(context?.targetScores) ? context.targetScores : [];
  return scores
    .filter(score => score?.hex_code || score?.identity || score?.score !== undefined)
    .slice()
    .sort((left, right) => String(right.roll_date || '').localeCompare(String(left.roll_date || '')))[0] || null;
}

export function collectHomepageRollEvents(models = [], limit = 12) {
  const events = [];
  const seen = new Set();

  for (const model of models) {
    const username = model?.context?.targetProfile?.username;
    const timeline = Array.isArray(model?.context?.timelineEvents) ? model.context.timelineEvents : [];
    for (const event of timeline) {
      if (event?.eventType !== 'roll' || !event.occurredAt || !event.payload?.hex || !username) continue;
      const eventKey = `${candidateKey(username)}:${event.id || event.occurredAt}:${event.payload.hex}`;
      if (seen.has(eventKey)) continue;
      seen.add(eventKey);
      events.push({
        id: eventKey,
        username,
        displayName: model.context.targetProfile.display_name || username,
        profilePath: model.profilePath,
        occurredAt: event.occurredAt,
        hex: event.payload.hex,
        identity: event.payload.identity || '',
        rarity: VALID_ROLL_RARITIES.has(event.payload.rarity) ? event.payload.rarity : '',
        score: /^\d{1,19}$/.test(String(event.payload.score || '')) ? String(event.payload.score) : ''
      });
    }
  }

  return events
    .sort((left, right) => new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime())
    .slice(0, limit);
}

export function formatHomepageRelativeTime(value, now = Date.now()) {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return '';
  const seconds = Math.max(0, Math.floor((now - timestamp) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function getHomepageTodayRollCount(responses = []) {
  const todayResponse = responses.find(response => response?.surface === 'today');
  const count = Number(todayResponse?.data?.todayRollCount);
  return Number.isSafeInteger(count) && count >= 0 ? count : null;
}

export function formatHomepageResetCountdown(now = Date.now()) {
  const current = new Date(now);
  const nextReset = Date.UTC(
    current.getUTCFullYear(),
    current.getUTCMonth(),
    current.getUTCDate() + 1,
    0,
    0,
    0,
    0
  );
  const difference = Math.max(0, nextReset - now);
  const hours = Math.floor(difference / 3600000);
  const minutes = Math.floor((difference % 3600000) / 60000);
  const seconds = Math.floor((difference % 60000) / 1000);
  return [hours, minutes, seconds].map(value => String(value).padStart(2, '0')).join(':');
}
