import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { createHtmlHeaders } from '../functions/_publicPage.js';
import { getProfileCacheControl } from '../functions/u/[[username]].js';
import { isSafeMediaSource, normalizeMediaSource } from '../src/lib/mediaSafety.js';

const appSource = await readFile(new URL('../src/App.svelte', import.meta.url), 'utf8');
const mediaSource = await readFile(new URL('../src/lib/foundation/Media.svelte', import.meta.url), 'utf8');
const budgetSource = await readFile(new URL('../scripts/check-performance-budget.mjs', import.meta.url), 'utf8');
const appShell = await readFile(new URL('../index.html', import.meta.url), 'utf8');

test('media sources allow local and HTTPS assets but reject unsafe protocols', () => {
  assert.equal(normalizeMediaSource('/logo-mark.svg'), '/logo-mark.svg');
  assert.equal(normalizeMediaSource('images/profile.png'), 'images/profile.png');
  assert.equal(normalizeMediaSource('https://cdn.example.com/profile.png'), 'https://cdn.example.com/profile.png');
  assert.equal(normalizeMediaSource('//cdn.example.com/profile.png'), '');
  assert.equal(normalizeMediaSource('http://cdn.example.com/profile.png'), '');
  assert.equal(normalizeMediaSource('data:image/svg+xml;base64,unsafe'), '');
  assert.equal(normalizeMediaSource('javascript:alert(1)'), '');
  assert.equal(isSafeMediaSource('/logo-mark.svg'), true);
  assert.equal(isSafeMediaSource('javascript:alert(1)'), false);
});

test('media renderer has a bounded source, load failure, and accessible fallback contract', () => {
  assert.match(mediaSource, /normalizeMediaSource/);
  assert.match(mediaSource, /on:error={handleError}/);
  assert.match(mediaSource, /foundation-media__fallback/);
  assert.doesNotMatch(mediaSource, /innerHTML|new Function|eval\s*\(/);
});

test('route changes expose a keyboard skip target and focus the active content region', () => {
  assert.match(appSource, /class="skip-link" href="#main-content"/);
  assert.match(appSource, /id="main-content"/);
  assert.match(appSource, /mainContent\.focus\(\{ preventScroll: true \}\)/);
  assert.match(appSource, /prefers-reduced-motion: reduce/);
});

test('public profile caching never applies to owner or legacy responses', () => {
  assert.equal(getProfileCacheControl({ username: 'NeonUser' }, false), 'public, max-age=60, s-maxage=300, stale-while-revalidate=60');
  assert.equal(getProfileCacheControl({ username: 'NeonUser' }, true), 'no-cache, must-revalidate');
  assert.equal(getProfileCacheControl(null, false), 'no-cache, must-revalidate');
});

test('public HTML cache controls remain explicit and security headers stay intact', async () => {
  const headers = await createHtmlHeaders(appShell, 'public, max-age=300, s-maxage=3600');
  assert.equal(headers['Cache-Control'], 'public, max-age=300, s-maxage=3600');
  assert.equal(headers['X-Frame-Options'], 'DENY');
  assert.match(headers['Content-Security-Policy'], /script-src 'self' 'sha256-/);
});

test('performance budget script defines regression limits instead of hiding the bundle warning', () => {
  assert.match(budgetSource, /javascript: 650 \* 1024/);
  assert.match(budgetSource, /css: 300 \* 1024/);
  assert.match(budgetSource, /Performance budget/);
  assert.match(budgetSource, /process\.exitCode = 1/);
});
