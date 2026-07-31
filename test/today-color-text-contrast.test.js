import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('completed result text separates earned values from the rolled-color accent', async () => {
  const tokens = await read('src/styles/tokens.css');
  const today = await read('src/lib/TodayColor.svelte');

  assert.match(tokens, /--color-earned:\s*#[0-9a-f]{6};/i);
  assert.match(today, /\.today-color__score\s*\{[^}]*rgba\(248,250,255,0\.96\)/s);
  assert.match(today, /\.today-color__condition-chip small\s*\{[^}]*var\(--profile-accent\)/s);
  assert.match(today, /\.today-color__label\s*\{[^}]*var\(--profile-accent\)/s);
  assert.match(today, /\.today-color__rarity\s*\{[^}]*var\(--profile-accent\)/s);
  assert.match(today, /<details class="today-color__details" bind:open=\{detailsOpen\}>/);
  assert.match(today, /Collapse score breakdown/);
  assert.match(today, /today-color__condition-records/);
});
