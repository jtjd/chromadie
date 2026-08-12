import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('progression is a dashboard surface backed by existing profile history', async () => {
  const progression = await read('src/lib/ProfileProgression.svelte');
  const [registry, workspace] = await Promise.all([
    read('src/lib/profile-studio/sectionRegistry.js'),
    read('src/lib/ProfileStudioWorkspace.svelte')
  ]);

  assert.match(progression, /getRankState/);
  assert.match(progression, /getProfileStoryUnlocks/);
  assert.match(progression, /lifetime_ep/);
  assert.match(progression, /current_streak/);
  assert.match(progression, /timelineEvents\.slice\(0, 3\)/);
  assert.match(progression, /server-authoritative/);
  assert.match(progression, /prefers-reduced-motion/);
  assert.match(registry, /ProfileProgression\.svelte/);
  assert.match(workspace, /activeSection === 'progression'/);
});

test('collection remains the owned expression surface while Shop stays acquisition-only', async () => {
  const cosmetics = await read('src/lib/ProfileCosmeticsEditor.svelte');
  const shop = await read('src/lib/Shop.svelte');

  assert.match(cosmetics, /Collection/);
  assert.match(cosmetics, /owned expression layers/);
  assert.match(cosmetics, /equip_item/);
  assert.match(shop, /supabase\.rpc\('purchase_item'/);
});
