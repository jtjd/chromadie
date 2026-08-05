/*
 * Motions are a finite, code-owned vocabulary. A renderer receives normalized
 * progress from the shared clock; no catalog row can supply executable motion
 * code or its own requestAnimationFrame loop.
 */

const motion = (key, durationMs, kind, extra = {}) => Object.freeze({
  key,
  durationMs,
  kind,
  composable: false,
  ...extra
});

const composableMotion = (key, durationMs, extra = {}) => motion(key, durationMs, key, {
  composable: true,
  ...extra
});

export const NAME_MOTIONS = Object.freeze({
  none: motion('none', 1, 'none', {
    composable: true,
    label: 'Still',
    collection: 'Baseline',
    rarity: 'Free',
    description: 'No animation.'
  }),

  // Curated paid motion definitions. These are complete, authored gestures;
  // the player never has to assemble a motion from a bag of generic parts.
  'haunt-glow': composableMotion('haunt-glow', 2800, { label: 'Glow', collection: 'Signal', rarity: 'Rare', description: 'A concentrated halo breathes around the name without washing out its edge.' }),
  'letter-shuffle': composableMotion('letter-shuffle', 3400, { label: 'Scramble', collection: 'Static Bloom', rarity: 'Anomaly', description: 'Characters rearrange before locking into place.' }),
  'typewriter-name': composableMotion('typewriter-name', 3600, { label: 'Type In', collection: 'Archive', rarity: 'Rare', description: 'Characters arrive one by one with a precise editorial cursor.' }),
  'haunt-particles': composableMotion('haunt-particles', 3400, { label: 'Particles', collection: 'Signal', rarity: 'Epic', description: 'A bright particle field lifts from the name and dissolves into the surrounding color.' }),
  'haunt-rainbow': composableMotion('haunt-rainbow', 3600, { label: 'Rainbow', collection: 'Prism', rarity: 'Epic', description: 'A saturated spectrum travels across the letterforms with a polished light pass.' }),
  'haunt-gradient': composableMotion('haunt-gradient', 3200, { label: 'Gradient', collection: 'Prism', rarity: 'Rare', description: 'A deep three-color gradient shifts slowly through the name with a crisp specular edge.' }),
  'haunt-fuzzy': composableMotion('haunt-fuzzy', 3000, { label: 'Fuzzy', collection: 'Static Bloom', rarity: 'Anomaly', description: 'The name resolves through soft signal noise and brief chromatic separation.' }),
  'haunt-reveal': composableMotion('haunt-reveal', 3000, { label: 'Reveal', collection: 'Archive', rarity: 'Rare', description: 'A clean light curtain unveils the name from left to right.' }),
  'haunt-split': composableMotion('haunt-split', 3200, { label: 'Split Reveal', collection: 'Archive', rarity: 'Epic', description: 'Two halves of the name enter on separate planes and meet on the centerline.' }),
  'haunt-flash': composableMotion('haunt-flash', 2600, { label: 'Flash', collection: 'Signal', rarity: 'Rare', description: 'A sharp white exposure rolls over the name before the color settles.' })
});

// Removed catalog rows remain valid historical values. They resolve to the
// closest curated motion at render time while their shop rows are marked
// legacy by the catalog migration and are no longer purchasable.
export const LEGACY_NAME_MOTION_ALIASES = Object.freeze({
  'fuzzy-signal': 'haunt-fuzzy',
  'chromatic-ripple': 'haunt-rainbow',
  'particle-drift': 'haunt-particles',
  'filament-trace': 'haunt-glow',
  'prism-fracture': 'haunt-gradient',
  'molten-rise': 'haunt-gradient',
  'voltage-arc': 'haunt-fuzzy',
  'archive-bloom': 'haunt-rainbow',
  'velvet-sweep': 'haunt-glow',
  'refraction-sweep': 'haunt-gradient',
  'ghost-offset': 'haunt-fuzzy',
  'focus-resolve': 'haunt-reveal',
  'mask-reveal': 'haunt-reveal',
  'quiet-afterimage': 'haunt-glow',
  'soft-rise': 'haunt-reveal',
  'scanline-reveal': 'haunt-fuzzy',
  'liquid-fill': 'haunt-gradient',
  'pixel-dissolve': 'haunt-split',
  'echo-collapse': 'haunt-reveal',
  'heat-shimmer': 'haunt-gradient',
  'signal-lock': 'haunt-glow',
  'letter-cascade': 'typewriter-name',
  'orbiting-spark': 'haunt-particles',
  'color-memory': 'haunt-rainbow',
  'daily-pulse': 'haunt-glow',
  'prism-shatter': 'haunt-split',
  'ink-spread': 'haunt-gradient'
});

export const NAME_MOTION_KEYS = Object.freeze(Object.keys(NAME_MOTIONS));
export const NAME_COMPOSABLE_MOTION_KEYS = Object.freeze(
  NAME_MOTION_KEYS.filter(key => NAME_MOTIONS[key].composable)
);
export const NAME_PAID_MOTION_KEYS = Object.freeze(
  NAME_COMPOSABLE_MOTION_KEYS.filter(key => key !== 'none')
);

function canonicalMotionKey(motionKey) {
  if (typeof motionKey !== 'string') return 'none';
  const candidate = motionKey.trim();
  const prefix = 'name_motion_';
  const namespaced = candidate.startsWith(prefix) ? candidate.slice(prefix.length) : '';
  const normalizedNamespaced = namespaced.replaceAll('_', '-');
  const normalized = Object.prototype.hasOwnProperty.call(NAME_MOTIONS, candidate) ? candidate : normalizedNamespaced;
  if (Object.prototype.hasOwnProperty.call(NAME_MOTIONS, normalized) && NAME_MOTIONS[normalized].composable) return normalized;
  return LEGACY_NAME_MOTION_ALIASES[normalized] || 'none';
}

export function resolveNameMotionKey(motionKey) {
  return canonicalMotionKey(motionKey);
}

export function getNameMotion(motionKey) {
  return NAME_MOTIONS[canonicalMotionKey(motionKey)] || NAME_MOTIONS.none;
}
