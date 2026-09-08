import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [auth, authPage] = await Promise.all([
  readFile(new URL('../src/lib/Auth.svelte', import.meta.url), 'utf8'),
  readFile(new URL('../src/lib/AuthPage.svelte', import.meta.url), 'utf8')
]);

test('staged signup keeps the username check and account fields in one auth flow', () => {
  assert.match(auth, /let signupStep = 1/);
  assert.match(auth, /supabase\.rpc\('is_username_allowed'/);
  assert.match(auth, /supabase\.rpc\('is_username_available'/);
  assert.match(auth, /id="username-input"/);
  assert.match(auth, /id="email-input"/);
  assert.match(auth, /id="password-input"/);
  assert.match(auth, /id="terms-accepted"/);
  assert.match(auth, /if \(!termsAccepted\)/);
  assert.match(auth, /auth-summary/);
  assert.match(auth, /Already have an account\?/);
  assert.doesNotMatch(auth, /signup-progress/);
  assert.doesNotMatch(auth, /166, 90, 193/);
});

test('Turnstile remains required for non-local auth submissions', () => {
  assert.match(auth, /https:\/\/challenges\.cloudflare\.com\/turnstile\/v0\/api\.js/);
  assert.match(auth, /window\.turnstile\.render/);
  assert.match(auth, /if \(!localDevelopment && !token\)/);
  assert.match(auth, /captchaToken: token/);
  assert.match(auth, /!isLocalDevelopment\(\)/);
  assert.match(auth, /removeTurnstile/);
});

test('auth completion defaults to the homepage while preserving safe handoffs', () => {
  assert.match(authPage, /getSafeNextUrl\(next, getFallbackHomeUrl\(\)\)/);
  assert.match(authPage, /function getFallbackHomeUrl\(\)[\s\S]*buildAppUrl\('\/'\)/);
  assert.doesNotMatch(authPage, /radial-gradient/);
});
