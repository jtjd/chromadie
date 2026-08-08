import { getProductAnalyticsConsent } from './productAnalytics.js';

export const PROFILE_INSIGHT_RECENCY_KEY = 'chromadie-profile-insight-recency-v1';
const MAX_RECENCY_ENTRIES = 400;
const USERNAME_PATTERN = /^[a-z0-9_]{1,20}$/;
const ENTRY_KEY_PATTERN = /^[a-z0-9][a-z0-9_-]{0,31}$/;

function getStorage() {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

function getDateKey(now = new Date()) {
  const date = now instanceof Date ? now : new Date(now);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
}

function readRecency(storage) {
  try {
    const parsed = JSON.parse(storage.getItem(PROFILE_INSIGHT_RECENCY_KEY) || '[]');
    return Array.isArray(parsed)
      ? parsed.filter(value => typeof value === 'string').slice(-MAX_RECENCY_ENTRIES)
      : [];
  } catch {
    return [];
  }
}

function writeRecency(storage, entries) {
  try {
    storage.setItem(PROFILE_INSIGHT_RECENCY_KEY, JSON.stringify(entries.slice(-MAX_RECENCY_ENTRIES)));
  } catch {
    // Analytics must never interrupt profile rendering.
  }
}

export function normalizeInsightUsername(value) {
  const username = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return USERNAME_PATTERN.test(username) ? username : '';
}

export function normalizeInsightEntryKey(value) {
  const key = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return !key || ENTRY_KEY_PATTERN.test(key) ? key : '';
}

/**
 * @param {{profileUsername?: string, metric?: string, entryKey?: string, storage?: Storage|null, now?: Date|string, fetcher?: Function|null}} options
 */
export async function recordProfileInsightEvent(options = {}) {
  const {
    profileUsername,
    metric = 'view',
    entryKey = '',
    storage = getStorage(),
    now = new Date(),
    fetcher = typeof fetch === 'function' ? fetch : null
  } = options;
  const username = normalizeInsightUsername(profileUsername);
  const normalizedMetric = metric === 'click' ? 'click' : metric === 'view' ? 'view' : '';
  const normalizedEntryKey = normalizedMetric === 'click' ? normalizeInsightEntryKey(entryKey) : '';
  if (!username || !normalizedMetric || (normalizedMetric === 'click' && !normalizedEntryKey)) {
    return { accepted: false, recorded: false, reason: 'invalid_event' };
  }
  if (getProductAnalyticsConsent() !== 'granted') {
    return { accepted: false, recorded: false, reason: 'consent_required' };
  }
  if (!storage) return { accepted: false, recorded: false, reason: 'storage_unavailable' };
  const dateKey = getDateKey(new Date(now));
  if (!dateKey) return { accepted: false, recorded: false, reason: 'invalid_date' };
  const recencyKey = `${dateKey}:${normalizedMetric}:${username}:${normalizedEntryKey}`;
  const recency = readRecency(storage);
  if (recency.includes(recencyKey)) {
    return { accepted: true, recorded: false, reason: 'already_recorded' };
  }
  if (!fetcher) return { accepted: true, recorded: false, reason: 'edge_unavailable' };

  try {
    const response = await fetcher('/analytics/profile', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username, metric: normalizedMetric, entryKey: normalizedEntryKey || null })
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || payload?.success === false || payload?.recorded !== true) {
      return { accepted: true, recorded: false, reason: payload?.reason || 'not_recorded' };
    }
    writeRecency(storage, [...recency.filter(value => value !== recencyKey), recencyKey]);
    return { accepted: true, recorded: true };
  } catch {
    return { accepted: true, recorded: false, reason: 'edge_unavailable' };
  }
}

export function createProfileInsightClickRecorder(profileUsername, options = {}) {
  return entryKey => recordProfileInsightEvent({
    profileUsername,
    metric: 'click',
    entryKey,
    ...options
  });
}
