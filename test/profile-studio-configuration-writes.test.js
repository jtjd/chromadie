import test from 'node:test';
import assert from 'node:assert/strict';

import { writeProfileStudioConfiguration } from '../src/lib/profile-studio/configurationWrites.js';

test('publishing uses the atomic v2 RPC and preserves identity and concurrency inputs', async () => {
  const calls = [];
  const result = { data: { success: true, published_at: '2026-09-22T00:00:00Z' }, error: null };
  const supabase = {
    rpc: async (...args) => {
      calls.push(args);
      return result;
    }
  };
  const draft = { version: 2, links: [{ label: 'Home', url: 'https://example.com' }] };

  const write = await writeProfileStudioConfiguration(
    supabase, 'publish', draft, 'Chromanaut', 'A color player',
    '2026-09-22T12:30:00Z', 'Could not publish.'
  );
  assert.equal(write.response, result);
  assert.equal(write.error, false);
  assert.deepEqual(calls, [[
    'publish_profile_studio_v2',
    {
      p_draft: draft,
      p_display_name: 'Chromanaut',
      p_bio: 'A color player',
      p_expected_updated_at: '2026-09-22T12:30:00Z'
    }
  ]]);
});

test('reset saves the published snapshot with the expected update token', async () => {
  const calls = [];
  const supabase = {
    rpc: async (...args) => {
      calls.push(args);
      return { data: { success: true }, error: null };
    }
  };
  const draft = { version: 2, content: { about: 'Published text' } };

  const write = await writeProfileStudioConfiguration(
    supabase, 'reset', draft, null, null, '2026-09-22T12:30:00Z', 'Could not reset.'
  );
  assert.equal(write.error, false);
  assert.deepEqual(calls, [[
    'save_profile_configuration_v2',
    { p_draft: draft, p_expected_updated_at: '2026-09-22T12:30:00Z' }
  ]]);
});

test('configuration writes retain PostgREST and RPC-level conflict messages', async () => {
  for (const response of [
    { error: { message: 'Network unavailable' }, data: null },
    { error: null, data: { success: false, code: 'conflict', error: 'This profile changed in another tab.' } },
    { error: null, data: { success: false, error: 'The configuration is invalid.' } }
  ]) {
    const write = await writeProfileStudioConfiguration({ rpc: async () => response }, 'publish', {}, null, null, null, 'Fallback');
    assert.ok(write.error);
    assert.equal(write.error, response.error?.message || response.data.error);
  }

  const fallbackWrite = await writeProfileStudioConfiguration(
    { rpc: async () => ({ data: { success: false } }) }, 'publish', {}, null, null, null, 'Fallback'
  );
  assert.equal(fallbackWrite.error, 'Fallback');

  const successfulWrite = await writeProfileStudioConfiguration({ rpc: async () => ({ data: { success: true } }) }, 'reset', {}, null, null, null, 'Fallback');
  assert.equal(successfulWrite.error, false);
});
