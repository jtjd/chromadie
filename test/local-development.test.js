import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [auth, config, readme] = await Promise.all([
  readFile(new URL('../src/lib/Auth.svelte', import.meta.url), 'utf8'),
  readFile(new URL('../supabase/config.toml', import.meta.url), 'utf8'),
  readFile(new URL('../README.md', import.meta.url), 'utf8')
]);

test('local auth bypass is restricted to localhost development', () => {
  assert.match(auth, /import\.meta\.env\.DEV/);
  assert.match(auth, /localhost/);
  assert.match(auth, /127\.0\.0\.1/);
  assert.match(auth, /captchaToken \? \{ captchaToken \}/);
  assert.match(config, /enable_confirmations = false/);
  assert.match(readme, /Local auth bypasses Turnstile and disables email\s+confirmation/);
});
