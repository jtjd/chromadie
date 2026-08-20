import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createEmptyProgression,
  normalizeProgressionData
} from '../src/lib/progressionState.js';
import {
  loadProgressionData,
  PROGRESSION_RPC
} from '../src/lib/progressionData.js';
import {
  PRODUCT_ANALYTICS_CONSENT_KEY,
  createAggregateProductAnalyticsAdapter,
  createMemoryProductAnalyticsAdapter,
  resetProgressionAnalyticsDedupe,
  setProductAnalyticsAdapter,
  setProductAnalyticsConsent,
  trackProgressionEvent,
  trackProductEvent
} from '../src/lib/productAnalytics.js';
import { normalizeProfileProgressionProof } from '../src/lib/profileStory.js';

function installStorage(initial = null) {
  const previous = globalThis.localStorage;
  const values = new Map(initial ? [[PRODUCT_ANALYTICS_CONSENT_KEY, initial]] : []);
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
  return () => {
    setProductAnalyticsAdapter(null);
    resetProgressionAnalyticsDedupe();
    if (previous === undefined) delete globalThis.localStorage;
    else Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      writable: true,
      value: previous
    });
  };
}

function reward(itemKey, extra = {}) {
  return {
    item_key: itemKey,
    name: itemKey,
    slot: 'font',
    access_tier: 'earned',
    renderer: 'canonical-renderer',
    ...extra
  };
}

test('progression presentation keeps all three dimensions and never infers eligibility', () => {
  const progression = normalizeProgressionData({
    current_ep: 2_500_000,
    total_rolls: 100,
    current_streak: 3,
    longest_streak: 21,
    milestones: [
      {
        id: 'ritual_roll_10',
        track: 'ritual',
        metric: 'achievement',
        progress_source: 'total_rolls',
        progress_target: 10,
        sort_order: 10,
        reward: reward('ritual_reward'),
        progress: { current: 10, target: 10, unit: 'rolls' },
        unlocked: true
      },
      {
        id: 'ritual_roll_100',
        track: 'ritual',
        metric: 'achievement',
        progress_source: 'total_rolls',
        progress_target: 100,
        sort_order: 20,
        reward: reward('ritual_future'),
        progress: { current: 100, target: 100, unit: 'rolls' },
        unlocked: false
      },
      {
        id: 'discovery_mythic',
        track: 'discovery',
        metric: 'achievement',
        achievement_id: 'mythic',
        sort_order: 10,
        expected_rolls: 852,
        pace_band: 'years',
        reward: reward('mythic_reward', {
          preview: { renderer: 'font', item_key: 'mythic_reward' }
        }),
        unlocked: false
      },
      {
        id: 'discovery_anomaly',
        track: 'discovery',
        metric: 'achievement',
        achievement_id: 'anomaly',
        sort_order: 20,
        expected_rolls: 2191,
        reward: reward('anomaly_reward'),
        unlocked: true,
        unlock_source: 'live',
        presented_at: null
      },
      {
        id: 'discovery_retired',
        track: 'discovery',
        metric: 'achievement',
        achievement_id: 'legacy',
        sort_order: 30,
        published: false,
        reward: reward('retired_reward'),
        unlocked: false
      }
    ]
  });

  assert.deepEqual(Object.keys(progression.tracks), ['rank', 'mastery', 'ritual', 'discovery']);
  assert.equal(progression.tracks.rank.length, 5);
  assert.equal(progression.tracks.mastery, progression.tracks.rank);
  assert.equal(progression.longestStreak, 21);

  const ritual = Object.fromEntries(
    progression.tracks.ritual.map(node => [node.id, node])
  );
  assert.equal(ritual.ritual_roll_10.presentationState, 'completed');
  assert.equal(ritual.ritual_roll_100.presentationState, 'active');
  assert.equal(ritual.ritual_roll_100.isCompleted, false);

  const discovery = Object.fromEntries(
    progression.tracks.discovery.map(node => [node.id, node])
  );
  assert.equal(discovery.discovery_mythic.presentationState, 'active');
  assert.equal(discovery.discovery_anomaly.presentationState, 'new');
  assert.equal(discovery.discovery_mythic.isFuture, false);
  assert.equal(discovery.discovery_anomaly.reward.accessTier, 'earned');
  assert.equal(discovery.discovery_anomaly.reward.preview, undefined);
  assert.equal(progression.unpublishedMilestones[0].presentationState, 'unpublished');
  assert.equal(progression.publishedMilestones.some(node => node.id === 'discovery_retired'), false);
});

test('public progression proof preserves a bounded server milestone count', () => {
  const proof = normalizeProfileProgressionProof({
    completed_count: '7',
    recent_unlocks: [{
      id: 'rank_ep_100',
      name: 'First expression',
      track: 'rank',
      reward: { name: 'Linework', slot: 'font' }
    }]
  });

  assert.equal(proof.completedCount, 7);
  assert.equal(proof.recentUnlocks.length, 1);
  assert.equal(normalizeProfileProgressionProof({ completed_count: 999999999 }).completedCount, 1000000);
  assert.equal(normalizeProfileProgressionProof({ completed_count: -4 }).completedCount, 0);
});

