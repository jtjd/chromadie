import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { createHtmlHeaders } from '../functions/_publicPage.js';
import { onRequest as previewMiddleware } from '../functions/_middleware.js';
import { onRequestGet as renderProfileRoute } from '../functions/u/[[username]].js';
import { onRequestGet as renderAliasRoute } from '../functions/a/[[alias]].js';
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

test('preview gate can be lifted explicitly for the public release', async () => {
  let nextCalled = false;
  const response = await previewMiddleware({
    request: new Request('https://chm.lol/'),
    env: {
      PREVIEW_PROTECTION: 'off',
      PREVIEW_PASSWORD: 'still-configured'
    },
    next: () => {
      nextCalled = true;
      return new Response('public site', { status: 200 });
    }
  });

  assert.equal(nextCalled, true);
  assert.equal(response.status, 200);
  assert.equal(await response.text(), 'public site');
});

test('preview gate allows only the authenticated cleanup scheduler through', async () => {
  let authorizedNextCalled = false;
  const authorizedResponse = await previewMiddleware({
    request: new Request('https://chm.lol/api/profile-media/account-cleanup', {
      method: 'POST',
      headers: { authorization: 'Bearer cleanup-test-secret' }
    }),
    env: {
      PREVIEW_PASSWORD: 'preview-test-password',
      R2_ACCOUNT_CLEANUP_SECRET: 'cleanup-test-secret'
    },
    next: () => {
      authorizedNextCalled = true;
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }
  });

  assert.equal(authorizedNextCalled, true);
  assert.equal(authorizedResponse.status, 200);

  let unauthorizedNextCalled = false;
  const unauthorizedResponse = await previewMiddleware({
    request: new Request('https://chm.lol/api/profile-media/account-cleanup', {
      method: 'POST',
      headers: { authorization: 'Bearer wrong-secret' }
    }),
    env: {
      PREVIEW_PASSWORD: 'preview-test-password',
      R2_ACCOUNT_CLEANUP_SECRET: 'cleanup-test-secret'
    },
    next: () => {
      unauthorizedNextCalled = true;
      return new Response('should not reach cleanup', { status: 200 });
    }
  });

  assert.equal(unauthorizedNextCalled, false);
  assert.equal(unauthorizedResponse.status, 401);
});

test('authenticated preview HTML is never cached between deployments', async () => {
  const password = 'preview-test-password';
  const loginResponse = await previewMiddleware({
    request: new Request('https://chm.lol/__preview-login', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ password, returnTo: '/profile/settings' })
    }),
    env: { PREVIEW_PASSWORD: password },
    next: () => new Response('unused', { status: 500 })
  });
  const cookie = loginResponse.headers.get('set-cookie')?.split(';')[0];
  assert.ok(cookie);

  const previewResponse = await previewMiddleware({
    request: new Request('https://chm.lol/profile/settings', {
      headers: { cookie }
    }),
    env: { PREVIEW_PASSWORD: password },
    next: () => new Response('<!doctype html><title>Current deployment</title>', {
      status: 200,
      headers: {
        'content-type': 'text/html; charset=UTF-8',
        'cache-control': 'public, max-age=300'
      }
    })
  });

  assert.equal(previewResponse.status, 200);
  assert.equal(previewResponse.headers.get('cache-control'), 'no-store, no-cache, must-revalidate');
  assert.equal(previewResponse.headers.get('x-robots-tag'), 'noindex, nofollow');
  assert.match(await previewResponse.text(), /Current deployment/);
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

test('alias route rejects wildcard input before resolving a public profile', async () => {
  const response = await renderAliasRoute({
    request: new Request('https://chromadie.com/a/%25'),
    env
  });
  assert.equal(response.status, 404);
  assert.equal(response.headers.get('x-frame-options'), 'DENY');
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
