import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('completed result text separates earned values from the rolled-color accent', async () => {
  const tokens = await read('src/styles/tokens.css');
  const summary = await read('src/lib/ProfileRollSummary.svelte');

  assert.match(tokens, /--color-earned:\s*#[0-9a-f]{6};/i);
  assert.match(summary, /color: var\(--profile-text, inherit\)/);
  assert.match(summary, /background: transparent/);
  assert.match(summary, /background: var\(--profile-roll-summary-color\)/);
  assert.match(summary, /<summary>View roll details<\/summary>/);
  assert.match(summary, /summary:focus-visible/);
  assert.match(summary, /data-profile-widget-mode="summary"/);
  assert.doesNotMatch(summary, /RollResultBreakdown|today-color|supabase|roll_die/);
});
