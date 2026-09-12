/** Finite avatar-local decoration registry. Choreography indices match the shader. */
const labels = [
  '3D Parallax Tilt', 'Glitch Slicer', 'Liquid Blob', 'Cyber HUD', 'Butterfly Orbit', 'Fireflies',
  'Moonlit Clouds', 'Enchanted Garden', 'Prismatic Fracture',
  'Sakura Neko', 'Cloud Bunny', 'Crimson Ronin', 'Midnight Oni', 'Koi Current',
  'Sakura Petals', 'Bat Orbit'
];
const normalizedDefinitions = Object.fromEntries(labels.map((label, index) => {
  const key = index === 0 ? '3d-parallax' : label.toLowerCase().replaceAll(' ', '-');
  return [key, Object.freeze({ key, label,
    ...(index >= 6 && index <= 13 ? { choreography: index - 6, artwork: `/avatar-decorations/${key}-v1.webp` } : {}),
    ...(key === 'sakura-petals' ? { sprite: '/avatar-decorations/sakura-petal-v1.webp' } : {}),
    ...(key === 'bat-orbit' ? { disabled: true } : {})
  })];
}));

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
