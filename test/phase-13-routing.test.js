import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  RESERVED_ROUTE_SEGMENTS,
  getCanonicalProfilePath,
  getCompatibilityProfilePath,
  getProfileAliasPath,
  isReservedRouteSegment,
  normalizeUsernameSegment
} from '../src/lib/routeContract.js';
import { parseRouteLocation, viewToCanonicalPath } from '../src/lib/routes.js';
import { getBrowserPublicOrigin, getServerPublicOrigin } from '../src/lib/siteOrigin.js';
import { getSafeNextUrl } from '../src/lib/authUrls.js';
import { isProtectedUsername } from '../src/lib/usernamePolicy.js';
import { onRequestGet as compatibilityRoute } from '../functions/u/[[username]].js';
import { onRequestGet as aliasRoute } from '../functions/a/[[alias]].js';
import { onRequestGet as rootProfileRoute } from '../functions/[[username]].js';

const [appSource, authPageSource, authSource] = await Promise.all([
  readFile(new URL('../src/App.svelte', import.meta.url), 'utf8'),
  readFile(new URL('../src/lib/AuthPage.svelte', import.meta.url), 'utf8'),
  readFile(new URL('../src/lib/Auth.svelte', import.meta.url), 'utf8')
]);

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

  const shortRoot = parseRouteLocation('/A');
  assert.equal(shortRoot.profileUsername, 'A');
  assert.equal(shortRoot.canonicalProfilePath, '/a');
  assert.equal(getCanonicalProfilePath('A'), '/a');
  assert.equal(getCompatibilityProfilePath('Z7'), '/u/Z7');
});

test('view navigation resolves to one canonical application path', () => {
  assert.equal(viewToCanonicalPath('leaderboard'), '/leaderboard');
  assert.equal(viewToCanonicalPath('leaderboard', { tab: 'monthly' }), '/leaderboard?tab=monthly');
  assert.equal(viewToCanonicalPath('progression'), '/progression');
  assert.equal(viewToCanonicalPath('prototype'), null);
  assert.equal(viewToCanonicalPath('prototype', { prototypeEnabled: true }), '/prototype/profile');
  assert.equal(viewToCanonicalPath('profile-settings'), '/profile/settings');
  assert.equal(viewToCanonicalPath('profile', { username: 'NeonUser' }), '/neonuser');
  assert.equal(viewToCanonicalPath('profile', { username: 'NeonUser', legacyProfile: true }), '/u/NeonUser?legacy=1');
  assert.equal(viewToCanonicalPath('profile', { userId: 'user-2' }), '/?view=profile&profile=user-2');
});

test('reactive route synchronization normalizes without adding browser history entries', async () => {
  const app = await readFile(new URL('../src/App.svelte', import.meta.url), 'utf8');
  const syncRoute = app.slice(app.indexOf('function syncRoute()'), app.indexOf('function setRoute('));
  assert.match(syncRoute, /window\.history\.replaceState/);
  assert.doesNotMatch(syncRoute, /window\.history\.pushState/);
});

test('aliases have an explicit route namespace and resolve only to canonical profile paths', async () => {
  const alias = parseRouteLocation('/a/Neon_Handle');
  assert.equal(alias.routeMode, 'app');
  assert.equal(alias.view, 'profile');
  assert.equal(alias.profileRouteKind, 'alias');
  assert.equal(alias.profileAlias, 'Neon_Handle');
  assert.equal(alias.profileUsername, null);
  assert.equal(getProfileAliasPath('Neon_Handle'), '/a/neon_handle');
  assert.equal(parseRouteLocation('/a/Neon%252FHandle').routeMode, 'not-found');

  const previousFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    assert.match(String(input), /get_public_profile_alias/);
    assert.equal(JSON.parse(init.body).p_alias, 'Neon_Handle');
    return Response.json({ alias: 'neon_handle', username: 'NeonUser' });
  };
  try {
    const response = await aliasRoute({
      request: new Request('https://chm.lol/a/Neon_Handle?utm_source=test'),
      env: { VITE_SITE_URL: 'https://chm.lol', VITE_SUPABASE_URL: 'https://project.supabase.co', VITE_SUPABASE_KEY: 'anon-key' }
    });
    assert.equal(response.status, 307);
    assert.equal(response.headers.get('location'), 'https://chm.lol/neonuser?utm_source=test');
    assert.equal(response.headers.get('cache-control'), 'no-store');
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test('unknown and unsafe aliases never render a profile page', async () => {
  const invalid = await aliasRoute({
    request: new Request('https://chm.lol/a/%25'),
    env: { VITE_SITE_URL: 'https://chm.lol' }
  });
  assert.equal(invalid.status, 404);

  const previousFetch = globalThis.fetch;
  globalThis.fetch = async () => Response.json(null);
  try {
    const unknown = await aliasRoute({
      request: new Request('https://chm.lol/a/missing'),
      env: { VITE_SITE_URL: 'https://chm.lol', VITE_SUPABASE_URL: 'https://project.supabase.co', VITE_SUPABASE_KEY: 'anon-key' }
    });
    assert.equal(unknown.status, 404);
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test('standalone auth routes carry only bounded, safe presentation state', () => {
  const login = parseRouteLocation('/login');
  const signup = parseRouteLocation('/signup', '?next=%2Fprofile%2Fsettings&username=ab');
  assert.equal(login.routeMode, 'auth');
  assert.equal(login.view, 'auth');
  assert.equal(login.authTab, 'login');
  assert.equal(signup.authTab, 'signup');
  assert.equal(signup.authNext, '/profile/settings');
  assert.equal(signup.authUsername, 'ab');
  assert.equal(parseRouteLocation('/signup', '?username=bad%2Fname').authUsername, '');
  assert.match(appSource, /loaderKey: 'authPage'/);
  assert.match(appSource, /navigateToAuth/);
  assert.doesNotMatch(appSource, /auth-modal-overlay|openAuthModal/);
  assert.match(authPageSource, /getSafeNextUrl/);
  assert.match(authPageSource, /profileLoading/);
  assert.match(authPageSource, /SiteModeHeader/);
  assert.match(authPageSource, /isHomepageStyle=\{true\}/);
  assert.match(authPageSource, /--home-canvas: var\(--bg, #0e0e10\)/);
  assert.doesNotMatch(authPageSource, /auth-page__header/);
  assert.match(authSource, /standalone/);
  assert.match(authSource, /getAuthCallbackUrl\(next\)/);
  assert.match(authSource, /getResetPasswordUrl\(next\)/);
  assert.match(authPageSource, /safeNext/);
  assert.match(authPageSource, /params\.set\('next', safeNext\)/);
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
