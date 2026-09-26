import { ATMOSPHERE_STUDIES } from './atmosphereStudies.js';
import { resolveAtmosphereKey } from './atmosphereKeys.js';
export { PROFILE_ATMOSPHERE_KEYS, isAtmosphereKey } from './atmosphereKeys.js';

/**
 * Finite, code-owned atmosphere scenes. The catalog stores only these keys;
 * it never provides CSS, markup, URLs, or animation instructions.
 */
const definitions = {
  ...Object.fromEntries(ATMOSPHERE_STUDIES.map(definition => [definition.key, definition])),
  'rain-window': {
    key: 'rain-window', label: 'Rain Window', collection: 'Nocturne', rarity: 'Rare',
    description: 'A seamless fall of fine rain turns the profile into a quiet weather signal.'
  },
  'droplets-glass': {
    key: 'droplets-glass', label: 'Droplets on Glass', collection: 'Archive', rarity: 'Rare',
    description: 'Realistic beads and trails cling to a pane, catching the daily color without obscuring the profile.'
  },
  'dust-light': {
    key: 'dust-light', label: 'Loveglass', collection: 'Archive', rarity: 'Rare',
    description: 'Rose glass hearts rise through pearly pin lights, catching reflections as they turn.'
  },
  'ink-bloom': {
    key: 'ink-bloom', label: 'Crimson Ink', collection: 'Prism', rarity: 'Epic',
    description: 'A broken crimson eclipse breathes with calligraphic ink currents and rising embers.'
  },
  snowfall: {
    key: 'snowfall', label: 'Snowfall', collection: 'Nocturne', rarity: 'Rare',
    description: 'Layered flakes drift through a blue winter field, from soft foreground crystals to distant pinpricks.'
  },
  'sakura-afterglow': {
    key: 'sakura-afterglow', label: 'Sakura Afterglow', collection: 'Prism', rarity: 'Rare',
    description: 'Painted cherry blossoms and wind-driven petals sweep across a soft anime dusk.'
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
    key: 'night-pollen', label: 'Starlight Tunnel', collection: 'Nocturne', rarity: 'Rare',
    description: 'A dense field of suspended lights folds through a deep nocturnal tunnel.'
  },
  'paper-shadow': {
    key: 'paper-shadow', label: 'Cyber Silk', collection: 'Prism', rarity: 'Rare',
    description: 'Liquid chrome ribbons twist between lilac and cyan beneath old-web star glints.'
  },
  'smoke-spiral': {
    key: 'smoke-spiral', label: 'Smoke Spiral', collection: 'Prism', rarity: 'Anomaly',
    description: 'A slow, sculptural spiral of smoke turns the background into a living study of air and light.'
  },
  'lumen-flare': {
    key: 'lumen-flare', label: 'Lumen Flare', collection: 'Signal', rarity: 'Mythic',
    description: 'A distant lens flare blooms and recedes like a signal arriving through the dark.'
  },
  'prism-dust': {
    key: 'prism-dust', label: 'Prism Dust', collection: 'Prism', rarity: 'Epic',
    description: 'Refractive shards drift at varied depths, catching light in small clustered constellations.'
  }
};

const normalizedDefinitions = Object.fromEntries(
  Object.entries(definitions).map(([key, definition]) => [key, Object.freeze({ ...definition })])
);

export const PROFILE_ATMOSPHERE_DEFINITIONS = Object.freeze(normalizedDefinitions);

export function getAtmosphereDefinition(value) {
  return PROFILE_ATMOSPHERE_DEFINITIONS[resolveAtmosphereKey(value)] || null;
}
