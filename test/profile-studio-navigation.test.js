import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('Studio is primary navigation while Shop remains a direct compatibility route', async () => {
  const [header, app, shop, cosmetics] = await Promise.all([
    read('src/lib/SiteModeHeader.svelte'),
    read('src/App.svelte'),
    read('src/lib/Shop.svelte'),
    read('src/lib/ProfileCosmeticsEditor.svelte')
  ]);

  assert.match(header, />Studio</);
  assert.doesNotMatch(header, />Shop</);
  assert.match(app, /parseRouteLocation/);
  assert.match(app, /isProfileSettings=\{profileSettingsModeVisible\}/);
  assert.match(header, /export let isProfileSettings = false/);
  assert.match(shop, /void loadShopItems\(\)/);
  assert.match(cosmetics, /void loadShopItems\(\)/);
});

test('account bootstrap does not depend on the hidden Shop catalog', async () => {
  const stores = await read('src/lib/stores.js');
  const hydration = stores.slice(stores.indexOf('async function hydrateAuthenticatedUser'), stores.indexOf('supabase.auth.onAuthStateChange'));

  assert.doesNotMatch(hydration, /await loadShopItems\(\)/);
  assert.match(stores, /export function loadShopItems\(\)/);
});
