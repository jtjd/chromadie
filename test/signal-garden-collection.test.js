import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('the homepage profile preview uses catalog-driven cosmetics and public profile data', async () => {
  const [preview, directory, seed, cosmetics] = await Promise.all([
    read('src/lib/HomepageProfilePreview.svelte'),
    read('src/lib/HomepageProfileDirectory.svelte'),
    read('supabase/seed.sql'),
    read('src/styles/cosmetics.css')
  ]);

  assert.match(preview, /getProfileBg/);
  assert.match(preview, /getProfileAtmosphereEffect/);
  assert.match(preview, /getProfileBorder/);
  assert.match(preview, /getNameEffect/);
  assert.match(preview, /getFrameEffect/);
  assert.match(preview, /getOrbShape/);
  assert.match(preview, /getRollEffect/);
  assert.match(preview, /backgroundSrc/);
  assert.match(directory, /get_public_discovery/);
  assert.match(seed, /bg_fireflies|bg_rain/);
  assert.match(cosmetics, /border-celestial-anim|roll-smoke-anim/);
  assert.doesNotMatch(preview, /bg_aurora|name_prism_atelier|mara-dog/);
});
