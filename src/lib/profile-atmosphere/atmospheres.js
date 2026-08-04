/**
 * Finite, code-owned atmosphere scenes. The catalog stores only these keys;
 * it never provides CSS, markup, URLs, or animation instructions.
 */
const definitions = {
  'signal-garden': {
    key: 'signal-garden', label: 'Signal Garden', collection: 'Signal', rarity: 'Rare',
    description: 'Measured signal filaments grow through a quiet field of roll-colored light.'
  },
  'aurora-veil': {
    key: 'aurora-veil', label: 'Aurora Veil', collection: 'Prism', rarity: 'Epic',
    description: 'Layered luminous veils drift behind the profile with a soft, editorial depth.'
  },
  'rain-window': {
    key: 'rain-window', label: 'Rain Window', collection: 'Nocturne', rarity: 'Rare',
    description: 'A seamless fall of fine rain turns the profile into a quiet weather signal.'
  },
  'droplets-glass': {
    key: 'droplets-glass', label: 'Droplets on Glass', collection: 'Archive', rarity: 'Rare',
    description: 'Realistic beads and trails cling to a pane, catching the daily color without obscuring the profile.'
  },
  'dust-light': {
    key: 'dust-light', label: 'Dustlight', collection: 'Archive', rarity: 'Rare',
    description: 'Fine particles drift through a single beam of light, revealing depth without filling the page.'
  },
  'ink-bloom': {
    key: 'ink-bloom', label: 'Ink Bloom', collection: 'Prism', rarity: 'Epic',
    description: 'A slow plume of ink unfurls like a living cloud, turning the profile into a moving study in density.'
  },
  snowfall: {
    key: 'snowfall', label: 'Snowfall', collection: 'Nocturne', rarity: 'Rare',
    description: 'Quiet flakes cross a black winter field in a soft, unhurried descent.'
  },
  'emberfall': {
    key: 'emberfall', label: 'Emberfall', collection: 'Ember', rarity: 'Epic',
    description: 'A small constellation of warm embers rises through the dark without covering the profile.'
  },
  'paper-archive': {
    key: 'paper-archive', label: 'Paper Archive', collection: 'Archive', rarity: 'Rare',
    description: 'Registration lines, paper fibers, and a restrained ink wash give the page a tactile history.'
  },
  'prism-lens': {
    key: 'prism-lens', label: 'Prism Lens', collection: 'Prism', rarity: 'Epic',
    description: 'A precise lens breaks the daily color into quiet spectral planes around the identity.'
  },
  'lunar-tide': {
    key: 'lunar-tide', label: 'Lunar Tide', collection: 'Nocturne', rarity: 'Anomaly',
    description: 'A slow lunar arc and a deep tide of light create a composed nocturnal stage.'
  },
  'color-memory': {
    key: 'color-memory', label: 'Color Memory', collection: 'Prism', rarity: 'Mythic',
    description: 'Recent rolls become an authored archive of moving light, unique to the profile’s history.'
  }
};

const normalizedDefinitions = Object.fromEntries(
  Object.entries(definitions).map(([key, definition]) => [key, Object.freeze({ ...definition })])
);

export const PROFILE_ATMOSPHERE_KEYS = Object.freeze(Object.keys(normalizedDefinitions));
export const PROFILE_ATMOSPHERE_DEFINITIONS = Object.freeze(normalizedDefinitions);

export function getAtmosphereDefinition(value) {
  if (typeof value !== 'string') return null;
  const candidate = value.trim();
  return PROFILE_ATMOSPHERE_DEFINITIONS[candidate]
    || (candidate.startsWith('profile_atmosphere_')
      ? PROFILE_ATMOSPHERE_DEFINITIONS[candidate.slice('profile_atmosphere_'.length).replaceAll('_', '-')]
      : null)
    || null;
}

export function isAtmosphereKey(value) {
  return Boolean(getAtmosphereDefinition(value));
}
