import { getProductAnalyticsConsent } from './productAnalytics.js';
import { recordProfileInsightEvent } from './profileInsightAnalytics.js';

export const PROFILE_VIEW_RECENCY_KEY = 'chromadie-profile-view-recency-v1';
const MAX_RECENCY_ENTRIES = 100;

function getStorage() {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

export function normalizeProfileViewUsername(value) {
  const username = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return /^[a-z0-9_]{1,20}$/.test(username) ? username : '';
}

export function getProfileViewDateKey(now = new Date()) {
  const date = now instanceof Date ? now : new Date(now);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
}

function readRecency(storage) {
  try {
    const parsed = JSON.parse(storage.getItem(PROFILE_VIEW_RECENCY_KEY) || '[]');
    return Array.isArray(parsed)
      ? parsed.filter(value => typeof value === 'string').slice(-MAX_RECENCY_ENTRIES)
      : [];
  } catch {
    return [];
  }
}

function writeRecency(storage, entries) {
  try {
    storage.setItem(PROFILE_VIEW_RECENCY_KEY, JSON.stringify(entries.slice(-MAX_RECENCY_ENTRIES)));
  } catch {
    // A storage failure must never affect profile rendering or navigation.
  }
}

/** @param {{storage?: Storage|null, now?: Date|string, edge?: boolean, fetcher?: Function|null}} options */
export async function recordPublicProfileView(client, profileUsername, options = {}) {
  const { storage = getStorage(), now = new Date(), edge = false, fetcher } = options;
  const username = normalizeProfileViewUsername(profileUsername);
  if (!username) return { accepted: false, recorded: false, reason: 'invalid_profile' };
  if (edge) {
    const edgeResult = await recordProfileInsightEvent({
      profileUsername: username,
      metric: 'view',
      storage,
      now,
      fetcher
    });
    if (edgeResult.recorded || !['edge_unavailable', 'not_recorded'].includes(edgeResult.reason)) return edgeResult;
  }
  if (getProductAnalyticsConsent() !== 'granted') {
    return { accepted: false, recorded: false, reason: 'consent_required' };
  }
  if (!storage) return { accepted: false, recorded: false, reason: 'storage_unavailable' };

  const dateKey = getProfileViewDateKey(new Date(now));
  if (!dateKey) return { accepted: false, recorded: false, reason: 'invalid_date' };
  const recencyKey = `${dateKey}:${username}`;
  const recency = readRecency(storage);
  if (recency.includes(recencyKey)) {
    return { accepted: true, recorded: false, reason: 'already_recorded' };
  }
  if (!client || typeof client.rpc !== 'function') {
    return { accepted: true, recorded: false, reason: 'recorder_unavailable' };
  }

  try {
    const result = await client.rpc('record_public_profile_view', { p_username: username });
    if (result?.error || result?.data?.success === false || result?.data?.recorded !== true) {
      return { accepted: true, recorded: false, reason: result?.error ? 'recorder_error' : 'not_recorded' };
    }
    writeRecency(storage, [...recency.filter(value => value !== recencyKey), recencyKey]);
    return { accepted: true, recorded: true };
  } catch {
    return { accepted: true, recorded: false, reason: 'recorder_error' };
  }
}
