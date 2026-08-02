/*
 * Motions are a finite, code-owned vocabulary. A renderer receives normalized
 * progress from the shared clock; no catalog row can supply executable motion.
 */

const motion = (key, durationMs, kind, extra = {}) => Object.freeze({
  key,
  durationMs,
  kind,
  ...extra
});

export const NAME_MOTIONS = Object.freeze({
  none: motion('none', 1, 'none'),
  shimmer: motion('shimmer', 2000, 'shimmer'),
  flicker: motion('flicker', 3200, 'flicker'),
  pulse: motion('pulse', 4200, 'pulse'),
  matrix: motion('matrix', 1800, 'matrix'),
  rainbow: motion('rainbow', 3000, 'rainbow'),
  glitch: motion('glitch', 4800, 'glitch'),
  wave: motion('wave', 3600, 'wave'),
  inferno: motion('inferno', 800, 'inferno'),
  sunset: motion('sunset', 4200, 'sunset'),
  void: motion('void', 4800, 'void'),
  signal: motion('signal', 5800, 'signal'),
  chroma: motion('chroma', 2200, 'chroma'),
  atelier: motion('atelier', 5400, 'atelier')
});

export function getNameMotion(motionKey) {
  return NAME_MOTIONS[motionKey] || NAME_MOTIONS.none;
}
