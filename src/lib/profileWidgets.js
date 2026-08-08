import {
  PROFILE_EXPRESSION_TYPES,
  parseSpotifyUrl,
  spotifyUrlFromParts
} from './profileExpression.js';

export const PROFILE_WIDGET_VERSION = 1;
export const PROFILE_WIDGET_LIMITS = Object.freeze({ maxWidgets: 2 });

export const PROFILE_WIDGET_PROVIDERS = Object.freeze({
  spotify: Object.freeze({
    label: 'Spotify',
    types: PROFILE_EXPRESSION_TYPES,
    help: 'Track, playlist, or album URL from open.spotify.com.'
  }),
  youtube: Object.freeze({
    label: 'YouTube',
    types: Object.freeze(['video']),
    help: 'A single public video URL from youtube.com or youtu.be.'
  })
});

const YOUTUBE_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
const PROVIDER_KEYS = Object.freeze(Object.keys(PROFILE_WIDGET_PROVIDERS));

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isValidWidgetId(provider, type, id) {
  if (provider === 'spotify') {
    return PROFILE_EXPRESSION_TYPES.includes(type) && /^[A-Za-z0-9]{22}$/.test(String(id || ''));
  }
  return provider === 'youtube' && type === 'video' && YOUTUBE_ID_PATTERN.test(String(id || ''));
}

export function parseYouTubeUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  const candidate = value.trim();
  let match = candidate.match(/^https:\/\/www\.youtube\.com\/watch\?v=([A-Za-z0-9_-]{11})$/);
  if (match) return { type: 'video', id: match[1] };
  match = candidate.match(/^https:\/\/youtu\.be\/([A-Za-z0-9_-]{11})$/);
  return match ? { type: 'video', id: match[1] } : null;
}

export function parseProfileWidgetUrl(provider, value) {
  if (provider === 'spotify') return parseSpotifyUrl(value);
  if (provider === 'youtube') return parseYouTubeUrl(value);
  return null;
}

export function profileWidgetUrl(provider, type, id) {
  if (!isValidWidgetId(provider, type, id)) return '';
  if (provider === 'spotify') return spotifyUrlFromParts(type, id);
  return `https://www.youtube.com/watch?v=${id}`;
}

export function profileWidgetEmbedUrl(provider, type, id) {
  if (!isValidWidgetId(provider, type, id)) return '';
  if (provider === 'spotify') return `https://open.spotify.com/embed/${type}/${id}?theme=0`;
  return `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1`;
}

function normalizeWidget(value, fallbackOrder) {
  if (!isPlainObject(value)) return null;
  const provider = String(value.provider || '').trim().toLowerCase();
  const type = String(value.type || '').trim().toLowerCase();
  const id = String(value.id || '').trim();
  if (!PROVIDER_KEYS.includes(provider) || !isValidWidgetId(provider, type, id)) return null;
  return {
    provider,
    type,
    id,
    visible: value.visible !== false,
    order: Number.isInteger(Number(value.order)) && Number(value.order) >= 0
      ? Number(value.order)
      : fallbackOrder
  };
}

export function normalizeProfileWidgets(value, legacyExpression = {}) {
  const input = Array.isArray(value) ? value : [];
  const seenProviders = new Set();
  const widgets = input
    .map((item, index) => normalizeWidget(item, index))
    .filter(widget => {
      if (!widget || seenProviders.has(widget.provider)) return false;
      seenProviders.add(widget.provider);
      return true;
    })
    .sort((left, right) => left.order - right.order)
    .slice(0, PROFILE_WIDGET_LIMITS.maxWidgets)
    .map((widget, index) => ({ ...widget, order: index }));

  if (widgets.length || !legacyExpression?.spotify_type || !legacyExpression?.spotify_id) return widgets;
  const legacy = normalizeWidget({
    provider: 'spotify',
    type: legacyExpression.spotify_type,
    id: legacyExpression.spotify_id,
    visible: true,
    order: 0
  }, 0);
  return legacy ? [legacy] : [];
}

export function getVisibleProfileWidgets(value, legacyExpression = {}) {
  return normalizeProfileWidgets(value, legacyExpression).filter(widget => widget.visible);
}

export function getProfileWidgetLabel(provider) {
  return PROFILE_WIDGET_PROVIDERS[provider]?.label || 'Provider';
}

export function getProfileWidgetInputUrl(widget) {
  return profileWidgetUrl(widget?.provider, widget?.type, widget?.id);
}
