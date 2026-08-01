const PROFILE_SLOTS = ['name_effect', 'frame', 'profile_border', 'profile_bg', 'profile_atmosphere'];
const ROLL_SLOTS = ['orb_shape', 'roll_effect'];
const COSMETIC_SLOTS = [...PROFILE_SLOTS, ...ROLL_SLOTS, 'lb_theme'];

export const SHOP_SECTIONS = Object.freeze([
  { id: 'overview', label: 'Overview' },
  { id: 'profile', label: 'Profile' },
  { id: 'roll', label: 'Roll' },
  { id: 'leaderboard', label: 'Leaderboard' },
  { id: 'utility', label: 'Utility' },
  { id: 'owned', label: 'Owned' }
]);

export const SHOP_SUBSECTIONS = Object.freeze({
  profile: [
    { id: 'all', label: 'All profile' },
    { id: 'name_effect', label: 'Names' },
    { id: 'frame', label: 'Frames' },
    { id: 'profile_border', label: 'Borders' },
    { id: 'profile_bg', label: 'Backgrounds' },
    { id: 'profile_atmosphere', label: 'Atmospheres' }
  ],
  roll: [
    { id: 'all', label: 'All roll' },
    { id: 'orb_shape', label: 'Orbs' },
    { id: 'roll_effect', label: 'Effects' }
  ]
});

export const SHOP_SLOT_LABELS = Object.freeze({
  name_effect: 'Name',
  frame: 'Frame',
  profile_border: 'Border',
  profile_bg: 'Background',
  profile_atmosphere: 'Atmosphere',
  orb_shape: 'Orb',
  roll_effect: 'Roll effect',
  lb_theme: 'Leaderboard',
  consumable: 'Utility'
});

export const SHOP_CONTEXT_LABELS = Object.freeze({
  profile: 'Profile',
  roll: 'Roll',
  leaderboard: 'Leaderboard'
});

export const SHOP_SORTS = Object.freeze([
  { id: 'curated', label: 'Curated' },
  { id: 'price_asc', label: 'Price: Low' },
  { id: 'price_desc', label: 'Price: High' },
  { id: 'rarity', label: 'Rarity' }
]);

export const SHOP_RARITIES = Object.freeze(['Uncommon', 'Rare', 'Epic', 'Anomaly', 'Mythic']);
export const SHOP_ACCESS_TIERS = Object.freeze(['free', 'earned', 'premium']);

const RARITY_RANK = Object.freeze({
  Trash: 0,
  Common: 1,
  Uncommon: 2,
  Rare: 3,
  Epic: 4,
  Anomaly: 5,
  Mythic: 6
});

const FEATURED_KEYS = Object.freeze([
  'bg_void',
  'roll_black_hole',
  'name_void',
  'border_void',
  'lb_void',
  'orb_star'
]);

export function isShopCosmetic(item) {
  return Boolean(item && COSMETIC_SLOTS.includes(item.slot));
}

export function getShopAccessTier(item) {
  return SHOP_ACCESS_TIERS.includes(item?.access_tier) ? item.access_tier : 'earned';
}

export function getShopAccessLabel(item) {
  const tier = getShopAccessTier(item);
  if (tier === 'free') return 'Free baseline';
  if (tier === 'premium') return 'Premium expression';
  return Number(item?.cost) > 0 ? 'Earned with EP' : 'Earned milestone';
}

export function hasShopEntitlement(item, fittingRoom = createFittingRoom()) {
  const tier = getShopAccessTier(item);
  if (tier === 'free') return true;
  if (tier !== 'premium') return (fittingRoom.inventoryCounts?.[item?.item_key] || 0) > 0;
  return Boolean(
    item?.entitlement_key
    && Array.isArray(fittingRoom.entitlements)
    && fittingRoom.entitlements.includes(item.entitlement_key)
  );
}

export function requiresPurchaseConfirmation(item) {
  return Boolean(item && (item.slot === 'consumable' || Number(item.cost) >= 100000));
}

export function getShopContextForSlot(slot) {
  if (PROFILE_SLOTS.includes(slot)) return 'profile';
  if (ROLL_SLOTS.includes(slot)) return 'roll';
  if (slot === 'lb_theme') return 'leaderboard';
  return null;
}

