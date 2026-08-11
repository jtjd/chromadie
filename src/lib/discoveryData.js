export const DISCOVERY_TABS = Object.freeze([
  'today',
  'rivals',
  'weekly',
  'monthly',
  'roll',
  'recent',
  'rising',
  'new',
  'random'
]);

export const DISCOVERY_PAGE_SIZE = 8;

export const DISCOVERY_SURFACES = Object.freeze({
  today: 'today',
  weekly: 'weekly',
  monthly: 'monthly',
  roll: 'all_time',
  recent: 'recent',
  rising: 'rising',
  new: 'new',
  random: 'random'
});

const RARITIES = new Set(['Trash', 'Common', 'Uncommon', 'Rare', 'Epic', 'Anomaly', 'Mythic']);
const ITEM_KEY_PATTERN = /^[a-z0-9_]{1,80}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const AVATAR_PATH_PATTERN = new RegExp(`^avatars/${UUID_PATTERN.source.slice(1, -1)}/avatar\\.webp$`, 'i');

function safeText(value, maxLength = 120) {
  if (typeof value !== 'string') return '';
  return [...value]
    .filter(character => {
      const codePoint = character.codePointAt(0);
      return codePoint >= 0x20 && codePoint !== 0x7f;
    })
    .join('')
    .trim()
    .slice(0, maxLength);
}

function safeCount(value) {
  const count = Number(value);
  return Number.isSafeInteger(count) && count >= 0 ? count : 0;
}

function safeScore(value) {
  if (value === null || value === undefined || value === '') return null;
  const score = Number(value);
  return Number.isSafeInteger(score) && score >= 0 ? score : null;
}

function safeDate(value) {
  if (typeof value !== 'string') return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) && !/^\d{4}-\d{2}-\d{2}T/.test(value)) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? value : null;
}

function normalizeCosmetics(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value)
      .filter(([slot, itemKey]) => /^[a-z_]{1,30}$/.test(slot) && typeof itemKey === 'string' && ITEM_KEY_PATTERN.test(itemKey))
      .slice(0, 12)
  );
}

function normalizeBadges(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter(badge => typeof badge === 'string' && ITEM_KEY_PATTERN.test(badge))
    .slice(0, 16);
}

function normalizeHex(value) {
  return typeof value === 'string' && /^#[0-9A-F]{6}$/i.test(value)
    ? value.toUpperCase()
    : null;
}

function normalizeAvatarPath(value) {
  const candidate = typeof value === 'string' ? value.trim() : '';
  const isLegacyAvatar = AVATAR_PATH_PATTERN.test(candidate);
  return isProfileMediaPathForKind(candidate, 'avatar') && (isLegacyAvatar || candidate.endsWith('.webp'))
    ? candidate.toLowerCase()
    : null;
}

export function isSafeDiscoveryUsername(value) {
  return typeof value === 'string' && normalizeUsernameSegment(value) === value;
}

export function getDiscoverySurface(tab) {
  return DISCOVERY_SURFACES[tab] || DISCOVERY_SURFACES.today;
}

export function getPublicProfilePath(username) {
  if (!isSafeDiscoveryUsername(username)) return null;
  return getCanonicalProfilePath(username);
}

export function getPublicProfileShareUrl(username, origin = '') {
  const path = getPublicProfilePath(username);
  if (!path) return null;
  if (!origin) return path;
  try {
    return new URL(path, origin).toString();
  } catch {
    return path;
  }
}

export function getProfileShareText(item, origin = '') {
  const username = item?.username || '';
  const url = getPublicProfileShareUrl(username, origin);
  return url ? `Explore ${username}'s ChromaDie profile: ${url}` : '';
}

export function normalizeDiscoveryItem(raw) {
  if (!raw || typeof raw !== 'object' || !isSafeDiscoveryUsername(raw.username)) return null;

  const kind = raw.kind === 'profile' ? 'profile' : 'roll';
  const rank = safeCount(raw.rank);
  const score = safeScore(raw.score);
  const rarity = RARITIES.has(raw.rarity) ? raw.rarity : null;

  return {
    username: raw.username,
    hexCode: normalizeHex(raw.hexCode),
    score,
    rarity,
    rollDate: safeDate(raw.rollDate),
    identity: safeText(raw.identity),
    displayName: safeText(raw.displayName, 40),
    bio: safeText(raw.bio, 160),
    profileAccent: normalizeHex(raw.profileAccent),
    avatarPath: normalizeAvatarPath(raw.avatarPath),
    currentStreak: safeCount(raw.currentStreak),
    totalRolls: safeCount(raw.totalRolls),
    lifetimeEp: safeCount(raw.lifetimeEp),
    equippedCosmetics: normalizeCosmetics(raw.equippedCosmetics),
    equippedBadges: normalizeBadges(raw.equippedBadges),
    isStaff: raw.isStaff === true,
    rank: rank > 0 ? rank : null,
    profileCreatedAt: safeDate(raw.profileCreatedAt),
    kind
  };
}

export function normalizeDiscoveryResponse(raw) {
  const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const page = safeCount(source.page);
  const limit = Math.min(DISCOVERY_PAGE_SIZE, Math.max(1, safeCount(source.limit) || DISCOVERY_PAGE_SIZE));
  const items = Array.isArray(source.items)
    ? source.items.map(normalizeDiscoveryItem).filter(Boolean)
    : [];

  return {
    surface: typeof source.surface === 'string' ? source.surface : '',
    page,
    limit,
    hasMore: source.hasMore === true,
    items: items.slice(0, limit)
  };
}

export function normalizeRivalItem(raw) {
  const item = normalizeDiscoveryItem({
    ...raw,
    username: raw?.username,
    hexCode: raw?.hex_code,
    score: raw?.score,
    rarity: raw?.rarity,
    rollDate: raw?.roll_date,
    identity: raw?.identity,
    currentStreak: raw?.current_streak,
    totalRolls: raw?.total_rolls,
    lifetimeEp: raw?.lifetime_ep,
    equippedCosmetics: raw?.equipped_cosmetics,
    equippedBadges: raw?.equipped_badges,
    isStaff: raw?.is_staff,
    rank: raw?.rank,
    kind: 'roll'
  });

  if (!item || !UUID_PATTERN.test(raw?.user_id || '')) return null;
  return { ...item, userId: raw.user_id };
}

export function normalizeDiscoveryQuery(value) {
  const query = typeof value === 'string' ? value.trim() : '';
  return /^[A-Za-z0-9_]{0,20}$/.test(query) ? query : '';
}

export function isDiscoveryRarity(value) {
  return value === '' || RARITIES.has(value);
}
import { getCanonicalProfilePath, normalizeUsernameSegment } from './routeContract.js';
import { isProfileMediaPathForKind } from './profileExpression.js';
