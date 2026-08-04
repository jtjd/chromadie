/** Finite avatar-local decoration registry. */
const definitions = {
  'signal-ring': { key: 'signal-ring', label: 'Signal Ring', particles: true },
  'neon-halo': { key: 'neon-halo', label: 'Neon Halo', particles: true },
  'prism-orbit': {
    key: 'prism-orbit',
    label: 'Prism Orbit',
    authoredOverlay: '/avatar-effects/prism-orbit-authored.png',
    particles: true
  },
  'crystal-aperture': { key: 'crystal-aperture', label: 'Crystal Aperture', particles: true },
  'chroma-arc': { key: 'chroma-arc', label: 'Chroma Arc', particles: true },
  'ember-crown': {
    key: 'ember-crown',
    label: 'Ember Crown',
    authoredOverlay: '/avatar-effects/ember-crown-authored.png',
    particles: true
  },
  ashfall: { key: 'ashfall', label: 'Ashfall', particles: true },
  'gold-laurel': { key: 'gold-laurel', label: 'Gold Laurel', particles: true },
  'ink-stamp': { key: 'ink-stamp', label: 'Ink Stamp', particles: true },
  'paper-tear': { key: 'paper-tear', label: 'Paper Tear', particles: true },
  'static-offset': { key: 'static-offset', label: 'Static Offset', particles: true },
  'pixel-satellites': { key: 'pixel-satellites', label: 'Pixel Satellites', particles: true },
  'crt-scan': { key: 'crt-scan', label: 'CRT Scan', particles: true },
  'void-eclipse': { key: 'void-eclipse', label: 'Void Eclipse', particles: true },
  'ghost-double': {
    key: 'ghost-double',
    label: 'Ghost Double',
    authoredOverlay: '/avatar-effects/ghost-double-authored.png',
    particles: true,
    imageAware: true
  },
  'night-frame': { key: 'night-frame', label: 'Night Frame', particles: true },
  'daily-aura': { key: 'daily-aura', label: 'Daily Aura', particles: true },
  'color-archive': { key: 'color-archive', label: 'Color Archive', particles: true }
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
