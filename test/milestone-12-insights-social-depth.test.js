import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { PRODUCT_ANALYTICS_CONSENT_KEY } from '../src/lib/productAnalytics.js';
import { recordProfileInsightEvent } from '../src/lib/profileInsightAnalytics.js';
import { createProfileInsightsCsv, normalizeProfileInsights } from '../src/lib/profileInsights.js';
import {
  getProfileNotificationLabel,
  normalizeProfileNotifications
} from '../src/lib/profileNotifications.js';
import { normalizeProfileContent } from '../src/lib/profileContent.js';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

function installStorage(initial = {}) {
  const previous = globalThis.localStorage;
  const values = new Map(Object.entries(initial));
  const storage = {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); }
  };
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, writable: true, value: storage });
  return () => {
    if (previous === undefined) delete globalThis.localStorage;
    else Object.defineProperty(globalThis, 'localStorage', { configurable: true, writable: true, value: previous });
  };
}

const validProfile = 'chromadie';
const validId = '11111111-1111-4111-8111-111111111111';

test('profile insight events require consent, send only bounded public keys, and deduplicate daily', async () => {
  const restore = installStorage({ [PRODUCT_ANALYTICS_CONSENT_KEY]: 'granted' });
  const requests = [];
  const storage = globalThis.localStorage;
  const fetcher = async (url, options) => {
    requests.push({ url, options, body: JSON.parse(options.body) });
    return { ok: true, async json() { return { success: true, recorded: true }; } };
  };
  try {
    assert.deepEqual(await recordProfileInsightEvent({
      profileUsername: validProfile,
      metric: 'click',
      entryKey: 'project-one',
      storage,
      now: new Date('2026-08-08T12:00:00Z'),
      fetcher
    }), { accepted: true, recorded: true });
    assert.equal(requests.length, 1);
    assert.deepEqual(requests[0].body, { username: validProfile, metric: 'click', entryKey: 'project-one' });
    assert.equal(Object.hasOwn(requests[0].body, 'country'), false);
    assert.deepEqual(await recordProfileInsightEvent({
      profileUsername: validProfile,
      metric: 'click',
      entryKey: 'project-one',
      storage,
      now: new Date('2026-08-08T23:00:00Z'),
      fetcher
    }), { accepted: true, recorded: false, reason: 'already_recorded' });
    assert.equal(requests.length, 1);
  } finally {
    restore();
  }
});

test('insight normalization and CSV export keep aggregate dimensions bounded and spreadsheet-safe', () => {
  const insights = normalizeProfileInsights({
    success: true,
    enabled: true,
    windowDays: 30,
    totalViews: 4,
    totalClicks: 2,
    devices: [{ device: 'desktop', count: 2 }, { device: '=FORMULA()', count: 1 }],
    countries: [{ country: 'US', count: 2 }],
    referrers: [{ host: 'example.com', count: 1 }],
    topClicks: [{ entryKey: 'project-one', clicks: 2 }]
  });
  const csv = createProfileInsightsCsv(insights);
  assert.match(csv, /"project-one","2"/);
  assert.doesNotMatch(csv, /"=FORMULA\(\)"/);
  assert.match(csv, /"'=FORMULA\(\)"/);
  assert.match(csv, /\r\n/);
});

test('notification normalization exposes only owner-safe grouped signals', () => {
  const normalized = normalizeProfileNotifications({
    unreadCount: 99,
    notifications: [{
      id: validId,
      type: 'guestbook_like',
      actor: 'ColorUser',
      eventCount: 5,
      payload: { bodyPreview: 'Kind note', privateEmail: 'hidden@example.invalid', ignored: { secret: true } },
      readAt: null,
      internalIp: '127.0.0.1'
    }, {
      id: 'not-a-uuid',
      type: 'message',
      actor: 'drop-me'
    }]
  });
  assert.equal(normalized.notifications.length, 1);
  assert.deepEqual(normalized.notifications[0].payload, { bodyPreview: 'Kind note' });
  assert.match(getProfileNotificationLabel(normalized.notifications[0]), /liked a guestbook note/);
  assert.equal(normalized.notifications[0].internalIp, undefined);
});

test('project keys are stable opaque identifiers while unsafe about content stays structured', () => {
  const first = normalizeProfileContent({
    version: 1,
    about: { heading: 'About', body: '<script>alert(1)</script> story' },
    projects: [{ title: 'One', url: 'https://example.com/one' }]
  });
  const second = normalizeProfileContent({
    version: 1,
    about: { heading: 'About', body: '<script>alert(1)</script> story' },
    projects: [{ title: 'One', url: 'https://example.com/one' }]
  });
  assert.equal(first.projects[0].key, second.projects[0].key);
  assert.match(first.projects[0].key, /^p[a-z0-9]+$/);
  assert.equal(first.about.body, '<script>alert(1)</script> story');
});

test('Milestone 12 schema and client surfaces retain privacy and RPC-only boundaries', async () => {
  const [migration, security, shell, social, notifications, analytics] = await Promise.all([
    read('supabase/migrations/20260808230000_profile_insights_social_depth.sql'),
    read('supabase/tests/launch_security.sql'),
    read('src/lib/ProfileShell.svelte'),
    read('src/lib/ProfileSocial.svelte'),
    read('src/lib/ProfileNotifications.svelte'),
    read('functions/analytics/profile.js')
  ]);
  assert.match(migration, /profile_insight_daily/);
  assert.match(migration, /profile_guestbook_replies/);
  assert.match(migration, /profile_guestbook_likes/);
  assert.match(migration, /profile_guestbook_pins/);
  assert.match(migration, /profile_notifications/);
  assert.match(migration, /event_count BETWEEN 0 AND 1000000/);
  assert.match(migration, /v_pin_count >= 3/);
  assert.match(migration, /cleanup_profile_view_daily/);
  assert.match(security, /profile_insight_daily/);
  assert.match(security, /get_my_profile_notifications/);
  assert.match(shell, /recordProfileInsightEvent/);
  assert.match(shell, /onEntryClick={recordProfileClick}/);
  assert.match(social, /create_profile_guestbook_reply/);
  assert.match(social, /toggle_profile_guestbook_like/);
  assert.match(social, /toggle_profile_guestbook_pin/);
  assert.match(social, /p_reply_key/);
  assert.match(notifications, /get_my_profile_notifications/);
  assert.doesNotMatch(notifications, /email notification/i);
  assert.match(analytics, /getDeviceClass/);
  assert.match(analytics, /getCountry/);
  assert.match(analytics, /getReferrerHost/);
  assert.doesNotMatch(analytics, /request\.headers\.get\(['"]x-forwarded-for/i);
});
