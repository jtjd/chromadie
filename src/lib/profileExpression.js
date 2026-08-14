export const PROFILE_EXPRESSION_TYPES = Object.freeze(['track', 'playlist', 'album']);

export const PROFILE_STORAGE_BUCKETS = Object.freeze({
  avatar: 'avatars',
  background: 'backgrounds',
  audio: 'profile_audio',
  rich: 'profile_media'
});

const UUID_PATTERN = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const SPOTIFY_ID_PATTERN = /^[A-Za-z0-9]{22}$/;
const UUID_RE = new RegExp(`^${UUID_PATTERN}$`, 'i');

function normalizeAssetId(value) {
  const candidate = String(value || '').trim();
  return UUID_RE.test(candidate) ? candidate.toLowerCase() : null;
}

function normalizeStoredPath(value, bucket, filename) {
  if (typeof value !== 'string') return null;
  const candidate = value.trim();
  const pattern = new RegExp(`^${bucket}/${UUID_PATTERN}/(?:${filename}|${UUID_PATTERN}[.]webp)$`, 'i');
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

  const output = {
    avatar_path: normalizeStoredPath(source.avatar_path, PROFILE_STORAGE_BUCKETS.avatar, 'avatar.webp'),
    background_path: normalizeStoredPath(source.background_path, PROFILE_STORAGE_BUCKETS.background, 'background.webp'),
    audio_path: normalizeStoredPath(source.audio_path, PROFILE_STORAGE_BUCKETS.audio, 'profile.mp3'),
    spotify_type: spotifyType && spotifyId ? spotifyType : null,
    spotify_id: spotifyType && spotifyId ? spotifyId : null
  };

  for (const field of ['avatar_asset_id', 'background_asset_id', 'audio_asset_id']) {
    if (Object.prototype.hasOwnProperty.call(source, field)) output[field] = normalizeAssetId(source[field]);
  }

  return output;
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

export function buildProfileStoragePath(kind, userId, assetId = '') {
  const bucket = kind === 'avatar'
    ? PROFILE_STORAGE_BUCKETS.avatar
    : kind === 'background'
      ? PROFILE_STORAGE_BUCKETS.background
      : kind === 'audio'
        ? PROFILE_STORAGE_BUCKETS.audio
        : '';
  const reusableAsset = ['avatar', 'background'].includes(kind)
    && new RegExp(`^${UUID_PATTERN}$`, 'i').test(String(assetId || ''));
  const filename = reusableAsset
    ? `${String(assetId).toLowerCase()}.webp`
    : kind === 'avatar'
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
    ? storedPath.match(new RegExp(`^(${PROFILE_STORAGE_BUCKETS.avatar})/(${UUID_PATTERN})/((?:avatar|${UUID_PATTERN})\\.webp)$`, 'i'))
    : null;
  if (avatarMatch) return { bucket: PROFILE_STORAGE_BUCKETS.avatar, objectPath: `${avatarMatch[2]}/${avatarMatch[3]}` };

  const backgroundMatch = typeof storedPath === 'string'
    ? storedPath.match(new RegExp(`^(${PROFILE_STORAGE_BUCKETS.background})/(${UUID_PATTERN})/((?:background|${UUID_PATTERN})\\.webp)$`, 'i'))
    : null;
  if (backgroundMatch) return { bucket: PROFILE_STORAGE_BUCKETS.background, objectPath: `${backgroundMatch[2]}/${backgroundMatch[3]}` };
  const audioMatch = typeof storedPath === 'string'
    ? storedPath.match(new RegExp(`^(${PROFILE_STORAGE_BUCKETS.audio})/(${UUID_PATTERN})/(profile\\.mp3)$`, 'i'))
    : null;
  if (audioMatch) return { bucket: PROFILE_STORAGE_BUCKETS.audio, objectPath: `${audioMatch[2]}/${audioMatch[3]}` };

  const richMatch = typeof storedPath === 'string'
    ? storedPath.match(new RegExp(`^(${PROFILE_STORAGE_BUCKETS.rich})/(${UUID_PATTERN})/(${UUID_PATTERN}\\.(?:mp4|webm|mp3|webp|ani))$`, 'i'))
    : null;
  if (richMatch) return { bucket: PROFILE_STORAGE_BUCKETS.rich, objectPath: `${richMatch[2]}/${richMatch[3]}` };
  return null;
}

/**
 * Validate the shared public path contract without making a storage or
 * database request. The database remains authoritative for ownership and
 * registration; consumers use this helper to accept both the legacy slot and
 * reusable UUID asset formats consistently.
 */
export function isProfileMediaPathForKind(storedPath, kind) {
  const reference = getProfileStorageRef(storedPath);
  const expectedBucket = kind === 'avatar'
    ? PROFILE_STORAGE_BUCKETS.avatar
    : kind === 'background'
      ? PROFILE_STORAGE_BUCKETS.background
      : kind === 'audio'
        ? PROFILE_STORAGE_BUCKETS.audio
        : '';
  return Boolean(reference && expectedBucket && reference.bucket === expectedBucket);
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
    maxOutputBytes: 4 * 1024 * 1024,
    outputLabel: '4 MB',
    accept: Object.freeze(['image/jpeg', 'image/png', 'image/webp'])
  })
});

export const PROFILE_AUDIO_RULES = Object.freeze({
  maxInputBytes: 5 * 1024 * 1024,
  accept: Object.freeze(['audio/mpeg'])
});
