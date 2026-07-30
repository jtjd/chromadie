const VIEW_STATE_PREFIX = 'chromadie-view-state:';
const memoryState = new Map();

function normalizeSegment(value, fallback = 'global') {
  const normalized = String(value ?? '').trim().replace(/[^A-Za-z0-9_-]/g, '_');
  return normalized || fallback;
}

export function getViewStateKey(namespace, scope = 'global') {
  return `${VIEW_STATE_PREFIX}${normalizeSegment(namespace)}:${normalizeSegment(scope)}`;
}

function getSessionStorage() {
  if (typeof window === 'undefined') return null;

  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function readViewState(namespace, scope = 'global', fallback = null) {
  const key = getViewStateKey(namespace, scope);
  if (memoryState.has(key)) return memoryState.get(key);

  const storage = getSessionStorage();
  if (!storage) return fallback;

  try {
    const raw = storage.getItem(key);
    if (!raw) return fallback;

    const parsed = JSON.parse(raw);
    memoryState.set(key, parsed);
    return parsed;
  } catch {
    try {
      storage.removeItem(key);
    } catch {
      // Ignore storage failures in private or hardened browser contexts.
    }
    return fallback;
  }
}

export function writeViewState(namespace, scope = 'global', value = null) {
  const key = getViewStateKey(namespace, scope);
  memoryState.set(key, value);

  const storage = getSessionStorage();
  if (!storage) return;

  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    // The in-memory copy still preserves state for normal SPA navigation.
  }
}

export function clearViewState(namespace, scope = 'global') {
  const key = getViewStateKey(namespace, scope);
  memoryState.delete(key);

  const storage = getSessionStorage();
  if (!storage) return;

  try {
    storage.removeItem(key);
  } catch {
    // Ignore storage failures in private or hardened browser contexts.
  }
}

export function clearAllViewState() {
  memoryState.clear();

  const storage = getSessionStorage();
  if (!storage) return;

  try {
    const keysToRemove = [];
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (key?.startsWith(VIEW_STATE_PREFIX)) keysToRemove.push(key);
    }
    keysToRemove.forEach(key => storage.removeItem(key));
  } catch {
    // Ignore storage failures in private or hardened browser contexts.
  }
}
