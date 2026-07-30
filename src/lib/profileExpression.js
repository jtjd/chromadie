export const PROFILE_EXPRESSION_TYPES = Object.freeze(['track', 'playlist', 'album']);

export const PROFILE_STORAGE_BUCKETS = Object.freeze({
  avatar: 'avatars',
  background: 'backgrounds',
  audio: 'profile_audio'
});

const UUID_PATTERN = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const SPOTIFY_ID_PATTERN = /^[A-Za-z0-9]{22}$/;

function normalizeStoredPath(value, bucket, filename) {
  if (typeof value !== 'string') return null;
  const candidate = value.trim();
  const pattern = new RegExp(`^${bucket}/${UUID_PATTERN}/${filename}$`, 'i');
  return pattern.test(candidate) ? candidate : null;
}

export function normalizeProfileExpression(value = {}) {
  /** @type {Record<string, any>} */
  const source = value && typeof value === 'object' ? value : {};
  const spotifyType = PROFILE_EXPRESSION_TYPES.includes(source.spotify_type)
    ? source.spotify_type
    : null;
  const spotifyId = typeof source.spotify_id === 'string' && SPOTIFY_ID_PATTERN.test(source.spotify_id)
    ? source.spotify_id
    : null;

  return {
    avatar_path: normalizeStoredPath(source.avatar_path, PROFILE_STORAGE_BUCKETS.avatar, 'avatar.webp'),
    background_path: normalizeStoredPath(source.background_path, PROFILE_STORAGE_BUCKETS.background, 'background.webp'),
    audio_path: normalizeStoredPath(source.audio_path, PROFILE_STORAGE_BUCKETS.audio, 'profile.mp3'),
    spotify_type: spotifyType && spotifyId ? spotifyType : null,
    spotify_id: spotifyType && spotifyId ? spotifyId : null
  };
}

export function parseSpotifyUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return null;

  try {
    const url = new URL(value.trim());
    const segments = url.pathname.split('/').filter(Boolean);
    const type = segments[0] || '';
    const id = segments[1] || '';
    if (
      url.protocol !== 'https:'
      || url.hostname !== 'open.spotify.com'
      || url.port
      || url.hash
      || segments.length !== 2
      || !PROFILE_EXPRESSION_TYPES.includes(type)
      || !SPOTIFY_ID_PATTERN.test(id)
    ) return null;

    return { type, id };
  } catch {
    return null;
  }
}

export function spotifyUrlFromParts(type, id) {
  if (!PROFILE_EXPRESSION_TYPES.includes(type) || !SPOTIFY_ID_PATTERN.test(String(id || ''))) return '';
  return `https://open.spotify.com/${type}/${id}`;
}

export function getSpotifyEmbedUrl(type, id) {
  if (!PROFILE_EXPRESSION_TYPES.includes(type) || !SPOTIFY_ID_PATTERN.test(String(id || ''))) return '';
  return `https://open.spotify.com/embed/${type}/${id}?theme=0`;
}

export function buildProfileStoragePath(kind, userId) {
  const bucket = kind === 'avatar'
    ? PROFILE_STORAGE_BUCKETS.avatar
    : kind === 'background'
      ? PROFILE_STORAGE_BUCKETS.background
      : kind === 'audio'
        ? PROFILE_STORAGE_BUCKETS.audio
        : '';
  const filename = kind === 'avatar'
    ? 'avatar.webp'
    : kind === 'background'
      ? 'background.webp'
      : kind === 'audio'
        ? 'profile.mp3'
        : '';
  if (!bucket || !filename || !new RegExp(`^${UUID_PATTERN}$`, 'i').test(String(userId || ''))) return '';
  return `${bucket}/${String(userId).toLowerCase()}/${filename}`;
}

export function getProfileStorageRef(storedPath) {
  const avatarMatch = typeof storedPath === 'string'
    ? storedPath.match(new RegExp(`^(${PROFILE_STORAGE_BUCKETS.avatar})/(${UUID_PATTERN})/(avatar\\.webp)$`, 'i'))
    : null;
  if (avatarMatch) return { bucket: PROFILE_STORAGE_BUCKETS.avatar, objectPath: `${avatarMatch[2]}/${avatarMatch[3]}` };

  const backgroundMatch = typeof storedPath === 'string'
    ? storedPath.match(new RegExp(`^(${PROFILE_STORAGE_BUCKETS.background})/(${UUID_PATTERN})/(background\\.webp)$`, 'i'))
    : null;
  if (backgroundMatch) return { bucket: PROFILE_STORAGE_BUCKETS.background, objectPath: `${backgroundMatch[2]}/${backgroundMatch[3]}` };
  const audioMatch = typeof storedPath === 'string'
    ? storedPath.match(new RegExp(`^(${PROFILE_STORAGE_BUCKETS.audio})/(${UUID_PATTERN})/(profile\\.mp3)$`, 'i'))
    : null;
  if (audioMatch) return { bucket: PROFILE_STORAGE_BUCKETS.audio, objectPath: `${audioMatch[2]}/${audioMatch[3]}` };
  return null;
}

export const PROFILE_IMAGE_RULES = Object.freeze({
  avatar: Object.freeze({
    maxInputBytes: 5 * 1024 * 1024,
    maxOutputBytes: 256 * 1024,
    outputLabel: '256 KB',
    accept: Object.freeze(['image/jpeg', 'image/png', 'image/webp'])
  }),
  background: Object.freeze({
    maxInputBytes: 10 * 1024 * 1024,
    maxOutputBytes: 1024 * 1024,
    outputLabel: '1 MB',
    accept: Object.freeze(['image/jpeg', 'image/png', 'image/webp'])
  })
});

export const PROFILE_AUDIO_RULES = Object.freeze({
  maxInputBytes: 1024 * 1024,
  maxDurationSeconds: 60,
  accept: Object.freeze(['audio/mpeg'])
});
