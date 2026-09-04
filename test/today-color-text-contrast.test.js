import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('completed result text separates earned values from the rolled-color accent', async () => {
  const tokens = await read('src/styles/tokens.css');
  const summary = await read('src/lib/ProfileRollSummary.svelte');

  assert.match(tokens, /--color-earned:\s*#[0-9a-f]{6};/i);
  assert.match(summary, /\.profile-roll-summary__score\s*\{[^}]*#f5c26f/s);
  assert.match(summary, /\.profile-roll-summary__identity\s*\{[^}]*rgba\(248,248,250,\.97\)/s);
  assert.match(summary, /\.profile-roll-summary__label\s*\{[^}]*rgba\(226,229,239,\.58\)/s);
  assert.match(summary, /\.profile-roll-summary__rarity\s*\{[^}]*var\(--profile-roll-summary-rarity\)/s);
  assert.match(summary, /data-profile-widget-mode="summary"/);
  assert.doesNotMatch(summary, /<details|RollResultBreakdown|today-color/);
});
