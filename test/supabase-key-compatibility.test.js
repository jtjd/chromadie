import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  createSupabaseHeaders,
  getSupabaseCredentials,
  getSupabasePublicHeaders,
  getSupabaseSecretHeaders
} from '../functions/_supabaseApi.js';

test('canonical Supabase credentials prefer modern publishable and secret keys', () => {
  const credentials = getSupabaseCredentials({
    VITE_SUPABASE_URL: 'https://example.supabase.co',
    VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_fake_example',
    VITE_SUPABASE_KEY: 'legacy-anon-value',
    SUPABASE_SECRET_KEY: 'sb_secret_fake_example',
    SUPABASE_SERVICE_ROLE_KEY: 'legacy-service-value'
  });

  assert.equal(credentials.url, 'https://example.supabase.co');
  assert.equal(credentials.publishableKey, 'sb_publishable_fake_example');
  assert.equal(credentials.secretKey, 'sb_secret_fake_example');
  assert.equal(credentials.publishableKeyIsLegacy, false);
  assert.equal(credentials.secretKeyIsLegacy, false);
});

test('modern project keys never become Authorization bearer credentials', () => {
  assert.deepEqual(
    getSupabasePublicHeaders({ VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_fake_example' }),
    { apikey: 'sb_publishable_fake_example' }
  );
  assert.deepEqual(
    getSupabaseSecretHeaders({ SUPABASE_SECRET_KEY: 'sb_secret_fake_example' }),
    { apikey: 'sb_secret_fake_example' }
  );
  assert.deepEqual(
    createSupabaseHeaders({ apiKey: 'sb_secret_fake_example', accessToken: 'user-jwt-token' }),
    { apikey: 'sb_secret_fake_example', Authorization: 'Bearer user-jwt-token' }
  );
});

test('legacy key fallback retains the old project bearer compatibility only when needed', () => {
  assert.deepEqual(
    getSupabasePublicHeaders({ VITE_SUPABASE_KEY: 'legacy-anon-value' }),
    { apikey: 'legacy-anon-value', Authorization: 'Bearer legacy-anon-value' }
  );
  assert.deepEqual(
    getSupabaseSecretHeaders({ SUPABASE_SERVICE_ROLE_KEY: 'legacy-service-value' }),
    { apikey: 'legacy-service-value', Authorization: 'Bearer legacy-service-value' }
  );
});

test('the browser source graph has no server-secret configuration path', async () => {
  const source = await readFile(new URL('../src/lib/supabase.js', import.meta.url), 'utf8');
  const transport = await readFile(new URL('../src/lib/supabaseTransport.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /SUPABASE_SECRET_KEY|SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(transport, /SUPABASE_SECRET_KEY|SUPABASE_SERVICE_ROLE_KEY/);
});

test('Edge Function service clients keep modern project keys out of bearer auth', async () => {
  const source = await readFile(new URL('../supabase/functions/_shared/supabase-keys.ts', import.meta.url), 'utf8');
  assert.match(source, /SUPABASE_SECRET_KEY/);
  assert.match(source, /SUPABASE_PUBLISHABLE_KEY/);
  assert.match(source, /Authorization:\s*''/);
});
