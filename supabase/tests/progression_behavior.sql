\set ON_ERROR_STOP on

-- Executable progression behavior checks. The suite is transactional and uses
-- isolated Auth/profile fixtures so it can run against a reset local database
-- without leaving account, inventory, or analytics rows behind.
BEGIN;

CREATE OR REPLACE FUNCTION pg_temp.progression_assert(condition boolean, message text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF condition IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'PROGRESSION ASSERTION FAILED: %', message;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION pg_temp.progression_expect_error(statement text, message text)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_failed boolean := false;
BEGIN
  BEGIN
    EXECUTE statement;
  EXCEPTION WHEN OTHERS THEN
    v_failed := true;
  END;
  IF NOT v_failed THEN
    RAISE EXCEPTION 'PROGRESSION ASSERTION FAILED: %', message;
  END IF;
END;
$$;

INSERT INTO auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at, is_anonymous
)
VALUES
  (
    '20000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated',
    'progression-database-a@example.test', '', now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"username":"progdb_a"}'::jsonb,
    now() - interval '4 years', now(), false
  ),
  (
    '20000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated',
    'progression-database-b@example.test', '', now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"username":"progdb_b"}'::jsonb,
    now() - interval '4 years', now(), false
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (
  id, username, created_at, current_streak, longest_streak,
  lifetime_ep, total_rolls, equipped_cosmetics
)
VALUES
  (
    '20000000-0000-0000-0000-000000000001', 'progdb_a',
    now() - interval '4 years', 0, 0, 0, 0, '{}'::jsonb
  ),
  (
    '20000000-0000-0000-0000-000000000002', 'progdb_b',
    now() - interval '4 years', 0, 0, 0, 0, '{}'::jsonb
  )
ON CONFLICT (id) DO UPDATE SET
  username = EXCLUDED.username,
  created_at = EXCLUDED.created_at,
  current_streak = 0,
  longest_streak = 0,
  lifetime_ep = 0,
  total_rolls = 0,
  equipped_cosmetics = '{}'::jsonb;

DELETE FROM public.user_progression_milestones
WHERE user_id IN (
  '20000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000002'
);
DELETE FROM public.user_achievements
WHERE user_id IN (
  '20000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000002'
);
DELETE FROM public.inventory
WHERE user_id IN (
  '20000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000002'
);
DELETE FROM public.profile_notifications
WHERE user_id IN (
  '20000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000002'
);

