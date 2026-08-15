import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('token refresh cannot remount Profile Studio or clear a hydrated account', async () => {
  const [stores, settings, app, outlet, transport] = await Promise.all([
    read('src/lib/stores.js'),
    read('src/lib/ProfileSettings.svelte'),
    read('src/App.svelte'),
    read('src/lib/RouteOutlet.svelte'),
    read('src/lib/supabaseTransport.js')
  ]);

  assert.match(transport, /autoRefreshToken:\s*true/);
  assert.match(stores, /isSameAuthenticatedAccount/);
  assert.match(stores, /eventName === 'TOKEN_REFRESHED' && sameAuthenticatedAccount/);
  assert.match(stores, /if \(!sameAuthenticatedAccount \|\| !currentSession\) \{[\s\S]*clearUserState\(\)/);
  assert.doesNotMatch(stores, /session\.set\(currentSession\)\s*\n\s*clearUserState\(\)/);

  assert.match(app, /componentKey: 'profile-settings-loading'/);
  assert.match(outlet, /\{#key activeKey\}/);

  assert.match(settings, /const settingsLoadAccounts = new SvelteSet\(\)/);
  assert.match(settings, /settingsLoadAccounts\.has\(nextAccountKey\)/);
  assert.match(settings, /void loadSettings\(nextAccountKey\)/);
  assert.match(settings, /expectedAccountKey !== \$session\?\.user\?\.id/);
});
