/**
 * Structured contract for premium profile media. Rich media is deliberately
 * kept separate from the legacy avatar/background slots so free profiles keep
 * their existing image path and no renderer has to trust arbitrary URLs.
 */

export const PROFILE_RICH_MEDIA_BUCKET = 'profile_media';
export const PROFILE_RICH_MEDIA_KINDS = Object.freeze([
  'background_video',
  'banner',
  'audio',
  'cursor',
  'pointer_cursor'
]);

const UUID_PATTERN = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const UUID_RE = new RegExp(`^${UUID_PATTERN}$`, 'i');

const MB = 1024 * 1024;

export const PROFILE_RICH_MEDIA_RULES = Object.freeze({
  background_video: Object.freeze({
    maxCount: 3,
    maxInputBytes: 25 * MB,
    maxOutputBytes: 25 * MB,
    accept: Object.freeze(['video/mp4', 'video/webm']),
    extensions: Object.freeze(['mp4', 'webm']),
    label: '25 MB'
  }),
  audio: Object.freeze({
    maxCount: 5,
    maxInputBytes: 10 * MB,
    maxOutputBytes: 10 * MB,
    accept: Object.freeze(['audio/mpeg']),
    extensions: Object.freeze(['mp3']),
    label: '10 MB'
  }),
  banner: Object.freeze({
    maxCount: 1,
    maxInputBytes: 10 * MB,
    maxOutputBytes: 2 * MB,
    accept: Object.freeze(['image/jpeg', 'image/png', 'image/webp']),
    extensions: Object.freeze(['webp']),
    label: '2 MB WebP'
  }),
  cursor: Object.freeze({
    maxCount: 1,
    maxInputBytes: 5 * MB,
    maxOutputBytes: 128 * 1024,
    maxWidth: 128,
    maxHeight: 128,
    accept: Object.freeze(['image/jpeg', 'image/png', 'image/webp']),
    extensions: Object.freeze(['webp']),
    label: '128 KB WebP'
  }),
  pointer_cursor: Object.freeze({
    maxCount: 1,
    maxInputBytes: 5 * MB,
    maxOutputBytes: 128 * 1024,
    maxWidth: 128,
    maxHeight: 128,
    accept: Object.freeze(['image/jpeg', 'image/png', 'image/webp']),
    extensions: Object.freeze(['webp']),
    label: '128 KB WebP'
  })
});

export const PROFILE_RICH_MEDIA_MAX_TOTAL_BYTES = 150 * MB;

const KIND_BY_EXTENSION = Object.freeze({
  mp4: 'background_video',
  webm: 'background_video',
  mp3: 'audio',
  webp: null
});

function safeInteger(value, fallback = 0, minimum = 0, maximum = Number.MAX_SAFE_INTEGER) {
  const candidate = Number(value);
  if (!Number.isFinite(candidate)) return fallback;
  return Math.min(maximum, Math.max(minimum, Math.round(candidate)));
}

function safeNumber(value, fallback = 0, minimum = 0, maximum = 1) {
  const candidate = Number(value);
  if (!Number.isFinite(candidate)) return fallback;
  return Math.min(maximum, Math.max(minimum, candidate));
}

function safeLabel(value, fallback = 'Untitled track') {
  const label = [...String(value || '').trim()]
    .filter(character => {
      const code = character.codePointAt(0);
      return code >= 32 && code !== 127;
    })
    .join('');
  return (label || fallback).slice(0, 80);
}

export function extensionForRichMedia(kind, fileOrMime = '') {
  const rules = PROFILE_RICH_MEDIA_RULES[kind];
  if (!rules) return '';
  const value = fileOrMime && typeof fileOrMime === 'object'
    ? String((/** @type {any} */ (fileOrMime))?.type || '')
    : String(fileOrMime || '').toLowerCase().replace(/^\./, '');
  if (rules.extensions.includes(value)) return value;
  if (value === 'video/mp4') return 'mp4';
  if (value === 'video/webm') return 'webm';
  if (value === 'audio/mpeg' || value === 'audio/mp3') return 'mp3';
  if (value.startsWith('image/')) return 'webp';
  return '';
}

export function buildRichMediaStoragePath(kind, userId, assetId, extension = '') {
  const rules = PROFILE_RICH_MEDIA_RULES[kind];
  const normalizedUserId = String(userId || '').toLowerCase();
  const normalizedAssetId = String(assetId || '').toLowerCase();
  const normalizedExtension = extensionForRichMedia(kind, extension).toLowerCase();
  if (!rules || !UUID_RE.test(normalizedUserId) || !UUID_RE.test(normalizedAssetId)) return '';
  if (!rules.extensions.includes(normalizedExtension)) return '';
  return `${PROFILE_RICH_MEDIA_BUCKET}/${normalizedUserId}/${normalizedAssetId}.${normalizedExtension}`;
}

