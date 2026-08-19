import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { normalizeNewMilestones, normalizeProgressionData } from '../src/lib/progressionState.js';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('progression normalization preserves server-published journey lanes and weekly focus', () => {
  const progression = normalizeProgressionData({
    current_ep: 2_500_000,
    total_rolls: 10,
    current_streak: 7,
    milestones: [
      {
        id: 'journey_roll_10',
        name: 'A rhythm begins',
        description: 'Roll ten colors.',
        track: 'ritual',
        metric: 'achievement',
        achievement_id: 'roll_10',
        sort_order: 20,
        threshold: 0,
        unlocked: true,
        unlocked_at: '2026-08-19T12:00:00Z',
        reward: { item_key: 'name_material_velvet_ink', name: 'Velvet Ink', slot: 'name_material' },
        progress: { current: 10, target: 10, unit: 'rolls' }
      },
      {
        id: 'journey_rarity_rare',
        name: 'First signal',
        description: 'Discover Rare.',
        track: 'discovery',
        metric: 'achievement',
        achievement_id: 'rarity_rare',
        sort_order: 10,
        threshold: 0,
        unlocked: false,
        reward: { item_key: 'avatar_effect_3d_parallax', name: '3D Parallax', slot: 'avatar_effect' }
      }
    ],
    weekly_focus: {
      week_start: '2026-08-17',
      target_hex: '#8b7cf6',
      completed: false,
      bonus_ep: 50000
    }
  });

  assert.equal(progression.currentRank.name, 'Gold');
  assert.equal(progression.totalRolls, 10);
  assert.equal(progression.currentStreak, 7);
  assert.equal(progression.journeyByTrack.ritual[0].reward.name, 'Velvet Ink');
  assert.equal(progression.journeyByTrack.discovery[0].progress, null);
  assert.equal(progression.nextJourney.discovery.id, 'journey_rarity_rare');
  assert.equal(progression.weeklyFocus.targetHex, '#8B7CF6');
  assert.equal(progression.weeklyFocus.bonusEp, 50000);
  assert.deepEqual(normalizeNewMilestones([{ id: 'journey_roll_10', track: 'ritual', metric: 'achievement', reward: { item_key: 'name_material_velvet_ink', name: 'Velvet Ink', slot: 'name_material' } }]).map(item => item.id), ['journey_roll_10']);
});

test('the journey schema is additive, catalog-backed, and returned by the authoritative roll path', async () => {
  const [journey, analytics, destinationSurface, rollResponse] = await Promise.all([
    read('supabase/migrations/20260819160000_progression_identity_journey.sql'),
    read('supabase/migrations/20260819161000_progression_aggregate_analytics.sql'),
    read('supabase/migrations/20260819170000_progression_destination_surface.sql'),
    read('supabase/migrations/20260819162000_progression_roll_response.sql')
  ]);

  for (const id of [
    'journey_first_roll', 'journey_roll_10', 'journey_streak_7',
    'journey_roll_50', 'journey_streak_30', 'journey_roll_100',
    'journey_roll_365', 'journey_rarity_rare', 'journey_rarity_epic',
    'journey_rarity_anomaly', 'journey_mythic', 'journey_palindrome'
  ]) {
    assert.match(journey, new RegExp(`'${id}'`));
  }
  assert.match(journey, /ADD COLUMN IF NOT EXISTS track/);
  assert.match(journey, /metric = 'achievement'/);
  assert.match(journey, /ON CONFLICT \(user_id, milestone_id\) DO NOTHING/);
  assert.match(journey, /CREATE OR REPLACE FUNCTION public\.get_public_profile_story/);
  assert.match(journey, /progression_proof/);
  assert.match(rollResponse, /roll_die_impl_progression_base/);
  assert.match(rollResponse, /new_progression_unlocks/);
  assert.match(analytics, /progression_analytics_daily/);
  assert.match(analytics, /90/);
  assert.match(analytics, /record_progression_event/);
  assert.match(analytics, /GRANT EXECUTE ON FUNCTION public\.record_progression_event/);
  assert.match(destinationSurface, /surface IN \('\', 'studio', 'progression'/);
  assert.match(destinationSurface, /CREATE OR REPLACE FUNCTION public\.record_progression_event/);
});

test('progression presentation and guest claim copy keep authority and privacy boundaries visible', async () => {
  const [progression, page, game, shell, preferences] = await Promise.all([
    read('src/lib/ProfileProgression.svelte'),
    read('src/lib/ProgressionPage.svelte'),
    read('src/lib/Game.svelte'),
    read('src/lib/ProfileShell.svelte'),
    read('src/lib/AnalyticsPreferences.svelte')
  ]);

  assert.match(progression, /Keep the ritual/);
  assert.match(progression, /Find the strange/);
  assert.match(progression, /Color of the Week/);
  assert.match(progression, /server-authoritative/);
  assert.match(progression, /pageMode/);
  assert.match(page, /Progression that/);
  assert.match(page, /Your next chapter starts with a roll/);
  assert.match(game, /newProgressionUnlocks/);
  assert.match(game, /function beginGuestSignup/);
  assert.match(game, /clearGuestRoll\(\)/);
  assert.match(game, /This preview will not transfer/);
  assert.match(shell, /Recent unlocks/);
  assert.match(preferences, /90 days/);
  assert.doesNotMatch(game, /insert\(.*(?:progression|inventory)/s);
});
