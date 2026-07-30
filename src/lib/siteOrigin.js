export const CANONICAL_PUBLIC_ORIGIN = 'https://chm.lol';
export const LEGACY_PUBLIC_ORIGIN = 'https://chromadie.com';
export const LOCAL_DEVELOPMENT_ORIGINS = Object.freeze([
  'http://localhost:5173',
  'http://127.0.0.1:5173'
]);

export function normalizeOrigin(value) {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.origin : null;
  } catch {
    return null;
  }
}

function canonicalizeConfiguredOrigin(value) {
  const origin = normalizeOrigin(value);
  return origin === LEGACY_PUBLIC_ORIGIN ? CANONICAL_PUBLIC_ORIGIN : origin;
}

export function isLocalOrigin(value) {
  const origin = normalizeOrigin(value);
  return Boolean(origin && (
    origin === 'http://localhost:5173'
      || origin === 'http://127.0.0.1:5173'
      || origin.startsWith('http://localhost:')
      || origin.startsWith('http://127.0.0.1:')
  ));
}

export function getBrowserPublicOrigin({ configuredOrigin = '', currentOrigin = '' } = {}) {
  const configured = canonicalizeConfiguredOrigin(configuredOrigin);
  const current = normalizeOrigin(currentOrigin);

  if (current && isLocalOrigin(current)) return current;
  if (configured && isLocalOrigin(configured)) return current || configured;
  if (configured) return configured;
  if (current === LEGACY_PUBLIC_ORIGIN) return CANONICAL_PUBLIC_ORIGIN;
  return current || CANONICAL_PUBLIC_ORIGIN;
}

export function getServerPublicOrigin({ configuredOrigin = '', requestOrigin = '' } = {}) {
  const configured = canonicalizeConfiguredOrigin(configuredOrigin);
  const request = normalizeOrigin(requestOrigin);

  if (configured && !isLocalOrigin(configured)) return configured;
  if (request === LEGACY_PUBLIC_ORIGIN) return CANONICAL_PUBLIC_ORIGIN;
  return request || CANONICAL_PUBLIC_ORIGIN;
}
