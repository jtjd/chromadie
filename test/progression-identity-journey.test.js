import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createEmptyProgression, normalizeNewMilestones, normalizeProgressionData } from '../src/lib/progressionState.js';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('progression normalization preserves server-published journey lanes and weekly focus', () => {
  const progression = normalizeProgressionData({
    current_ep: 23_950_000,
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
  assert.equal(progression.journeyState, 'ready');
  assert.equal(progression.journeyByTrack.ritual[0].reward.name, 'Velvet Ink');
  assert.equal(progression.journeyByTrack.discovery[0].progress, null);
  assert.equal(progression.nextJourney.discovery.id, 'journey_rarity_rare');
  assert.equal(progression.weeklyFocus.targetHex, '#8B7CF6');
  assert.equal(progression.weeklyFocus.bonusEp, 50000);
  assert.deepEqual(normalizeNewMilestones([{ id: 'journey_roll_10', track: 'ritual', metric: 'achievement', achievement_id: 'roll_10', reward: { item_key: 'name_material_velvet_ink', name: 'Velvet Ink', slot: 'name_material' } }]).map(item => item.id), ['journey_roll_10']);
  assert.equal(normalizeProgressionData({ success: true, journey_state: 'empty', milestones: [] }).journeyState, 'empty');
  assert.equal(createEmptyProgression().journeyState, 'unavailable');
});

test('progression keeps approaching deterministic goals and parallel discoveries visible', async () => {
  const component = await read('src/lib/ProfileProgression.svelte');
  const reward = itemKey => ({ item_key: itemKey, name: itemKey, slot: 'expression' });
  const progression = normalizeProgressionData({
    total_rolls: 42,
    current_streak: 5,
    longest_streak: 9,
    milestones: [
      {
        id: 'journey_roll_10',
        name: 'Ten rolls',
        track: 'ritual',
        metric: 'achievement',
        progress_source: 'total_rolls',
        progress_target: 10,
        sort_order: 10,
        progress: { current: 10, target: 10, unit: 'rolls' },
        unlocked: true,
        reward: reward('ritual_ten')
      },
      {
        id: 'journey_streak_14',
        name: '14-day streak',
        track: 'ritual',
        metric: 'achievement',
        progress_source: 'longest_streak',
        progress_target: 14,
        sort_order: 20,
        progress: { current: 9, target: 14, unit: 'days' },
        unlocked: false,
        reward: reward('ritual_streak')
      },
      {
        id: 'journey_roll_50',
        name: '50 rolls',
        track: 'ritual',
        metric: 'achievement',
        progress_source: 'total_rolls',
        progress_target: 50,
        sort_order: 30,
        progress: { current: 42, target: 50, unit: 'rolls' },
        unlocked: false,
        reward: reward('ritual_fifty')
      },
      {
        id: 'journey_roll_100',
        name: '100 rolls',
        track: 'ritual',
        metric: 'achievement',
        progress_source: 'total_rolls',
        progress_target: 100,
        sort_order: 40,
        progress: { current: 42, target: 100, unit: 'rolls' },
        unlocked: false,
        reward: reward('ritual_hundred')
      },
      ...['rare', 'epic', 'anomaly'].map((name, index) => ({
        id: 'discovery_' + name,
        name,
        track: 'discovery',
        metric: 'achievement',
        sort_order: 10 + index * 10,
        unlocked: false,
        reward: reward('discovery_' + name)
      }))
    ]
  });

  const ritual = Object.fromEntries(progression.journeyByTrack.ritual.map(node => [node.id, node]));
  assert.equal(ritual.journey_streak_14.presentationState, 'active');
  assert.equal(ritual.journey_roll_50.presentationState, 'future');
  assert.equal(ritual.journey_roll_50.progress.current, 42);
  assert.equal(ritual.journey_roll_100.presentationState, 'future');

  const discovery = progression.journeyByTrack.discovery;
  assert.equal(discovery.length, 3);
  assert.ok(discovery.every(node => node.presentationState === 'active'));
  assert.match(component, /if \(state === 'future'\) return 'future'/);
  assert.match(component, /activeNodes: lane\.id === 'discovery' \? activeNodes : activeNodes\.slice\(0, 2\)/);
});

test('the journey schema is additive, catalog-backed, and returned by the authoritative roll path', async () => {
  const [journey, goalContract, analytics, destinationSurface, rollResponse, rewardAccess, rewardAnalytics, seed] = await Promise.all([
    read('supabase/migrations/20260819160000_progression_identity_journey.sql'),
    read('supabase/migrations/20260819180000_progression_goal_contract.sql'),
    read('supabase/migrations/20260819161000_progression_aggregate_analytics.sql'),
    read('supabase/migrations/20260819170000_progression_destination_surface.sql'),
    read('supabase/migrations/20260819162000_progression_roll_response.sql'),
    read('supabase/migrations/20260819200000_progression_reward_access_contract.sql'),
    read('supabase/migrations/20260819210000_progression_analytics_semantics.sql'),
    read('supabase/seed.sql')
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
  assert.match(goalContract, /progress_source/);
  assert.match(goalContract, /progress_target/);
  assert.match(goalContract, /journey_streak_14/);
  assert.match(goalContract, /journey_streak_100/);
  assert.match(goalContract, /journey_high_contrast/);
  assert.match(goalContract, /journey_greyscale/);
  assert.match(goalContract, /journey_roll_prime/);
  assert.match(goalContract, /'journey_state', v_journey_state/);
  assert.doesNotMatch(goalContract, /m\.achievement_id IN/);
  assert.match(rollResponse, /roll_die_impl_progression_base/);
  assert.match(rollResponse, /new_progression_unlocks/);
  assert.match(analytics, /progression_analytics_daily/);
  assert.match(analytics, /90/);
  assert.match(analytics, /record_progression_event/);
  assert.match(analytics, /GRANT EXECUTE ON FUNCTION public\.record_progression_event/);
  assert.match(destinationSurface, /surface IN \('', 'studio', 'progression'/);
  assert.match(destinationSurface, /CREATE OR REPLACE FUNCTION public\.record_progression_event/);
  assert.match(rewardAccess, /access_tier = 'earned'/);
  assert.match(rewardAccess, /equipped_cosmetics/);
  assert.match(rewardAccess, /free_baseline_count/);
  assert.match(rewardAnalytics, /progression_goal_viewed/);
  assert.doesNotMatch(rewardAnalytics, /PERFORM public\.cleanup_profile_view_daily/);
  assert.match(rewardAnalytics, /auth\.role\(\) = 'anon'/);
  assert.match(seed, /progression_milestones AS milestone/);
  assert.match(seed, /item_key NOT IN \('name_prism_atelier', 'bg_prism_atmosphere'\)/);
});

test('progression presentation and guest claim copy keep authority and privacy boundaries visible', async () => {
  const [progression, state, overview, page, game, preRoll, shell, preferences] = await Promise.all([
    read('src/lib/ProfileProgression.svelte'),
    read('src/lib/progressionState.js'),
    read('src/lib/ProfileStudioOverview.svelte'),
    read('src/lib/ProgressionPage.svelte'),
    read('src/lib/Game.svelte'),
    read('src/lib/RollPreRoll.svelte'),
    read('src/lib/ProfileShell.svelte'),
    read('src/lib/AnalyticsPreferences.svelte')
  ]);

  assert.match(state, /Ritual/);
  assert.match(state, /Discovery/);
  assert.match(progression, /Find it whenever it appears/);
  assert.match(progression, /journeyState/);
  assert.doesNotMatch(progression, /0\/0/);
  assert.match(progression, /Your profile story/);
  assert.match(progression, /Today's direction/);
  assert.match(progression, /Build mastery/);
  assert.match(progression, /Find rare colors/);
  assert.match(progression, /Each discovery is independent/);
  assert.match(progression, /Cosmetics earned/);
  assert.doesNotMatch(progression, /No history yet/);
  assert.match(overview, /Some goals unavailable/);
  assert.match(progression, /Weekly color/);
  assert.match(progression, /IntersectionObserver/);
  assert.match(progression, /progression_goal_viewed/);
  assert.doesNotMatch(progression, /recordUnlockSeen/);
  assert.match(progression, /verified on the server/);
  assert.match(progression, /pageMode/);
  assert.doesNotMatch(page, /Your profile \/ progression/);
  assert.match(page, /Progress belongs to your profile/);
  assert.doesNotMatch(page, /progression-page__ambient|progression-page__hero|Season 1|season 1/i);
  assert.doesNotMatch(progression, /color-mix\(in srgb,var\(--color-accent/);
  assert.match(game, /newProgressionUnlocks/);
  assert.match(game, /function beginGuestSignup/);
  assert.match(game, /clearGuestRoll\(\)/);
  assert.match(game, /Save future rolls and earn EP/);
  assert.match(preRoll, /Sign up/);
  assert.match(preRoll, /to save your roll\./);
  assert.match(shell, /Recent unlocks/);
  assert.match(preferences, /90 days/);
  assert.doesNotMatch(game, /insert\(.*(?:progression|inventory)/s);
});

test('progression visual treatment keeps state neutral and previews canonical cosmetics', async () => {
  const [progression, page, board, rewardPreview, pathIcon, tokens, smoke] = await Promise.all([
    read('src/lib/ProfileProgression.svelte'),
    read('src/lib/ProgressionPage.svelte'),
    read('src/lib/ProgressionPageBoard.svelte'),
    read('src/lib/ProgressionRewardPreview.svelte'),
    read('src/lib/ProgressionPathIcon.svelte'),
    read('src/styles/tokens.css'),
    read('scripts/browser/progression-smoke.mjs')
  ]);

  assert.match(tokens, /--color-state-active/);
  assert.match(tokens, /--shadow-state-card/);
  assert.match(board, /profile-progression-rank__badge-label/);
  assert.match(progression, /profile-progression-color-chip/);
  assert.match(rewardPreview, /REWARD_TYPE_LABELS/);
  assert.match(rewardPreview, /NON_PREVIEWABLE_SLOTS/);
  assert.match(rewardPreview, /progression-reward-preview__category-card/);
  assert.match(rewardPreview, /progression-reward-preview__type/);
  assert.doesNotMatch(rewardPreview, /Preview unavailable/);
  assert.match(board, /formatCompactNumber/);
  assert.match(board, /profile-progression-lane__toggle/);
  assert.match(board, /function toggleLane/);
  assert.match(board, /laneMilestoneCopy/);
  assert.match(board, /profile-progression-section-heading--page/);
  assert.match(board, /profile-progression-rank__badge-label/);
  assert.match(progression, /profile-progression-surface--page \{[^}]*border-radius:0!important/);
  assert.match(board, /function laneAccent/);
  assert.match(progression, /profile-progression-surface--page \{[^}]*padding:0!important; border:0!important;[^}]*background:transparent!important/);
  assert.match(board, /profile-progression-page-grid/);
  assert.match(board, /profile-progression-page-main/);
  assert.match(board, /profile-progression-page-side/);
  assert.match(board, /progression-page__roll-card/);
  assert.match(board, /viewBox="0 0 24 24"[^>]*aria-hidden="true"[^>]*focusable="false"><g transform="rotate\(-18 8\.2 8\.2\)"/);
  assert.match(board, /profile-progression-stat__icon \{[^}]*width:1\.8rem; height:1\.8rem/);
  assert.match(board, /profile-progression-weekly__page-copy/);
  const rankMarkup = progression.slice(progression.indexOf('Rank · Build mastery'), progression.indexOf('Rank · Build mastery') + 180);
  assert.doesNotMatch(rankMarkup, /profile-progression-color-chip/);
  assert.match(board, /ProgressionPathIcon/);
  assert.match(progression, /profile-progression-rank__ring-value[^}]*var\(--progression-accent/);
  assert.match(page, /--progression-accent/);
  assert.match(page, /progression-page__composition/);
  assert.doesNotMatch(page, /radial-gradient|linear-gradient/);
  assert.doesNotMatch(progression, /radial-gradient/);
  assert.match(page, /--progression-accent-light/);
  assert.match(page, /progression-page__color-chip/);
  assert.match(page, /progression-page__streak-strip/);
  assert.match(page, /class="progression-page__streak-day" class:progression-page__streak-day--active/);
  assert.match(page, /progression-page__streak-day \{[^}]*flex:0 0 7px;[^}]*width:7px;[^}]*height:7px;[^}]*aspect-ratio:1/);
  assert.match(page, /dailyRollData = dailyRoll\.data \|\| null/);
  assert.match(page, /hasRolledToday/);
  assert.match(page, /progression-page__roll-status/);
  assert.match(board, /progression-page__rail-details/);
  assert.match(board, /View full roll/);
  assert.match(board, /Scoring signals/);
  assert.doesNotMatch(board, /Next milestone/);
  assert.match(board, /this week’s color/);
  assert.match(page, /currentStreak}-day streak/);
  assert.match(rewardPreview, /onMount/);
  assert.match(rewardPreview, /progression-reward-preview__thumbnail/);
  assert.match(rewardPreview, /flex-basis:min\(8\.5rem,46%\)/);
  assert.match(board, /presentation="wide"/);
  assert.match(board, /flat=\{true\}/);
  assert.match(board, /grid-template-columns:minmax\(0,1fr\)/);
  assert.match(rewardPreview, /grayscale\(1\)/);
  assert.doesNotMatch(rewardPreview, /Preview reward/);
  assert.match(pathIcon, /normalizedTrack === 'rank'/);
  assert.match(pathIcon, /normalizedTrack === 'ritual'/);
  assert.match(pathIcon, /track === 'discovery'/);
  assert.match(smoke, /progression-reward-preview__trigger/);
});
