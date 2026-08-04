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
  },
  'silk-folds': {
    key: 'silk-folds', label: 'Silk Folds', collection: 'Prism', rarity: 'Rare',
    description: 'Moving folds of black silk carry a restrained sheen through the profile without adding a frame.'
  },
  'glass-caustics': {
    key: 'glass-caustics', label: 'Glass Caustics', collection: 'Archive', rarity: 'Epic',
    description: 'Refracted water light breaks across the page like a quiet pane catching the daily color.'
  },
  'cinder-drift': {
    key: 'cinder-drift', label: 'Cinder Drift', collection: 'Ember', rarity: 'Epic',
    description: 'Fine sparks lift through a dark field, adding a warm trace of motion behind the identity.'
  },
  'night-pollen': {
    key: 'night-pollen', label: 'Night Pollen', collection: 'Nocturne', rarity: 'Rare',
    description: 'Sparse points of out-of-focus light drift across a nocturnal field with a photographic softness.'
  },
  'paper-shadow': {
    key: 'paper-shadow', label: 'Paper Shadow', collection: 'Archive', rarity: 'Rare',
    description: 'Crumpled black paper gives the atmosphere a tactile surface and a quiet record of pressure.'
  },
  'smoke-spiral': {
    key: 'smoke-spiral', label: 'Smoke Spiral', collection: 'Prism', rarity: 'Anomaly',
    description: 'A slow, sculptural spiral of smoke turns the background into a living study of air and light.'
  },
  'lumen-flare': {
    key: 'lumen-flare', label: 'Lumen Flare', collection: 'Signal', rarity: 'Mythic',
    description: 'A distant lens flare blooms and recedes like a signal arriving through the dark.'
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
