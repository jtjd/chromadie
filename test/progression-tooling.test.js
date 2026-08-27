import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { simulateBalance } from '../scripts/simulate-balance.mjs';
import { parseProgressionRows, readProgressionManifest } from '../scripts/progression-manifest.mjs';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('balance simulation exposes condition frequencies and expected rolls', () => {
  const report = simulateBalance({ rolls: 10_000, seed: 0x4348524f });
  const prime = report.conditions.sum_prime;
  const rare = report.rarities.Rare;

  assert.ok(prime.count > 0);
  assert.equal(prime.frequency, prime.count / report.rolls);
  assert.equal(prime.expectedRolls, 1 / prime.frequency);
  assert.ok(rare.count > 0);
  assert.equal(rare.expectedRolls, report.rolls / rare.count);
});

test('progression manifest parser preserves authored pacing metadata', () => {
  const [row] = parseProgressionRows(`
    INSERT INTO public.progression_milestones
      (id, track, achievement_id, expected_rolls, published)
    VALUES ('journey_mythic', 'discovery', 'mythic_roll', 852, TRUE)
    ON CONFLICT (id) DO UPDATE SET expected_rolls = EXCLUDED.expected_rolls;
  `);

  assert.deepEqual(row, {
    id: 'journey_mythic',
    track: 'discovery',
    achievement_id: 'mythic_roll',
    expected_rolls: 852,
    published: true
  });
});

test('progression manifest parser evaluates the final CASE-based migration patch', async () => {
  const manifest = await readProgressionManifest();
  const byId = new Map(manifest.map(row => [row.id, row]));

  assert.equal(byId.get('journey_rarity_rare').sort_order, 10);
  assert.equal(byId.get('journey_rarity_rare').expected_rolls, 3);
  assert.equal(byId.get('journey_roll_prime').sort_order, 20);
  assert.equal(byId.get('journey_roll_prime').expected_rolls, 7);
  assert.equal(byId.get('journey_high_contrast').sort_order, 30);
  assert.equal(byId.get('journey_high_contrast').expected_rolls, 10);
  assert.equal(byId.get('journey_rarity_epic').sort_order, 40);
  assert.equal(byId.get('journey_rarity_epic').expected_rolls, 26);
  assert.equal(byId.get('journey_rarity_anomaly').sort_order, 50);
  assert.equal(byId.get('journey_rarity_anomaly').expected_rolls, 927);
  assert.equal(byId.get('journey_mythic').sort_order, 70);
  assert.equal(byId.get('journey_mythic').expected_rolls, 33894);
  assert.equal(byId.get('journey_palindrome').sort_order, 60);
  assert.equal(byId.get('journey_palindrome').expected_rolls, 4096);
  assert.equal(byId.get('journey_streak_14').progress_source, 'longest_streak');
  assert.equal(byId.get('journey_greyscale').published, false);
  assert.equal(byId.get('journey_roll_730').achievement_id, null);
  assert.equal(byId.get('journey_roll_730').progress_target, 730);
});

test('progression balance gate blocks probability and pacing regressions', async () => {
  const source = await read('scripts/check-progression-balance.mjs');
  assert.match(source, /journey_roll_730/);
  assert.match(source, /journey_roll_1095/);
  assert.match(source, /journey_greyscale/);
  assert.match(source, /Legendary must precede Anomaly/);
  assert.match(source, /expected_rolls/);
  assert.match(source, /MAX_PUBLISHED_EXPECTED_ROLLS/);
  assert.match(source, /longest_streak/);
  assert.match(source, /must not depend on an achievement row/);
  assert.match(source, /simulateBalance\(\{ exhaustive: true \}\)/);
});

test('catalog drift interprets progression access SQL instead of normalizing rewards', async () => {
  const source = await read('scripts/check-catalog-drift.mjs');
  assert.doesNotMatch(source, /function applyProgressionRewardAccessUpdates/);
  assert.match(source, /applyExplicitProgressionEarnedUpdate/);
  assert.match(source, /assertProgressionRewardContract/);
  assert.match(source, /NOT EXISTS/);
  assert.match(source, /milestone/);
  assert.match(source, /reward_item_key/);
  assert.match(source, /access_tier !== 'earned'/);
  assert.match(source, /freeBaseline/);
});

test('progression route budget excludes and separately measures lazy preview code', async () => {
  const source = await read('scripts/check-performance-budget.mjs');
  assert.match(source, /progression: \{/);
  assert.match(source, /src\/lib\/ProgressionPage\.svelte/);
  assert.match(source, /src\/lib\/ShopItemPreview\.svelte/);
  assert.doesNotMatch(source, /dynamicEntries: \['src\/lib\/ProgressionRewardPreview\.svelte'\]/);
  assert.match(source, /dynamicJavascript: 160 \* 1024/);
  assert.match(source, /preview entries entered the initial route payload/);
  assert.match(source, /summarizeDynamicManifestEntries/);
});

test('database security and progression runners isolate score baselines and execute the behavior file', async () => {
  const [security, runner, packageJson, fastWorkflow, databaseWorkflow, smoke] = await Promise.all([
    read('scripts/check-database-security.mjs'),
    read('scripts/check-progression-database.mjs'),
    read('package.json'),
    read('.github/workflows/ci.yml'),
    read('.github/workflows/database-ci.yml'),
    read('scripts/browser/progression-smoke.mjs')
  ]);

  assert.match(security, /audit_score_baseline/);
  assert.match(security, /guest roll wrote a score/);
  assert.match(runner, /supabase.*tests.*progression_behavior\.sql/);
  assert.match(packageJson, /check:progression-db/);
  assert.match(packageJson, /test:browser:progression/);
  assert.match(packageJson, /check:username-policy-drift/);
  assert.match(fastWorkflow, /cancel-in-progress: true/);
  assert.match(fastWorkflow, /timeout-minutes: 10/);
  assert.match(databaseWorkflow, /Run progression database behavior checks/);
  assert.match(databaseWorkflow, /Check username policy drift/);
  assert.match(databaseWorkflow, /Run progression browser smoke/);
  assert.match(databaseWorkflow, /workflow_dispatch:/);
  assert.match(databaseWorkflow, /supabase\/\*\*/);
  assert.match(databaseWorkflow, /cancel-in-progress: true/);
  assert.match(databaseWorkflow, /timeout-minutes: 15/);
  assert.match(databaseWorkflow, /Locate preinstalled browser/);
  assert.doesNotMatch(databaseWorkflow, /apt-get/);
  assert.match(databaseWorkflow, /if: failure\(\)/);
  assert.match(databaseWorkflow, /path: \/tmp\/chromadie-ci-evidence/);
  assert.match(databaseWorkflow, /retention-days: 3/);
  assert.doesNotMatch(smoke, /uploadGeneratedImage/);
  assert.match(smoke, /startVite/);
  assert.match(smoke, /progression-page__state/);
  assert.match(smoke, /prefers-reduced-motion/);
});
