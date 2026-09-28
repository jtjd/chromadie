import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import fixture from '../src/lib/generated/scoringV6BalanceFixture.json' with { type: 'json' };
import { rollScoreToEp } from '../src/lib/rollEp.js';
import { RANKS } from '../src/lib/rankConfig.js';
import { readProgressionManifest } from '../scripts/progression-manifest.mjs';

const migration = readFileSync('supabase/migrations/20260928100000_roll_ep_rank_rebalance.sql', 'utf8');

test('ordinary score stays close to EP while exceptional score has smooth diminishing returns', () => {
  assert.equal(rollScoreToEp(47_461), 47_461);
  assert.equal(rollScoreToEp(80_000), 80_000);
  assert.equal(rollScoreToEp(80_001), 80_001);
  assert.equal(rollScoreToEp(145_751), 127_990);
  assert.equal(rollScoreToEp(fixture.scoreSpread.max), 1_144_662);
  assert.ok(rollScoreToEp(100_000_000_000) > rollScoreToEp(fixture.scoreSpread.max));
});

test('EP conversion is monotone across the full observed score range', () => {
  let previous = -1;
  for (let score = 0; score <= 100_000; score += 1) {
    const current = rollScoreToEp(score);
    assert.ok(current >= previous, `score ${score}`);
    previous = current;
  }
  for (let score = 100_001; score <= fixture.scoreSpread.max; score = Math.ceil(score * 1.01)) {
    const current = rollScoreToEp(score);
    assert.ok(current >= previous, `score ${score}`);
    previous = current;
  }
});

test('extreme roll is worth less than one month of rank progress', () => {
  const highestAward = rollScoreToEp(fixture.scoreSpread.max);
  assert.ok(highestAward < RANKS[2].min - RANKS[1].min);
  assert.ok(highestAward < RANKS[5].min / 20);
});

test('exhaustive distribution bonus-aware journeys follow the intended rank pace', () => {
  assert.deepEqual(fixture.progression.rankDailyRollsWithBonuses, {
    Silver: { p10: 10, median: 14, p90: 16 },
    Gold: { p10: 36, median: 45, p90: 51 },
    Platinum: { p10: 104, median: 119, p90: 131 },
    Diamond: { p10: 232, median: 252, p90: 269 },
    Chroma: { p10: 476, median: 500, p90: 525 }
  });
});

test('server migration reverses stored roll EP on reroll and keeps raw score for achievements', () => {
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.roll_score_to_ep\(p_score bigint\)/);
  assert.match(migration, /v_roll_ep := public\.roll_score_to_ep\(v_total_score\)/);
  assert.match(migration, /progression_ep = GREATEST\(0, COALESCE\(progression_ep, 0\) - COALESCE\(v_existing_roll\.ep_earned, public\.roll_score_to_ep\(v_existing_roll\.score\), 0\) \+ v_roll_ep/);
  assert.match(migration, /lifetime_ep_awarded, v_existing_roll\.score, 0\) \+ v_roll_ep/);
  assert.match(migration, /score = v_total_score,\s+ep_earned = v_roll_ep/);
  assert.match(migration, /v_total_score >= 14370000/);
  assert.match(migration, /PERFORM public\.reconcile_progression_account\(v_profile\.id\)/);
  assert.match(migration, /SET progression_ep = public\.map_legacy_rank_ep\(lifetime_ep\)/);
});

test('Ritual unlocks cover the midgame without moving the veteran capstones', async () => {
  const byId = new Map((await readProgressionManifest()).map(row => [row.id, row]));
  for (const [id, day, reward] of [
    ['journey_roll_180', 180, 'profile_atmosphere_ink_bloom'],
    ['journey_roll_300', 300, 'cursor_trail_ember_ash'],
    ['journey_roll_430', 430, 'border_gold'],
    ['journey_roll_730', 730, 'cursor_trail_color_memory'],
    ['journey_roll_1095', 1095, 'border_chroma']
  ]) {
    const row = byId.get(id);
    assert.equal(row?.progress_target, day);
    assert.equal(row?.reward_item_key, reward);
    assert.equal(row?.track, 'ritual');
    assert.equal(row?.published, true);
  }
});
