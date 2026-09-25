import { getTodayString } from './utils.js';

export const GUEST_ROLL_STORAGE_KEY = 'chromadie-roll';
export const REROLL_LOCK_PREFIX = 'chromadie-reroll-lock:';
const REROLL_LOCK_MS = 10000;

function getStorage() {
  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
}

export function getSavedGuestRoll(storage = getStorage()) {
  if (!storage) return null;
  try {
    return storage.getItem(GUEST_ROLL_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function saveGuestRoll(rollData, storage = getStorage()) {
  if (!storage) return;
  try {
    storage.setItem(GUEST_ROLL_STORAGE_KEY, JSON.stringify(rollData));
  } catch {
    // Ignore storage failures in private browsing or hardened browser modes.
  }
}

export function clearGuestRoll(storage = getStorage()) {
  if (!storage) return;
  try {
    storage.removeItem(GUEST_ROLL_STORAGE_KEY);
  } catch {
    // Ignore storage failures.
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
