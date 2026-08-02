import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('the homepage uses optimized source imagery and keeps live discovery data authoritative', async () => {
  const [hero, directory, daily, leaderboard] = await Promise.all([
    read('src/lib/HomeHero.svelte'),
    read('src/lib/HomepageProfileDirectory.svelte'),
    read('src/lib/HomeDailyResult.svelte'),
    read('src/lib/HomeLeaderboard.svelte')
  ]);

  assert.match(hero, /admin-profile-desktop\.png/);
  assert.match(hero, /admin-profile-mobile\.webp/);
  assert.match(directory, /supabase\.rpc\('get_public_discovery'/);
  assert.match(directory, /collectHomepageRollEvents/);
  assert.match(daily, /CompactRollPreview/);
  assert.match(leaderboard, /getProfileMediaUrl/);
  assert.doesNotMatch(hero, /data:image/);
});
