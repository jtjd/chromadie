/** Finite avatar-local decoration registry. */
const definitions = {
  'signal-ring': { key: 'signal-ring', label: 'Signal Ring' },
  'neon-halo': { key: 'neon-halo', label: 'Neon Halo' },
  'prism-orbit': { key: 'prism-orbit', label: 'Prism Orbit' },
  'crystal-aperture': { key: 'crystal-aperture', label: 'Crystal Aperture' },
  'chroma-arc': { key: 'chroma-arc', label: 'Chroma Arc' },
  'ember-crown': { key: 'ember-crown', label: 'Ember Crown' },
  ashfall: { key: 'ashfall', label: 'Ashfall' },
  'gold-laurel': { key: 'gold-laurel', label: 'Gold Laurel' },
  'ink-stamp': { key: 'ink-stamp', label: 'Ink Stamp' },
  'paper-tear': { key: 'paper-tear', label: 'Paper Tear' },
  'static-offset': { key: 'static-offset', label: 'Static Offset' },
  'pixel-satellites': { key: 'pixel-satellites', label: 'Pixel Satellites' },
  'crt-scan': { key: 'crt-scan', label: 'CRT Scan' },
  'void-eclipse': { key: 'void-eclipse', label: 'Void Eclipse' },
  'ghost-double': { key: 'ghost-double', label: 'Ghost Double' },
  'night-frame': { key: 'night-frame', label: 'Night Frame' },
  'daily-aura': { key: 'daily-aura', label: 'Daily Aura' },
  'color-archive': { key: 'color-archive', label: 'Color Archive' }
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
