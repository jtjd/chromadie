import { PROFILE_LAYOUT_DEFINITIONS, PROFILE_LAYOUT_KEYS, normalizeProfileLayoutKey } from './profileLayouts.js';

const MODULE_ORDER = Object.freeze({
  compact: ['roll', 'stats', 'links', 'signature', 'recent', 'achievements', 'boundary', 'explore'],
  'full-bleed': ['roll', 'links', 'signature', 'recent', 'achievements', 'stats', 'boundary', 'explore']
});

const MODULE_SIZES = Object.freeze({
  roll: 'wide',
  stats: 'medium',
  signature: 'medium',
  links: 'medium',
  recent: 'wide',
  achievements: 'wide',
  boundary: 'medium',
  explore: 'wide'
});

function modulesFor(key) {
  return (MODULE_ORDER[key] || MODULE_ORDER.compact).map((id, order) => ({
    id,
    visible: true,
    order,
    size: MODULE_SIZES[id] || 'medium'
  }));
}

/** Build the bounded structural patch used by the Layout tab. */
export function createProfileLayoutPatch(value) {
  const key = normalizeProfileLayoutKey(value, 'compact');
  if (!PROFILE_LAYOUT_KEYS.includes(key) || !PROFILE_LAYOUT_DEFINITIONS[key]) return null;
  return {
    templateKey: key,
    layoutVariant: key,
    modules: modulesFor(key)
  };
}
