import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolveNameMotionKey } from '../src/lib/name/nameMotions.js';
import { getAtmosphereDefinition } from '../src/lib/profile-atmosphere/atmospheres.js';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('Atelier expression is restored as two canonical Plus renderer rows', async () => {
  const [seed, migration] = await Promise.all([
    read('supabase/seed.sql'),
    read('supabase/migrations/20260809000000_atelier_expression_catalog.sql')
  ]);

  for (const [itemKey, slot, renderer] of [
    ['name_prism_atelier', 'name_motion', 'haunt-rainbow'],
    ['bg_prism_atmosphere', 'profile_atmosphere', 'silk-folds']
  ]) {
    assert.match(seed, new RegExp(`'${itemKey}'.*'${slot}'.*'renderer'.*'${renderer}'.*'premium'.*'chromadie_plus'`));
    assert.match(migration, new RegExp(`'${itemKey}'[\\s\\S]*'${slot}'[\\s\\S]*'${renderer}'[\\s\\S]*'premium'[\\s\\S]*'chromadie_plus'`));
  }

  assert.match(migration, /Expected 99 active catalog rows/);
  assert.match(migration, /Expected 11 active Name Motion rows/);
  assert.match(migration, /Expected 13 active Profile Atmosphere rows/);
  assert.doesNotMatch(migration, /INSERT[\s\S]*'(?:name_effect|profile_bg)'/);
  assert.equal(resolveNameMotionKey('name_prism_atelier'), 'haunt-rainbow');
  assert.equal(getAtmosphereDefinition('bg_prism_atmosphere')?.key, 'silk-folds');
});

test('Plus Collection explains where the Atelier layers are configured', async () => {
  const [editor, settings] = await Promise.all([
    read('src/lib/ProfileCosmeticsEditor.svelte'),
    read('src/lib/ProfileSettings.svelte')
  ]);

  assert.match(editor, /Atelier expression is ready/);
  assert.match(editor, /cosmetic-name_motion/);
  assert.match(editor, /cosmetic-profile-atmosphere/);
  assert.match(editor, /profile-layout/);
  assert.match(editor, /async function applyChanges/);
  assert.match(editor, /class="profile-cosmetics-apply"/);
  assert.doesNotMatch(editor, /applySlot/);
  assert.match(settings, /entitlements=\{\$profileEntitlements\} staff=\{Boolean\(context\.targetProfile\?\.is_staff\)\}/);
});
