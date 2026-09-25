import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { parseRouteLocation } from '../src/lib/routes.js';

const app = await readFile(new URL('../src/App.svelte', import.meta.url), 'utf8');
const navigation = await readFile(new URL('../src/lib/routeNavigation.js', import.meta.url), 'utf8');
const routeTarget = await readFile(new URL('../src/lib/routeTarget.js', import.meta.url), 'utf8');
const routeLoaders = await readFile(new URL('../src/lib/routeLoaders.js', import.meta.url), 'utf8');
const header = await readFile(new URL('../src/lib/SiteModeHeader.svelte', import.meta.url), 'utf8');
const site = await readFile(new URL('../src/styles/site.css', import.meta.url), 'utf8');

test('the homepage is the daily-roll entry while challenge routes stay distinct', () => {
  assert.equal(parseRouteLocation('/').view, 'home');
  assert.equal(parseRouteLocation('/', '?view=game').view, 'home');
  assert.equal(parseRouteLocation('/roll').routeMode, 'not-found');
  assert.equal(parseRouteLocation('/c/challenge-1').view, 'game');
  assert.equal(parseRouteLocation('/u/OtherUser').view, 'profile');
  assert.equal(parseRouteLocation('/profile/settings').view, 'profile-settings');
  assert.equal(parseRouteLocation('/progression').view, 'progression');
});

test('site surfaces use one shared header and the quiet site shell', () => {
  assert.match(app, /<SiteModeHeader/);
  assert.doesNotMatch(app, /<ProfileModeHeader/);
  assert.match(app, /isProfileMode=\{profileModeVisible\}/);
  assert.match(app, /isHomepageStyle=\{!profileModeVisible && !profileSettingsModeVisible\}/);
  assert.match(app, /on:edit=\{handleProfileHeaderEdit\}/);
  assert.match(app, /app-main--site/);
  assert.match(app, /setRoute\('profile', \{ username:/);
  assert.match(app, /createRouteNavigationController/);
  assert.match(app, /routeNavigation\.navigateToPath\(nextPath/);
  assert.match(navigation, /function handleInternalLinkClick/);
  assert.match(navigation, /function navigateToPath/);
  assert.match(app, /ACCOUNT_STATES\.SIGNED_OUT/);
  assert.match(routeTarget, /loaderKey: 'home'/);
  assert.match(routeTarget, /loaderKey: 'profileSettings'/);
  assert.match(routeLoaders, /profileSettings: \(\) => import\('\.\/ProfileSettings\.svelte'\)/);
  assert.match(app, /on:signup=\{\(\) => navigateToAuth\('signup'\)\}/);
  assert.match(header, /Profile/);
  assert.match(header, />Roll</);
  assert.match(header, /prefetch\('home'\)/);
  assert.match(header, /navigate\('home'\)/);
  assert.match(header, /navigate\('home'\)/);
  assert.match(header, /Leaderboard/);
  assert.match(header, />Customize</);
  assert.match(header, />Progression</);
  assert.doesNotMatch(header, />Shop</);
  assert.doesNotMatch(header, />Profile</);
  assert.match(header, /class:site-mode-header--home=\{isHomeMode \|\| isHomepageStyle\}/);
  assert.match(header, /isProfileMode/);
  assert.match(header, />Edit</);
  assert.match(header, /site-mode-header--profile \.site-mode-header__context \{ display: flex/);
  assert.doesNotMatch(header, /navigator\.share/);
  assert.doesNotMatch(header, /Share profile/);
  assert.doesNotMatch(header, /shareProfile/);
  assert.match(header, /dispatch\('logout'/);
  assert.match(site, /\.app-main--site \.card/);
  assert.doesNotMatch(site, /discovery-(?:hub|card|grid|tabs)/);
});

test('explicit routes remain available while the retired Shop URL enters Customize', () => {
  assert.equal(parseRouteLocation('/shop').view, 'profile-settings');
  assert.equal(parseRouteLocation('/leaderboard').view, 'leaderboard');
  assert.equal(parseRouteLocation('/how-to-play').routeMode, 'how-to-play');
  assert.equal(parseRouteLocation('/privacy').routeMode, 'privacy');
  assert.equal(parseRouteLocation('/terms').routeMode, 'terms');
});
