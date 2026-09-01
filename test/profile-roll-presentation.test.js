import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('the dedicated roll keeps staged server-authoritative presentation without cosmetic slots', async () => {
  const [page, game, shell] = await Promise.all([
    readFile(new URL('../src/lib/RollPage.svelte', import.meta.url), 'utf8'),
    readFile(new URL('../src/lib/Game.svelte', import.meta.url), 'utf8'),
    readFile(new URL('../src/lib/ProfileShell.svelte', import.meta.url), 'utf8')
  ]);
  assert.match(page, /<Game/);
  assert.match(game, /requestRoll\(supabase, isReroll\)/);
  assert.match(game, /prefersReducedMotion/);
  assert.doesNotMatch(game, /roll_effect|orb_shape|ProfileAtmosphere/);
  assert.doesNotMatch(shell, /profileRollComponent|todayColorComponent|roll_die\s*\(/);
});
