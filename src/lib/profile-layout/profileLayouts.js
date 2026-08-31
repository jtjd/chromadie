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
    label: 'Default',
    description: 'A banner-led identity card with a small daily color widget.',
    structure: Object.freeze({ identity: 'centered', roll: 'widget', surface: 'banner-card' }),
    motionTarget: 'compact-card'
  },
  'full-bleed': {
    key: 'full-bleed',
    label: 'Simplistic',
    description: 'A cardless identity scene with a small color widget and icon links.',
    structure: Object.freeze({ identity: 'centered', roll: 'widget', surface: 'cardless' }),
    motionTarget: 'full-bleed-identity'
  },
  sleek: {
    key: 'sleek',
    label: 'Sleek',
    description: 'A compact rounded identity card with an overlapping avatar.',
    structure: Object.freeze({ identity: 'left', roll: 'widget', surface: 'sleek-card' }),
    motionTarget: 'framed-card'
  },
  framed: {
    key: 'framed',
    label: 'Modern',
    description: 'A wide identity surface with a roll widget and separated media.',
    structure: Object.freeze({ identity: 'split', roll: 'widget', surface: 'modern-card' }),
    motionTarget: 'framed-card'
  },
  portfolio: {
    key: 'portfolio',
    label: 'Portfolio',
    description: 'A long-form profile hero that opens into story and project sections.',
    structure: Object.freeze({ identity: 'centered', roll: 'widget', surface: 'portfolio' }),
    motionTarget: 'full-bleed-identity'
  }
};

export const PROFILE_LAYOUT_KEYS = Object.freeze(Object.keys(PROFILE_LAYOUTS));
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
  const normalizedFallback = normalizeCandidate(fallback);
  if (PROFILE_LAYOUT_KEYS.includes(normalizedFallback)) return normalizedFallback;
  return 'compact';
}

export function getProfileLayoutDefinition(value) {
  const candidate = normalizeCandidate(value);
  return PROFILE_LAYOUT_DEFINITIONS[candidate] || null;
}

export function getProfileLayoutMotionTarget(value) {
  return getProfileLayoutDefinition(value)?.motionTarget || 'none';
}

export function isProfileLayoutKey(value) {
  return PROFILE_LAYOUT_KEYS.includes(normalizeCandidate(value));
}

/** Resolve the public renderer from the published/profile configuration. */
export function resolveProfileLayoutVariant(profileConfig = {}) {
  return normalizeProfileLayoutKey(profileConfig?.layoutVariant, 'compact');
}
