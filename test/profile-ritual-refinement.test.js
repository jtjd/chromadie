import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('the profile identity surface stays sparse and keeps the archive outside the card', async () => {
  const identity = await read('src/lib/ProfileReferenceCard.svelte');
  const shell = await read('src/lib/ProfileShell.svelte');
  const renderModel = await read('src/lib/profileRenderModel.js');

  assert.doesNotMatch(identity, /identity-card__handle-row|identity-card__handle/);
  assert.match(identity, /profile-reference-card__links/);
  assert.match(identity, /profile-reference-card__roll/);
  assert.doesNotMatch(identity, /color identity/);
  assert.doesNotMatch(identity, /chm\.lol\/\{username\}/);
  assert.doesNotMatch(identity, /identity-card|collection/);
  assert.match(shell, /profile-shell__approved-main/);
  assert.match(shell, /profile-shell__approved-featured/);
  assert.match(shell, /pinnedAchievements/);
  assert.match(renderModel, /profileDisplayName = profile\?\.display_name \|\| profileName/);
  assert.doesNotMatch(shell, /profileRollComponent|todayColorComponent|profile-shell__approved-game/);
  assert.match(shell, /data-profile-region="featured"/);
  assert.doesNotMatch(shell, /slot="today"/);
  assert.doesNotMatch(shell, /slot="collection"/);
});

test('the dedicated roll uses a staged presentation without moving authority into the client', async () => {
  const roll = await read('src/lib/Game.svelte');

  assert.match(roll, /getRollRevealTimeline/);
  assert.match(roll, /ROLL_REVEAL_STEPS/);
  assert.match(roll, /roll-stage--rolling/);
  assert.match(roll, /Skip reveal/);
  assert.match(roll, /prefersReducedMotion/);
  assert.match(roll, /requestRoll\(supabase, isReroll\)/);
  assert.doesNotMatch(roll, /Math\.random\(\)|calculate_roll_v2|clientScore|clientReward/);
});

test('profile and account hydration remain non-visual', async () => {
  const shell = await read('src/lib/ProfileShell.svelte');
  const legacyProfile = await read('src/lib/Profile.svelte');
  const app = await read('src/App.svelte');
  const accountUnavailable = await read('src/lib/AccountUnavailable.svelte');
  const header = await read('src/lib/SiteModeHeader.svelte');

  assert.match(shell, /aria-busy=\{loading\}/);
  assert.match(legacyProfile, /aria-busy=\{loading\}/);
  assert.doesNotMatch(shell + legacyProfile, /Loading profile|Loading color identity|profile-shell-loading/);
  assert.match(app, /staticComponent: RouteLoading/);
  assert.match(app, /currentLegacyProfile \? 'profileLegacy' : 'profileShell'/);
  assert.doesNotMatch(header, /Loading account|Preparing your account/);
  assert.match(accountUnavailable, /Account unavailable/);
  assert.match(header, /Retry account/);
});

test('profile presentation keeps visual effects code-owned and bounded', async () => {
  const border = await read('src/lib/profile-border/ProfileBorderEffect.svelte');
  const registry = await read('src/lib/profile-border/profileBorders.js');
  const profile = await read('src/lib/Profile.svelte');
  assert.match(registry, /PROFILE_BORDER_KEYS/);
  assert.match(border, /prefers-reduced-motion/);
  assert.match(border, /IntersectionObserver/);
  assert.match(profile, /ProfileBorderEffect/);
  assert.doesNotMatch(border, /\{@html|catalog/);
});
