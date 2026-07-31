import { USERNAME_PATTERN } from './usernamePolicy.js';

export { USERNAME_PATTERN } from './usernamePolicy.js';

// Keep route-reserved segments shared by the browser parser and Pages Functions. Every
// actual top-level application/asset endpoint is reserved before a segment
// can be considered a public username.
export const RESERVED_ROUTE_SEGMENTS = Object.freeze([
  'account',
  'api',
  'assets',
  'auth',
  'c',
  'discover',
  'edit',
  'favicon.ico',
  'favicon-16-v2.png',
  'favicon-32-v2.png',
  'help',
  'how-to-play',
  'icons.svg',
  'icon-192-v2.png',
  'icon-512-v2.png',
  'icon-maskable-192-v2.png',
  'icon-maskable-512-v2.png',
  'leaderboard',
  'llms.txt',
  'logo-mark.svg',
  'login',
  'og',
  'privacy',
  'profile',
  'prototype',
  'reset-password',
  'roll',
  'robots.txt',
  'settings',
  'shop',
  'sitemap-core.xml',
  'sitemap-index.xml',
  'sitemap-profiles.xml',
  'site.webmanifest',
  'signup',
  'studio',
  'support',
  'terms',
  'u',
  '__preview-login',
  '__preview-logout'
]);

const RESERVED_ROUTE_SET = new Set(RESERVED_ROUTE_SEGMENTS.map(segment => segment.toLowerCase()));

export function decodeRouteSegment(value) {
  let decoded = String(value ?? '');
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    } catch {
      return null;
    }
  }
  return decoded;
}

export function isReservedRouteSegment(value) {
  const decoded = decodeRouteSegment(value);
  return Boolean(decoded && RESERVED_ROUTE_SET.has(decoded.toLowerCase()));
}

export function normalizeUsernameSegment(value) {
  const decoded = decodeRouteSegment(value);
  if (!decoded || decoded.includes('/') || decoded.includes('\\') || !USERNAME_PATTERN.test(decoded)) return null;
  if (isReservedRouteSegment(decoded)) return null;
  return decoded;
}

export function isValidUsername(value) {
  return Boolean(normalizeUsernameSegment(value));
}

export function getCanonicalProfilePath(username) {
  const normalized = normalizeUsernameSegment(username);
  return normalized ? `/${encodeURIComponent(normalized.toLowerCase())}` : null;
}

export function getCompatibilityProfilePath(username) {
  const normalized = normalizeUsernameSegment(username);
  return normalized ? `/u/${encodeURIComponent(normalized)}` : null;
}
