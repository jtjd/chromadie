import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { applyCosmeticChanges } from '../src/lib/profile-studio/cosmeticMutations.js';
import { saveAchievementPins } from '../src/lib/achievementBadgeMutation.js';
import { acknowledgeProgressionUnlock } from '../src/lib/progressionUnlockAcknowledge.js';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('cosmetic multi-slot Apply stops before issuing a later slot under a new account', async () => {
  let ownerId = 'account-a';
  let resolveFirst;
  const calls = [];
  const resultPromise = applyCosmeticChanges({
    changedSlots: ['name_font', 'profile_border'],
    previewLoadout: { name_font: 'font-next', profile_border: 'border-next' },
    equippedItems: { name_font: 'font-current', profile_border: 'border-current' },
    getItem: itemKey => ({ item_key: itemKey }),
    rpc: (name, args) => {
      calls.push({ ownerId, name, args });
      return new Promise(resolve => { resolveFirst = resolve; });
    },
    refresh: async () => { assert.fail('stale cosmetics must not refresh through the new account'); },
    isCurrent: () => ownerId === 'account-a'
  });
  await Promise.resolve();
  assert.equal(calls.length, 1);
  ownerId = 'account-b';
  resolveFirst({ data: { success: true } });
  const result = await resultPromise;

  assert.equal(result.stale, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].ownerId, 'account-a');
});

test('pinned achievement save discards a response after its owner changes', async () => {
  let current = true;
  let resolveRpc;
  let committed = false;
  const client = {
    rpcWithAccessToken: (name, args, accessToken) => {
      assert.equal(name, 'equip_badges');
      assert.deepEqual(args, { p_badge_ids: ['first_light'] });
      assert.equal(accessToken, 'account-a-token');
      return new Promise(resolve => { resolveRpc = resolve; });
    }
  };
  const resultPromise = saveAchievementPins({
    supabaseClient: client,
    badgeIds: ['first_light'],
    accessToken: 'account-a-token',
    isCurrent: () => current
  });
  await Promise.resolve();
  current = false;
  resolveRpc({ data: { success: true, badges: ['first_light'] } });
  const result = await resultPromise;
  if (!result.stale) committed = true;
  assert.equal(result.stale, true);
  assert.equal(committed, false);
});

test('progression acknowledgement does not continue to the second RPC after the account changes', async () => {
  let current = true;
  let acknowledgeCalls = 0;
  const result = await acknowledgeProgressionUnlock({
    unlock: { id: 'rank_2' },
    isCurrent: () => current,
    present: async () => { current = false; },
    acknowledge: async () => { acknowledgeCalls += 1; return { data: { success: true } }; }
  });

  assert.equal(result.stale, true);
  assert.equal(acknowledgeCalls, 0);
});

test('account-bound profile components guard badge, meta, identity, expression, and progression transitions', async () => {
  const [profile, achievements, identity, expression, queue] = await Promise.all([
    read('src/lib/Profile.svelte'),
    read('src/lib/ProgressionAchievements.svelte'),
    read('src/lib/IdentityEditor.svelte'),
    read('src/lib/ProfileExpressionEditor.svelte'),
    read('src/lib/ProgressionUnlockQueue.svelte')
  ]);
  assert.match(profile, /saveAchievementPins\([\s\S]*isCurrent/);
  assert.match(profile, /rpcWithAccessToken\(supabase, 'update_profile_meta'/);
  assert.match(achievements, /syncOwner\(userId \|\| ''\)/);
  assert.match(achievements, /saveAchievementPins\([\s\S]*isCurrent/);
  assert.match(identity, /rpcWithAccessToken\(supabase, 'update_my_profile_identity'/);
  assert.match(identity, /if \(!isCurrent\(\)\) return;[\s\S]*rpcWithAccessToken\(supabase, 'save_profile_identity_presentation'/);
  assert.match(expression, /deleteProfileExpressionAsset\(asset\.id,[\s\S]*authorization,[\s\S]*isCurrent: action\.isCurrent/);
  assert.match(expression, /clearLegacyProfileExpressionAudio\(previousPath,[\s\S]*authorization,[\s\S]*isCurrent: action\.isCurrent/);
  assert.match(expression, /finally \{[\s\S]*if \(action\.isCurrent\(\)\) busy = false;/);
  assert.match(queue, /isCurrentAccount\(ownerId, generation\)/);
  assert.match(queue, /rpcWithAccessToken\(supabase, 'acknowledge_progression_unlocks'/);
});

test('environment files stay ignored while the documented example remains trackable', async () => {
  const gitignore = await read('.gitignore');
  assert.match(gitignore, /^\.env\.\*$/m);
  assert.match(gitignore, /^!\.env\.example$/m);
});
