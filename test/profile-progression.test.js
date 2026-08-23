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

test('Customize is the complete profile cosmetics surface with earned and Plus states', async () => {
  const cosmetics = await read('src/lib/ProfileCosmeticsEditor.svelte');

  assert.match(cosmetics, /Profile cosmetics/);
  assert.match(cosmetics, /every profile cosmetic layer/);
  assert.match(cosmetics, /availableCosmetics/);
  assert.match(cosmetics, /hasShopEntitlement/);
  assert.match(cosmetics, /getShopAccessLabel/);
  assert.doesNotMatch(cosmetics, /ownedCosmetics|profile-cosmetics-plus-guide/);
  assert.match(cosmetics, /equip_item/);
  assert.doesNotMatch(cosmetics, /purchase_item/);
});

test('the dedicated Roll unlock is integrated and gives name cosmetics a wide canonical preview', async () => {
  const [game, page, queue, preview] = await Promise.all([
    read('src/lib/Game.svelte'),
    read('src/lib/RollPage.svelte'),
    read('src/lib/ProgressionUnlockQueue.svelte'),
    read('src/lib/ProgressionRewardPreview.svelte')
  ]);

  const resultDisplayIndex = game.indexOf('<div class="roll-display" aria-live="polite">');
  const unlockQueueIndex = game.indexOf('<ProgressionUnlockQueue', resultDisplayIndex);
  const resultBreakdownIndex = game.indexOf('<div class="roll-breakdown roll-breakdown--result"', resultDisplayIndex);

  assert.ok(resultDisplayIndex >= 0 && unlockQueueIndex > resultDisplayIndex && unlockQueueIndex < resultBreakdownIndex);
  assert.match(game, /compact=\{dedicated\}/);
  assert.doesNotMatch(page, /roll-page__proof-label">NEW COSMETIC/);
  assert.match(queue, /class:progression-unlock-queue--compact=\{compact\}/);
  assert.match(queue, /presentation=\{compact \? 'wide' : 'default'\}/);
  assert.match(preview, /export let presentation = 'default'/);
  assert.match(preview, /progression-reward-preview--wide/);
  assert.match(page, /min\(8\.5rem, 46%\)/);
  assert.match(page, /name-effect-canvas\) \{ display:block; width:100%; max-width:100%;/);
  assert.match(page, /name-effect-canvas__semantic\) \{ width:100%; overflow:hidden;/);
});
