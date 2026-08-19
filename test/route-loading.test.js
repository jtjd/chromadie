import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const [app, outlet, loaders, header] = await Promise.all([
  read('src/App.svelte'),
  read('src/lib/RouteOutlet.svelte'),
  read('src/lib/routeLoaders.js'),
  read('src/lib/SiteModeHeader.svelte')
]);

test('route loading keeps the shell and previous page mounted until a destination resolves', () => {
  assert.match(app, /<RouteOutlet/);
  assert.match(app, /homepageHeaderTransitionPending/);
  assert.match(app, /on:loaded=\{handleRouteSettled\}/);
  assert.match(app, /on:error=\{handleRouteSettled\}/);
  assert.match(app, /!homepageHeaderTransitionPending/);
  assert.match(outlet, /activeComponent/);
  assert.match(outlet, /activeProps/);
  assert.match(outlet, /activeProps = componentProps/);
  assert.match(outlet, /current route props/);
  assert.match(outlet, /await loadRouteComponent\(target\.loaderKey\)/);
  assert.match(outlet, /if \(target\.staticComponent\)/);
  assert.match(outlet, /dispatch\('loaded'/);
  assert.match(outlet, /dispatch\('error'/);
  assert.match(outlet, /role="status"/);
  assert.match(outlet, /prefers-reduced-motion/);
  assert.doesNotMatch(outlet, /activecolor/);
});

test('route loaders use explicit split points and cache prefetched modules', () => {
  for (const key of ['game', 'leaderboard', 'progression', 'profileShell', 'profileSettings', 'guestProfile', 'privacy', 'terms', 'howToPlay']) {
    assert.match(loaders, new RegExp(`${key}: \\(\\) => import\\(`));
  }
  assert.match(loaders, /const promiseCache = new Map/);
  assert.match(loaders, /export function prefetchRouteComponent/);
  assert.match(loaders, /game: \(\) => import\('\.\/RollPage\.svelte'\)/);
});

test('primary navigation prefetches destinations for mouse and keyboard users', () => {
  assert.match(header, /on:mouseenter=\{\(\) => prefetch\('leaderboard'\)\}/);
  assert.match(header, /on:focus=\{\(\) => prefetch\('leaderboard'\)\}/);
  assert.match(header, /on:mouseenter=\{\(\) => prefetch\('profileSettings'\)\}/);
  assert.match(header, /on:focus=\{\(\) => prefetch\('profileSettings'\)\}/);
  assert.match(header, /on:mouseenter=\{\(\) => prefetch\('progression'\)\}/);
  assert.match(header, /on:focus=\{\(\) => prefetch\('progression'\)\}/);
});

test('the app does not prefetch unrelated route trees during idle startup', () => {
  assert.doesNotMatch(app, /prefetchCommonRoutes|requestIdleCallback|cancelIdlePrefetch/);
});

test('direct refresh resolves the current route before lazy outlet startup', () => {
  assert.match(app, /const initialRoute = typeof window !== 'undefined'/);
  assert.match(app, /parseRouteLocation\(window\.location\.pathname, window\.location\.search\)/);
  assert.match(app, /let view = initialRoute\?\.view \|\| 'home'/);
  assert.match(app, /let routeMode = initialRoute\?\.routeMode \|\| 'app'/);
  assert.doesNotMatch(app, /let view = 'home';[\s\S]{0,180}onMount\(\(\) => \{[\s\S]{0,180}parseRoute\(\)/);
});
