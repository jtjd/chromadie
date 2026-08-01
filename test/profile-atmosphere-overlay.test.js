import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('profile atmosphere effects render as a full-page layer', async () => {
  const [atmosphere, shell, cosmetics, settingsPreview, studioPreview, editor] = await Promise.all([
    read('src/lib/ProfileAtmosphere.svelte'),
    read('src/lib/ProfileShell.svelte'),
    read('src/lib/cosmetics.js'),
    read('src/lib/ProfileSettingsPreview.svelte'),
    read('src/lib/ShopStudioPreview.svelte'),
    read('src/lib/ProfileCosmeticsEditor.svelte')
  ]);

  assert.match(atmosphere, /position:\s*fixed/);
  assert.match(atmosphere, /inset:\s*0/);
  assert.match(atmosphere, /width:\s*100vw/);
  assert.match(atmosphere, /height:\s*100dvh/);
  assert.match(atmosphere, /\.profile-atmosphere__effect[\s\S]*position:\s*absolute/);
  assert.match(atmosphere, /<canvas bind:this=\{effectCanvas\} class="profile-atmosphere__effect-canvas"/);
  assert.match(atmosphere, /const EFFECTS = new Set/);
  for (const effect of ['rain', 'snow', 'fireflies', 'scanlines']) {
    assert.match(atmosphere, new RegExp(`draw${effect[0].toUpperCase()}${effect.slice(1)}`));
  }
  assert.match(atmosphere, /prefers-reduced-motion/);
  assert.doesNotMatch(atmosphere, /repeating-linear-gradient/);
  assert.match(atmosphere, /export let backgroundTint = false/);
  assert.match(atmosphere, /export let ambientEffects = true/);
  assert.match(atmosphere, /backgroundTint \?/);
  assert.match(atmosphere, /profile-atmosphere--ambient-muted/);
  assert.match(shell, /<ProfileAtmosphere[\s\S]*effect=\{atmosphereEffect\}/);
  assert.match(shell, /backgroundTint=\{colorEffectsEnabled\}/);
  assert.match(shell, /ambientEffects=\{colorEffectsEnabled\}/);
  assert.match(cosmetics, /getProfileAtmosphere/);
  assert.match(cosmetics, /profile_atmosphere/);
  assert.match(settingsPreview, /<ProfileAtmosphere[\s\S]*canvasOnly=\{true\}/);
  assert.match(studioPreview, /<ProfileAtmosphere[\s\S]*canvasOnly=\{true\}/);
  assert.match(editor, /previewSlot\('profile_atmosphere'/);
  assert.match(editor, /applySlot\('profile_atmosphere'/);
});

test('weather cosmetics migrate to a separate atmosphere slot without changing item keys', async () => {
  const [migration, catalogMigration, seed, catalogDrift] = await Promise.all([
    read('supabase/migrations/20260801100000_profile_atmosphere_slot.sql'),
    read('supabase/migrations/20260801110000_profile_atmosphere_catalog.sql'),
    read('supabase/seed.sql'),
    read('scripts/check-catalog-drift.mjs')
  ]);

  assert.match(migration, /profile_atmosphere/);
  assert.match(migration, /UPDATE public\.shop_items/);
  assert.match(migration, /UPDATE public\.profiles/);
  assert.match(migration, /jsonb_build_object\('profile_atmosphere'/);
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.equip_item/);
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.unequip_item/);
  assert.match(catalogMigration, /INSERT INTO public\.shop_items/);
  assert.match(catalogMigration, /ON CONFLICT \(item_key\) DO UPDATE/);
  assert.match(catalogMigration, /'bg_rain'.*'profile_atmosphere'/);
  assert.match(catalogMigration, /'bg_scanlines'.*'profile_atmosphere'/);
  assert.match(seed, /'bg_rain', 'Rainfall', 'profile_atmosphere'/);
  assert.match(seed, /'bg_snow', 'Soft Snow', 'profile_atmosphere'/);
  assert.match(seed, /'bg_fireflies', 'Fireflies', 'profile_atmosphere'/);
  assert.match(seed, /'bg_scanlines', 'Signal Scanlines', 'profile_atmosphere'/);
  assert.match(catalogDrift, /catalogExtensionPaths/);
  assert.match(catalogDrift, /20260801110000_profile_atmosphere_catalog\.sql/);
  assert.match(catalogDrift, /matchAll/);
});
