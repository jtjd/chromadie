import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  RESERVED_ROUTE_SEGMENTS,
  getCanonicalProfilePath,
  getCompatibilityProfilePath,
  isReservedRouteSegment,
  normalizeUsernameSegment
} from '../src/lib/routeContract.js';
import { parseRouteLocation } from '../src/lib/routes.js';
import { getBrowserPublicOrigin, getServerPublicOrigin } from '../src/lib/siteOrigin.js';
import { getSafeNextUrl } from '../src/lib/authUrls.js';
import { isProtectedUsername } from '../src/lib/usernamePolicy.js';
import { onRequestGet as compatibilityRoute } from '../functions/u/[[username]].js';
import { onRequestGet as rootProfileRoute } from '../functions/[[username]].js';

test('root profile routing is case-normalized and /u remains compatible', () => {
  const root = parseRouteLocation('/NeonUser');
  assert.equal(root.routeMode, 'app');
  assert.equal(root.view, 'profile');
  assert.equal(root.profileRouteKind, 'root');
  assert.equal(root.profileUsername, 'NeonUser');
  assert.equal(root.canonicalProfilePath, '/neonuser');
  assert.equal(getCanonicalProfilePath('NeonUser'), '/neonuser');
  assert.equal(getCompatibilityProfilePath('NeonUser'), '/u/NeonUser');

  const compatibility = parseRouteLocation('/u/NeonUser', '?legacy=1');
  assert.equal(compatibility.profileRouteKind, 'compatibility');
  assert.equal(compatibility.legacyProfile, true);
  assert.equal(compatibility.canonicalProfilePath, '/neonuser');
});

test('reserved application and asset paths cannot become usernames', () => {
  for (const segment of RESERVED_ROUTE_SEGMENTS) {
    assert.equal(normalizeUsernameSegment(segment), null, segment);
    assert.equal(isReservedRouteSegment(encodeURIComponent(segment)), true, segment);
    assert.equal(parseRouteLocation(`/${segment}`).profileUsername, null, segment);
  }

  assert.equal(normalizeUsernameSegment('%61dmin'), 'admin');
  assert.equal(normalizeUsernameSegment('Admin'), 'Admin');
  assert.equal(isProtectedUsername('Admin'), true);
  assert.equal(parseRouteLocation('/Admin').profileUsername, 'Admin');
  assert.equal(parseRouteLocation('/Neon%252FUser').routeMode, 'not-found');
  assert.equal(parseRouteLocation('/Neon%2525252FUser').routeMode, 'not-found');
  assert.equal(parseRouteLocation('/Neon%').routeMode, 'not-found');
  assert.equal(parseRouteLocation('/u/Neon%252FUser').routeMode, 'not-found');
});

test('canonical and legacy origins stay separate across browser and server helpers', () => {
  assert.equal(getBrowserPublicOrigin({ configuredOrigin: 'https://chromadie.com', currentOrigin: 'https://chromadie.com' }), 'https://chm.lol');
  assert.equal(getServerPublicOrigin({ configuredOrigin: 'https://chromadie.com', requestOrigin: 'https://chromadie.com' }), 'https://chm.lol');
  assert.equal(getBrowserPublicOrigin({ configuredOrigin: 'http://localhost:5173', currentOrigin: 'http://localhost:5173' }), 'http://localhost:5173');
  assert.equal(getServerPublicOrigin({ configuredOrigin: 'https://preview.example.pages.dev', requestOrigin: 'https://preview.example.pages.dev' }), 'https://preview.example.pages.dev');
  assert.match(getSafeNextUrl('/profile/settings'), /^http:\/\/localhost:5173\/profile\/settings$/);
  assert.match(getSafeNextUrl('https://evil.example/steal'), /^http:\/\/localhost:5173\/?$/);
});

test('legacy profile requests make one canonical host/path hop', async () => {
  const response = await compatibilityRoute({
    request: new Request('https://chromadie.com/u/NeonUser'),
    env: { VITE_SITE_URL: 'https://chromadie.com' }
  });
  assert.equal(response.status, 307);
  assert.equal(response.headers.get('location'), 'https://chm.lol/neonuser');
  assert.equal(response.headers.get('cache-control'), 'no-store');
});

test('reserved root requests fall through to their real Pages route', async () => {
  let nextCalled = false;
  const response = await rootProfileRoute({
    request: new Request('https://chm.lol/leaderboard'),
    env: {},
    next: () => {
      nextCalled = true;
      return new Response('leaderboard route', { status: 200 });
    }
  });
  assert.equal(nextCalled, true);
  assert.equal(response.status, 200);
  assert.equal(await response.text(), 'leaderboard route');
});

test('canonical metadata and crawler assets use the production origin', async () => {
  const [index, robots, coreSitemap, profileSitemap, llms, cutover] = await Promise.all([
    readFile(new URL('../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../public/robots.txt', import.meta.url), 'utf8'),
    readFile(new URL('../public/sitemap-core.xml', import.meta.url), 'utf8'),
    readFile(new URL('../public/sitemap-index.xml', import.meta.url), 'utf8'),
    readFile(new URL('../public/llms.txt', import.meta.url), 'utf8'),
    readFile(new URL('../docs/CHM_LOL_DOMAIN_CUTOVER.md', import.meta.url), 'utf8')
  ]);
  assert.match(index, /<link rel="canonical" href="https:\/\/chm\.lol\//);
  assert.match(index, /name="twitter:url" content="https:\/\/chm\.lol\//);
  assert.doesNotMatch(coreSitemap, /chromadie\.com/);
  assert.doesNotMatch(profileSitemap, /chromadie\.com/);
  assert.match(robots, /Sitemap: https:\/\/chm\.lol\/sitemap-index\.xml/);
  assert.match(llms, /https:\/\/chm\.lol\/\{username\}/);
  assert.match(cutover, /Cloudflare Pages checklist/);
  assert.match(cutover, /Supabase checklist/);
  assert.match(cutover, /Email checklist/);
});
