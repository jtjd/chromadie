/**
 * Keep editor dirty state source-aware. A single Customize destination can
 * host several mounted editors, so one child reporting clean must never clear
 * a sibling's unsaved draft.
 */
export function updateDirtySource(sources, source, dirty) {
  const next = { ...(sources || {}) };
  const key = String(source || '').trim();
  if (!key) return next;
  if (dirty) next[key] = true;
  else delete next[key];
  return next;
}

export function hasDirtySources(sources) {
  return Object.values(sources || {}).some(Boolean);
}

export function clearDirtySourcesForSection(sources, sectionId) {
  const section = String(sectionId || '').trim();
  if (!section) return { ...(sources || {}) };
  return Object.fromEntries(
    Object.entries(sources || {}).filter(([source]) => source !== section && !source.startsWith(`${section}:`))
  );
}

export function dirtySourceForEvent(detail, fallback) {
  return String(detail?.source || fallback || '').trim();
}
