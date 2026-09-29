import test from 'node:test';
import assert from 'node:assert/strict';

import { checkProductionHealth } from '../scripts/check-production-health.mjs';

test('production health checks are read-only and accept the expected public responses', async () => {
  const requests = [];
  const result = await checkProductionHealth({
    siteOrigin: 'https://example.test',
    supabaseAuthHealthUrl: 'https://project.example.test/auth/v1/health',
    fetchImpl: async (url, options) => {
      requests.push({ url: String(url), method: options.method || 'GET' });
      if (String(url).includes('/auth/v1/health')) {
        return new Response('{"message":"No API key found"}', {
          status: 401,
          headers: { 'content-type': 'application/json' }
        });
      }
      if (options.method === 'HEAD') {
        return new Response(null, {
          status: 200,
          headers: { 'content-type': 'image/webp' }
        });
      }
      return new Response('<title>ChromaDie — Daily Random Color Game</title>', {
        status: 200,
        headers: { 'content-type': 'text/html; charset=utf-8' }
      });
    }
  });

  assert.deepEqual(result.failures, []);
  assert.equal(requests.length, 14);
  assert.ok(requests.every(request => ['GET', 'HEAD'].includes(request.method)));
});

test('production health checks surface maintenance pages, missing assets, and Auth outages', async () => {
  const result = await checkProductionHealth({
    siteOrigin: 'https://example.test',
    supabaseAuthHealthUrl: 'https://project.example.test/auth/v1/health',
    fetchImpl: async url => {
      const value = String(url);
      if (value.includes('/auth/v1/health')) return new Response('unavailable', { status: 503 });
      if (value.includes('.webp')) return new Response('<html></html>', {
        status: 200,
        headers: { 'content-type': 'text/html' }
      });
      if (value.endsWith('/')) return new Response('<title>Maintenance</title>', {
        status: 503,
        headers: { 'content-type': 'text/html' }
      });
      return new Response('<title>ChromaDie</title>', {
        status: 200,
        headers: { 'content-type': 'text/html' }
      });
    }
  });

  assert.equal(result.failures.length, 4);
  assert.match(result.failures[0], /expected 200 HTML/);
  assert.match(result.failures[1], /expected 200 WebP/);
  assert.match(result.failures.at(-1), /Supabase Auth/);
});
