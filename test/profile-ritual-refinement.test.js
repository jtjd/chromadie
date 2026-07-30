import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('the profile identity surface stays sparse and keeps the archive outside the card', async () => {
  const identity = await read('src/lib/IdentityCard.svelte');
  const shell = await read('src/lib/ProfileShell.svelte');

  assert.match(identity, /identity-card__handle-row/);
  assert.match(identity, /identity-card__link-glyph/);
  assert.match(identity, /identity-card__badges/);
  assert.match(identity, /badges = \[\]/);
  assert.match(identity, /showToday = true/);
  assert.match(identity, /slot name="today"/);
  assert.doesNotMatch(identity, /color identity/);
  assert.doesNotMatch(identity, /chm\.lol\/\{username\}/);
  assert.doesNotMatch(identity, /identity-card__collection/);
  assert.match(shell, /profile-shell__approved-main/);
  assert.match(shell, /profile-shell__approved-game/);
  assert.match(shell, /profile-shell__approved-featured/);
  assert.match(shell, /badges=\{pinnedAchievements\}/);
  assert.match(shell, /showToday=\{false\}/);
  assert.match(shell, /quiet=\{true\}/);
  assert.match(shell, /data-profile-region="featured"/);
  assert.doesNotMatch(shell, /slot="today"/);
  assert.doesNotMatch(shell, /slot="collection"/);
});

test('the owner roll uses a staged presentation without moving authority into the client', async () => {
  const roll = await read('src/lib/ProfileRoll.svelte');

  assert.match(roll, /REVEAL_STAGES/);
  assert.match(roll, /profile-roll__reveal-button/);
  assert.match(roll, /profile-roll__scan-field/);
  assert.match(roll, /profile-roll__condition-rail/);
  assert.match(roll, /Scoring conditions/);
  assert.match(roll, /profile-roll--quiet/);
  assert.ok(roll.indexOf('class="profile-roll__details"') < roll.indexOf('class="profile-roll__condition-rail"'));
  assert.ok(roll.indexOf('class="profile-roll__details"') < roll.indexOf('class="profile-roll__story"'));
  assert.match(roll, /profile-roll__skip/);
  assert.match(roll, /animateScore: true/);
  assert.match(roll, /revealBadges: false/);
  assert.match(roll, /prefersReducedMotion/);
  assert.match(roll, /requestRoll\(supabase, isReroll\)/);
  assert.doesNotMatch(roll, /Math\.random\(\)|calculate_roll_v2|clientScore|clientReward/);
});

test('profile and account hydration remain non-visual', async () => {
  const shell = await read('src/lib/ProfileShell.svelte');
  const legacyProfile = await read('src/lib/Profile.svelte');
  const app = await read('src/App.svelte');
  const header = await read('src/lib/SiteModeHeader.svelte');

  assert.match(shell, /aria-busy=\{loading\}/);
  assert.match(legacyProfile, /aria-busy=\{loading\}/);
  assert.doesNotMatch(shell + legacyProfile, /Loading profile|Loading color identity|profile-shell-loading/);
  assert.doesNotMatch(app + header, /Loading account|Preparing your account/);
  assert.match(app, /Account unavailable/);
  assert.match(header, /Retry account/);
});
