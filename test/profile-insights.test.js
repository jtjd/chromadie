import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { PRODUCT_ANALYTICS_CONSENT_KEY } from '../src/lib/productAnalytics.js';
import { normalizeProfileInsights } from '../src/lib/profileInsights.js';
import {
  PROFILE_VIEW_RECENCY_KEY,
  getProfileViewDateKey,
  recordPublicProfileView
} from '../src/lib/profileViewAnalytics.js';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

function installStorage(initial = {}) {
  const previous = globalThis.localStorage;
  const values = new Map(Object.entries(initial));
  const storage = {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    }
  };

  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    writable: true,
    value: storage
  });

  return {
    storage,
    restore() {
      if (previous === undefined) delete globalThis.localStorage;
      else Object.defineProperty(globalThis, 'localStorage', { configurable: true, writable: true, value: previous });
    }
  };
}

test('profile insights normalization keeps daily aggregates bounded', () => {
  const normalized = normalizeProfileInsights({
    success: true,
    enabled: true,
    windowDays: 500,
    totalViews: 900000000,
    activeDays: 900,
    daily: Array.from({ length: 100 }, (_, index) => ({
      date: `2026-05-${String((index % 30) + 1).padStart(2, '0')}`,
      views: 2000000 - index
    }))
  });

  assert.equal(normalized.windowDays, 90);
  assert.equal(normalized.totalViews, 1000000);
  assert.equal(normalized.activeDays, 90);
  assert.equal(normalized.daily.length, 90);
  assert.equal(normalized.daily.every(entry => entry.views <= 1000000), true);
  assert.equal(normalized.daily[0].date <= normalized.daily.at(-1).date, true);
});

test('public profile view recording requires consent and deduplicates by profile and UTC day', async () => {
  const { storage, restore } = installStorage({ [PRODUCT_ANALYTICS_CONSENT_KEY]: 'granted' });
  const calls = [];
  const client = {
    async rpc(name, args) {
      calls.push({ name, args });
      return { data: { success: true, recorded: true }, error: null };
    }
  };
  const now = new Date('2026-08-08T12:00:00Z');

  try {
    assert.equal(getProfileViewDateKey(now), '2026-08-08');
    assert.deepEqual(await recordPublicProfileView(client, 'Ada', { storage, now }), {
      accepted: true,
      recorded: true
    });
    assert.deepEqual(calls, [{
      name: 'record_public_profile_view',
      args: { p_username: 'ada' }
    }]);
    assert.deepEqual(JSON.parse(storage.getItem(PROFILE_VIEW_RECENCY_KEY)), ['2026-08-08:ada']);
    assert.deepEqual(await recordPublicProfileView(client, 'ada', { storage, now }), {
      accepted: true,
      recorded: false,
      reason: 'already_recorded'
    });
    assert.equal(calls.length, 1);
  } finally {
    restore();
  }
});

test('denied or malformed profile views never invoke the recorder', async () => {
  const { storage, restore } = installStorage({ [PRODUCT_ANALYTICS_CONSENT_KEY]: 'denied' });
  let calls = 0;
  const client = { rpc: async () => { calls += 1; return { data: { success: true, recorded: true } }; } };

  try {
    assert.deepEqual(await recordPublicProfileView(client, 'Ada', { storage }), {
      accepted: false,
      recorded: false,
      reason: 'consent_required'
    });
    assert.deepEqual(await recordPublicProfileView(client, 'not a username', { storage }), {
      accepted: false,
      recorded: false,
      reason: 'invalid_profile'
    });
    assert.equal(calls, 0);
  } finally {
    restore();
  }
});

test('profile insights preserve the privacy and dashboard boundaries', async () => {
  const [recorder, shell, component, settings, migration] = await Promise.all([
    read('src/lib/profileViewAnalytics.js'),
    read('src/lib/ProfileShell.svelte'),
    read('src/lib/ProfileInsights.svelte'),
    read('src/lib/ProfileSettings.svelte'),
    read('supabase/migrations/20260808170000_profile_insights.sql')
  ]);

  assert.match(shell, /recordPublicProfileView\(supabase, targetProfile\.username\)/);
  assert.match(recorder, /getProductAnalyticsConsent\(\) !== 'granted'/);
  assert.match(recorder, /record_public_profile_view/);
  assert.doesNotMatch(recorder, /fetch\s*\(|sendBeacon|XMLHttpRequest/);
  assert.match(component, /update_my_profile_insights_settings/);
  assert.match(component, /Visitor identities, IP addresses, and exact visit times are never stored/);
  assert.match(component, /prefers-reduced-motion/);
  assert.match(settings, /'profile-insights': \(\) => import\('\.\/ProfileInsights\.svelte'\)/);
  assert.match(settings, /id: 'profile-insights'/);
  assert.match(settings, /insights: 'profile-insights'/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.profile_view_daily/);
  assert.match(migration, /ALTER TABLE public\.profile_view_daily ENABLE ROW LEVEL SECURITY/);
  assert.match(migration, /REVOKE ALL ON TABLE public\.profile_view_daily FROM PUBLIC, anon, authenticated/);
  assert.match(migration, /profile_insights_enabled boolean NOT NULL DEFAULT false/);
  assert.match(migration, /view_date < public\.game_utc_date\(\) - 90/);
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.record_public_profile_view/);
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.get_my_profile_insights/);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.get_my_profile_insights\(integer\) TO authenticated/);
  assert.doesNotMatch(migration, /GRANT (SELECT|ALL) ON TABLE public\.profile_view_daily TO (anon|authenticated)/);
});
