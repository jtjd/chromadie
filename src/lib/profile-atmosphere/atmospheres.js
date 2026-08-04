/**
 * Finite, code-owned atmosphere scenes. The catalog stores only these keys;
 * it never provides CSS, markup, URLs, or animation instructions.
 */
const definitions = {
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
