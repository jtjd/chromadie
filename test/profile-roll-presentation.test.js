import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('the owner roll keeps staged server-authoritative presentation without cosmetic slots', async () => {
  const profileRoll = await readFile(new URL('../src/lib/ProfileRoll.svelte', import.meta.url), 'utf8');
  const game = await readFile(new URL('../src/lib/Game.svelte', import.meta.url), 'utf8');
  assert.match(profileRoll, /REVEAL_STAGES/);
  assert.match(profileRoll, /requestRoll\(supabase, isReroll\)/);
  assert.match(profileRoll, /prefersReducedMotion/);
  assert.match(profileRoll, /profile-roll__scan-field/);
  assert.match(profileRoll, /profile-roll__lock-ring/);
  assert.match(game, /requestRoll|rollService/);
  assert.doesNotMatch(profileRoll + game, /roll_effect|orb_shape|ProfileAtmosphere/);
});
