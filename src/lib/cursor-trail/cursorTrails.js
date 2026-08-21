/**
 * Finite, code-owned cursor trail definitions. Catalog rows only carry one of
 * these renderer keys; they never provide drawing instructions.
 */
const definitions = {
  'signal-trace': { key: 'signal-trace', label: 'Signal Trace', collection: 'Signal', rarity: 'Rare' },
  'pixel-wake': { key: 'pixel-wake', label: 'Pixel Wake', collection: 'Static Bloom', rarity: 'Rare' },
  'chroma-ribbon': { key: 'chroma-ribbon', label: 'Chroma Ribbon', collection: 'Prism', rarity: 'Epic' },
  'glass-shards': { key: 'glass-shards', label: 'Glass Shards', collection: 'Prism', rarity: 'Epic' },
  'ember-ash': { key: 'ember-ash', label: 'Ember Ash', collection: 'Ember', rarity: 'Rare' },
  'comet-thread': { key: 'comet-thread', label: 'Comet Thread', collection: 'Nocturne', rarity: 'Epic' },
  'ink-drops': { key: 'ink-drops', label: 'Ink Drops', collection: 'Archive', rarity: 'Rare' },
  'orbit-dust': { key: 'orbit-dust', label: 'Orbit Dust', collection: 'Prism', rarity: 'Epic' },
  'static-echo': { key: 'static-echo', label: 'Static Echo', collection: 'Static Bloom', rarity: 'Epic' },
  'rain-trace': { key: 'rain-trace', label: 'Rain Trace', collection: 'Signal', rarity: 'Rare' },
  'gold-fleck': { key: 'gold-fleck', label: 'Gold Fleck', collection: 'Archive', rarity: 'Epic' },
  'ghost-tail': { key: 'ghost-tail', label: 'Ghost Tail', collection: 'Nocturne', rarity: 'Epic' },
  'color-memory': { key: 'color-memory', label: 'Color Memory', collection: 'Prism', rarity: 'Anomaly' },
  'marker-stroke': { key: 'marker-stroke', label: 'Marker Stroke', collection: 'Archive', rarity: 'Epic' },
  'solar-sparks': { key: 'solar-sparks', label: 'Solar Sparks', collection: 'Ember', rarity: 'Anomaly' },
  'void-lensing': { key: 'void-lensing', label: 'Void Lensing', collection: 'Nocturne', rarity: 'Mythic' },
  'plasma-swarm': { key: 'plasma-swarm', label: 'Plasma Swarm', collection: 'Signal', rarity: 'Anomaly' }
};

const normalizedDefinitions = Object.fromEntries(
  Object.entries(definitions).map(([key, definition]) => [key, Object.freeze({ ...definition })])
);

export const CURSOR_TRAIL_KEYS = Object.freeze(Object.keys(normalizedDefinitions));
export const CURSOR_TRAIL_DEFINITIONS = Object.freeze(normalizedDefinitions);

export function getCursorTrailDefinition(value) {
  if (typeof value !== 'string') return null;
  const candidate = value.trim();
  return CURSOR_TRAIL_DEFINITIONS[candidate]
    || (candidate.startsWith('cursor_trail_')
      ? CURSOR_TRAIL_DEFINITIONS[candidate.slice('cursor_trail_'.length).replaceAll('_', '-')]
      : null)
    || null;
}

export function isCursorTrailKey(value) {
  return Boolean(getCursorTrailDefinition(value));
}

export function getCursorTrailKey(value) {
  const definition = getCursorTrailDefinition(value);
  return definition?.key || '';
}
