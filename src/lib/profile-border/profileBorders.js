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
    label: 'Chroma',
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
    label: 'Glitch',
    collection: 'Static Bloom',
    rarity: 'Mythic'
  },
  gold: {
    key: 'gold',
    itemKey: 'border_gold',
    label: 'Gold',
    collection: 'Archive',
    rarity: 'Mythic'
  },
  neon: {
    key: 'neon',
    itemKey: 'border_neon',
    label: 'Neon',
    collection: 'Signal',
    rarity: 'Epic'
  },
  prism: {
    key: 'prism',
    itemKey: 'border_prism',
    label: 'Prism',
    collection: 'Prism',
    rarity: 'Epic'
  },
  void: {
    key: 'void',
    itemKey: 'border_void',
    label: 'Void',
    collection: 'Nocturne',
    rarity: 'Mythic'
  },
  signal: {
    key: 'signal',
    itemKey: 'border_signal',
    label: 'Signal',
    collection: 'Signal',
    rarity: 'Rare'
  }
};

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
    if (Object.prototype.hasOwnProperty.call(PROFILE_BORDER_DEFINITIONS, itemKey)) return itemKey;
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
