export const CHROMADIE_PLUS_ENTITLEMENT_KEY = 'chromadie_plus';
export const LEGACY_ATELIER_ENTITLEMENT_KEY = 'atelier_plus';
export const PREMIUM_EXPRESSION_ENTITLEMENT_KEYS = Object.freeze([
  CHROMADIE_PLUS_ENTITLEMENT_KEY,
  LEGACY_ATELIER_ENTITLEMENT_KEY
]);

export function hasChromadiePlus(entitlements = []) {
  return Array.isArray(entitlements)
    && PREMIUM_EXPRESSION_ENTITLEMENT_KEYS.some(key => entitlements.includes(key));
}
