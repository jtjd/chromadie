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

  // Phase D1 paid motion definitions.
  'velvet-sweep': composableMotion('velvet-sweep', 3600, { label: 'Velvet Sweep', collection: 'Ember', rarity: 'Epic', description: 'A soft satin highlight travels across the name.' }),
  'refraction-sweep': composableMotion('refraction-sweep', 3600, { label: 'Refraction Sweep', collection: 'Prism', rarity: 'Epic', description: 'Cyan and rose refraction bands cross the letters.' }),
  'ghost-offset': composableMotion('ghost-offset', 4200, { label: 'Ghost Offset', collection: 'Static Bloom', rarity: 'Epic', description: 'Slow chromatic echoes drift behind the name.' }),
  'focus-resolve': composableMotion('focus-resolve', 3200, { label: 'Focus Resolve', collection: 'Nocturne', rarity: 'Rare', description: 'The name resolves from controlled blur.' }),
  'mask-reveal': composableMotion('mask-reveal', 3000, { label: 'Mask Reveal', collection: 'Archive', rarity: 'Rare', description: 'A clean horizontal reveal.' }),
  'quiet-afterimage': composableMotion('quiet-afterimage', 3600, { label: 'Quiet Afterimage', collection: 'Static Bloom', rarity: 'Rare', description: 'A restrained delayed copy trails the text.' }),
  'soft-rise': composableMotion('soft-rise', 3000, { label: 'Soft Rise', collection: 'Ember', rarity: 'Uncommon', description: 'A subtle entrance from below.' }),
  'scanline-reveal': composableMotion('scanline-reveal', 3200, { label: 'Scanline Reveal', collection: 'Signal', rarity: 'Epic', description: 'A scanning line reveals the name.' }),
  'particle-drift': composableMotion('particle-drift', 4200, { label: 'Particle Drift', collection: 'Prism', rarity: 'Epic', description: 'Small particles lift from the letterforms.' }),
  'letter-shuffle': composableMotion('letter-shuffle', 3400, { label: 'Letter Shuffle', collection: 'Static Bloom', rarity: 'Anomaly', description: 'Characters rearrange before locking into place.' }),
  'fuzzy-signal': composableMotion('fuzzy-signal', 3000, { label: 'Fuzzy Signal', collection: 'Signal', rarity: 'Epic', description: 'Controlled horizontal signal slices distort the name.' }),
  'typewriter-name': composableMotion('typewriter-name', 3600, { label: 'Typewriter Name', collection: 'Archive', rarity: 'Rare', description: 'Characters appear one by one.' }),
  'chromatic-ripple': composableMotion('chromatic-ripple', 3600, { label: 'Chromatic Ripple', collection: 'Prism', rarity: 'Epic', description: 'A colored wave bends vertical sections of the letters.' }),
  'liquid-fill': composableMotion('liquid-fill', 4200, { label: 'Liquid Fill', collection: 'Prism', rarity: 'Anomaly', description: 'Today’s color rises inside the name and settles.' }),
  'pixel-dissolve': composableMotion('pixel-dissolve', 3800, { label: 'Pixel Dissolve', collection: 'Static Bloom', rarity: 'Epic', description: 'The name assembles from a field of square fragments.' }),
  'echo-collapse': composableMotion('echo-collapse', 3800, { label: 'Echo Collapse', collection: 'Nocturne', rarity: 'Epic', description: 'Distant copies converge into the final name.' }),
  'heat-shimmer': composableMotion('heat-shimmer', 3400, { label: 'Heat Shimmer', collection: 'Ember', rarity: 'Rare', description: 'Thin horizontal bands refract like rising heat.' }),
  'signal-lock': composableMotion('signal-lock', 3200, { label: 'Signal Lock', collection: 'Signal', rarity: 'Epic', description: 'Misaligned signal slices snap cleanly into place.' }),
  'letter-cascade': composableMotion('letter-cascade', 3600, { label: 'Letter Cascade', collection: 'Archive', rarity: 'Epic', description: 'Characters fall individually into their final positions.' }),
  'orbiting-spark': composableMotion('orbiting-spark', 4200, { label: 'Orbiting Spark', collection: 'Prism', rarity: 'Epic', description: 'A bright spark traces around the name.' }),
  'color-memory': composableMotion('color-memory', 4600, { label: 'Color Memory', collection: 'Prism', rarity: 'Anomaly', description: 'Recent rolled colors pass through the lettering in sequence.', usesRecentColors: true }),
  'daily-pulse': composableMotion('daily-pulse', 4200, { label: 'Daily Pulse', collection: 'Ember', rarity: 'Epic', description: 'Today’s color blooms outward from the center.', usesDailyColor: true }),
  'prism-shatter': composableMotion('prism-shatter', 4200, { label: 'Prism Shatter', collection: 'Prism', rarity: 'Mythic', description: 'Faceted fragments separate and reassemble.' }),
  'ink-spread': composableMotion('ink-spread', 4000, { label: 'Ink Spread', collection: 'Archive', rarity: 'Epic', description: 'Soft ink expands into crisp finished letterforms.' })
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
  if (Object.prototype.hasOwnProperty.call(NAME_MOTIONS, candidate) && NAME_MOTIONS[candidate].composable) return candidate;
  const prefix = 'name_motion_';
  const namespaced = candidate.startsWith(prefix) ? candidate.slice(prefix.length) : '';
  const normalizedNamespaced = namespaced.replaceAll('_', '-');
  return Object.prototype.hasOwnProperty.call(NAME_MOTIONS, normalizedNamespaced) && NAME_MOTIONS[normalizedNamespaced].composable
    ? normalizedNamespaced
    : 'none';
}

export function resolveNameMotionKey(motionKey) {
  return canonicalMotionKey(motionKey);
}

export function getNameMotion(motionKey) {
  const candidate = typeof motionKey === 'string' && Object.prototype.hasOwnProperty.call(NAME_MOTIONS, motionKey.trim())
    ? motionKey.trim()
    : canonicalMotionKey(motionKey);
  return NAME_MOTIONS[candidate] || NAME_MOTIONS.none;
}
