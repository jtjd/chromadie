/** Lightweight allowlist for catalog/profile validation; artwork stays lazy. */
export const ATMOSPHERE_STUDY_KEYS = Object.freeze([
  'aurora-veil', 'abyssal-bloom', 'astral-orbit', 'lantern-festival', 'firefly-grove', 'opal-tide', 'retro-horizon', 'lunar-moths', 'koi-reverie', 'kinetic-studio'
]);
export const PROFILE_ATMOSPHERE_KEYS = Object.freeze([
  'rain-window', 'droplets-glass', 'dust-light', 'ink-bloom', 'snowfall',
  'sakura-afterglow', 'silk-folds', 'glass-caustics', 'cinder-drift',
  'night-pollen', 'paper-shadow', 'smoke-spiral', 'lumen-flare', 'prism-dust',
  ...ATMOSPHERE_STUDY_KEYS
]);
const keys = new Set(PROFILE_ATMOSPHERE_KEYS);
export function resolveAtmosphereKey(value) {
  if (typeof value !== 'string') return '';
  let key = value.trim();
  if (key === 'bg_prism_atmosphere') key = 'silk-folds';
  if (key.startsWith('profile_atmosphere_')) key = key.slice('profile_atmosphere_'.length).replaceAll('_', '-');
  return keys.has(key) ? key : '';
}
export function isAtmosphereKey(value) { return Boolean(resolveAtmosphereKey(value)); }
