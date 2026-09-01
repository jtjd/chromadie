/*
 * Small, source-backed timing helpers for the Guns.lol username effects we
 * audited in the shipped page bundle. The helpers contain no DOM or animation
 * loop; the app's existing shared clocks remain the only frame scheduler.
 */

export const GUNS_FUZZY_BASE_INTENSITY = 0.15;
export const GUNS_FUZZY_ROW_JITTER = 30;
export const GUNS_SHUFFLE_DURATION_MS = 350;
export const GUNS_SHUFFLE_STAGGER_MS = 30;

function safeCount(value) {
  return Math.max(0, Math.floor(Number(value) || 0));
}

/**
 * Guns' Fuzzy effect uses:
 *   floor(intensity * (Math.random() - .5) * 30)
 * for every source-canvas row on every frame.
 */
export function getGunsFuzzyRowOffset(randomValue, intensity = GUNS_FUZZY_BASE_INTENSITY) {
  const sample = Number.isFinite(Number(randomValue)) ? Number(randomValue) : 0.5;
  const safeIntensity = Math.max(0, Number(intensity) || 0);
  const offset = Math.floor(safeIntensity * (sample - 0.5) * GUNS_FUZZY_ROW_JITTER);
  return offset === 0 ? 0 : offset;
}

/**
 * Reproduce the source Shuffle component's `animationMode: "evenodd"`
 * schedule. Odd-indexed glyphs begin first; the even group starts at 70% of
 * the odd group's full staggered duration, so the two passes overlap.
 */
export function getGunsShuffleTracks(characterCount, {
  durationMs = GUNS_SHUFFLE_DURATION_MS,
  staggerMs = GUNS_SHUFFLE_STAGGER_MS
} = {}) {
  const count = safeCount(characterCount);
  const duration = Math.max(1, Number(durationMs) || GUNS_SHUFFLE_DURATION_MS);
  const stagger = Math.max(0, Number(staggerMs) || 0);
  const oddCount = Math.floor(count / 2);
  const evenStartMs = oddCount
    ? 0.7 * (duration + Math.max(0, oddCount - 1) * stagger)
    : 0;

  return Object.freeze(Array.from({ length: count }, (_, index) => {
    const odd = index % 2 === 1;
    const rank = odd ? Math.floor(index / 2) : Math.floor(index / 2);
    const startMs = (odd ? 0 : evenStartMs) + rank * stagger;
    return Object.freeze({
      index,
      group: odd ? 'odd' : 'even',
      startMs,
      endMs: startMs + duration
    });
  }));
}

export function getGunsShuffleCycleDuration(characterCount, options = {}) {
  const tracks = getGunsShuffleTracks(characterCount, options);
  return tracks.reduce(
    (latest, track) => Math.max(latest, track.endMs),
    Math.max(1, Number(options.durationMs) || GUNS_SHUFFLE_DURATION_MS)
  );
}

function easePower3Out(value) {
  const progress = Math.max(0, Math.min(1, Number(value) || 0));
  return 1 - ((1 - progress) ** 3);
}

/**
 * Return the horizontal translation of one rightward Shuffle glyph. The
 * source builds three identical glyph slots (original, one optional scramble,
 * original), starts the track at -2 * glyphWidth, and animates to zero.
 */
export function getGunsShuffleTrackOffset(index, elapsedMs, glyphWidth, characterCount, options = {}) {
  const tracks = getGunsShuffleTracks(characterCount, options);
  const track = tracks[Math.max(0, Math.floor(Number(index) || 0))];
  const width = Math.max(0, Number(glyphWidth) || 0);
  if (!track) return 0;
  const elapsed = Number(elapsedMs) || 0;
  if (elapsed <= track.startMs) return -2 * width;
  if (elapsed >= track.endMs) return 0;
  const progress = (elapsed - track.startMs) / (track.endMs - track.startMs);
  return -2 * width * (1 - easePower3Out(progress));
}
