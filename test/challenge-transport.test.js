import test from 'node:test';
import assert from 'node:assert/strict';

import { createChallengeLink } from '../src/lib/challenges.js';
import { loadChallengeLink } from '../src/lib/challengeLookup.js';

function createSupabaseResult({ data = null, error = null }) {
  const calls = [];
  return {
    calls,
    supabase: {
      functions: {
        invoke: async (...args) => {
          calls.push(args);
          return { data, error };
        }
      }
    }
  };
}

test('challenge creation keeps the existing endpoint payload and result shape', async () => {
  const challenge = { id: 'challenge-1' };
  const { calls, supabase } = createSupabaseResult({
    data: { success: true, challenge, share_url: '/c/challenge-1' }
  });

  const result = await createChallengeLink(supabase, {
    score: 7300,
    hex: '#12ABEF',
    senderUsername: 'NeonUser'
  });

  assert.deepEqual(calls, [[
    'challenge-link',
    { body: { action: 'create', score: 7300, hex: '#12ABEF', sender_username: 'NeonUser' } }
  ]]);
  assert.deepEqual(result, {
    success: true,
    challenge,
    shareUrl: '/c/challenge-1'
  });
});

test('challenge lookup remains a separate get request and normalizes missing links', async () => {
  const challenge = { id: 'challenge-2', target_score: 51, target_hex: '#ABCDEF' };
  const success = createSupabaseResult({ data: { success: true, challenge } });

  assert.deepEqual(await loadChallengeLink(success.supabase, 'challenge-2'), {
    success: true,
    challenge
  });
  assert.deepEqual(success.calls, [[
    'challenge-link',
    { body: { action: 'get', id: 'challenge-2' } }
  ]]);

  const missing = createSupabaseResult({ data: { success: false, error: 'Expired.' } });
  assert.deepEqual(await loadChallengeLink(missing.supabase, 'missing'), {
    success: false,
    error: { message: 'Expired.', code: 'challenge_error' }
  });
});
