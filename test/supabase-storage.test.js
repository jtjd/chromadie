import test from 'node:test';
import assert from 'node:assert/strict';
import { createLazyStorageClient } from '../src/lib/supabaseStorage.js';

test('storage upload preserves the Supabase object protocol without loading the storage SDK', async () => {
  let request;
  const storage = createLazyStorageClient({
    storageUrl: 'https://example.supabase.co/storage/v1',
    headers: { 'X-Client-Info': 'chromadie-test' },
    fetch: async (url, init) => {
      request = { url, init };
      return new Response(JSON.stringify({ Id: 'object-id', Key: 'profiles/user/avatar.webp' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  });

  const blob = new Blob(['profile'], { type: 'image/webp' });
  const result = await storage.from('profile-media').upload('user/avatar.webp', blob, {
    cacheControl: '3600',
    contentType: 'image/webp',
    upsert: true
  });

  assert.equal(request.url, 'https://example.supabase.co/storage/v1/object/profile-media/user/avatar.webp');
  assert.equal(request.init.method, 'POST');
  assert.equal(request.init.headers['x-upsert'], 'true');
  assert.equal(request.init.body.get('cacheControl'), '3600');
  assert.equal(request.init.body.get('').type, 'image/webp');
  assert.deepEqual(result, {
    data: { id: 'object-id', path: 'user/avatar.webp', fullPath: 'profiles/user/avatar.webp' },
    error: null
  });
});

test('storage remove sends normalized prefixes and returns API errors', async () => {
  let request;
  const storage = createLazyStorageClient({
    storageUrl: 'https://example.supabase.co/storage/v1',
    headers: {},
    fetch: async (url, init) => {
      request = { url, init };
      return new Response(JSON.stringify({ message: 'Not allowed' }), {
        status: 403,
        statusText: 'Forbidden',
        headers: { 'Content-Type': 'application/json' }
      });
    }
  });

  const result = await storage.from('profile-media').remove(['/user/avatar.webp']);

  assert.equal(request.url, 'https://example.supabase.co/storage/v1/object/profile-media');
  assert.equal(request.init.method, 'DELETE');
  assert.deepEqual(JSON.parse(request.init.body), { prefixes: ['user/avatar.webp'] });
  assert.equal(result.data, null);
  assert.equal(result.error.message, 'Not allowed');
});