SELECT set_config(
  'request.jwt.claims',
  '{"sub":"20000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);

-- A published earned reward is unavailable before its authoritative counter
-- is reached. The owner read also reports it as locked.
SELECT pg_temp.progression_assert(
  NOT EXISTS (
    SELECT 1
    FROM jsonb_array_elements(public.get_my_progression()->'milestones') AS item
    WHERE item->>'id' = 'journey_roll_10'
      AND (item->>'unlocked')::boolean
  ),
  'locked_before_earned'
);
SELECT pg_temp.progression_assert(
  (public.equip_item('name_material_velvet_ink')->>'success') = 'false',
  'locked earned reward could be equipped before acquisition'
);

UPDATE public.profiles
SET total_rolls = 10,
    current_streak = 0,
    longest_streak = 0
WHERE id = '20000000-0000-0000-0000-000000000001';

DO $eligible_grant$
DECLARE
  v_result jsonb;
BEGIN
  v_result := public.grant_progression_milestones('20000000-0000-0000-0000-000000000001');
  PERFORM pg_temp.progression_assert(
    v_result @> '[{"id":"journey_roll_10"}]'::jsonb,
    'eligible_grant did not return the newly earned milestone'
  );
  PERFORM pg_temp.progression_assert(
    EXISTS (
      SELECT 1
      FROM public.user_progression_milestones
      WHERE user_id = '20000000-0000-0000-0000-000000000001'
        AND milestone_id = 'journey_roll_10'
        AND unlock_source = 'live'
        AND acknowledged_at IS NULL
    ),
    'eligible_grant did not write live ledger provenance'
  );
  PERFORM pg_temp.progression_assert(
    EXISTS (
      SELECT 1
      FROM public.inventory
      WHERE user_id = '20000000-0000-0000-0000-000000000001'
        AND item_key = 'name_material_velvet_ink'
        AND quantity = 1
    ),
    'eligible_grant did not write inventory ownership'
  );
  PERFORM pg_temp.progression_assert(
    EXISTS (
      SELECT 1
      FROM public.profile_notifications
      WHERE user_id = '20000000-0000-0000-0000-000000000001'
        AND event_key = 'reward:milestone:journey_roll_10'
    ),
    'live grant did not queue a progression notification'
  );
END;
$eligible_grant$;

DO $duplicate_grant$
DECLARE
  v_result jsonb;
BEGIN
  v_result := public.grant_progression_milestones('20000000-0000-0000-0000-000000000001');
  PERFORM pg_temp.progression_assert(
    jsonb_array_length(v_result) = 0,
    'duplicate_grant emitted a second unlock'
  );
  PERFORM pg_temp.progression_assert(
    (SELECT quantity = 1 FROM public.inventory
     WHERE user_id = '20000000-0000-0000-0000-000000000001'
       AND item_key = 'name_material_velvet_ink'),
    'duplicate_grant duplicated inventory quantity'
  );
END;
$duplicate_grant$;

-- The grant path repairs inventory even when the durable ledger already
-- exists, without creating a new presentation event.
DELETE FROM public.inventory
WHERE user_id = '20000000-0000-0000-0000-000000000001'
  AND item_key = 'name_material_velvet_ink';
DO $inventory_repair$
DECLARE
  v_result jsonb;
BEGIN
  v_result := public.grant_progression_milestones('20000000-0000-0000-0000-000000000001');
  PERFORM pg_temp.progression_assert(jsonb_array_length(v_result) = 0, 'inventory_repair emitted a duplicate unlock');
  PERFORM pg_temp.progression_assert(
    EXISTS (
      SELECT 1 FROM public.inventory
      WHERE user_id = '20000000-0000-0000-0000-000000000001'
        AND item_key = 'name_material_velvet_ink'
        AND quantity >= 1
    ),
    'inventory_repair did not restore ownership'
  );
END;
$inventory_repair$;

SELECT pg_temp.progression_assert(
  (public.equip_item('name_material_velvet_ink')->>'success') = 'true',
  'earned reward could not be equipped after grant'
);

DO $presentation$
DECLARE
  v_present jsonb;
  v_present_again jsonb;
  v_ack jsonb;
  v_ack_again jsonb;
BEGIN
  v_present := public.present_progression_unlocks(ARRAY['journey_roll_10']);
  v_present_again := public.present_progression_unlocks(ARRAY['journey_roll_10']);
  v_ack := public.acknowledge_progression_unlocks(ARRAY['journey_roll_10']);
  v_ack_again := public.acknowledge_progression_unlocks(ARRAY['journey_roll_10']);
  PERFORM pg_temp.progression_assert((v_present->>'presented')::integer = 1, 'present_progression_unlocks did not transition once');
  PERFORM pg_temp.progression_assert((v_present_again->>'presented')::integer = 0, 'present_progression_unlocks was not idempotent');
  PERFORM pg_temp.progression_assert((v_ack->>'acknowledged')::integer = 1, 'acknowledge_progression_unlocks did not transition once');
  PERFORM pg_temp.progression_assert((v_ack_again->>'acknowledged')::integer = 0, 'acknowledge_progression_unlocks was not idempotent');
END;
$presentation$;

-- Historical reconciliation uses monotonic counters, including longest_streak
-- rather than the resettable current_streak, and acknowledges backfilled rows.
UPDATE public.profiles
SET total_rolls = 1095,
    current_streak = 0,
    longest_streak = 14,
    created_at = now() - interval '4 years'
WHERE id = '20000000-0000-0000-0000-000000000002';
INSERT INTO public.user_achievements (user_id, achievement_id, unlocked_at)
VALUES (
  '20000000-0000-0000-0000-000000000002',
  'greyscale',
  now() - interval '3 years'
)
ON CONFLICT DO NOTHING;
INSERT INTO public.user_achievements (user_id, achievement_id, unlocked_at)
VALUES (
  '20000000-0000-0000-0000-000000000002',
  'streak_14',
  now() - interval '2 years'
)
ON CONFLICT DO NOTHING;
-- The achievement trigger is unrelated to progression notification delivery;
-- clear its fixture row so the assertion below isolates the ledger trigger.
DELETE FROM public.profile_notifications
WHERE user_id = '20000000-0000-0000-0000-000000000002';

SELECT set_config('request.jwt.claims', '{"role":"service_role"}', true);
SELECT pg_temp.progression_assert(
  (public.reconcile_progression_account('20000000-0000-0000-0000-000000000002')->>'success') = 'true',
  'historical_backfill RPC failed'
);
SELECT pg_temp.progression_assert(
  EXISTS (
    SELECT 1
    FROM public.user_progression_milestones
    WHERE user_id = '20000000-0000-0000-0000-000000000002'
      AND milestone_id = 'journey_roll_1095'
      AND unlock_source = 'historical_backfill'
      AND acknowledged_at IS NOT NULL
  ),
  'historical_backfill did not grant the 1,095-roll capstone'
);
SELECT pg_temp.progression_assert(
  EXISTS (
    SELECT 1
    FROM public.user_progression_milestones
    WHERE user_id = '20000000-0000-0000-0000-000000000002'
      AND milestone_id = 'journey_streak_14'
  ),
  'historical_backfill ignored longest_streak'
);
SELECT pg_temp.progression_assert(
  (
    SELECT ledger.unlocked_at = achievement.unlocked_at
    FROM public.user_progression_milestones AS ledger
    JOIN public.user_achievements AS achievement
      ON achievement.user_id = ledger.user_id
     AND achievement.achievement_id = 'streak_14'
    WHERE ledger.user_id = '20000000-0000-0000-0000-000000000002'
      AND ledger.milestone_id = 'journey_streak_14'
  ),
  'historical_backfill discarded the durable streak achievement timestamp'
);
SELECT pg_temp.progression_assert(
  EXISTS (
    SELECT 1
    FROM public.user_progression_milestones
    WHERE user_id = '20000000-0000-0000-0000-000000000002'
      AND milestone_id = 'journey_greyscale'
      AND unlock_source = 'historical_backfill'
  ),
  'unpublished greyscale history was not preserved'
);
SELECT pg_temp.progression_assert(
  NOT EXISTS (
    SELECT 1
    FROM public.profile_notifications
    WHERE user_id = '20000000-0000-0000-0000-000000000002'
      AND event_key LIKE 'reward:milestone:%'
  ),
  'historical_backfill queued a false progression notification'
);
DELETE FROM public.inventory
WHERE user_id = '20000000-0000-0000-0000-000000000002'
  AND item_key = 'border_chroma';
SELECT pg_temp.progression_assert(
  (public.reconcile_progression_account('20000000-0000-0000-0000-000000000002')->>'success') = 'true',
  'historical reconciliation rerun failed'
);
SELECT pg_temp.progression_assert(
  (SELECT quantity >= 1 FROM public.inventory
   WHERE user_id = '20000000-0000-0000-0000-000000000002'
     AND item_key = 'border_chroma'),
  'historical reconciliation did not repair missing inventory idempotently'
);
SELECT pg_temp.progression_assert(
  (SELECT count(*) = 1 FROM public.user_progression_milestones
   WHERE user_id = '20000000-0000-0000-0000-000000000002'
     AND milestone_id = 'journey_roll_1095'),
  'historical reconciliation duplicated the durable ledger row'
);
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"20000000-0000-0000-0000-000000000002","role":"authenticated"}',
  true
);
SELECT pg_temp.progression_assert(
  NOT EXISTS (
    SELECT 1
    FROM jsonb_array_elements(public.get_my_progression()->'milestones') AS item
    WHERE item->>'id' = 'journey_greyscale'
  ),
  'unpublished greyscale goal leaked into the published journey'
);

