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
  assert.match(identity, /identity-card__badge--staff/);
  assert.match(identity, /<span>STAFF<\/span>/);
  assert.match(identity, /staff \|\| founder \|\| displayedBadges\.length/);
  assert.match(identity, /export let staff = false/);
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
  assert.match(shell, /staff=\{Boolean\(targetProfile\?\.is_staff\)\}/);
  assert.match(shell, /profileDisplayName = username/);
  assert.match(shell, /showToday=\{false\}/);
  assert.match(shell, /quiet=\{true\}/);
  assert.match(shell, /data-profile-region="featured"/);
  assert.doesNotMatch(shell, /slot="today"/);
  assert.doesNotMatch(shell, /slot="collection"/);
});

test('the owner roll uses a staged presentation without moving authority into the client', async () => {
  const roll = await read('src/lib/ProfileRoll.svelte');

  assert.match(roll, /REVEAL_STAGES/);
  assert.match(roll, /REVEAL_SPECTRUM/);
  assert.match(roll, /REVEAL_PACE = 3/);
  assert.match(roll, /REVEAL_STEP_LABELS/);
  assert.match(roll, /profile-roll__reveal-button/);
  assert.match(roll, /profile-roll__reveal-swatch/);
  assert.match(roll, /profile-roll__availability/);
  assert.match(roll, /Resets in/);
  assert.match(roll, /Roll your color/);
  assert.doesNotMatch(roll, /profile-roll__reveal-orb/);
  assert.doesNotMatch(roll, /Reveal your color/);
  assert.match(roll, /profile-roll__scan-field/);
  assert.match(roll, /profile-roll__lock-ring/);
  assert.match(roll, /profile-roll__condition-rail/);
  assert.match(roll, /Top scoring conditions/);
  assert.match(roll, /profile-roll--quiet/);
  assert.ok(roll.indexOf('class="profile-roll__condition-rail"') < roll.indexOf('class="profile-roll__details"'));
  assert.ok(roll.indexOf('class="profile-roll__details"') < roll.indexOf('class="profile-roll__story"'));
  assert.match(roll, /profile-roll__skip/);
  assert.match(roll, /let detailsOpen = true/);
  assert.match(roll, /profile-roll__rolling-conditions/);
  assert.match(roll, /profile-roll__condition--revealing/);
  assert.match(roll, /primeCanonicalConditions/);
  assert.match(roll, /primeCanonicalConditions\(canonical\)/);
  assert.match(roll, /Collapse score breakdown/);
  assert.match(roll, /dispatch\('colorpreview'/);
  assert.match(roll, /View score breakdown/);
  assert.match(roll, /bind:open=\{detailsOpen\}/);
  assert.match(roll, /\$profile\?\.is_staff/);
  assert.match(roll, /Replay reveal/);
  assert.match(roll, /async function shareRoll/);
  assert.match(roll, /Share roll/);
  assert.match(roll, /surface: 'roll'/);
  assert.ok(roll.indexOf('class="profile-roll__result-actions"') < roll.indexOf('class="profile-roll__details"'));
  assert.match(roll, /async function replayReveal/);
  assert.doesNotMatch(
    roll.slice(roll.indexOf('async function replayReveal'), roll.indexOf('async function initiateRoll')),
    /requestRoll|supabase\.rpc|refreshProfileState|fetchInventoryState|fetchWalletBalance/
  );
  assert.match(roll, /displayScore\.toLocaleString\(\)\} <span>EP/);
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