test('pending unlocks carry server reward metadata without changing eligibility', () => {
  const progression = normalizeProgressionData({
    pending_unlocks: [{
      id: 'discovery_new',
      track: 'discovery',
      metric: 'achievement',
      achievement_id: 'new_condition',
      reward: reward('new_reward', {
        category: 'font',
        preview: { renderer: 'font', item_key: 'new_reward' }
      })
    }],
    milestones: [{
      id: 'discovery_new',
      track: 'discovery',
      metric: 'achievement',
      achievement_id: 'new_condition',
      reward: reward('new_reward')
    }]
  });

  assert.deepEqual(progression.pendingUnlocks.map(node => node.id), ['discovery_new']);
  assert.equal(progression.milestones.find(node => node.id === 'discovery_new').presentationState, 'new');
  assert.equal(progression.milestones.find(node => node.id === 'discovery_new').reward.category, 'font');
  assert.equal(progression.milestones.find(node => node.id === 'discovery_new').reward.preview.renderer, 'font');
  assert.equal(progression.milestones.find(node => node.id === 'discovery_new').unlocked, true);
});

test('progression loader calls only the authenticated owner RPC and preserves compatibility shapes', async () => {
  const calls = [];
  const supabaseClient = {
    rpc(name, args) {
      calls.push({ name, args });
      return Promise.resolve({
        data: {
          current_ep: 500_000,
          milestones: []
        },
        error: null
      });
    }
  };

  const loaded = await loadProgressionData(supabaseClient, 'user-id');
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], { name: PROGRESSION_RPC, args: undefined });
  assert.equal(loaded.error, null);
  assert.equal(loaded.data.currentEp, 500_000);
  assert.equal(loaded.skipped, false);

  const skipped = await loadProgressionData(supabaseClient, null);
  assert.equal(skipped.skipped, true);
  assert.equal(calls.length, 1);
  assert.deepEqual(createEmptyProgression().pendingUnlocks, []);
});

test('progression analytics require consent and authentication, then dedupe lifecycle events', async () => {
  const restore = installStorage();
  const adapter = createMemoryProductAnalyticsAdapter();
  setProductAnalyticsAdapter(adapter);

  try {
    assert.deepEqual(
      trackProgressionEvent('progression_unlock_presented', {
        surface: 'progression',
        accountMode: 'guest',
        milestoneId: 'private-id'
      }, { dedupeKey: 'milestone_private' }),
      { accepted: false, reason: 'authenticated_required' }
    );

    setProductAnalyticsConsent('granted');
    const first = trackProgressionEvent('progression_unlock_presented', {
      surface: 'progression',
      accountMode: 'authenticated',
      track: 'discovery',
      milestoneId: 'discovery_mythic',
      hex: '#FFFFFF',
      accountId: 'private-account'
    }, { dedupeKey: 'discovery_mythic' });
    const duplicate = trackProgressionEvent('progression_unlock_presented', {
      surface: 'progression',
      accountMode: 'authenticated',
      track: 'discovery'
    }, { dedupeKey: 'discovery_mythic' });

    assert.equal(first.accepted, true);
    assert.deepEqual(duplicate, { accepted: false, reason: 'duplicate' });
    assert.equal(adapter.getEvents().length, 1);
    assert.doesNotMatch(JSON.stringify(adapter.getEvents()), /private-account|FFFFFF|discovery_mythic/);

    assert.equal(trackProgressionEvent('progression_reward_previewed', {
      surface: 'progression',
      accountMode: 'authenticated',
      track: 'discovery'
    }, { dedupeKey: 'discovery_mythic' }).accepted, true);
    assert.equal(trackProgressionEvent('progression_cta_used', {
      surface: 'progression',
      accountMode: 'authenticated',
      track: 'discovery',
      action: 'studio'
    }, { dedupeKey: 'discovery_mythic' }).accepted, true);
    assert.equal(trackProgressionEvent('progression_unlock_acknowledged', {
      surface: 'progression',
      accountMode: 'authenticated',
      track: 'discovery'
    }, { dedupeKey: 'discovery_mythic' }).accepted, true);
  } finally {
    restore();
  }
});

test('aggregate progression analytics never sends an unauthenticated event to the RPC', async () => {
  const calls = [];
  const adapter = createAggregateProductAnalyticsAdapter({
    target: { dispatchEvent() { return true; } },
    supabaseClient: {
      rpc(name, payload) {
        calls.push({ name, payload });
        return Promise.resolve({ data: { success: true }, error: null });
      }
    }
  });
  setProductAnalyticsAdapter(adapter);
  const restore = installStorage('granted');
  try {
    assert.equal(trackProductEvent('progression_viewed', {
      surface: 'progression',
      accountMode: 'guest'
    }).accepted, false);
    assert.equal(trackProductEvent('progression_viewed', {
      surface: 'progression',
      accountMode: 'authenticated'
    }).accepted, true);
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(calls.length, 1);
    assert.equal(calls[0].name, 'record_progression_event');
    assert.equal(calls[0].payload.p_account_mode, 'authenticated');
  } finally {
    restore();
  }
});
