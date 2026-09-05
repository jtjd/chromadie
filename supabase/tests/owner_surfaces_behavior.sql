\set ON_ERROR_STOP on

BEGIN;

CREATE OR REPLACE FUNCTION pg_temp.owner_surface_assert(condition boolean, message text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF condition IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'OWNER SURFACE ASSERTION FAILED: %', message;
  END IF;
END;
$$;

INSERT INTO auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, is_anonymous)
VALUES
  ('21000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'owner-surfaces-a@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{"username":"surface_a"}', now(), now(), false),
  ('21000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'owner-surfaces-b@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{"username":"surface_b"}', now(), now(), false),
  ('21000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'owner-surfaces-c@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{"username":"surface_c"}', now(), now(), false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, username, display_name, created_at, current_streak, longest_streak, lifetime_ep, total_rolls, equipped_cosmetics)
VALUES
  ('21000000-0000-4000-8000-000000000001', 'surface_a', 'Surface A', now() - interval '1 year', 3, 5, 0, 0, '{}'),
  ('21000000-0000-4000-8000-000000000002', 'surface_b', 'Surface B', now() - interval '1 year', 4, 6, 0, 0, '{}'),
  ('21000000-0000-4000-8000-000000000003', 'surface_c', 'Surface C', now() - interval '1 year', 5, 7, 0, 0, '{}')
ON CONFLICT (id) DO UPDATE SET username = EXCLUDED.username, display_name = EXCLUDED.display_name;

INSERT INTO public.profile_events (user_id, event_key, event_type, occurred_at, payload)
SELECT
  '21000000-0000-4000-8000-000000000001',
  'owner-surface-roll:' || value,
  'roll',
  now() - (value || ' days')::interval,
  jsonb_build_object('hex', '#123ABC', 'score', value * 100, 'rarity', 'Common', 'identity', 'Test color', 'conditionIds', jsonb_build_array('sum_even', CASE WHEN value % 2 = 0 THEN 'web_safe' ELSE 'sum_odd' END))
FROM generate_series(1, 45) AS value;

SELECT set_config('request.jwt.claims', '{"sub":"21000000-0000-4000-8000-000000000001","role":"authenticated"}', true);

SELECT pg_temp.owner_surface_assert(
  jsonb_array_length(public.get_my_profile_history()->'items') = 40
    AND (public.get_my_profile_history()->>'hasMore')::boolean,
  'history was not bounded to a keyset page of 40'
);

SELECT pg_temp.owner_surface_assert(
  EXISTS (
    SELECT 1 FROM jsonb_array_elements(public.get_my_condition_collection()->'items') AS item
    WHERE item->>'id' = 'sum_even' AND (item->>'count')::integer = 45
  ),
  'condition collection did not aggregate durable roll events'
);

INSERT INTO public.scores (user_id, hex_code, score, rarity, roll_date, score_version, condition_ids, contributors, traits, identity)
VALUES
  ('21000000-0000-4000-8000-000000000002', '#AABBCC', 50000, 'Rare', public.game_utc_date(), 6, '[]', '[]', '[]', 'Private activity'),
  ('21000000-0000-4000-8000-000000000003', '#BBCCDD', 60000, 'Rare', public.game_utc_date(), 6, '[]', '[]', '[]', 'Blocked activity');

INSERT INTO public.profile_social_settings (user_id, activity_visible)
VALUES ('21000000-0000-4000-8000-000000000002', false)
ON CONFLICT (user_id) DO UPDATE SET activity_visible = false;

INSERT INTO public.user_follows (follower_id, followee_id)
VALUES
  ('21000000-0000-4000-8000-000000000001', '21000000-0000-4000-8000-000000000002'),
  ('21000000-0000-4000-8000-000000000001', '21000000-0000-4000-8000-000000000003');

INSERT INTO public.profile_blocks (blocker_id, blocked_id)
VALUES ('21000000-0000-4000-8000-000000000003', '21000000-0000-4000-8000-000000000001');

SELECT pg_temp.owner_surface_assert(
  jsonb_array_length(public.get_my_rivals()->'items') = 2
    AND EXISTS (
      SELECT 1 FROM jsonb_array_elements(public.get_my_rivals()->'items') AS item
      WHERE item->>'userId' = '21000000-0000-4000-8000-000000000002'
        AND item->'todayRoll' = 'null'::jsonb
    )
    AND EXISTS (
      SELECT 1 FROM jsonb_array_elements(public.get_my_rivals()->'items') AS item
      WHERE item->>'userId' = '21000000-0000-4000-8000-000000000003'
        AND (item->>'inaccessible')::boolean
        AND item->'username' = 'null'::jsonb
    ),
  'rivals projection crossed an activity or block privacy boundary'
);

SELECT pg_temp.owner_surface_assert(
  (public.toggle_follow('21000000-0000-4000-8000-000000000003')->>'action') = 'unfollowed',
  'blocked rival could not be removed'
);

SELECT pg_temp.owner_surface_assert(
  has_function_privilege('authenticated', 'public.get_my_profile_history(timestamptz,uuid,integer)', 'EXECUTE')
    AND NOT has_function_privilege('anon', 'public.get_my_profile_history(timestamptz,uuid,integer)', 'EXECUTE')
    AND has_function_privilege('authenticated', 'public.get_my_condition_collection()', 'EXECUTE')
    AND NOT has_function_privilege('anon', 'public.get_my_condition_collection()', 'EXECUTE')
    AND has_function_privilege('authenticated', 'public.get_my_rivals()', 'EXECUTE')
    AND NOT has_function_privilege('anon', 'public.get_my_rivals()', 'EXECUTE'),
  'owner RPC grants crossed the authenticated boundary'
);

ROLLBACK;

\echo 'Owner surface database behavior checks passed.'
