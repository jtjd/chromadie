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
    description: 'A centered glass profile card with your identity, links, and daily color.',
    structure: Object.freeze({ identity: 'centered', roll: 'integrated', surface: 'reference-card' }),
    motionTarget: 'compact-card'
  },
  'full-bleed': {
    key: 'full-bleed',
    label: 'Immersive',
    description: 'A full-viewport identity scene with a large avatar, bio, and icon links.',
    structure: Object.freeze({ identity: 'centered', roll: 'below-fold', surface: 'cardless' }),
    motionTarget: 'full-bleed-identity'
  },
  framed: {
    key: 'framed',
    label: 'Framed',
    description: 'A left-aligned identity card with an overlapping avatar and icon links.',
    structure: Object.freeze({ identity: 'left', roll: 'below-fold', surface: 'reference-card' }),
    motionTarget: 'framed-card'
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
