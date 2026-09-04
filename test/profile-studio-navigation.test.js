import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('Customize is the only profile-expression acquisition surface', async () => {
  const [header, app, cosmetics, catalogState] = await Promise.all([
    read('src/lib/SiteModeHeader.svelte'),
    read('src/App.svelte'),
    read('src/lib/ProfileCosmeticsEditor.svelte'),
    read('src/lib/catalogState.js')
  ]);

  assert.match(header, />Customize</);
  assert.doesNotMatch(header, />Shop</);
  assert.match(app, /parseRouteLocation/);
  assert.match(app, /isProfileSettings=\{profileSettingsModeVisible\}/);
  assert.match(header, /export let isProfileSettings = false/);
  assert.match(app, /window\.location\.pathname === '\/shop'/);
  assert.match(cosmetics, /void loadCosmeticCatalog\(\)/);
  assert.doesNotMatch(cosmetics, /purchase_item|ownedCosmetics/);
  assert.match(cosmetics, /hasShopEntitlement/);
  assert.match(catalogState, /export function loadCosmeticCatalog\(\)/);
});

test('account bootstrap does not depend on the cosmetic catalog', async () => {
  const [stores, catalogState] = await Promise.all([
    read('src/lib/stores.js'),
    read('src/lib/catalogState.js')
  ]);
  const hydration = stores.slice(stores.indexOf('async function hydrateAuthenticatedUser'), stores.indexOf('supabase.auth.onAuthStateChange'));

  assert.doesNotMatch(hydration, /await loadCosmeticCatalog\(\)/);
  assert.match(catalogState, /export function loadCosmeticCatalog\(\)/);
});
