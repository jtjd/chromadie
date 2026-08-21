const PROFILE_MOTIONS = Object.freeze({
  profile_motion_perspective_tilt: Object.freeze({
    itemKey: 'profile_motion_perspective_tilt',
    slot: 'profile_motion',
    key: 'perspective-tilt',
    name: '3D Tilt'
  }),
  profile_motion_halo_offset: Object.freeze({
    itemKey: 'profile_motion_halo_offset',
    slot: 'profile_motion',
    key: 'halo-offset',
    name: 'Halo Offset'
  }),
  profile_motion_wavefront: Object.freeze({
    itemKey: 'profile_motion_wavefront',
    slot: 'profile_motion',
    key: 'wavefront',
    name: 'Wavefront'
  })
});

export const PROFILE_MOTION_KEYS = Object.freeze(Object.keys(PROFILE_MOTIONS));
export const PROFILE_MOTION_DEFINITIONS = Object.freeze(PROFILE_MOTIONS);

function normalizeCandidate(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

export function getProfileMotionDefinition(value) {
  const candidate = normalizeCandidate(value);
  if (PROFILE_MOTIONS[candidate]) return PROFILE_MOTIONS[candidate];
  return Object.values(PROFILE_MOTIONS).find(definition => definition.key === candidate) || null;
}

export function getProfileMotionRendererKey(value) {
  return getProfileMotionDefinition(value)?.key || '';
}

export function isProfileMotionKey(value) {
  return Boolean(getProfileMotionDefinition(value));
}
