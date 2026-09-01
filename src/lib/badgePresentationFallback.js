const RARITIES = new Set(['Trash', 'Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Anomaly', 'Mythic']);

export function humanizeBadgeId(value) {
  return String(value || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, character => character.toUpperCase())
    .trim();
}
/**
 * Read-only surfaces receive authored condition presentation from bounded
 * server projections. This fallback deliberately contains no scoring catalog:
 * unknown historical identifiers stay legible without pulling scoring data
 * into public profile routes.
 */
export function getBadgePresentationFallback(value, fallbackId = '') {
  const source = value && typeof value === 'object' ? value : {};
  const id = String(source.id || source.key || fallbackId || '');
  return {
    id,
    name: String(source.name || source.label || humanizeBadgeId(id) || 'Recorded condition'),
    symbol: String(source.symbol || source.icon || '✦'),
    description: String(source.description || source.desc || 'A server-reported score condition.'),
    rarity: RARITIES.has(source.rarity) ? source.rarity : 'Common'
  };
}
