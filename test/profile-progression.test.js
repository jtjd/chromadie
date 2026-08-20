import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('progression is a dedicated page backed by existing profile history', async () => {
  const [progression, page, registry, workspace] = await Promise.all([
    read('src/lib/ProfileProgression.svelte'),
    read('src/lib/ProgressionPage.svelte'),
    read('src/lib/profile-studio/sectionRegistry.js'),
    read('src/lib/ProfileStudioWorkspace.svelte')
  ]);

  assert.match(progression, /getRankState/);
  assert.match(progression, /getProfileStoryUnlocks/);
  assert.match(progression, /lifetime_ep/);
  assert.match(progression, /current_streak/);
  assert.match(progression, /timelineEvents\.slice\(0, 3\)/);
  assert.match(progression, /verified on the server/);
  assert.match(progression, /prefers-reduced-motion/);
  assert.match(progression, /analyticsSurface/);
  assert.match(page, /loadProgressionData/);
  assert.match(page, /ProfileProgression/);
  assert.match(page, /analyticsSurface="progression"/);
  assert.match(page, /href="\/login\?next=%2Fprogression"/);
  assert.match(page, /prefers-reduced-motion/);
  assert.doesNotMatch(registry, /ProfileProgression\.svelte/);
  assert.doesNotMatch(workspace, /activeSection === 'progression'/);
});

test('Customize is the complete profile expression surface with earned and Plus states', async () => {
  const cosmetics = await read('src/lib/ProfileCosmeticsEditor.svelte');

  assert.match(cosmetics, /Profile expression/);
  assert.match(cosmetics, /every profile expression layer/);
  assert.match(cosmetics, /availableCosmetics/);
  assert.match(cosmetics, /hasShopEntitlement/);
  assert.match(cosmetics, /getShopAccessLabel/);
  assert.doesNotMatch(cosmetics, /ownedCosmetics|profile-cosmetics-plus-guide/);
  assert.match(cosmetics, /equip_item/);
  assert.doesNotMatch(cosmetics, /purchase_item/);
});