export function inventoryToCounts(inventory = []) {
  if (!Array.isArray(inventory)) return {};
  return inventory.reduce((counts, itemKey) => {
    if (typeof itemKey !== 'string' || !itemKey) return counts;
    counts[itemKey] = (counts[itemKey] || 0) + 1;
    return counts;
  }, {});
}

export function createFittingRoom({
  walletBalance = 0,
  userInventory = [],
  equippedItems = {},
  rerollShards = 0,
  entitlements = []
} = {}) {
  const inventoryCounts = inventoryToCounts(userInventory);
  const shardCount = Math.max(0, Math.floor(Number(rerollShards) || 0));
  if (shardCount > 0) inventoryCounts.reroll_shard = shardCount;

  return {
    balance: Math.max(0, Math.floor(Number(walletBalance) || 0)),
    inventoryCounts,
    loadout: { ...(equippedItems || {}) },
    entitlements: [...new Set((Array.isArray(entitlements) ? entitlements : [])
      .filter(value => typeof value === 'string' && /^[a-z0-9_]{1,80}$/.test(value)))]
  };
}

export function tryOnShopItem(loadout, item) {
  if (!isShopCosmetic(item)) return { ...(loadout || {}) };
  return { ...(loadout || {}), [item.slot]: item.item_key };
}

export function clearShopSlot(loadout, slot) {
  const next = { ...(loadout || {}) };
  if (COSMETIC_SLOTS.includes(slot)) delete next[slot];
  return next;
}

function matchesSection(item, section, subslot) {
  if (section === 'profile') {
    return PROFILE_SLOTS.includes(item.slot) && (subslot === 'all' || item.slot === subslot);
  }
  if (section === 'roll') {
    return ROLL_SLOTS.includes(item.slot) && (subslot === 'all' || item.slot === subslot);
  }
  if (section === 'leaderboard') return item.slot === 'lb_theme';
  if (section === 'utility') return item.slot === 'consumable';
  return item.slot !== 'consumable';
}

function curatedScore(item) {
  const featuredIndex = FEATURED_KEYS.indexOf(item.item_key);
  const featuredScore = featuredIndex === -1 ? 0 : (FEATURED_KEYS.length - featuredIndex) * 100000000;
  const collectionScore = item.collection === 'Voidwalker' ? 10000000 : 0;
  return featuredScore + collectionScore + ((RARITY_RANK[item.rarity] || 0) * 1000000) + (Number(item.cost) || 0);
}

export function filterShopItems(items, filters = {}, fittingRoom = createFittingRoom()) {
  const {
    section = 'overview',
    subslot = 'all',
    query = '',
    rarity = 'all',
    affordableOnly = false,
    sortMode = 'curated'
  } = filters;
  const normalizedQuery = String(query || '').trim().toLowerCase();

  const filtered = (Array.isArray(items) ? items : [])
    .filter(item => item && item.item_key !== 'title_founder' && item.slot !== 'title')
    .filter(item => matchesSection(item, section, subslot))
    .filter(item => section !== 'owned' || hasShopEntitlement(item, fittingRoom))
    .filter(item => rarity === 'all' || item.rarity === rarity)
    .filter(item => !affordableOnly || (item.cost > 0 && item.cost <= fittingRoom.balance))
    .filter(item => {
      if (!normalizedQuery) return true;
      return [item.name, item.description, item.collection, SHOP_SLOT_LABELS[item.slot]]
        .filter(Boolean)
        .some(value => String(value).toLowerCase().includes(normalizedQuery));
    });

  return filtered.sort((a, b) => {
    if (sortMode === 'price_asc') return a.cost - b.cost || a.name.localeCompare(b.name);
    if (sortMode === 'price_desc') return b.cost - a.cost || a.name.localeCompare(b.name);
    if (sortMode === 'rarity') {
      return (RARITY_RANK[b.rarity] || 0) - (RARITY_RANK[a.rarity] || 0)
        || b.cost - a.cost
        || a.name.localeCompare(b.name);
    }
    return curatedScore(b) - curatedScore(a) || a.name.localeCompare(b.name);
  });
}

export function getCollectionItems(items, collection, excludeKey = null) {
  if (!collection) return [];
  return (Array.isArray(items) ? items : [])
    .filter(item => item.collection === collection && item.item_key !== excludeKey && isShopCosmetic(item))
    .sort((a, b) => (RARITY_RANK[b.rarity] || 0) - (RARITY_RANK[a.rarity] || 0) || a.cost - b.cost);
}
