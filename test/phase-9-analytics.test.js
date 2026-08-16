import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  PRODUCT_ANALYTICS_CONSENT_KEY,
  createMemoryProductAnalyticsAdapter,
  getProductAnalyticsConsent,
  setProductAnalyticsAdapter,
  setProductAnalyticsConsent,
  trackProductEvent
} from '../src/lib/productAnalytics.js';

function installStorage(initial = null) {
  const previous = globalThis.localStorage;
  const values = new Map(initial ? [[PRODUCT_ANALYTICS_CONSENT_KEY, initial]] : []);
  const storage = {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
    }
  };

  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    writable: true,
    value: storage
  });

  return () => {
    setProductAnalyticsAdapter(null);
    if (previous === undefined) {
      delete globalThis.localStorage;
    } else {
      Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        writable: true,
        value: previous
      });
    }
  };
}

test('product events require explicit consent and an allowlisted name', () => {
  const restore = installStorage();
  const adapter = createMemoryProductAnalyticsAdapter();
  setProductAnalyticsAdapter(adapter);

  try {
    assert.equal(getProductAnalyticsConsent(), null);
    assert.deepEqual(trackProductEvent('route_view', { route: 'game' }), {
      accepted: false,
      reason: 'consent_required'
    });
    assert.deepEqual(trackProductEvent('private_account_export', {}), {
      accepted: false,
      reason: 'invalid_event'
    });
    assert.deepEqual(adapter.getEvents(), []);
  } finally {
    restore();
  }
});

test('granted events are bounded, redacted, and delivered to the local adapter only', () => {
  const restore = installStorage();
  const adapter = createMemoryProductAnalyticsAdapter();
  setProductAnalyticsAdapter(adapter);

  try {
    assert.equal(setProductAnalyticsConsent('granted'), 'granted');
    const result = trackProductEvent('public_profile_view', {
      viewer: 'visitor\n' + 'x'.repeat(100),
      username: 'SecretName',
      profileId: 'private-user-id',
      score: 999999,
      hex: '#FFFFFF',
      moderationDetails: 'private report'
    });

    assert.equal(result.accepted, true);
    assert.equal(result.sent, true);
    const [event] = adapter.getEvents();
    assert.deepEqual(Object.keys(event.properties), ['viewer']);
    assert.equal(event.properties.viewer.length, 48);
    assert.doesNotMatch(JSON.stringify(event), /SecretName|private-user-id|999999|FFFFFF|private report/);
    assert.match(event.occurredAt, /^\d{4}-\d{2}-\d{2}T/);
  } finally {
    restore();
  }
});

test('denied consent blocks events and the memory adapter remains bounded', () => {
  const restore = installStorage('denied');
  const adapter = createMemoryProductAnalyticsAdapter(2);
  setProductAnalyticsAdapter(adapter);

  try {
    assert.equal(getProductAnalyticsConsent(), 'denied');
    assert.deepEqual(trackProductEvent('route_view', { route: 'game' }), {
      accepted: false,
      reason: 'consent_required'
    });
    assert.equal(setProductAnalyticsConsent('granted'), 'granted');
    trackProductEvent('route_view', { route: 'game' });
    trackProductEvent('route_view', { route: 'profile-settings' });
    trackProductEvent('route_view', { route: 'privacy' });
    assert.deepEqual(adapter.getEvents().map(event => event.properties.route), ['profile-settings', 'privacy']);
  } finally {
    restore();
  }
});

test('the browser adapter is a page-local custom-event seam without a network sink', async () => {
  const source = await readFile(new URL('../src/lib/productAnalytics.js', import.meta.url), 'utf8');
  const mainSource = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');

  assert.match(source, /chromadie:product-event/);
  assert.match(source, /dispatchEvent/);
  assert.doesNotMatch(source, /fetch\s*\(|navigator\.sendBeacon|XMLHttpRequest/);
  assert.match(mainSource, /createBrowserProductAnalyticsAdapter/);
});

test('existing flows use the product-event contract without exposing private payloads', async () => {
  const sources = await Promise.all([
    readFile(new URL('../src/App.svelte', import.meta.url), 'utf8'),
    readFile(new URL('../src/lib/ProfileShell.svelte', import.meta.url), 'utf8'),
    readFile(new URL('../src/lib/Game.svelte', import.meta.url), 'utf8'),
    readFile(new URL('../src/lib/ProfileRoll.svelte', import.meta.url), 'utf8'),
    readFile(new URL('../src/lib/DiscoveryCard.svelte', import.meta.url), 'utf8'),
    readFile(new URL('../src/lib/ProfileCosmeticsEditor.svelte', import.meta.url), 'utf8')
  ]);
  const [app, shell, game, profileRoll, discovery, cosmeticsEditor] = sources;

  assert.match(app, /trackProductEvent\('route_view'/);
  assert.match(shell, /trackProductEvent\('public_profile_view'/);
  assert.match(game, /trackProductEvent\('roll_ready'/);
  assert.match(game, /trackProductEvent\('roll_completed'/);
  assert.match(profileRoll, /trackProductEvent\('roll_ready'/);
  assert.match(profileRoll, /trackProductEvent\('roll_completed'/);
  assert.match(discovery, /trackProductEvent\('profile_shared'/);
  assert.match(cosmeticsEditor, /trackProductEvent\('cosmetic_preview'/);
  assert.match(cosmeticsEditor, /trackProductEvent\('cosmetic_equip'/);
  assert.doesNotMatch(app + shell + game + profileRoll + discovery + cosmeticsEditor, /trackProductEvent\([^\n]*(username|profileId|score|hex|email|details)/i);
});

test('homepage conversion events are allowlisted without identity payloads', () => {
  const restore = installStorage();
  const adapter = createMemoryProductAnalyticsAdapter();
  setProductAnalyticsAdapter(adapter);

  try {
    setProductAnalyticsConsent('granted');
    for (const eventName of ['username_claim_started', 'username_claim_completed', 'example_profile_opened', 'explore_clicked']) {
      assert.equal(trackProductEvent(eventName, { username: 'private-name' }).accepted, true);
    }
    assert.deepEqual(adapter.getEvents().map(event => event.name), [
      'username_claim_started',
      'username_claim_completed',
      'example_profile_opened',
      'explore_clicked'
    ]);
    assert.doesNotMatch(JSON.stringify(adapter.getEvents()), /private-name/);
    assert.deepEqual(adapter.getEvents().map(event => event.properties), [{}, {}, {}, {}]);
  } finally {
    restore();
  }
});