-- Catalog and mapping contracts fail closed after a reward has been authored
-- and granted.
SELECT pg_temp.progression_expect_error(
  $$UPDATE public.shop_items SET access_tier = 'free' WHERE item_key = 'cursor_trail_color_memory'$$,
  'progression_catalog_contract'
);
SELECT pg_temp.progression_expect_error(
  $$UPDATE public.progression_milestones SET reward_item_key = 'border_signal' WHERE id = 'journey_roll_10'$$,
  'reward_mapping_immutable'
);

SELECT pg_temp.progression_assert(
  NOT has_function_privilege('anon', 'public.grant_progression_milestones(uuid)', 'EXECUTE')
    AND NOT has_function_privilege('authenticated', 'public.grant_progression_milestones(uuid)', 'EXECUTE')
    AND has_function_privilege('service_role', 'public.reconcile_progression_account(uuid)', 'EXECUTE')
    AND NOT has_function_privilege('anon', 'public.reconcile_progression_account(uuid)', 'EXECUTE')
    AND NOT has_function_privilege('authenticated', 'public.reconcile_progression_account(uuid)', 'EXECUTE')
    AND has_function_privilege('authenticated', 'public.present_progression_unlocks(text[])', 'EXECUTE')
    AND NOT has_function_privilege('anon', 'public.present_progression_unlocks(text[])', 'EXECUTE')
    AND has_function_privilege('authenticated', 'public.acknowledge_progression_unlocks(text[])', 'EXECUTE')
    AND NOT has_function_privilege('anon', 'public.record_progression_event(text,text,text,text,text)', 'EXECUTE')
    AND NOT has_function_privilege('anon', 'public.prevent_progression_reward_remap()', 'EXECUTE')
    AND NOT has_function_privilege('authenticated', 'public.validate_progression_milestone_reward()', 'EXECUTE')
    AND NOT has_function_privilege('authenticated', 'public.validate_progression_catalog_item()', 'EXECUTE')
    AND NOT has_function_privilege('authenticated', 'public.notify_progression_milestone_unlock()', 'EXECUTE'),
  'progression RPC privileges crossed an authority boundary'
);

