import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [rewards, game] = await Promise.all([
  readFile(new URL('../src/lib/RollResultRewards.svelte', import.meta.url), 'utf8'),
  readFile(new URL('../src/lib/Game.svelte', import.meta.url), 'utf8')
]);

test('Roll rewards view uses canonical badge metadata and keeps the empty grid wrapper', () => {
  assert.match(rewards, /import \{ getBadgeMeta \} from '\.\/badgeData'/);
  assert.match(rewards, /export let systemBadges = \[\]/);
  assert.match(rewards, /export let earnedAchievements = \[\]/);
  assert.match(rewards, /<div class="roll-detail-grid">/);
  assert.match(rewards, /\{#if systemBadges\.length > 0\}[\s\S]*\{#if earnedAchievements\.length > 0\}/);
  assert.match(game, /\{#if !dedicated\}\s*<RollResultRewards \{systemBadges\} \{earnedAchievements\} \/>\s*\{\/if\}/);
});

test('Roll bonus and achievement sections preserve their labels, order, and row details', () => {
  assert.match(rewards, /aria-labelledby="roll-rewards-title"/);
  assert.match(rewards, /id="roll-rewards-title">EP bonuses & milestones/);
  assert.match(rewards, /Wallet rewards · separate from score/);
  assert.match(rewards, /aria-labelledby="roll-achievements-title"/);
  assert.match(rewards, /id="roll-achievements-title">Achievements unlocked/);
  assert.match(rewards, /New rewards from this roll/);
  assert.ok(rewards.indexOf('systemBadges as badgeId') < rewards.indexOf('earnedAchievements as badgeId'));
  assert.match(rewards, /badge\.symbol \|\| '✨'/);
  assert.match(rewards, /badge\.symbol \|\| '🏆'/);
  assert.match(rewards, /badge\.points\.toLocaleString\(\)\} EP/);
  assert.match(rewards, />Granted<\/span>/);
  assert.match(rewards, /\.badges-container-tight/);
  assert.match(rewards, /@media \(max-width: 600px\)/);
  assert.doesNotMatch(rewards, /requestRoll|calculate_roll|scoreCandidate|rerollShards/);
});
