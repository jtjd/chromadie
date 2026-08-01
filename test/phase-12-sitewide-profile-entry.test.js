import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { parseRouteLocation } from '../src/lib/routes.js';

const app = await readFile(new URL('../src/App.svelte', import.meta.url), 'utf8');
const routeLoaders = await readFile(new URL('../src/lib/routeLoaders.js', import.meta.url), 'utf8');
const header = await readFile(new URL('../src/lib/SiteModeHeader.svelte', import.meta.url), 'utf8');
const site = await readFile(new URL('../src/styles/site.css', import.meta.url), 'utf8');

test('the bare root is the landing page and explicit gameplay remains compatible', () => {
  assert.equal(parseRouteLocation('/').view, 'home');
  assert.equal(parseRouteLocation('/', '?view=game').view, 'game');
  assert.equal(parseRouteLocation('/c/challenge-1').view, 'game');
  assert.equal(parseRouteLocation('/u/OtherUser').view, 'profile');
  assert.equal(parseRouteLocation('/profile/settings').view, 'profile-settings');
});

test('site surfaces use one shared header and the quiet site shell', () => {
  assert.match(app, /<SiteModeHeader/);
  assert.doesNotMatch(app, /<ProfileModeHeader/);
  assert.match(app, /isProfileMode=\{profileModeVisible\}/);
  assert.match(app, /on:edit=\{handleProfileHeaderEdit\}/);
  assert.doesNotMatch(app, /<ProfileAtmosphere/);
  assert.match(app, /app-main--site/);
  assert.match(app, /setRoute\('profile', \{ username:/);
  assert.match(app, /handleInternalLinkClick/);
  assert.match(app, /navigateToPath\(nextPath\)/);
  assert.match(app, /ACCOUNT_STATES\.SIGNED_OUT/);
  assert.match(app, /staticComponent: HomePage/);
  assert.match(app, /loaderKey: 'profileSettings'/);
  assert.match(routeLoaders, /profileSettings: \(\) => import\('\.\/ProfileSettings\.svelte'\)/);
  assert.match(app, /on:signup=\{\(\) => openAuthModal\('signup'\)\}/);
  assert.match(header, /Profile/);
  assert.doesNotMatch(header, />Roll</);
  assert.match(header, /navigate\('home'\)/);
  assert.match(header, /Leaderboard/);
  assert.match(header, /Studio/);
  assert.match(header, /isProfileMode/);
  assert.doesNotMatch(header, /navigator\.share/);
  assert.doesNotMatch(header, /Share profile/);
  assert.doesNotMatch(header, /shareProfile/);
  assert.match(header, /dispatch\('logout'/);
  assert.match(site, /\.app-main--site \.card/);
  assert.match(site, /\.app-main--site \.shop-page/);
  assert.match(site, /\.app-main--site \.discovery-hub/);
});

test('explicit routes remain available instead of being rewritten to the profile', () => {
  assert.equal(parseRouteLocation('/shop').view, 'shop');
  assert.equal(parseRouteLocation('/leaderboard').view, 'leaderboard');
  assert.equal(parseRouteLocation('/how-to-play').routeMode, 'how-to-play');
  assert.equal(parseRouteLocation('/privacy').routeMode, 'privacy');
  assert.equal(parseRouteLocation('/terms').routeMode, 'terms');
});
