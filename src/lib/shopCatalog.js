const NAME_SLOTS = ['name_font', 'name_material', 'name_motion'];
const PROFILE_SLOTS = [...NAME_SLOTS, 'profile_border', 'cursor_trail', 'avatar_effect', 'profile_layout', 'profile_atmosphere', 'profile_motion'];
const COSMETIC_SLOTS = [...PROFILE_SLOTS];

export const SHOP_NAME_SLOTS = Object.freeze([...NAME_SLOTS]);
export const SHOP_NAME_SUBTYPES = Object.freeze([
  { id: 'name_font', label: 'Fonts' },
  { id: 'name_material', label: 'Materials' },
  { id: 'name_motion', label: 'Motion' }
]);

export const SHOP_SECTIONS = Object.freeze([
  { id: 'featured', label: 'Featured' },
  { id: 'names', label: 'Names' },
  { id: 'borders', label: 'Borders' },
  { id: 'avatar', label: 'Avatar' },
  { id: 'atmosphere', label: 'Atmosphere' },
  { id: 'cursor', label: 'Cursor' },
  { id: 'layouts', label: 'Layouts' },
  { id: 'utility', label: 'Utility' },
  { id: 'owned', label: 'Owned' }
]);

export const SHOP_SUBSECTIONS = Object.freeze({
  names: [
    { id: 'name_font', label: 'Fonts' },
    { id: 'name_material', label: 'Materials' },
    { id: 'name_motion', label: 'Motion' }
  ],
  borders: [{ id: 'profile_border', label: 'Borders' }]
});

export const SHOP_SLOT_LABELS = Object.freeze({
  name_font: 'Name · Font',
  name_material: 'Name · Material',
  name_motion: 'Name · Motion',
  profile_border: 'Border',
  avatar_effect: 'Avatar effect',
  cursor_trail: 'Cursor trail',
  profile_layout: 'Profile layout',
  profile_atmosphere: 'Atmosphere',
  profile_motion: 'Profile motion',
  consumable: 'Utility',
  title: 'Title'
});

export const SHOP_CONTEXT_LABELS = Object.freeze({
  profile: 'Profile'
});

export const SHOP_SORTS = Object.freeze([
  { id: 'curated', label: 'Curated' },
  { id: 'price_asc', label: 'Price: Low' },
  { id: 'price_desc', label: 'Price: High' },
  { id: 'rarity', label: 'Rarity' }
]);

export const SHOP_RARITIES = Object.freeze(['Uncommon', 'Rare', 'Epic', 'Anomaly', 'Mythic']);
export const SHOP_ACCESS_TIERS = Object.freeze(['free', 'earned', 'premium']);
export const SHOP_OWNERSHIP_FILTERS = Object.freeze([
  { id: 'all', label: 'All items' },
  { id: 'owned', label: 'Owned' },
  { id: 'unowned', label: 'Not owned' }
]);

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
  'name_font_editorial_serif',
  'name_material_glass_emboss',
  'name_motion_haunt_rainbow',
  'border_signal',
  'name_material_neon_tube',
  'name_motion_haunt_gradient',
  'border_prism',
  'cursor_trail_color_memory',
  'avatar_effect_color_archive'
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

export function getCatalogStatus(item) {
  return ['active', 'legacy', 'retired'].includes(item?.catalog_status)
    ? item.catalog_status
    : 'active';
}

export function isActiveCatalogItem(item) {
  return getCatalogStatus(item) === 'active';
}

export function getShopNameSubtype(itemOrSlot) {
  const slot = typeof itemOrSlot === 'string' ? itemOrSlot : itemOrSlot?.slot;
  if (slot === 'name_font') return 'name_font';
  if (slot === 'name_material') return 'name_material';
  if (slot === 'name_motion') return 'name_motion';
  return null;
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

export function getShopItemState(item, equippedItems = {}, fittingRoom = createFittingRoom()) {
  const ownedCount = fittingRoom.inventoryCounts?.[item?.item_key] || 0;
  const accessTier = getShopAccessTier(item);
  const cost = Number(item?.cost) || 0;

  if (item && equippedItems[item.slot] === item.item_key) {
    return { label: 'Equipped', tone: 'equipped', ownedCount };
  }
  if (accessTier === 'free') return { label: 'Free baseline', tone: 'free', ownedCount };
  if (accessTier === 'premium') {
    return hasShopEntitlement(item, fittingRoom)
      ? { label: 'Premium unlocked', tone: 'premium', ownedCount }
      : { label: 'Premium expression', tone: 'premium-locked', ownedCount };
  }
  if (ownedCount > 0) {
    return { label: item?.slot === 'consumable' ? `${ownedCount} owned` : 'Owned', tone: 'owned', ownedCount };
  }
  if (cost <= 0) return { label: 'Earned milestone', tone: 'milestone', ownedCount };
  if (fittingRoom.balance < cost) return { label: 'Not enough EP', tone: 'unaffordable', ownedCount };
  return { label: 'Available', tone: 'available', ownedCount };
}

function matchesSection(item, section, subslot) {
  if (section === 'featured') return FEATURED_KEYS.includes(item.item_key);
  if (section === 'names') {
    return NAME_SLOTS.includes(item.slot)
      && (subslot === 'all' || item.slot === subslot);
  }
  if (section === 'borders') return item.slot === 'profile_border';
  if (section === 'avatar') return item.slot === 'avatar_effect';
  if (section === 'atmosphere') return item.slot === 'profile_atmosphere';
  if (section === 'cursor') return item.slot === 'cursor_trail';
  if (section === 'layouts') return item.slot === 'profile_layout';
  if (section === 'utility') return item.slot === 'consumable';
  if (section === 'owned') return item.slot !== 'consumable';
  return item.slot !== 'consumable' && item.slot !== 'title';
}

function curatedScore(item) {
  const featuredIndex = FEATURED_KEYS.indexOf(item.item_key);
  const featuredScore = featuredIndex === -1 ? 0 : (FEATURED_KEYS.length - featuredIndex) * 100000000;
  const collectionScore = item.collection === 'Signal Garden'
    ? 12000000
    : item.collection === 'Voidwalker' ? 10000000 : 0;
  return featuredScore + collectionScore + ((RARITY_RANK[item.rarity] || 0) * 1000000) + (Number(item.cost) || 0);
}

export function filterShopItems(items, filters = {}, fittingRoom = createFittingRoom()) {
  const {
    section = 'overview',
    subslot = 'all',
    query = '',
    rarity = 'all',
    collection = 'all',
    ownership = 'all',
    affordableOnly = false,
    sortMode = 'curated'
  } = filters;
  const normalizedQuery = String(query || '').trim().toLowerCase();

  const filtered = (Array.isArray(items) ? items : [])
    .filter(item => item && item.item_key !== 'title_founder' && item.slot !== 'title')
    .filter(item => section === 'owned' ? getCatalogStatus(item) !== 'retired' : isActiveCatalogItem(item))
    .filter(item => matchesSection(item, section, subslot))
    .filter(item => section !== 'owned' || hasShopEntitlement(item, fittingRoom))
    .filter(item => rarity === 'all' || item.rarity === rarity)
    .filter(item => collection === 'all' || item.collection === collection)
    .filter(item => ownership === 'all'
      || (ownership === 'owned' && hasShopEntitlement(item, fittingRoom))
      || (ownership === 'unowned' && !hasShopEntitlement(item, fittingRoom)))
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
