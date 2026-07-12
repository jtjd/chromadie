\set ON_ERROR_STOP on

BEGIN;

CREATE OR REPLACE FUNCTION pg_temp.audit_assert(condition boolean, message text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF condition IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'AUDIT ASSERTION FAILED: %', message;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION pg_temp.audit_expect_check(statement text, message text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  BEGIN
    EXECUTE statement;
    RAISE EXCEPTION 'AUDIT ASSERTION FAILED: %', message;
  EXCEPTION
    WHEN check_violation THEN NULL;
  END;
END;
$$;

SELECT pg_temp.audit_assert(
  NOT has_function_privilege('authenticated', 'public.grant_staff_test_ep(uuid,bigint)', 'EXECUTE'),
  'authenticated must not execute grant_staff_test_ep'
);
SELECT pg_temp.audit_assert(
  NOT has_function_privilege('authenticated', 'public.set_staff_status(uuid,boolean)', 'EXECUTE'),
  'authenticated must not execute set_staff_status'
);
SELECT pg_temp.audit_assert(
  has_function_privilege('service_role', 'public.grant_staff_test_ep(uuid,bigint)', 'EXECUTE'),
  'service_role must retain staff wallet administration'
);
SELECT pg_temp.audit_assert(
  NOT has_table_privilege('anon', 'public.scores', 'SELECT')
    AND NOT has_table_privilege('authenticated', 'public.scores', 'SELECT'),
  'browser roles must not read the score base table'
);
SELECT pg_temp.audit_assert(
  NOT has_table_privilege('anon', 'public.inventory', 'SELECT')
    AND NOT has_table_privilege('anon', 'public.user_achievements', 'SELECT')
    AND NOT has_table_privilege('anon', 'public.user_follows', 'SELECT'),
  'anonymous users must not read account-owned tables'
);
SELECT pg_temp.audit_assert(
  has_table_privilege('anon', 'public.active_seasonal_achievements', 'SELECT')
    AND NOT has_table_privilege('anon', 'public.active_seasonal_achievements', 'INSERT')
    AND NOT has_table_privilege('authenticated', 'public.active_seasonal_achievements', 'UPDATE'),
  'seasonal achievement view must be read-only'
);
SELECT pg_temp.audit_assert(
  (SELECT p.proconfig @> ARRAY['search_path=public']
   FROM pg_proc p
   WHERE p.oid = 'public.update_streak()'::regprocedure),
  'update_streak must have a fixed search_path'
);
SELECT pg_temp.audit_assert(
  has_function_privilege('authenticated', 'public.get_my_daily_roll()', 'EXECUTE')
    AND has_function_privilege('anon', 'public.get_public_profile_scores(uuid)', 'EXECUTE'),
  'bounded score projections must be available to intended roles'
);
SELECT pg_temp.audit_assert(
  NOT has_table_privilege('authenticated', 'public.profiles', 'INSERT')
    AND NOT has_table_privilege('authenticated', 'public.profiles', 'UPDATE')
    AND NOT has_table_privilege('authenticated', 'public.scores', 'INSERT')
    AND NOT has_table_privilege('authenticated', 'public.inventory', 'INSERT')
    AND NOT has_table_privilege('authenticated', 'public.user_achievements', 'INSERT')
    AND NOT has_table_privilege('authenticated', 'public.user_follows', 'INSERT'),
  'authenticated users must not directly mutate competitive/account tables'
);
SELECT pg_temp.audit_assert(
  to_regprocedure('public.admin_bump_shop_version()') IS NULL
    AND to_regprocedure('public.admin_randomize_cotw()') IS NULL
    AND to_regprocedure('public.admin_trigger_cotw_test()') IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'profiles'
        AND column_name IN ('bio', 'is_admin', 'force_cotw_next_roll')
    ),
  'legacy admin/test profile surface must be removed'
);
SELECT pg_temp.audit_assert(
  position('force_cotw' IN pg_get_functiondef('public.roll_die_impl_pre_audit(boolean)'::regprocedure)) = 0
    AND position('user_daily_reward_claims' IN pg_get_functiondef('public.roll_die_impl_pre_audit(boolean)'::regprocedure)) > 0
    AND position('NOT p_is_reroll' IN pg_get_functiondef('public.roll_die_impl_pre_audit(boolean)'::regprocedure)) > 0,
  'competitive roll function retained a forced or repeatable reward path'
);

CREATE TEMP TABLE audit_results (name text PRIMARY KEY, payload jsonb);

SELECT set_config('request.jwt.claims', '{"role":"anon"}', true);
INSERT INTO audit_results VALUES ('guest_roll', public.roll_die(false));
SELECT pg_temp.audit_assert(
  (SELECT payload->>'is_anon' = 'true' FROM audit_results WHERE name = 'guest_roll'),
  'anonymous roll must remain anonymous'
);
SELECT pg_temp.audit_assert((SELECT count(*) = 0 FROM public.scores), 'guest roll wrote a score');

INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  '10000000-0000-0000-0000-000000000002',
  'authenticated', 'authenticated', 'audit-recovery@example.invalid', '', now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"username":"audit_recovery"}'::jsonb, now(), now()
);
DELETE FROM public.profiles WHERE id = '10000000-0000-0000-0000-000000000002';
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000002","role":"authenticated"}',
  true
);
INSERT INTO audit_results VALUES ('profile_recovery', public.get_my_profile()::jsonb);
SELECT pg_temp.audit_assert(
  (SELECT payload->>'id' = '10000000-0000-0000-0000-000000000002'
      AND payload->>'username' = 'audit_recovery'
   FROM audit_results WHERE name = 'profile_recovery'),
  'authenticated user did not recover a missing profile'
);

INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  '10000000-0000-0000-0000-000000000001',
  'authenticated', 'authenticated', 'audit-one@example.invalid', '', now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"username":"audit_one"}'::jsonb, now(), now()
);

SELECT set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);
INSERT INTO audit_results VALUES ('first_roll', public.roll_die(false));
SELECT pg_temp.audit_assert(
  (SELECT payload->>'success' = 'true' AND payload->>'is_anon' = 'false' FROM audit_results WHERE name = 'first_roll'),
  'authenticated roll failed'
);
SELECT pg_temp.audit_assert(
  (SELECT total_rolls = 1 FROM public.profiles WHERE id = '10000000-0000-0000-0000-000000000001'),
  'durable roll counter did not increment'
);
SELECT pg_temp.audit_assert(
  (SELECT contributors <> '[]'::jsonb AND identity <> '' FROM public.scores WHERE user_id = '10000000-0000-0000-0000-000000000001'),
  'authoritative presentation was not stored'
);
SELECT pg_temp.audit_assert(
  (SELECT s.condition_ids = r.payload->'badges'
   FROM public.scores s
   JOIN audit_results r ON r.name = 'first_roll'
   WHERE s.user_id = '10000000-0000-0000-0000-000000000001'),
  'stored badges differ from the authoritative roll response'
);

INSERT INTO audit_results VALUES ('restored_roll', public.roll_die(false));
SELECT pg_temp.audit_assert(
  (SELECT restored.payload->>'already_rolled' = 'true'
      AND restored.payload->'badges' = original.payload->'badges'
   FROM audit_results restored, audit_results original
   WHERE restored.name = 'restored_roll' AND original.name = 'first_roll')
    AND (SELECT total_rolls = 1 FROM public.profiles
         WHERE id = '10000000-0000-0000-0000-000000000001'),
  'daily roll restoration changed presentation or progression'
);
SELECT pg_temp.audit_expect_check(
  'UPDATE public.profiles SET reroll_shards = -1 WHERE id = ''10000000-0000-0000-0000-000000000001''',
  'negative reroll shards were accepted'
);
SELECT pg_temp.audit_expect_check(
  'UPDATE public.scores SET score = -1 WHERE user_id = ''10000000-0000-0000-0000-000000000001''',
  'negative score was accepted'
);

INSERT INTO audit_results
SELECT 'challenge_mismatch', public.create_challenge(
  s.user_id, s.score + 1, s.hex_code
)
FROM public.scores s
WHERE s.user_id = '10000000-0000-0000-0000-000000000001';
SELECT pg_temp.audit_assert(
  (SELECT payload->>'success' = 'false' FROM audit_results WHERE name = 'challenge_mismatch'),
  'fabricated challenge was accepted'
);

