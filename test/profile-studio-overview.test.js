import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('Studio overview points progression work to its dedicated destination', async () => {
  const overview = await read('src/lib/ProfileStudioOverview.svelte');

  assert.match(overview, /Profile overview/);
  assert.match(overview, /getRankState/);
  assert.match(overview, /getProfileStoryUnlocks/);
  assert.match(overview, /href="#customize"/);
  assert.match(overview, /href="\/progression"/);
  assert.match(overview, /href="#customize-links"/);
  assert.match(overview, /timelineEvents\.slice\(0, 3\)/);
  assert.match(overview, /prefers-reduced-motion/);
  assert.match(overview, /role="progressbar"/);
});

test('Studio overview handles new and partial profiles without inventing state', async () => {
  const overview = await read('src/lib/ProfileStudioOverview.svelte');

  assert.match(overview, /profile \|\| \{\}/);
  assert.match(overview, /No rolls recorded yet/);
  assert.match(overview, /collectionItems\.length/);
  assert.match(overview, /unlockedAchievements/);
});
