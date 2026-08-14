import test from 'node:test';
import assert from 'node:assert/strict';
import { createLazyStorageClient } from '../src/lib/supabaseStorage.js';

test('storage compatibility client keeps public URL resolution without a write path', () => {
  const storage = createLazyStorageClient({
    storageUrl: 'https://example.supabase.co/storage/v1',
    headers: { 'X-Client-Info': 'chromadie-test' },
    fetch: async () => new Response('{}', { status: 200 })
  });

  const result = storage.from('profile-media').getPublicUrl('/user/avatar.webp');

  assert.equal(result.data.publicUrl, 'https://example.supabase.co/storage/v1/object/public/profile-media/user/avatar.webp');
  assert.equal(typeof storage.from('profile-media').upload, 'undefined');
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