export function getRichMediaStorageRef(storedPath) {
  if (typeof storedPath !== 'string') return null;
  const match = storedPath.trim().match(new RegExp(`^${PROFILE_RICH_MEDIA_BUCKET}/(${UUID_PATTERN})/(${UUID_PATTERN})\\.(mp4|webm|mp3|webp)$`, 'i'));
  if (!match) return null;
  const extension = match[3].toLowerCase();
  const kind = KIND_BY_EXTENSION[extension];
  return {
    bucket: PROFILE_RICH_MEDIA_BUCKET,
    objectPath: `${match[1].toLowerCase()}/${match[2].toLowerCase()}.${extension}`,
    extension,
    kind: kind || (storedPath.includes('/banner/') ? 'banner' : null)
  };
}

export function getRichMediaKindFromPath(storedPath, expectedKind = '') {
  const reference = getRichMediaStorageRef(storedPath);
  if (!reference) return null;
  if (expectedKind === 'background_video' && ['mp4', 'webm'].includes(reference.extension)) return expectedKind;
  if (expectedKind === 'audio' && reference.extension === 'mp3') return expectedKind;
  if (['banner', 'cursor', 'pointer_cursor'].includes(expectedKind) && reference.extension === 'webp') return expectedKind;
  return reference.kind;
}

export function validateRichMediaFile(file, kind) {
  const rules = PROFILE_RICH_MEDIA_RULES[kind];
  if (!rules) return 'This rich media type is not supported.';
  if (!file || typeof file !== 'object') return 'Choose a file first.';
  if (!rules.accept.includes(String(file.type || '').toLowerCase())) {
    return kind === 'background_video' ? 'Use an MP4 or WebM video.' : kind === 'audio' ? 'Use an MP3 audio file.' : 'Use a JPEG, PNG, or WebP image.';
  }
  if (!Number.isFinite(file.size) || file.size <= 0 || file.size > rules.maxInputBytes) {
    return `That file is too large. Keep it under ${rules.label} input.`;
  }
  return '';
}

export function createDefaultRichMediaConfig() {
  return {
    background_video_path: null,
    banner_path: null,
    cursor_path: null,
    pointer_cursor_path: null,
    audio_playlist: {
      tracks: [],
      shuffle: false,
      loop: true,
      autoplay: false,
      volume: 0.75,
      controls: true
    }
  };
}

function normalizeTrack(value, index) {
  if (!value || typeof value !== 'object') return null;
  const path = getRichMediaStorageRef(value.path || value.storage_path)?.objectPath
    ? String(value.path || value.storage_path).trim()
    : '';
  if (!path || getRichMediaStorageRef(path)?.extension !== 'mp3') return null;
  const durationMs = safeInteger(value.duration_ms, 0, 0, 24 * 60 * 60 * 1000);
  const startMs = safeInteger(value.trim_start_ms, 0, 0, durationMs || 24 * 60 * 60 * 1000);
  const endMs = safeInteger(value.trim_end_ms, durationMs, startMs, durationMs || 24 * 60 * 60 * 1000);
  return {
    path,
    label: safeLabel(value.label, `Track ${index + 1}`),
    duration_ms: durationMs,
    trim_start_ms: startMs,
    trim_end_ms: endMs,
    order: safeInteger(value.order, index, 0, 4)
  };
}

export function normalizeRichAudioPlaylist(value) {
  const source = Array.isArray(value) ? { tracks: value } : (value && typeof value === 'object' ? value : {});
  const tracks = Array.isArray(source.tracks)
    ? source.tracks.map(normalizeTrack).filter(Boolean).slice(0, 5)
    : [];
  const seenPaths = new Set();
  const uniqueTracks = tracks.filter(track => {
    if (seenPaths.has(track.path)) return false;
    seenPaths.add(track.path);
    return true;
  }).sort((left, right) => left.order - right.order).map((track, index) => ({ ...track, order: index }));
  return {
    tracks: uniqueTracks,
    shuffle: source.shuffle === true,
    loop: source.loop !== false,
    autoplay: source.autoplay === true,
    volume: safeNumber(source.volume, 0.75, 0, 1),
    controls: source.controls !== false
  };
}

export function normalizeRichMediaConfig(value = {}) {
  /** @type {Record<string, any>} */
  const source = value && typeof value === 'object' ? value : {};
  const output = createDefaultRichMediaConfig();
  for (const [kind, field] of [
    ['background_video', 'background_video_path'],
    ['banner', 'banner_path'],
    ['cursor', 'cursor_path'],
    ['pointer_cursor', 'pointer_cursor_path']
  ]) {
    const path = typeof source[field] === 'string' ? source[field].trim() : '';
    const reference = getRichMediaStorageRef(path);
    if (reference && ((kind === 'background_video' && ['mp4', 'webm'].includes(reference.extension)) || (kind !== 'background_video' && reference.extension === 'webp'))) {
      output[field] = path;
    }
  }
  output.audio_playlist = normalizeRichAudioPlaylist(source.audio_playlist);
  return output;
}

export function formatRichMediaBytes(bytes) {
  const value = Number(bytes);
  if (!Number.isFinite(value) || value < 0) return '0 KB';
  if (value >= MB) return `${(value / MB).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(value / 1024))} KB`;
}
