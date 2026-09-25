import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveRouteMetadata } from '../src/lib/routeMetadata.js';

test('profile metadata fails closed until the discoverability projection loads', () => {
  const pending = resolveRouteMetadata({
    routeMode: 'app',
    view: 'profile',
    profileTitle: 'Alex',
    selectedProfileUsername: 'alex'
  });
  assert.equal(pending.canonicalPath, '/alex');
  assert.equal(pending.robots, 'noindex,follow');

  const discoverable = resolveRouteMetadata({
    routeMode: 'app',
    view: 'profile',
    profileTitle: 'Alex',
    selectedProfileUsername: 'alex',
    profileIndexingAllowed: true
  });
  assert.equal(discoverable.robots, 'index,follow');
});
test('private application surfaces and challenge routes stay noindex', () => {
  for (const view of ['profile-settings', 'progression', 'prototype']) {
    assert.equal(resolveRouteMetadata({ routeMode: 'app', view }).robots, 'noindex,follow');
  }
  const challenge = resolveRouteMetadata({ routeMode: 'app', view: 'game', challengeData: { id: 'challenge-42', fromUsername: 'Alex' } });
  assert.equal(challenge.title, 'Challenge | ChromaDie');
  assert.equal(challenge.robots, 'noindex,follow');
  const removedDailyRollRoute = resolveRouteMetadata({ routeMode: 'app', view: 'game' });
  assert.equal(removedDailyRollRoute.title, 'Page Not Found | ChromaDie');
  assert.equal(removedDailyRollRoute.robots, 'noindex,follow');
  assert.equal(resolveRouteMetadata({ routeMode: 'app', view: 'pricing', pricingSuccess: true }).robots, 'noindex,follow');
  assert.equal(resolveRouteMetadata({ routeMode: 'app', view: 'profile', selectedProfileUsername: 'alex', profileIndexingAllowed: true, profileRouteKind: 'compatibility' }).robots, 'noindex,follow');
});
