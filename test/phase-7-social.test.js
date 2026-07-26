import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { loadProfileContext } from '../src/lib/profileData.js';
import {
  normalizeProfileSocial,
  normalizeProfileSocialSettings
} from '../src/lib/profileSocial.js';

function createSocialSupabase({ profile, social, settings = null }) {
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
      if (name === 'get_public_profile_social') return { data: social, error: null };
      if (name === 'get_my_profile_social_settings') return { data: settings, error: null };
      if (name === 'get_public_profile_scores') return { data: [], error: null };
      if (name === 'get_public_profile_story') return { data: { timeline: [], collection: [] }, error: null };
      if (name === 'get_my_profile_configuration') return { data: null, error: null };
      if (name === 'get_public_profile_configuration') return { data: null, error: null };
      return { data: null, error: null };
    }
  };
}

const validEntryKey = '11111111-1111-4111-8111-111111111111';

test('social normalization keeps public signals bounded and drops private fields', () => {
  const social = normalizeProfileSocial({
    favoriteCount: '7',
    reactionCounts: { spark: 2, glow: -1, cheer: 3 },
    viewerReactions: ['spark', 'private_reaction'],
    guestbook: [
      { entryKey: validEntryKey, author: 'ColorUser', body: '<b>kind</b>', author_id: 'private-user-id' },
      { entryKey: 'not-a-uuid', author: 'bad', body: 'drop me' }
    ],
    internalModerationNote: 'private'
  });

  assert.equal(social.favoriteCount, 7);
  assert.deepEqual(social.reactionCounts, { spark: 2, glow: 0, cheer: 3 });
  assert.deepEqual(social.viewerReactions, ['spark']);
  assert.equal(social.guestbook.length, 1);
  assert.equal(social.guestbook[0].body, '<b>kind</b>');
  assert.equal(social.guestbook[0].author_id, undefined);
  assert.equal(social.internalModerationNote, undefined);
});

test('owner social context loads settings while visitor context stays public-only', async () => {
  const ownerSupabase = createSocialSupabase({
    profile: { id: 'user-1', username: 'NeonUser', total_rolls: 3 },
    social: { success: true, favoriteCount: 2, guestbook: [] },
    settings: {
      success: true,
      settings: { interactionsEnabled: false, guestbookEnabled: true, activityVisible: false, discoverable: false }
    }
  });
  const owner = await loadProfileContext({
    supabaseClient: ownerSupabase,
    isAuthenticated: true,
    sessionUserId: 'user-1',
    currentUsername: 'NeonUser',
    profileUsername: 'neonuser'
  });

  assert.equal(owner.social.favoriteCount, 2);
  assert.equal(owner.socialSettings.interactionsEnabled, false);
  assert.equal(owner.socialSettings.discoverable, false);
  assert.equal(ownerSupabase.calls.some(call => call.name === 'get_my_profile_social_settings'), true);

  const visitorSupabase = createSocialSupabase({
    profile: { id: 'user-2', username: 'OtherUser', total_rolls: 3, email: 'private@example.com' },
    social: { success: true, blocked: false, favoriteCount: 4, guestbook: [] }
  });
  const visitor = await loadProfileContext({
    supabaseClient: visitorSupabase,
    isAuthenticated: false,
    profileUsername: 'OtherUser'
  });

  assert.equal(visitor.social.favoriteCount, 4);
  assert.equal(visitor.targetProfile.email, undefined);
  assert.equal(visitorSupabase.calls.some(call => call.name === 'get_my_profile_social_settings'), false);
  assert.equal(visitorSupabase.calls.some(call => ['toggle_profile_favorite', 'toggle_profile_reaction', 'create_profile_guestbook_entry'].includes(call.name)), false);
});

test('social settings normalization preserves safe defaults for incomplete RPC data', () => {
  assert.deepEqual(normalizeProfileSocialSettings(null), {
    interactionsEnabled: true,
    guestbookEnabled: true,
    activityVisible: true,
    discoverable: true
  });
  assert.deepEqual(normalizeProfileSocialSettings({ settings: { activityVisible: false } }), {
    interactionsEnabled: true,
    guestbookEnabled: true,
    activityVisible: false,
    discoverable: true
  });
});

test('social implementation keeps writes RPC-backed and text rendering safe', async () => {
  const component = await readFile(new URL('../src/lib/ProfileSocial.svelte', import.meta.url), 'utf8');
  const data = await readFile(new URL('../src/lib/profileData.js', import.meta.url), 'utf8');
  const migration = await readFile(new URL('../supabase/migrations/20260725130000_social_layer.sql', import.meta.url), 'utf8');

  assert.match(component, /toggle_profile_favorite/);
  assert.match(component, /toggle_profile_reaction/);
  assert.match(component, /create_profile_guestbook_entry/);
  assert.match(component, /toggle_profile_block/);
  assert.match(component, /report_profile_social_content/);
  assert.doesNotMatch(component, /innerHTML|new Function|eval\s*\(/);
  assert.match(data, /get_public_profile_social/);
  assert.match(migration, /profile_guestbook_body_check/);
  assert.match(migration, /consume_profile_social_rate_limit/);
  assert.match(migration, /REVOKE ALL ON TABLE public\.profile_social_settings/);
  assert.match(migration, /get_public_profile_discovery|discoverable/);
});
