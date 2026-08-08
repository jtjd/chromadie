import { getProfileStorageRef } from './profileExpression.js';

export const PROFILE_METADATA_VERSION = 1;
export const PROFILE_METADATA_LIMITS = Object.freeze({ title: 80, description: 200 });
const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;

function safeText(value, maximum) {
  return [...String(value ?? '')]
    .filter(character => {
      const code = character.codePointAt(0);
      return code >= 32 && (code < 127 || code > 159);
    })
    .join('')
    .trim()
    .slice(0, maximum);
}

function safeMediaPath(value) {
  const candidate = String(value ?? '').trim();
  const reference = getProfileStorageRef(candidate);
  if (!reference) return null;
  const allowed = reference.bucket === 'profile_media'
    ? /\.webp$/i.test(reference.objectPath)
    : ['avatars', 'backgrounds'].includes(reference.bucket);
  return allowed ? candidate : null;
}

export function createDefaultProfileMetadata() {
  return {
    version: PROFILE_METADATA_VERSION,
    title: '',
    description: '',
    embedColor: '#CDD2FF',
    faviconPath: null,
    bannerPath: null
  };
}

export function normalizeProfileMetadata(value) {
  const fallback = createDefaultProfileMetadata();
  const input = value && typeof value === 'object' ? value : {};
  const embedColor = String(input.embedColor ?? input.embed_color ?? '').trim();
  return {
    version: PROFILE_METADATA_VERSION,
    title: safeText(input.title, PROFILE_METADATA_LIMITS.title),
    description: safeText(input.description, PROFILE_METADATA_LIMITS.description),
    embedColor: HEX_COLOR_PATTERN.test(embedColor) ? embedColor.toUpperCase() : fallback.embedColor,
    faviconPath: safeMediaPath(input.faviconPath ?? input.favicon_path),
    bannerPath: safeMediaPath(input.bannerPath ?? input.banner_path)
  };
}
