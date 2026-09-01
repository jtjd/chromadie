import { PROFILE_LAYOUT_DEFINITIONS, PROFILE_LAYOUT_KEYS, normalizeProfileLayoutKey } from './profileLayouts.js';

const MODULE_ORDER = Object.freeze({
  compact: ['roll', 'stats', 'links', 'signature', 'recent', 'achievements', 'boundary', 'explore'],
  'full-bleed': ['roll', 'links', 'signature', 'recent', 'achievements', 'stats', 'boundary', 'explore'],
  sleek: ['roll', 'links', 'signature', 'recent', 'achievements', 'stats', 'boundary', 'explore'],
  framed: ['roll', 'links', 'signature', 'recent', 'achievements', 'stats', 'boundary', 'explore'],
  portfolio: ['roll', 'links', 'signature', 'recent', 'achievements', 'stats', 'boundary', 'explore']
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

function moduleVisibility(source) {
  const modules = Array.isArray(source) ? source : source?.modules;
  if (!Array.isArray(modules)) return new Map();
  return new Map(modules
    .filter(module => module && typeof module.id === 'string')
    .map(module => [module.id, module.visible !== false]));
}

function modulesFor(key, source = null) {
  const visibility = moduleVisibility(source);
  return (MODULE_ORDER[key] || MODULE_ORDER.compact).map((id, order) => ({
    id,
    visible: visibility.has(id) ? visibility.get(id) : true,
    order,
    size: MODULE_SIZES[id] || 'medium'
  }));
}

/** Build the bounded structural patch used by the Layout tab. */
export function createProfileLayoutPatch(value, source = null) {
  const key = normalizeProfileLayoutKey(value, 'compact');
  if (!PROFILE_LAYOUT_KEYS.includes(key) || !PROFILE_LAYOUT_DEFINITIONS[key]) return null;
  return {
    templateKey: key,
    layoutVariant: key,
    modules: modulesFor(key, source)
  };
}
