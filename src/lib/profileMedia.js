import { DEFAULT_PROFILE_MEDIA_ORIGIN, resolveProfileMediaReference } from './profileMediaResolver.js';

function getConfiguredMediaOrigin() {
  return import.meta.env?.VITE_PROFILE_MEDIA_ORIGIN || DEFAULT_PROFILE_MEDIA_ORIGIN;
}

export function getProfileMediaUrl(mediaReference) {
  return resolveProfileMediaReference(mediaReference, {
    publicOrigin: getConfiguredMediaOrigin()
  });
}
