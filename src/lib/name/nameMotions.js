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
  'fuzzy-signal': composableMotion('fuzzy-signal', 3000, { label: 'Ghost Frequency', collection: 'Signal', rarity: 'Epic', description: 'Controlled horizontal signal slices distort the name.' }),
  'letter-shuffle': composableMotion('letter-shuffle', 3400, { label: 'Scramble', collection: 'Static Bloom', rarity: 'Anomaly', description: 'Characters rearrange before locking into place.' }),
  'chromatic-ripple': composableMotion('chromatic-ripple', 3600, { label: 'Color Wake', collection: 'Prism', rarity: 'Epic', description: 'A colored wave bends vertical sections of the letters.' }),
  'particle-drift': composableMotion('particle-drift', 4200, { label: 'Dustfall', collection: 'Prism', rarity: 'Epic', description: 'A bright field of dust lifts from the letterforms and falls back through them.' }),
  'typewriter-name': composableMotion('typewriter-name', 3600, { label: 'Type In', collection: 'Archive', rarity: 'Rare', description: 'Characters arrive one by one with a precise editorial cursor.' }),
  'filament-trace': composableMotion('filament-trace', 3800, { label: 'Filament Trace', collection: 'Signal', rarity: 'Epic', description: 'Luminous filaments thread through the name before tightening into a clean signal.' }),
  'prism-fracture': composableMotion('prism-fracture', 4200, { label: 'Prism Fracture', collection: 'Prism', rarity: 'Mythic', description: 'The name separates into vivid spectral facets, then snaps back into focus.' }),
  'molten-rise': composableMotion('molten-rise', 4400, { label: 'Molten Rise', collection: 'Ember', rarity: 'Anomaly', description: 'A hot liquid front climbs through the letters, shedding bright heat at the edge.', usesDailyColor: true }),
  'voltage-arc': composableMotion('voltage-arc', 3600, { label: 'Voltage Arc', collection: 'Signal', rarity: 'Anomaly', description: 'A living arc jumps between the letterforms in sharp cyan, violet, and white.' }),
  'archive-bloom': composableMotion('archive-bloom', 4600, { label: 'Archive Bloom', collection: 'Archive', rarity: 'Anomaly', description: 'Stored color memories bloom through the name like layered exposures.', usesRecentColors: true })
});

// Removed catalog rows remain valid historical values. They resolve to the
// closest curated motion at render time while their shop rows are marked
// legacy by the catalog migration and are no longer purchasable.
export const LEGACY_NAME_MOTION_ALIASES = Object.freeze({
  'velvet-sweep': 'filament-trace',
  'refraction-sweep': 'prism-fracture',
  'ghost-offset': 'fuzzy-signal',
  'focus-resolve': 'archive-bloom',
  'mask-reveal': 'typewriter-name',
  'quiet-afterimage': 'fuzzy-signal',
  'soft-rise': 'filament-trace',
  'scanline-reveal': 'fuzzy-signal',
  'liquid-fill': 'molten-rise',
  'pixel-dissolve': 'prism-fracture',
  'echo-collapse': 'archive-bloom',
  'heat-shimmer': 'molten-rise',
  'signal-lock': 'voltage-arc',
  'letter-cascade': 'typewriter-name',
  'orbiting-spark': 'voltage-arc',
  'color-memory': 'archive-bloom',
  'daily-pulse': 'molten-rise',
  'prism-shatter': 'prism-fracture',
  'ink-spread': 'archive-bloom'
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