-- Privilege checks are backed by an in-function guard as well. This catches a
-- future grant regression when the SQL runner is operating as a superuser
-- with browser-shaped request claims.
SELECT pg_temp.progression_assert(
  (public.reconcile_progression_account('20000000-0000-0000-0000-000000000002')->>'reason') = 'service_only',
  'browser-shaped claims reached the service-only reconciler'
);
SELECT set_config('request.jwt.claims', '{"role":"service_role"}', true);
SELECT pg_temp.progression_assert(
  (public.reconcile_progression_account('20000000-0000-0000-0000-000000000002')->>'success') = 'true',
  'service-role reconciliation was rejected'
);
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"20000000-0000-0000-0000-000000000002","role":"authenticated"}',
  true
);

SELECT pg_temp.progression_assert(
  (public.record_progression_event('progression_viewed', 'progression', 'authenticated', 'all', 'ritual')->>'recorded') = 'true',
  'authenticated progression analytics write failed'
);

SELECT set_config(
  'request.jwt.claims',
  '{"sub":"20000000-0000-0000-0000-000000000002","role":"anon"}',
  true
);
SELECT pg_temp.progression_assert(
  (public.record_progression_event('progression_viewed', 'progression', 'guest', 'all', 'ritual')->>'reason') = 'authenticated_only',
  'anonymous progression analytics write was accepted'
);

-- Public proof is aggregate-only and bounded to two recent unlocks.
SELECT pg_temp.progression_assert(
  (jsonb_typeof(public.get_public_profile_story('20000000-0000-0000-0000-000000000002')->'progression_proof'->'completed_count') = 'number')
    AND jsonb_array_length(public.get_public_profile_story('20000000-0000-0000-0000-000000000002')->'progression_proof'->'recent_unlocks') <= 2,
  'public progression proof exceeded its bounded projection'
);

ROLLBACK;

\echo 'Progression database behavior checks passed.'
