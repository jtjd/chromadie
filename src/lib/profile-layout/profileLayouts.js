/**
 * Profile layout registry. Layouts are finite code-owned compositions; the
 * catalog only stores the renderer key.
 */
const PAID_LAYOUTS = {
  'split-signal': { key: 'split-signal', label: 'Split Signal', collection: 'Signal', rarity: 'Rare' },
  'archive-index': { key: 'archive-index', label: 'Archive Index', collection: 'Archive', rarity: 'Rare' },
  'prism-mosaic': { key: 'prism-mosaic', label: 'Prism Mosaic', collection: 'Prism', rarity: 'Epic' },
  'night-terminal': { key: 'night-terminal', label: 'Night Terminal', collection: 'Nocturne', rarity: 'Epic' },
  'story-stack': { key: 'story-stack', label: 'Story Stack', collection: 'Ember', rarity: 'Anomaly' }
};

export const FREE_PROFILE_LAYOUTS = Object.freeze(['immersive', 'editorial', 'focus']);
export const PAID_PROFILE_LAYOUT_KEYS = Object.freeze(Object.keys(PAID_LAYOUTS));
export const PROFILE_LAYOUT_DEFINITIONS = Object.freeze(Object.fromEntries(
  Object.entries(PAID_LAYOUTS).map(([key, definition]) => [key, Object.freeze({ ...definition })])
));
export const PROFILE_LAYOUT_KEYS = Object.freeze([...FREE_PROFILE_LAYOUTS, ...PAID_PROFILE_LAYOUT_KEYS]);

export function getProfileLayoutDefinition(value) {
  if (typeof value !== 'string') return null;
  const candidate = value.trim();
  return PROFILE_LAYOUT_DEFINITIONS[candidate]
    || (candidate.startsWith('profile_layout_')
      ? PROFILE_LAYOUT_DEFINITIONS[candidate.slice('profile_layout_'.length).replaceAll('_', '-')]
      : null)
    || null;
}

export function isPaidProfileLayoutKey(value) {
  return Boolean(getProfileLayoutDefinition(value));
}

export function isProfileLayoutKey(value) {
  return PROFILE_LAYOUT_KEYS.includes(value);
}

export function resolveProfileLayoutVariant(equippedCosmetics = {}, profileConfig = {}) {
  if (FREE_PROFILE_LAYOUTS.includes(profileConfig?.layoutOverride)) return profileConfig.layoutOverride;
  const temporaryDefinition = getProfileLayoutDefinition(profileConfig?.layoutOverride);
  if (temporaryDefinition) return temporaryDefinition.key;
  const paidKey = equippedCosmetics?.profile_layout;
  const paidDefinition = getProfileLayoutDefinition(paidKey);
  if (paidDefinition) return paidDefinition.key;
  const fallback = profileConfig?.layoutVariant;
  return FREE_PROFILE_LAYOUTS.includes(fallback) ? fallback : 'immersive';
}

export function getProfileLayoutLabel(value) {
  return getProfileLayoutDefinition(value)?.label
    || ({ immersive: 'Immersive', editorial: 'Editorial', focus: 'Focused' }[value] || 'Immersive');
}
