import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const [actions, game, rollPage, reliabilitySmoke, homepageSmoke] = await Promise.all([
  read('src/lib/RollResultActions.svelte'),
  read('src/lib/Game.svelte'),
  read('src/lib/RollPage.svelte'),
  read('scripts/browser/roll-reliability-smoke.mjs'),
  read('scripts/browser/homepage-account-smoke.mjs')
]);

test('dedicated result actions preserve the profile, share, image, and reroll controls', () => {
  const dedicatedActions = actions.slice(actions.indexOf("placement === 'dedicated'"), actions.indexOf("{:else if placement === 'acquisition'}"));

  assert.match(actions, /placement === 'dedicated'/);
  assert.match(actions, /roll-acquisition-actions roll-acquisition-actions--dedicated/);
  assert.match(actions, /aria-label="Roll result actions"/);
  assert.match(actions, /export let showAcquisitionActions = false/);
  assert.match(rollPage, /export let showAcquisitionActions = false/);
  assert.match(game, /placement="dedicated"[\s\S]*\{showAcquisitionActions\}/);
  assert.match(dedicatedActions, /\{#if showAcquisitionActions\}[\s\S]*\{#if isAuthenticated\}/);
  assert.match(dedicatedActions, /dispatch\('navigate', \{ view: 'profile' \}\)[\s\S]*View your profile/);
  assert.match(dedicatedActions, /dispatch\('navigate', \{ view: 'profile-settings' \}\)[\s\S]*Customize your profile/);
  assert.match(dedicatedActions, /dispatch\('navigate', \{ view: 'leaderboard' \}\)[\s\S]*Explore leaderboard/);
  assert.match(dedicatedActions, /\{:else\}[\s\S]*dispatch\('navigate', \{ view: 'leaderboard' \}\)[\s\S]*Browse the leaderboard/);
  assert.match(dedicatedActions, /role="group" aria-label="Continue from your result"/);
  assert.match(dedicatedActions, /roll-acquisition-actions__next-steps/);
  assert.match(dedicatedActions, /roll-acquisition-actions__next-action/);
  assert.match(dedicatedActions, /\{\/if\}[\s\S]*<div class="post-score-actions post-score-actions--dedicated"/);
  assert.match(actions, /post-score-actions post-score-actions--dedicated/);
  assert.match(actions, /aria-label="Share and continue"/);
  assert.match(actions, /<button type="button" class="chroma-btn result-action roll-acquisition-actions__tool"/);
  assert.match(actions, /data-roll-action="share-image"/);
  assert.match(actions, /View \/ share image/);
  assert.match(actions, /isAuthenticated && rerollShards > 0/);
  assert.match(actions, /disabled=\{rerollDisabled\}/);
  assert.match(actions, /type="button" class="reroll-btn result-action result-action--reroll roll-acquisition-actions__tool"/);
  assert.match(actions, /dispatch\('shareimage'\)/);
  assert.match(actions, /dispatch\('reroll'\)/);
});

test('acquisition and post-score actions retain guest/authenticated branches and order', () => {
  assert.match(actions, /placement === 'acquisition'/);
  assert.match(actions, /aria-label="Roll result actions"/);
  assert.match(actions, /\{#if isAuthenticated\}[\s\S]*View your profile[\s\S]*dispatch\('share'\)/);
  assert.match(actions, /\{:else if isSignedOut\}[\s\S]*dispatch\('share'\)/);
  assert.match(actions, /<button class="roll-acquisition-actions__quiet" on:click/);
  assert.match(actions, /<button class="roll-acquisition-actions__quiet" type="button" on:click/);

  assert.match(actions, /placement === 'post-score'/);
  assert.match(actions, /class="countdown-inline"/);
  assert.match(actions, /countdown-inline__label">Next roll/);
  assert.match(actions, /dispatch\('share'\)/);
  assert.match(actions, /View image\s*<\/button>/);
  assert.match(actions, /Reroll · \{rerollShards\} left/);
});

test('Game keeps roll state and action handlers while delegating only the action markup', () => {
  assert.match(game, /import RollResultActions from '\.\/RollResultActions\.svelte'/);
  assert.equal((game.match(/<RollResultActions\b/g) || []).length, 3);
  assert.match(game, /placement="dedicated"[\s\S]*on:share=\{shareResultsText\}[\s\S]*on:shareimage=\{generateShareImage\}[\s\S]*on:reroll=\{\(\) => initiateRoll\(true\)\}/);
  assert.ok(game.indexOf('class="roll-result-footer"') < game.indexOf('placement="dedicated"'));
  assert.ok(game.indexOf('placement="acquisition"') < game.indexOf('{#if cotwHit}'));
  assert.ok(game.indexOf('{#if cotwHit}') < game.indexOf('placement="post-score"'));
  assert.match(game, /isSignedOut=\{\$accountState === ACCOUNT_STATES\.SIGNED_OUT\}/);
  assert.match(game, /rerollDisabled=\{loading \|\| rerollRequestInFlight \|\| rerollLocked \|\| !\$authInitialized\}/);
  assert.match(game, /on:navigate=\{event => dispatch\('navigate', event\.detail\)\}/);
  assert.doesNotMatch(game, /<div class="roll-acquisition-actions/);
  assert.match(game, /function shareResultsText\(/);
  assert.match(game, /import \{ runRollTextShare \} from '\.\/rollTextShare\.js'/);
  assert.match(game, /await runRollTextShare\(\{[\s\S]*?shareHex: normalizeHexColor\(displayColor\)[\s\S]*?earnedLine[\s\S]*?\}, \{[\s\S]*?isCurrent: \(\) => shareAttemptId === rollTextShareAttemptId[\s\S]*?shareRequestId === rollRequestId[\s\S]*?createChallengeLink: payload => createChallengeLink\(supabase, payload\)[\s\S]*?writeText: text => navigator\.clipboard\.writeText\(text\)[\s\S]*?track: trackProductEvent[\s\S]*?toast: addToast[\s\S]*?onCopied: \(\) => \{[\s\S]*?const feedbackVersion = \+\+copiedFeedbackVersion[\s\S]*?if \(feedbackVersion === copiedFeedbackVersion\) copied = false[\s\S]*?\}, 2000\)/);
  assert.match(game, /async function initiateRoll\(/);
});

test('RollPage and browser smoke selectors keep the same public action hooks', () => {
  assert.match(rollPage, /\.roll-result-footer \.result-action/);
  assert.match(rollPage, /\.roll-stage--results > \.roll-acquisition-actions/);
  assert.match(reliabilitySmoke, /\.reroll-btn/);
  assert.match(reliabilitySmoke, /data-roll-action=share-image/);
  assert.match(reliabilitySmoke, /\.roll-acquisition-actions--dedicated/);
  assert.match(reliabilitySmoke, /\.post-score-actions--dedicated/);
  assert.match(homepageSmoke, /\.roll-acquisition-actions--dedicated/);
  assert.match(homepageSmoke, /data-roll-action=share-image/);
});
