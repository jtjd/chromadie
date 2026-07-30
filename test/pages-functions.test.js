import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { createHtmlHeaders } from '../functions/_publicPage.js';
import { onRequest as previewMiddleware } from '../functions/_middleware.js';
import { onRequestGet as renderProfileRoute } from '../functions/u/[[username]].js';
import { onRequestGet as renderChallengeRoute } from '../functions/c/[[id]].js';
import { onRequestGet as renderPrototypeRoute } from '../functions/prototype/profile.js';

const appShell = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const env = {
  VITE_SITE_URL: 'https://chm.lol',
  ASSETS: {
    fetch: async () => new Response(appShell, { status: 200 })
  }
};

test('dynamic HTML responses carry strict security headers and script hashes', async () => {
  const headers = await createHtmlHeaders(appShell);
  assert.equal(headers['X-Frame-Options'], 'DENY');
  assert.match(headers['Strict-Transport-Security'], /max-age=31536000/);
  assert.match(headers['Content-Security-Policy'], /script-src 'self' 'sha256-/);
  assert.doesNotMatch(headers['Content-Security-Policy'], /script-src[^;]*'unsafe-inline'/);
});

test('preview gate leaves Cloudflare ACME validation reachable without opening the site', async () => {
  let validationNextCalled = false;
  const validationResponse = await previewMiddleware({
    request: new Request('http://chm.lol/.well-known/acme-challenge/cloudflare-check'),
    env: {},
    next: () => {
      validationNextCalled = true;
      return new Response('validation endpoint', { status: 200 });
    }
  });

  assert.equal(validationNextCalled, true);
  assert.equal(validationResponse.status, 200);

  const normalResponse = await previewMiddleware({
    request: new Request('https://chm.lol/'),
    env: {},
    next: () => new Response('site', { status: 200 })
  });
  assert.equal(normalResponse.status, 503);
});

test('profile route rejects PostgREST wildcard/filter input without an API request', async () => {
  const response = await renderProfileRoute({
    request: new Request('https://chromadie.com/u/%25'),
    params: { username: '%' },
    env
  });
  assert.equal(response.status, 404);
  assert.equal(response.headers.get('x-frame-options'), 'DENY');
  const html = await response.text();
  assert.match(html, /Profile not found/);
});

test('challenge route rejects invalid identifiers and still serves a protected shell', async () => {
  const response = await renderChallengeRoute({
    request: new Request('https://chromadie.com/c/not-a-uuid'),
    params: { id: 'not-a-uuid' },
    env
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  const html = await response.text();
  assert.match(html, /Challenge Unavailable/);
  assert.match(html, /https:\/\/chm\.lol\/og-default-v4\.png/);
  assert.doesNotMatch(html, /og-default\.png/);
});

test('profile canvas prototype is direct-refreshable and non-indexable', async () => {
  const response = await renderPrototypeRoute({
    request: new Request('https://chromadie.com/prototype/profile'),
    env
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('x-frame-options'), 'DENY');
  const html = await response.text();
  assert.match(html, /<meta name="robots" content="noindex,nofollow" \/>/);
  assert.match(html, /Profile Canvas Prototype \| ChromaDie/);
});
