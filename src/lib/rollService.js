import { normalizeCanonicalRoll } from './rollState.js';
import { getTodayString } from './utils.js';

const REROLL_LOCK_PREFIX = 'chromadie-reroll-lock:';
const REROLL_LOCK_MS = 10000;

function getStorage() {
  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
}

export function getRerollLockKey(date = getTodayString(), userId = '') {
  return REROLL_LOCK_PREFIX + date + (userId ? ':' + userId : '');
}

export function getRerollLockExpiry(now = Date.now()) {
  return now + REROLL_LOCK_MS;
}

export function setRerollLock(storage = getStorage(), now = Date.now(), userId = '') {
  if (!storage) return;
  try {
    const key = getRerollLockKey(getTodayString(), userId);
    const value = JSON.stringify({ expiresAt: getRerollLockExpiry(now), token: globalThis.crypto.randomUUID() });
    storage.setItem(key, value);
    return { key, value };
  } catch {
    // Ignore storage failures in private browsing or hardened browser modes.
  }
}

export function clearRerollLock(storage = getStorage(), handle = null) {
  if (!storage) return;
  try {
    const key = handle?.key || getRerollLockKey();
    if (!handle || storage.getItem(key) === handle.value) storage.removeItem(key);
  } catch {
    // Ignore storage failures.
  }
}

export function hasActiveRerollLock(storage = getStorage(), now = Date.now(), userId = '') {
  if (!storage) return false;
  try {
    const key = getRerollLockKey(getTodayString(), userId);
    const stored = JSON.parse(storage.getItem(key));
    const expiry = Number(stored?.expiresAt ?? stored);
    if (!Number.isFinite(expiry)) return false;
    if (expiry <= now) {
      storage.removeItem(key);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Call the server-authoritative roll RPC and return its bounded presentation
 * model. The service never computes score, rarity, eligibility, or rewards.
 */
export async function requestRoll(supabaseClient, isReroll = false) {
  try {
    const { data, error } = await supabaseClient.rpc('roll_die', { p_is_reroll: isReroll });
    if (error || !data || !data.success) {
      return {
        success: false,
        data: null,
        canonical: null,
        error: error || new Error(data?.error || 'The server could not complete this roll.')
      };
    }

    return {
      success: true,
      data,
      canonical: normalizeCanonicalRoll(data),
      error: null
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      canonical: null,
      error: error instanceof Error ? error : new Error('The server could not complete this roll.')
    };
  }
}

/** Optional ranking data must never invalidate a confirmed roll. */
export async function requestRollPercentile(supabaseClient, score) {
  try {
    const { data, error } = await supabaseClient.rpc('get_score_percentile', { p_score: score });
    return error ? null : data;
  } catch {
    return null;
  }
}
