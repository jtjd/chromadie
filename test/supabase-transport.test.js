import test from 'node:test';
import assert from 'node:assert/strict';

import { createSupabaseTransport } from '../src/lib/supabaseTransport.js';

test('auth transport does not recursively await session state for GoTrue requests', async () => {
  const requests = [];
  const transport = createSupabaseTransport({
    supabaseUrl: 'https://example.supabase.co',
    supabaseKey: 'anon-key',
    globalFetch: async (input, init) => {
      requests.push({ input: String(input), headers: new Headers(init?.headers) });
      return new Response('{}', { status: 200 });
    }
  });

  let getSessionCalls = 0;
  transport.auth.getSession = async () => {
    getSessionCalls += 1;
    throw new Error('GoTrue session lookup should not run inside its own fetcher.');
  };

  await transport.fetchWithAuth('https://example.supabase.co/auth/v1/settings');

  assert.equal(getSessionCalls, 0);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].headers.get('apikey'), 'anon-key');
  assert.equal(requests[0].headers.get('authorization'), 'Bearer anon-key');
});
