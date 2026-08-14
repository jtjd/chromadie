/**
 * The public profile layout catalog.
 *
 * Layouts are deliberately structural: they decide scale, alignment and
 * reading order, while the profile appearance/cosmetic renderers decide the
 * visual personality. Keep this registry small so public profiles do not
 * grow a second theme system.
 */
const PROFILE_LAYOUTS = {
  compact: {
    key: 'compact',
    label: 'Compact',
    description: 'A horizontal identity head with a tiny integrated daily roll.',
    footprint: 'small',
    structure: Object.freeze({ identity: 'horizontal', roll: 'integrated', surface: 'card' }),
    motionTarget: 'layout-frame'
  },
  sleek: {
    key: 'sleek',
    label: 'Sleek',
    description: 'A compact identity card with detached media and status modules when available.',
    footprint: 'small',
    structure: Object.freeze({ identity: 'stacked', roll: 'detached', surface: 'card-with-strips' }),
    motionTarget: 'layout-frame'
  },
  minimal: {
    key: 'minimal',
    label: 'Minimal',
    description: 'A free-floating, offset identity with an inline daily indicator.',
    footprint: 'floating',
    structure: Object.freeze({ identity: 'offset', roll: 'inline', surface: 'cardless' }),
    motionTarget: 'layout-frame'
  },
  modern: {
    key: 'modern',
    label: 'Modern',
    description: 'A compact identity surface with a small secondary roll widget.',
    footprint: 'small',
    structure: Object.freeze({ identity: 'compact', roll: 'widget', surface: 'card-with-region' }),
    motionTarget: 'layout-frame'
  },
  portfolio: {
    key: 'portfolio',
    label: 'Portfolio',
    description: 'A cardless centered identity landing that opens into a longer profile story.',
    footprint: 'longform',
    structure: Object.freeze({ identity: 'hero', roll: 'below-fold', surface: 'cardless' }),
    motionTarget: 'identity-frame'
  }
};

/**
 * Existing values remain readable during the migration window. These values
 * are not part of the active catalog and are never returned by
 * getProfileLayoutDefinition/isProfileLayoutKey.
 */
export const LEGACY_PROFILE_LAYOUT_MAP = Object.freeze({
  immersive: 'compact',
  editorial: 'sleek',
  focus: 'compact',
  signal: 'compact',
  archive: 'portfolio',
  atelier: 'modern',
  'split-signal': 'sleek',
  'archive-index': 'portfolio',
  'prism-mosaic': 'modern',
  'night-terminal': 'minimal',
  'story-stack': 'portfolio'
});

export const PROFILE_LAYOUT_KEYS = Object.freeze(Object.keys(PROFILE_LAYOUTS));
export const FREE_PROFILE_LAYOUTS = PROFILE_LAYOUT_KEYS;
// Kept as a compatibility export for callers that used to enumerate the
// premium novelty layouts. The replacement structural catalog is free; no
// layout key is entitlement-gated now.
export const PAID_PROFILE_LAYOUT_KEYS = Object.freeze([]);
export const PROFILE_LAYOUT_DEFINITIONS = Object.freeze(Object.fromEntries(
  PROFILE_LAYOUT_KEYS.map(key => [key, Object.freeze({ ...PROFILE_LAYOUTS[key] })])
));

function normalizeCandidate(value) {
  if (typeof value !== 'string') return '';
  const candidate = value.trim().toLowerCase();
  if (candidate.startsWith('profile_layout_')) {
    return candidate.slice('profile_layout_'.length).replaceAll('_', '-');
  }
  return candidate;
}

export function normalizeProfileLayoutKey(value, fallback = 'compact') {
  const candidate = normalizeCandidate(value);
  if (PROFILE_LAYOUT_KEYS.includes(candidate)) return candidate;
  const legacy = LEGACY_PROFILE_LAYOUT_MAP[candidate];
  if (legacy) return legacy;
  const normalizedFallback = normalizeCandidate(fallback);
  if (PROFILE_LAYOUT_KEYS.includes(normalizedFallback)) return normalizedFallback;
  return LEGACY_PROFILE_LAYOUT_MAP[normalizedFallback] || 'compact';
}

export function getProfileLayoutDefinition(value) {
  const candidate = normalizeCandidate(value);
  return PROFILE_LAYOUT_DEFINITIONS[candidate] || null;
}

export function getProfileLayoutMotionTarget(value) {
  return getProfileLayoutDefinition(value)?.motionTarget || 'none';
}

export function isPaidProfileLayoutKey() {
  return false;
}

export function isProfileLayoutKey(value) {
  return PROFILE_LAYOUT_KEYS.includes(normalizeCandidate(value));
}

/**
 * Resolve the public renderer from the published/profile configuration.
 * Legacy equipped profile_layout rows remain readable for ownership and
 * migration history, but never override the structural profile setting.
 */
export function resolveProfileLayoutVariant(profileConfig = {}) {
  return normalizeProfileLayoutKey(profileConfig?.layoutVariant, 'compact');
}

/**
 * Resolve a temporary fitting-room preview. This is intentionally separate
 * from the public resolver so selecting a shop item cannot mutate or silently
 * replace the saved profile configuration.
 */
export function resolveProfileLayoutPreviewVariant(previewLoadout = {}, profileConfig = {}) {
  return normalizeProfileLayoutKey(
    previewLoadout?.profile_layout || profileConfig?.layoutVariant,
    'compact'
  );
}

export function getProfileLayoutLabel(value) {
  return getProfileLayoutDefinition(value)?.label
    || PROFILE_LAYOUT_DEFINITIONS[normalizeProfileLayoutKey(value)]?.label
    || 'Compact';
}
