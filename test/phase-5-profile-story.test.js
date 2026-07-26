import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { createDefaultProfileConfig } from '../src/lib/profileConfig.js';
import { loadProfileContext } from '../src/lib/profileData.js';
import {
  getProfileStoryUnlocks,
  normalizeProfileStory,
  normalizeProfileTimeline
} from '../src/lib/profileStory.js';

function createStorySupabase({ profile, story }) {
  const calls = [];
  function from(table) {
    const builder = {
      select(fields) {
        calls.push({ type: 'select', table, fields });
        return builder;
      },
      ilike(field, value) {
        calls.push({ type: 'ilike', table, field, value });
        return builder;
      },
      eq(field, value) {
        calls.push({ type: 'eq', table, field, value });
        return builder;
      },
      async maybeSingle() {
        return { data: profile, error: null };
      },
      then(resolve, reject) {
        return Promise.resolve({ data: [], error: null }).then(resolve, reject);
      }
    };
    return builder;
  }

  return {
    calls,
    from,
    async rpc(name, args) {
      calls.push({ type: 'rpc', name, args });
      if (name === 'get_my_profile') return { data: profile, error: null };
      if (name === 'get_public_profile_scores') return { data: [], error: null };
      if (name === 'get_public_profile_story') return { data: story, error: null };
      if (name === 'get_my_profile_configuration') {
        const config = createDefaultProfileConfig('#112233');
        return { data: { success: true, version: 1, draft: config, published: config }, error: null };
      }
      if (name === 'get_public_profile_configuration') return { data: createDefaultProfileConfig('#445566'), error: null };
      return { data: null, error: null };
    }
  };
}

const storyFixture = {
  timeline: [
    {
      id: 'event-roll-1',
      eventType: 'roll',
      occurredAt: '2026-07-25T12:00:00.000Z',
      payload: {
        hex: '#ABCDEF',
        score: 61196,
        rarity: 'Rare',
        identity: 'Bright Vivid Azure',
        conditionIds: ['high_contrast', 'unsafe<script>']
      }
    },
    {
      id: 'event-created',
      eventType: 'profile_created',
      occurredAt: '2026-07-01T12:00:00.000Z',
      payload: {}
    }
  ],
  collection: [
    { id: 'high_contrast', name: 'Polarized Channels', icon: '🌓', rarity: 'Common', count: 4, firstSeen: '2026-07-01', lastSeen: '2026-07-25' },
    { id: 'javascript:alert(1)', name: '<script>', icon: '<', rarity: 'Mythic', count: 3 }
  ]
};

test('profile story unlocks grow from server-owned roll progress', () => {
  assert.deepEqual(getProfileStoryUnlocks({ total_rolls: 0 }), {
    totalRolls: 0,
    timelineLimit: 1,
    collectionUnlocked: false,
    collectionRollsRequired: 10
  });
  assert.equal(getProfileStoryUnlocks({ total_rolls: 3 }).timelineLimit, 6);
  assert.equal(getProfileStoryUnlocks({ total_rolls: 10 }).collectionUnlocked, true);
  assert.equal(getProfileStoryUnlocks({ total_rolls: 10 }).timelineLimit, 12);
});

test('profile story normalization keeps public event and collection payloads bounded', () => {
  const story = normalizeProfileStory(storyFixture);

  assert.equal(story.timeline.length, 2);
  assert.deepEqual(story.timeline[0].payload.conditionIds, ['high_contrast']);
  assert.equal(story.timeline[0].payload.hex, '#ABCDEF');
  assert.equal(story.collection.length, 1);
  assert.equal(story.collection[0].id, 'high_contrast');
  assert.equal(story.collection[0].count, 4);
  assert.deepEqual(normalizeProfileTimeline([{ eventType: 'private_achievement', occurredAt: '2026-07-25' }]), []);
});

test('owner and visitor profile contexts load the same public story without exposing private progress', async () => {
  const ownerSupabase = createStorySupabase({
    profile: { id: 'user-1', username: 'NeonUser', total_rolls: 12, equipped_badges: [] },
    story: storyFixture
  });
  const owner = await loadProfileContext({
    supabaseClient: ownerSupabase,
    isAuthenticated: true,
    sessionUserId: 'user-1',
    currentUsername: 'NeonUser',
    profileUsername: 'neonuser'
  });

  assert.equal(owner.timelineEvents.length, 2);
  assert.equal(owner.collectionItems[0].id, 'high_contrast');
  assert.equal(ownerSupabase.calls.some(call => call.type === 'rpc' && call.name === 'get_public_profile_story'), true);

  const visitorSupabase = createStorySupabase({
    profile: { id: 'user-2', username: 'OtherUser', total_rolls: 12, equipped_badges: [], email: 'private@example.com' },
    story: storyFixture
  });
  const visitor = await loadProfileContext({
    supabaseClient: visitorSupabase,
    isAuthenticated: false,
    profileUsername: 'OtherUser'
  });

  assert.equal(visitor.timelineEvents.length, 2);
  assert.equal(visitor.collectionItems[0].id, 'high_contrast');
  assert.equal(visitor.targetProfile.email, undefined);
  assert.equal(visitorSupabase.calls.some(call => call.type === 'select' && call.table === 'user_achievements'), false);
});

test('story modules remain presentation-only and the server event projection is bounded', async () => {
  const timeline = await readFile(new URL('../src/lib/ProfileTimeline.svelte', import.meta.url), 'utf8');
  const collection = await readFile(new URL('../src/lib/ProfileCollection.svelte', import.meta.url), 'utf8');
  const story = await readFile(new URL('../src/lib/profileStory.js', import.meta.url), 'utf8');
  const migration = await readFile(new URL('../supabase/migrations/20260725110000_profile_story.sql', import.meta.url), 'utf8');

  assert.match(timeline, /prefers-reduced-motion/);
  assert.match(collection, /aria-label/);
  assert.doesNotMatch(timeline + collection + story, /innerHTML|new Function|eval\s*\(/);
  assert.match(migration, /profile_events/);
  assert.match(migration, /profile_roll_story_event/);
  assert.match(migration, /LIMIT 40/);
  assert.match(migration, /LIMIT 30/);
  assert.match(migration, /get_public_profile_story/);
});
