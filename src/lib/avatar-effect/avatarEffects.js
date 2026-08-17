/** Finite avatar-local decoration registry. */
const definitions = {
  '3d-parallax': {
    key: '3d-parallax',
    label: '3D Parallax Tilt'
  },
  'glitch-slicer': {
    key: 'glitch-slicer',
    label: 'Glitch Slicer'
  },
  'liquid-blob': {
    key: 'liquid-blob',
    label: 'Liquid Blob'
  },
  'cyber-hud': {
    key: 'cyber-hud',
    label: 'Cyber HUD'
  }
};

const normalizedDefinitions = Object.fromEntries(
  Object.entries(definitions).map(([key, definition]) => [key, Object.freeze({ ...definition })])
);

export const AVATAR_EFFECT_KEYS = Object.freeze(Object.keys(normalizedDefinitions));
export const AVATAR_EFFECT_DEFINITIONS = Object.freeze(normalizedDefinitions);

export function getAvatarEffectDefinition(value) {
  if (typeof value !== 'string') return null;
  const candidate = value.trim();
  return AVATAR_EFFECT_DEFINITIONS[candidate]
    || (candidate.startsWith('avatar_effect_')
      ? AVATAR_EFFECT_DEFINITIONS[candidate.slice('avatar_effect_'.length).replaceAll('_', '-')]
      : null)
    || null;
}

export function isAvatarEffectKey(value) {
  return Boolean(getAvatarEffectDefinition(value));
}
