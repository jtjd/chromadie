import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('the final progression migration defines one authoritative acquisition contract', async () => {
  const migration = await read('supabase/migrations/20260820000000_progression_core_system.sql');

  for (const token of [
    'published boolean NOT NULL DEFAULT true',
    'expected_rolls bigint',
    "pace_band text NOT NULL DEFAULT 'days'",
    "progress_source IN ('lifetime_ep', 'total_rolls', 'longest_streak', 'achievement')",
    "'journey_roll_730'",
    "'journey_roll_1095'",
    "'journey_greyscale'",
    "published = false",
    "'cursor_trail_color_memory'",
    "'border_chroma'",
    'user_progression_milestones_unlock_source_check',
    'presented_at timestamptz',
    'acknowledged_at timestamptz',
    'CREATE OR REPLACE FUNCTION public.reconcile_progression_account',
    'CREATE OR REPLACE FUNCTION public.present_progression_unlocks',
    'CREATE OR REPLACE FUNCTION public.acknowledge_progression_unlocks',
    'prevent_progression_reward_remap',
    'validate_progression_catalog_item',
    "GRANT EXECUTE ON FUNCTION public.reconcile_progression_account(uuid) TO service_role",
    "GRANT EXECUTE ON FUNCTION public.record_progression_event(text, text, text, text, text) TO authenticated, service_role"
  ]) {
    assert.match(migration, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), token);
  }

  assert.match(migration, /WHEN 'longest_streak' THEN COALESCE\(v_longest_streak/);
  assert.match(migration, /WHEN 'achievement' THEN EXISTS \(/);
  assert.match(migration, /AND m\.published/);
  assert.match(migration, /DO UPDATE\s+SET quantity = GREATEST\(public\.inventory\.quantity, 1\)/s);
  assert.match(migration, /authenticated_only/);
  assert.doesNotMatch(migration, /PERFORM public\.cleanup_profile_view_daily\(\)/);

  await assert.rejects(
    access(new URL('../supabase/migrations/20260820000001_progression_core_system.sql', import.meta.url))
  );
});

test('the executable progression SQL test covers authority, backfill, presentation, and privacy', async () => {
  const sql = await read('supabase/tests/progression_behavior.sql');

  for (const token of [
    'locked_before_earned',
    'eligible_grant',
    'duplicate_grant',
    'inventory_repair',
    'historical_backfill',
    'progression_catalog_contract',
    'reward_mapping_immutable',
    'present_progression_unlocks',
    'acknowledge_progression_unlocks',
    'record_progression_event',
    'completed_count',
    'ROLLBACK'
  ]) {
    assert.match(sql, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), token);
  }
});

test('progression analytics quota stays private, bounded, and race-safe', async () => {
  const migration = await read('supabase/migrations/20260924120000_progression_analytics_account_quota.sql');
  const sql = await read('supabase/tests/progression_behavior.sql');
  assert.match(migration, /event_count integer NOT NULL CHECK \(event_count BETWEEN 1 AND 500\)/);
  assert.match(migration, /ENABLE ROW LEVEL SECURITY/);
  assert.match(migration, /ON public\.progression_analytics_user_daily_limit \(event_date\)/);
  assert.match(migration, /REVOKE ALL ON TABLE public\.progression_analytics_user_daily_limit FROM PUBLIC, anon, authenticated, service_role/);
  assert.match(migration, /WHERE public\.progression_analytics_user_daily_limit\.event_count < 500/);
  assert.match(migration, /'rate_limited'/);
  assert.match(migration, /DELETE FROM public\.progression_analytics_user_daily_limit/);
  assert.match(sql, /daily quota failed to reject without changing shared aggregates/);
});
