/**
 * Finite, code-owned Profile Border definitions.
 *
 * Catalog rows carry only one of these renderer keys. They never provide CSS,
 * animation code, or arbitrary visual instructions.
 */

const definitions = {
  celestial: {
    key: 'celestial',
    itemKey: 'border_celestial',
    label: 'Celestial',
    collection: 'Prism',
    rarity: 'Mythic'
  },
  chroma: {
    key: 'chroma',
    itemKey: 'border_chroma',
    label: 'Rosette',
    taste: 'Girly',
    collection: 'Prism',
    rarity: 'Mythic'
  },
  crystal: {
    key: 'crystal',
    itemKey: 'border_crystal',
    label: 'Crystal',
    collection: 'Prism',
    rarity: 'Mythic'
  },
  glitch: {
    key: 'glitch',
    itemKey: 'border_glitch',
    label: 'Love Letter',
    taste: 'Girly',
    collection: 'Static Bloom',
    rarity: 'Mythic'
  },
  gold: {
    key: 'gold',
    itemKey: 'border_gold',
    label: 'Sakura Diary',
    taste: 'Anime',
    collection: 'Archive',
    rarity: 'Mythic'
  },
  neon: {
    key: 'neon',
    itemKey: 'border_neon',
    label: 'Manga Panel',
    taste: 'Anime',
    collection: 'Signal',
    rarity: 'Epic'
  },
  prism: {
    key: 'prism',
    itemKey: 'border_prism',
    label: 'Midnight Rose',
    taste: 'Dark romance',
    collection: 'Prism',
    rarity: 'Epic'
  },
  void: {
    key: 'void',
    itemKey: 'border_void',
    label: 'Blackthorn',
    taste: 'Dark romance',
    collection: 'Nocturne',
    rarity: 'Mythic'
  },
  signal: {
    key: 'signal',
    itemKey: 'border_signal',
    label: 'Web Angel',
    taste: 'Old internet',
    collection: 'Signal',
    rarity: 'Rare'
  },
  elastic: {
    key: 'elastic',
    itemKey: 'border_elastic',
    label: 'Afterhours',
    taste: 'Old internet',
    collection: 'Signal',
    rarity: 'Epic'
  },
  'shimmer-track': {
    key: 'shimmer-track',
    itemKey: 'border_shimmer_track',
    label: 'Sea Glass',
    taste: 'Natural',
    collection: 'Prism',
    rarity: 'Epic'
  }
};

definitions.aurora = {
  key: 'aurora', itemKey: 'border_aurora', label: 'Wildflower',
  taste: 'Natural',
  collection: 'Prism', rarity: 'Epic'
};

// Historical IDs are retained because inventory and journey rewards refer to them.
export const AUTHORED_PROFILE_BORDER_KEYS = Object.freeze([
  'chroma', 'glitch', 'gold', 'neon', 'prism', 'void', 'signal', 'elastic', 'shimmer-track', 'aurora'
]);

const normalizedDefinitions = Object.fromEntries(
  Object.entries(definitions).map(([key, definition]) => [key, Object.freeze({ ...definition })])
);

export const PROFILE_BORDER_KEYS = Object.freeze(Object.keys(normalizedDefinitions));
export const PROFILE_BORDER_DEFINITIONS = Object.freeze(normalizedDefinitions);

function canonicalBorderKey(value) {
  if (typeof value !== 'string') return '';
  const candidate = value.trim();
  if (Object.prototype.hasOwnProperty.call(PROFILE_BORDER_DEFINITIONS, candidate)) return candidate;
  if (candidate.startsWith('border_')) {
    const itemKey = candidate.slice('border_'.length);
    const normalizedItemKey = itemKey.replaceAll('_', '-');
    if (Object.prototype.hasOwnProperty.call(PROFILE_BORDER_DEFINITIONS, normalizedItemKey)) return normalizedItemKey;
  }
  return '';
}

export function getProfileBorderDefinition(value) {
  const key = canonicalBorderKey(value);
  return key ? PROFILE_BORDER_DEFINITIONS[key] : null;
}

export function getProfileBorderKey(value) {
  return canonicalBorderKey(value);
}

export function isProfileBorderKey(value) {
  return Boolean(canonicalBorderKey(value));
}
