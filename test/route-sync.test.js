import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { getChallengeClearPath, resolveRouteSyncPath, viewToCanonicalPath } from '../src/lib/routes.js';

const [appSource, pricingSource] = await Promise.all([
  readFile(new URL('../src/App.svelte', import.meta.url), 'utf8'),
  readFile(new URL('../src/lib/Pricing.svelte', import.meta.url), 'utf8')
]);
const syncRouteSource = appSource.slice(appSource.indexOf('function syncRoute()'), appSource.indexOf('async function loadFounderAnnouncementState()'));

function resolve(overrides = {}) {
  const state = {
    routeMode: 'app',
    aliasResolving: false,
    view: 'home',
    pathname: '/',
    search: '',
    ...overrides
  };
  return resolveRouteSyncPath(
    state.routeMode,
    state.view,
    state.aliasResolving,
    state.pathname,
    state.search,
    state.selectedProfileUsername,
    state.selectedUserId,
    state.sessionUserId,
    state.accountUsername,
    state.challengeData,
    state.tab,
    state.progressionTab,
    state.legacyProfile
  );
}

test('route synchronization skips states that App must leave alone', () => {
  assert.equal(resolve({ routeMode: 'privacy' }), null);
  assert.equal(resolve({ aliasResolving: true, view: 'profile', selectedProfileUsername: 'neon' }), null);
  assert.equal(resolve({ view: 'game', challengeData: { id: 'challenge-1' }, pathname: '/c/challenge-1' }), null);
  assert.equal(resolve({ view: 'prototype', pathname: '/prototype/profile', search: '?fixture=1' }), null);
  assert.equal(resolve({ view: 'profile', pathname: '/profile' }), null);
});

test('profile synchronization preserves username precedence and ID fallbacks', () => {
  assert.equal(resolve({
    view: 'profile',
    pathname: '/profile',
    selectedProfileUsername: 'SelectedName',
    selectedUserId: 'other-user',
    accountUsername: 'MyName',
    sessionUserId: 'my-user'
  }), '/selectedname');
  assert.equal(resolve({
    view: 'profile',
    pathname: '/profile',
    selectedUserId: 'my-user',
    sessionUserId: 'my-user',
    accountUsername: 'MyName'
  }), '/myname');
  assert.equal(resolve({ view: 'profile', pathname: '/profile', accountUsername: 'MyName' }), '/myname');
  assert.equal(resolve({ view: 'profile', pathname: '/profile', selectedUserId: 'other-user', accountUsername: 'MyName' }), '/?view=profile&profile=other-user');
  assert.equal(resolve({ view: 'profile', pathname: '/profile', selectedUserId: 'my-user', sessionUserId: 'my-user' }), '/?view=profile&profile=my-user');
  assert.equal(resolve({ view: 'profile', pathname: '/u/LegacyName', selectedProfileUsername: 'LegacyName', legacyProfile: true }), '/u/LegacyName?legacy=1');
});

test('route synchronization uses canonical tab paths and skips matching paths', () => {
  assert.equal(resolve({ view: 'leaderboard', pathname: '/leaderboard' }), null);
  assert.equal(resolve({ view: 'leaderboard', pathname: '/leaderboard', search: '?tab=monthly', tab: 'monthly' }), null);
  assert.equal(resolve({ view: 'leaderboard', pathname: '/leaderboard/', tab: 'monthly' }), '/leaderboard?tab=monthly');
  assert.equal(resolve({ view: 'leaderboard', pathname: '/leaderboard', search: '?tab=invalid', tab: 'invalid' }), '/leaderboard');
  assert.equal(resolve({ view: 'progression', pathname: '/progression', progressionTab: 'journey' }), null);
  assert.equal(resolve({ view: 'progression', pathname: '/progression', progressionTab: 'history' }), '/progression?tab=history');
  assert.equal(resolve({ view: 'profile-settings', pathname: '/profile/settings' }), null);
  assert.equal(resolve({ view: 'profile-settings', pathname: '/profile/settings', search: '?panel=content' }), '/profile/settings');
});

test('pricing return URLs and their query parameters survive reactive synchronization', () => {
  assert.equal(resolve({
    view: 'pricing',
    pathname: '/pricing/success',
    search: '?session_id=cs_live_123&utm_source=checkout'
  }), null);
  assert.equal(resolve({
    view: 'pricing',
    pathname: '/pricing/success/',
    search: '?session_id=cs_live_123'
  }), null);
  assert.equal(resolve({
    view: 'pricing',
    pathname: '/pricing/success',
    search: '?session_id=cs_live_123'
  }), null);
  assert.equal(resolve({
    view: 'pricing',
    pathname: '/pricing',
    search: '?checkout=cancelled&utm_source=checkout'
  }), null);
  assert.equal(resolve({
    view: 'pricing',
    pathname: '/pricing/',
    search: '?checkout=cancelled'
  }), null);
  assert.equal(resolve({ view: 'pricing', pathname: '/pricing', search: '?checkout=unknown' }), '/pricing');
  assert.equal(viewToCanonicalPath('pricing'), '/pricing');
  assert.ok(pricingSource.includes("params.get('session_id')"));
  assert.ok(pricingSource.includes("params.get('checkout') === 'cancelled'"));
  assert.ok(pricingSource.includes("window.location.pathname.replace(/\\/+$/, '') === '/pricing/success'"));
});

test('challenge cleanup redirects challenge paths and preserves unrelated path, query, and hash state', () => {
  assert.equal(
    getChallengeClearPath('https://chromadie.test/c/challenge-42?challenge=old&hex=%23ffffff&from=Name&keep=1#section'),
    '/'
  );
  assert.equal(
    getChallengeClearPath('https://chromadie.test/?view=game&tab=monthly&challenge=old&hex=%23ffffff&from=Name&keep=1#section'),
    '/?tab=monthly&keep=1#section'
  );
});

test('App keeps replaceState as the route sync side effect and compares path plus search', () => {
  assert.match(syncRouteSource, /window\.history\.replaceState/);
  assert.doesNotMatch(syncRouteSource, /window\.history\.pushState/);
  const noWriteIndex = syncRouteSource.indexOf('if (!nextUrl) return;');
  const replaceIndex = syncRouteSource.indexOf('window.history.replaceState');
  assert.ok(noWriteIndex >= 0 && replaceIndex > noWriteIndex);
  assert.match(syncRouteSource, /window\.location\.pathname/);
  assert.match(syncRouteSource, /window\.location\.search/);
  assert.doesNotMatch(syncRouteSource, /window\.location\.hash/);
});
