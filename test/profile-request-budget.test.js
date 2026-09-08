import test from 'node:test';
import assert from 'node:assert/strict';
import { loadProfileContext, loadProfileStudioContext } from '../src/lib/profileData.js';
import { clearAchievementDefinitionsCache } from '../src/lib/achievementData.js';

const profileRecord = { id: 'owner-request-test', username: 'request_owner' };
function client() {
  const calls = [];
  const response = { data: [], error: null };
  return {
    calls,
    async rpc(name) {
      calls.push(name);
      if (/identity|get_my_profile$/.test(name)) return { data: profileRecord, error: null };
      return { data: null, error: null };
    },
    from(table) {
      calls.push(table);
      return { select() { return this; }, eq() { return Promise.resolve(response); },
        then(resolve, reject) { return Promise.resolve(response).then(resolve, reject); } };
    }
  };
}

test('hydrated owner identity is reused only for its authenticated owner', async () => {
  clearAchievementDefinitionsCache();
  const supabaseClient = client();
  const options = { supabaseClient, isAuthenticated: true, sessionUserId: profileRecord.id,
    currentUsername: profileRecord.username, profileRecord };
  await loadProfileContext(options);
  assert.equal(supabaseClient.calls.filter(name => name === 'get_my_profile').length, 0);
  assert.ok(supabaseClient.calls.includes('get_public_profile_identity_by_id'));
  supabaseClient.calls.length = 0;
  await loadProfileContext({ ...options, profileRecord: { ...profileRecord, id: 'other-account' } });
  assert.equal(supabaseClient.calls.filter(name => name === 'get_my_profile').length, 1);
  supabaseClient.calls.length = 0;
  await loadProfileContext({ ...options, isAuthenticated: false, profileUsername: 'visitor' });
  assert.ok(supabaseClient.calls.includes('get_public_profile_identity'));
  assert.ok(!supabaseClient.calls.includes('get_my_profile'));
});

test('Studio bootstrap still performs exactly one configuration request', async () => {
  const supabaseClient = client();
  await loadProfileStudioContext({ supabaseClient, profileRecord, sessionUserId: profileRecord.id });
  assert.deepEqual(supabaseClient.calls, ['get_my_profile_configuration_v2']);
});

test('owner mount request comparison includes the complete hydration fan-out', async t => {
  const counts = [];
  for (const reuse of [false, true]) {
    clearAchievementDefinitionsCache();
    const supabaseClient = client();
    await loadProfileContext({ supabaseClient, isAuthenticated: true,
      sessionUserId: profileRecord.id, currentUsername: profileRecord.username,
      profileRecord: reuse ? profileRecord : null });
    counts.push(supabaseClient.calls.length);
    t.diagnostic(`${reuse ? 'after' : 'before'}: ${supabaseClient.calls.length} requests (${supabaseClient.calls.join(', ')})`);
  }
  assert.equal(counts[1], counts[0] - 1);
});