INSERT INTO audit_results
SELECT 'challenge_valid', public.create_challenge(s.user_id, s.score, s.hex_code)
FROM public.scores s
WHERE s.user_id = '10000000-0000-0000-0000-000000000001';
INSERT INTO audit_results
SELECT 'challenge_repeat', public.create_challenge(s.user_id, s.score, s.hex_code)
FROM public.scores s
WHERE s.user_id = '10000000-0000-0000-0000-000000000001';
SELECT pg_temp.audit_assert(
  (SELECT a.payload->'challenge'->>'id' = b.payload->'challenge'->>'id'
   FROM audit_results a, audit_results b
   WHERE a.name = 'challenge_valid' AND b.name = 'challenge_repeat'),
  'challenge creation is not idempotent'
);

UPDATE public.scores
SET score = 9000000000, hex_code = '#ABCDEF', rarity = 'Mythic'
WHERE user_id = '10000000-0000-0000-0000-000000000001' AND roll_date = public.game_utc_date();
INSERT INTO public.user_roll_best_candidates (user_id, roll_date, score, hex_code, rarity)
VALUES ('10000000-0000-0000-0000-000000000001', public.game_utc_date(), 9000000000, '#ABCDEF', 'Mythic')
ON CONFLICT (user_id, roll_date) DO UPDATE
SET score = EXCLUDED.score, hex_code = EXCLUDED.hex_code, rarity = EXCLUDED.rarity;
UPDATE public.profiles
SET best_roll_score = 9000000000, best_roll_hex = '#ABCDEF', best_roll_rarity = 'Mythic',
    reroll_shards = 1, ep_spent = lifetime_ep
WHERE id = '10000000-0000-0000-0000-000000000001';

INSERT INTO audit_results VALUES ('reroll', public.roll_die(true));
SELECT pg_temp.audit_assert(
  (SELECT p.best_roll_score = s.score
   FROM public.profiles p
   JOIN public.scores s ON s.user_id = p.id AND s.roll_date = public.game_utc_date()
   WHERE p.id = '10000000-0000-0000-0000-000000000001'),
  'reroll left a ghost best score'
);
SELECT pg_temp.audit_assert(
  (SELECT lifetime_ep >= ep_spent AND public.get_wallet_balance() >= 0
   FROM public.profiles
   WHERE id = '10000000-0000-0000-0000-000000000001'),
  'reroll created a negative wallet balance'
);

UPDATE public.profiles
SET total_rolls = 49
WHERE id = '10000000-0000-0000-0000-000000000001';
DELETE FROM public.user_achievements
WHERE user_id = '10000000-0000-0000-0000-000000000001' AND achievement_id = 'roll_50';
UPDATE public.scores
SET roll_date = public.game_utc_date() - 1
WHERE user_id = '10000000-0000-0000-0000-000000000001' AND roll_date = public.game_utc_date();
UPDATE public.user_roll_best_candidates
SET roll_date = public.game_utc_date() - 1
WHERE user_id = '10000000-0000-0000-0000-000000000001' AND roll_date = public.game_utc_date();

INSERT INTO audit_results VALUES ('roll_fifty', public.roll_die(false));
SELECT pg_temp.audit_assert(
  (SELECT total_rolls = 50 FROM public.profiles WHERE id = '10000000-0000-0000-0000-000000000001'),
  'lifetime counter did not reach 50'
);
SELECT pg_temp.audit_assert(
  EXISTS (SELECT 1 FROM public.user_achievements
    WHERE user_id = '10000000-0000-0000-0000-000000000001' AND achievement_id = 'roll_50'),
  'roll_50 did not unlock from durable progress'
);
SELECT pg_temp.audit_assert(
  (SELECT count = 1 FROM public.user_achievements
   WHERE user_id = '10000000-0000-0000-0000-000000000001' AND achievement_id = 'first_roll'),
  'one-time achievement mastery count was incremented repeatedly'
);

INSERT INTO audit_results VALUES (
  'delete_first',
  public.delete_account_data('10000000-0000-0000-0000-000000000001')
);
INSERT INTO audit_results VALUES (
  'delete_second',
  public.delete_account_data('10000000-0000-0000-0000-000000000001')
);
SELECT pg_temp.audit_assert(
  (SELECT payload->>'success' = 'true' FROM audit_results WHERE name = 'delete_first')
    AND (SELECT payload->>'success' = 'true' AND payload->>'missing_profile' = 'true'
         FROM audit_results WHERE name = 'delete_second'),
  'account cleanup is not idempotent'
);

ROLLBACK;

\echo 'Database security and integrity checks passed.'
