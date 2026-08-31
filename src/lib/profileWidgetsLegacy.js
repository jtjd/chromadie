// Compact public renderer contract. The editor and V2 normalizer retain the
// full provider parser in profileWidgets.js, while public cards consume only
// validated provider records and fixed URL builders.
import { PROFILE_EXPRESSION_TYPES, parseSpotifyUrl, spotifyUrlFromParts } from './profileExpression.js';

export const PROFILE_WIDGET_VERSION = 1;
export const PROFILE_WIDGET_LIMITS = Object.freeze({ freeWidgets: 4, maxWidgets: 4 });
export const PROFILE_WIDGET_PROVIDERS = Object.freeze({
  spotify: Object.freeze({ label: 'Spotify', types: PROFILE_EXPRESSION_TYPES, help: 'Track, playlist, or album URL from open.spotify.com.' }),
  youtube: Object.freeze({ label: 'YouTube', types: Object.freeze(['video']), help: 'A single public video URL from youtube.com or youtu.be.' }),
  github: Object.freeze({ label: 'GitHub', types: Object.freeze(['user']), kind: 'card', help: 'A public GitHub user profile URL.' }),
  twitch: Object.freeze({ label: 'Twitch', types: Object.freeze(['channel']), kind: 'card', help: 'A public Twitch channel URL.' }),
  lastfm: Object.freeze({ label: 'Last.fm', types: Object.freeze(['user']), kind: 'card', help: 'A public Last.fm user URL.' }),
  discord: Object.freeze({ label: 'Discord', types: Object.freeze(['server']), kind: 'card', help: 'A Discord invite URL.' })
});

const YOUTUBE_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
const PROVIDER_KEYS = Object.freeze(Object.keys(PROFILE_WIDGET_PROVIDERS));

function valid(provider, type, id) {
  if (provider === 'spotify') return PROFILE_EXPRESSION_TYPES.includes(type) && /^[A-Za-z0-9]{22}$/.test(String(id || ''));
  if (provider === 'youtube') return type === 'video' && YOUTUBE_ID_PATTERN.test(String(id || ''));
  if (provider === 'github') return type === 'user' && /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/.test(String(id || ''));
  if (provider === 'twitch') return type === 'channel' && /^[A-Za-z0-9_]{4,25}$/.test(String(id || ''));
  if (provider === 'lastfm') return type === 'user' && /^[A-Za-z0-9][A-Za-z0-9_-]{0,38}$/.test(String(id || ''));
  return provider === 'discord' && type === 'server' && /^[A-Za-z0-9-]{2,32}$/.test(String(id || ''));
}

export function parseYouTubeUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  const candidate = value.trim();
  const match = candidate.match(/^https:\/\/(?:www\.)?youtube\.com\/watch\?v=([A-Za-z0-9_-]{11})$/)
    || candidate.match(/^https:\/\/youtu\.be\/([A-Za-z0-9_-]{11})$/);
  return match ? { type: 'video', id: match[1] } : null;
}

export function parseProfileWidgetUrl(provider, value) {
  if (provider === 'spotify') return parseSpotifyUrl(value);
  if (provider === 'youtube') return parseYouTubeUrl(value);
  if (typeof value !== 'string' || !value.trim()) return null;
  let url;
  try { url = new URL(value.trim()); } catch { return null; }
  if (url.protocol !== 'https:' || url.port || url.search || url.hash) return null;
  const segments = url.pathname.split('/').filter(Boolean);
  if (provider === 'github' && url.hostname === 'github.com' && segments.length === 1 && valid(provider, 'user', segments[0])) return { type: 'user', id: segments[0] };
  if (provider === 'twitch' && (url.hostname === 'twitch.tv' || url.hostname === 'www.twitch.tv') && segments.length === 1 && valid(provider, 'channel', segments[0])) return { type: 'channel', id: segments[0] };
  if (provider === 'lastfm' && (url.hostname === 'last.fm' || url.hostname === 'www.last.fm') && segments.length === 2 && segments[0] === 'user' && valid(provider, 'user', segments[1])) return { type: 'user', id: segments[1] };
  if (provider === 'discord' && url.hostname === 'discord.gg' && segments.length === 1 && valid(provider, 'server', segments[0])) return { type: 'server', id: segments[0] };
  return null;
}

export function profileWidgetUrl(provider, type, id) {
  if (!valid(provider, type, id)) return '';
  if (provider === 'spotify') return spotifyUrlFromParts(type, id);
  if (provider === 'youtube') return `https://www.youtube.com/watch?v=${id}`;
  if (provider === 'github') return `https://github.com/${id}`;
  if (provider === 'twitch') return `https://www.twitch.tv/${id}`;
  if (provider === 'lastfm') return `https://www.last.fm/user/${id}`;
  return `https://discord.gg/${id}`;
}

export function profileWidgetEmbedUrl(provider, type, id) {
  if (!valid(provider, type, id)) return '';
  if (provider === 'spotify') return `https://open.spotify.com/embed/${type}/${id}?theme=0`;
  if (provider === 'youtube') return `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1`;
  return '';
}

export function getProfileWidgetKind(provider) {
  return PROFILE_WIDGET_PROVIDERS[provider]?.kind || 'embed';
}

function normalizeWidget(value, fallbackOrder) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const provider = String(value.provider || '').trim().toLowerCase();
  const type = String(value.type || '').trim().toLowerCase();
  const id = String(value.id || '').trim();
  if (!PROVIDER_KEYS.includes(provider) || !valid(provider, type, id)) return null;
  return { provider, type, id, visible: value.visible !== false, order: Number.isInteger(Number(value.order)) && Number(value.order) >= 0 ? Number(value.order) : fallbackOrder };
}

export function normalizeProfileWidgets(value, legacyExpression = {}, options = {}) {
  const input = Array.isArray(value) ? value : [];
  const seen = new Set();
  const limit = Math.max(0, Math.min(PROFILE_WIDGET_LIMITS.maxWidgets, Number(options.maxWidgets) || PROFILE_WIDGET_LIMITS.maxWidgets));
  const widgets = input.map((item, index) => normalizeWidget(item, index)).filter(widget => {
    if (!widget || seen.has(widget.provider)) return false;
    seen.add(widget.provider);
    return true;
  }).sort((left, right) => left.order - right.order).slice(0, limit).map((widget, index) => ({ ...widget, order: index }));
  if (widgets.length || !legacyExpression?.spotify_type || !legacyExpression?.spotify_id) return widgets;
  const legacy = normalizeWidget({ provider: 'spotify', type: legacyExpression.spotify_type, id: legacyExpression.spotify_id }, 0);
  return legacy ? [legacy] : [];
}

export function getVisibleProfileWidgets(value, legacyExpression = {}, options = {}) {
  return normalizeProfileWidgets(value, legacyExpression, options).filter(widget => widget.visible);
}

export function getProfileWidgetLabel(provider) {
  return PROFILE_WIDGET_PROVIDERS[provider]?.label || 'Provider';
}

export function getProfileWidgetInputUrl(widget) {
  return profileWidgetUrl(widget?.provider, widget?.type, widget?.id);
}
