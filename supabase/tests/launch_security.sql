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
  (SELECT bool_and(p.proconfig @> ARRAY['search_path=public'])
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
  has_function_privilege('authenticated', 'public.get_my_profile_configuration()', 'EXECUTE')
    AND has_function_privilege('authenticated', 'public.save_profile_configuration(jsonb)', 'EXECUTE')
    AND has_function_privilege('authenticated', 'public.publish_profile_configuration()', 'EXECUTE')
    AND has_function_privilege('anon', 'public.get_public_profile_configuration(uuid)', 'EXECUTE'),
  'profile configuration RPCs must be available only to intended browser roles'
);
SELECT pg_temp.audit_assert(
  has_function_privilege('anon', 'public.get_public_profile_story(uuid)', 'EXECUTE')
    AND has_function_privilege('authenticated', 'public.get_public_profile_story(uuid)', 'EXECUTE'),
  'public profile story projection must be available to intended browser roles'
);
SELECT pg_temp.audit_assert(
  has_function_privilege('anon', 'public.get_public_discovery(text,text,text,integer,integer)', 'EXECUTE')
    AND has_function_privilege('authenticated', 'public.get_public_discovery(text,text,text,integer,integer)', 'EXECUTE'),
  'public discovery projection must be available to intended browser roles'
);
SELECT pg_temp.audit_assert(
  (SELECT p.proconfig @> ARRAY['search_path=public']
   FROM pg_proc p
   WHERE p.oid = 'public.get_public_discovery(text,text,text,integer,integer)'::regprocedure),
  'public discovery projection must have a fixed search_path'
);
SELECT pg_temp.audit_assert(
  to_regclass('public.profiles_created_at_id_idx') IS NOT NULL
    AND to_regclass('public.profiles_best_roll_score_idx') IS NOT NULL
    AND to_regclass('public.scores_user_score_roll_date_idx') IS NOT NULL,
  'public discovery ordering indexes must exist'
);
SELECT pg_temp.audit_assert(
  NOT has_table_privilege('anon', 'public.profile_social_settings', 'SELECT')
    AND NOT has_table_privilege('authenticated', 'public.profile_social_settings', 'SELECT')
    AND NOT has_table_privilege('authenticated', 'public.profile_favorites', 'INSERT')
    AND NOT has_table_privilege('authenticated', 'public.profile_reactions', 'INSERT')
    AND NOT has_table_privilege('authenticated', 'public.profile_guestbook_entries', 'INSERT')
    AND NOT has_table_privilege('authenticated', 'public.profile_blocks', 'INSERT')
    AND NOT has_table_privilege('authenticated', 'public.profile_reports', 'INSERT'),
  'browser roles must use social RPCs instead of protected social tables'
);
SELECT pg_temp.audit_assert(
  (SELECT bool_and(relrowsecurity)
   FROM pg_class
   WHERE oid IN (
     'public.profile_social_settings'::regclass,
     'public.profile_favorites'::regclass,
     'public.profile_reactions'::regclass,
     'public.profile_guestbook_entries'::regclass,
     'public.profile_blocks'::regclass,
     'public.profile_reports'::regclass,
     'public.profile_social_rate_limits'::regclass
   )),
  'every social table must have row-level security enabled'
);
SELECT pg_temp.audit_assert(
  has_function_privilege('anon', 'public.get_public_profile_social(uuid)', 'EXECUTE')
    AND has_function_privilege('authenticated', 'public.get_public_profile_social(uuid)', 'EXECUTE')
    AND has_function_privilege('authenticated', 'public.update_my_profile_social_settings(boolean,boolean,boolean,boolean)', 'EXECUTE')
    AND has_function_privilege('authenticated', 'public.toggle_profile_favorite(uuid)', 'EXECUTE')
    AND has_function_privilege('authenticated', 'public.toggle_profile_reaction(uuid,text)', 'EXECUTE')
    AND has_function_privilege('authenticated', 'public.create_profile_guestbook_entry(uuid,text)', 'EXECUTE')
    AND has_function_privilege('authenticated', 'public.toggle_profile_block(uuid)', 'EXECUTE')
    AND has_function_privilege('authenticated', 'public.report_profile_social_content(uuid,uuid,text,text)', 'EXECUTE')
    AND NOT has_function_privilege('anon', 'public.toggle_profile_favorite(uuid)', 'EXECUTE'),
  'social RPCs must be available only to their intended browser roles'
);
SELECT pg_temp.audit_assert(
  (SELECT bool_and(p.proconfig @> ARRAY['search_path=public'])
   FROM pg_proc p
   WHERE p.oid IN (
     'public.get_public_profile_social(uuid)'::regprocedure,
     'public.update_my_profile_social_settings(boolean,boolean,boolean,boolean)'::regprocedure,
     'public.toggle_profile_favorite(uuid)'::regprocedure,
     'public.toggle_profile_reaction(uuid,text)'::regprocedure,
     'public.create_profile_guestbook_entry(uuid,text)'::regprocedure,
     'public.toggle_profile_block(uuid)'::regprocedure,
     'public.report_profile_social_content(uuid,uuid,text,text)'::regprocedure
   )),
  'social SECURITY DEFINER RPCs must have a fixed search_path'
);
SELECT pg_temp.audit_assert(
  NOT has_table_privilege('anon', 'public.profile_configurations', 'SELECT')
    AND NOT has_table_privilege('authenticated', 'public.profile_configurations', 'SELECT')
    AND NOT has_table_privilege('authenticated', 'public.profile_configurations', 'INSERT')
    AND NOT has_table_privilege('authenticated', 'public.profile_configurations', 'UPDATE'),
  'browser roles must use profile configuration RPCs instead of the protected table'
);
SELECT pg_temp.audit_assert(
  NOT has_table_privilege('anon', 'public.profile_entitlements', 'SELECT')
    AND NOT has_table_privilege('authenticated', 'public.profile_entitlements', 'SELECT')
    AND has_table_privilege('service_role', 'public.profile_entitlements', 'SELECT')
    AND (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.profile_entitlements'::regclass),
  'profile entitlements must remain service-owned and RLS-protected'
);
SELECT pg_temp.audit_assert(
  has_function_privilege('authenticated', 'public.get_my_profile_entitlements()', 'EXECUTE')
    AND NOT has_function_privilege('anon', 'public.get_my_profile_entitlements()', 'EXECUTE')
    AND has_function_privilege('service_role', 'public.grant_profile_entitlement(uuid,text,text)', 'EXECUTE')
    AND NOT has_function_privilege('authenticated', 'public.grant_profile_entitlement(uuid,text,text)', 'EXECUTE'),
  'entitlement reads and grants must use intended RPC roles'
);
SELECT pg_temp.audit_assert(
  (SELECT bool_and(p.proconfig @> ARRAY['search_path=public'])
   FROM pg_proc p
   WHERE p.oid IN (
     'public.get_my_profile_entitlements()'::regprocedure,
     'public.grant_profile_entitlement(uuid,text,text)'::regprocedure,
     'public.purchase_item_impl(text)'::regprocedure,
     'public.equip_item(text)'::regprocedure
   )),
  'decoration entitlement and cosmetic mutation functions must have fixed search paths'
);
SELECT pg_temp.audit_assert(
  (SELECT access_tier = 'premium' AND entitlement_key = 'atelier_plus'
   FROM public.shop_items WHERE item_key = 'name_prism_atelier')
    AND (SELECT access_tier = 'premium' AND entitlement_key = 'atelier_plus'
         FROM public.shop_items WHERE item_key = 'bg_prism_atmosphere'),
  'premium catalog rows must carry an explicit entitlement key'
);
SELECT pg_temp.audit_assert(
  NOT has_function_privilege('anon', 'public.purchase_item_impl(text)', 'EXECUTE')
    AND NOT has_function_privilege('authenticated', 'public.purchase_item_impl(text)', 'EXECUTE')
    AND has_function_privilege('authenticated', 'public.equip_item(text)', 'EXECUTE'),
  'browser roles must use guarded purchase and equip wrappers'
);
SELECT pg_temp.audit_assert(
  NOT has_table_privilege('anon', 'public.profile_events', 'SELECT')
    AND NOT has_table_privilege('authenticated', 'public.profile_events', 'SELECT')
    AND NOT has_table_privilege('authenticated', 'public.profile_events', 'INSERT')
    AND NOT has_table_privilege('authenticated', 'public.profile_events', 'UPDATE'),
  'browser roles must use the public profile story RPC instead of the event table'
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
INSERT INTO audit_results VALUES (
  'story_public',
  public.get_public_profile_story('10000000-0000-0000-0000-000000000001')
);
SELECT pg_temp.audit_assert(
  (SELECT jsonb_typeof(payload->'timeline') = 'array'
      AND jsonb_typeof(payload->'collection') = 'array'
      AND EXISTS (
        SELECT 1
        FROM jsonb_array_elements(payload->'timeline') AS timeline_item
        WHERE timeline_item->>'eventType' = 'roll'
      )
   FROM audit_results WHERE name = 'story_public'),
  'public profile story did not capture the canonical roll event safely'
);
SELECT set_config('request.jwt.claims', '{"role":"anon"}', true);
INSERT INTO audit_results VALUES (
  'discovery_public',
  public.get_public_discovery('today', NULL, NULL, 0, 99)
);
SELECT pg_temp.audit_assert(
  (SELECT jsonb_typeof(payload->'items') = 'array'
      AND jsonb_array_length(payload->'items') <= 12
      AND payload->>'limit' = '12'
      AND NOT EXISTS (
        SELECT 1
        FROM jsonb_array_elements(payload->'items') AS discovery_item
        WHERE discovery_item ? 'user_id'
      )
   FROM audit_results WHERE name = 'discovery_public'),
  'public discovery exposed an unbounded or internal identifier field'
);
INSERT INTO audit_results VALUES (
  'discovery_new',
  public.get_public_discovery('new', NULL, 'audit', 0, 12)
);
SELECT pg_temp.audit_assert(
  (SELECT EXISTS (
        SELECT 1
        FROM jsonb_array_elements(payload->'items') AS discovery_item
        WHERE discovery_item->>'username' = 'audit_one'
      )
   FROM audit_results WHERE name = 'discovery_new'),
  'public discovery username filtering did not return the public profile'
);
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);

INSERT INTO public.profile_entitlements (user_id, entitlement_key, source)
VALUES ('10000000-0000-0000-0000-000000000001', 'atelier_plus', 'security-test');

INSERT INTO audit_results VALUES (
  'social_default',
  public.get_public_profile_social('10000000-0000-0000-0000-000000000002')
);
SELECT pg_temp.audit_assert(
  (SELECT payload->>'success' = 'true'
      AND payload->>'blocked' = 'false'
      AND payload->>'interactionsEnabled' = 'true'
      AND payload->>'guestbookEnabled' = 'true'
   FROM audit_results WHERE name = 'social_default'),
  'public social projection did not return safe defaults'
);
INSERT INTO audit_results VALUES (
  'social_favorite',
  public.toggle_profile_favorite('10000000-0000-0000-0000-000000000002')
);
SELECT pg_temp.audit_assert(
  (SELECT payload->>'success' = 'true' AND payload->>'action' = 'favorited'
   FROM audit_results WHERE name = 'social_favorite'),
  'authenticated favorite mutation failed'
);
INSERT INTO audit_results VALUES (
  'social_reaction',
  public.toggle_profile_reaction('10000000-0000-0000-0000-000000000002', 'spark')
);
SELECT pg_temp.audit_assert(
  (SELECT payload->>'success' = 'true' AND payload->>'action' = 'added'
   FROM audit_results WHERE name = 'social_reaction'),
  'authenticated positive reaction mutation failed'
);
INSERT INTO audit_results VALUES (
  'social_guestbook',
  public.create_profile_guestbook_entry(
    '10000000-0000-0000-0000-000000000002',
    'A thoughtful color identity.'
  )
);
SELECT pg_temp.audit_assert(
  (SELECT payload->>'success' = 'true'
      AND payload->'entry'->>'body' = 'A thoughtful color identity.'
      AND NOT (payload->'entry' ? 'author_id')
   FROM audit_results WHERE name = 'social_guestbook'),
  'guestbook RPC did not return a bounded public-safe entry'
);
INSERT INTO audit_results VALUES (
  'social_guestbook_url',
  public.create_profile_guestbook_entry(
    '10000000-0000-0000-0000-000000000002',
    'Visit https://example.com'
  )
);
SELECT pg_temp.audit_assert(
  (SELECT payload->>'success' = 'false' FROM audit_results WHERE name = 'social_guestbook_url'),
  'guestbook accepted a URL'
);
DO $social_rate_test$
DECLARE
  v_index integer;
  v_result jsonb;
BEGIN
  FOR v_index IN 2..6 LOOP
    v_result := public.create_profile_guestbook_entry(
      '10000000-0000-0000-0000-000000000002',
      'Bounded note ' || v_index::text
    );
  END LOOP;
  INSERT INTO audit_results VALUES ('social_guestbook_rate', v_result);
END;
$social_rate_test$;
SELECT pg_temp.audit_assert(
  (SELECT payload->>'success' = 'false' FROM audit_results WHERE name = 'social_guestbook_rate'),
  'guestbook writes were not rate limited'
);
INSERT INTO audit_results VALUES (
  'social_report',
  public.report_profile_social_content(
    '10000000-0000-0000-0000-000000000002',
    NULL,
    'other',
    'Review this profile.'
  )
);
SELECT pg_temp.audit_assert(
  (SELECT payload->>'success' = 'true' AND payload->>'action' = 'reported'
   FROM audit_results WHERE name = 'social_report'),
  'authenticated profile report mutation failed'
);
INSERT INTO audit_results VALUES (
  'social_block',
  public.toggle_profile_block('10000000-0000-0000-0000-000000000002')
);
SELECT pg_temp.audit_assert(
  (SELECT payload->>'success' = 'true' AND payload->>'action' = 'blocked'
   FROM audit_results WHERE name = 'social_block')
    AND NOT EXISTS (
      SELECT 1 FROM public.profile_favorites
      WHERE favoriter_id = '10000000-0000-0000-0000-000000000001'
        AND profile_id = '10000000-0000-0000-0000-000000000002'
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.profile_reactions
      WHERE reactor_id = '10000000-0000-0000-0000-000000000001'
        AND profile_id = '10000000-0000-0000-0000-000000000002'
    ),
  'blocking did not remove existing social connections'
);
INSERT INTO audit_results VALUES (
  'social_blocked_projection',
  public.get_public_profile_social('10000000-0000-0000-0000-000000000002')
);
SELECT pg_temp.audit_assert(
  (SELECT payload->>'blocked' = 'true'
      AND jsonb_array_length(payload->'guestbook') = 0
      AND payload->>'interactionsEnabled' = 'false'
   FROM audit_results WHERE name = 'social_blocked_projection'),
  'blocked profile social projection did not hide interactions'
);
INSERT INTO audit_results VALUES (
  'social_blocked_write',
  public.toggle_profile_favorite('10000000-0000-0000-0000-000000000002')
);
SELECT pg_temp.audit_assert(
  (SELECT payload->>'success' = 'false' FROM audit_results WHERE name = 'social_blocked_write'),
  'blocked profile accepted a new social write'
);
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000002","role":"authenticated"}',
  true
);
INSERT INTO audit_results VALUES (
  'social_settings_update',
  public.update_my_profile_social_settings(false, false, false, false)
);
SELECT pg_temp.audit_assert(
  (SELECT payload->>'success' = 'true'
      AND payload->'settings'->>'interactionsEnabled' = 'false'
      AND payload->'settings'->>'guestbookEnabled' = 'false'
      AND payload->'settings'->>'activityVisible' = 'false'
      AND payload->'settings'->>'discoverable' = 'false'
   FROM audit_results WHERE name = 'social_settings_update'),
  'owner social privacy settings did not save'
);
SELECT set_config('request.jwt.claims', '{"role":"anon"}', true);
INSERT INTO audit_results VALUES (
  'social_settings_public',
  public.get_public_profile_social('10000000-0000-0000-0000-000000000002')
);
SELECT pg_temp.audit_assert(
  (SELECT payload->>'interactionsEnabled' = 'false'
      AND payload->>'guestbookEnabled' = 'false'
   FROM audit_results WHERE name = 'social_settings_public'),
  'public social projection ignored owner interaction settings'
);
INSERT INTO audit_results VALUES (
  'social_discovery_private',
  public.get_public_discovery('new', NULL, 'audit_recovery', 0, 12)
);
SELECT pg_temp.audit_assert(
  (SELECT NOT EXISTS (
        SELECT 1
        FROM jsonb_array_elements(payload->'items') AS discovery_item
        WHERE discovery_item->>'username' = 'audit_recovery'
      )
   FROM audit_results WHERE name = 'social_discovery_private'),
  'discovery ignored the owner discoverable setting'
);
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);
INSERT INTO audit_results VALUES (
  'social_activity_settings',
  public.update_my_profile_social_settings(true, true, false, true)
);
SELECT set_config('request.jwt.claims', '{"role":"anon"}', true);
INSERT INTO audit_results
SELECT 'social_activity_scores_private', coalesce(jsonb_agg(to_jsonb(score_rows)), '[]'::jsonb)
FROM public.get_public_profile_scores('10000000-0000-0000-0000-000000000001') AS score_rows;
INSERT INTO audit_results VALUES (
  'social_activity_story_private',
  public.get_public_profile_story('10000000-0000-0000-0000-000000000001')
);
SELECT pg_temp.audit_assert(
  (SELECT jsonb_typeof(payload) = 'array' AND jsonb_array_length(payload) = 0
   FROM audit_results WHERE name = 'social_activity_scores_private')
    AND (SELECT jsonb_typeof(payload->'timeline') = 'array'
              AND jsonb_array_length(payload->'timeline') = 0
         FROM audit_results WHERE name = 'social_activity_story_private'),
  'activity privacy did not gate public score and story projections'
);
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);
INSERT INTO audit_results
SELECT 'social_activity_owner_scores', coalesce(jsonb_agg(to_jsonb(score_rows)), '[]'::jsonb)
FROM public.get_public_profile_scores('10000000-0000-0000-0000-000000000001') AS score_rows;
SELECT pg_temp.audit_assert(
  (SELECT jsonb_typeof(payload) = 'array' AND jsonb_array_length(payload) > 0
   FROM audit_results WHERE name = 'social_activity_owner_scores'),
  'activity privacy hid the owner profile from its own score projection'
);
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
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

INSERT INTO audit_results VALUES ('config_owner', public.get_my_profile_configuration());
SELECT pg_temp.audit_assert(
  (SELECT payload->>'success' = 'true'
      AND payload->'draft'->>'version' = '1'
      AND payload->'published'->>'version' = '1'
   FROM audit_results WHERE name = 'config_owner'),
  'owner profile configuration did not return a safe default projection'
);
INSERT INTO audit_results VALUES (
  'config_invalid',
  public.save_profile_configuration(jsonb_build_object(
    'version', 1,
    'signatureColor', 'javascript:',
    'layoutVariant', 'immersive',
    'modules', '[]'::jsonb,
    'links', '[]'::jsonb
  ))
);
SELECT pg_temp.audit_assert(
  (SELECT payload->>'success' = 'false' FROM audit_results WHERE name = 'config_invalid'),
  'invalid profile configuration was accepted'
);
INSERT INTO audit_results
SELECT 'config_save', public.save_profile_configuration(
  jsonb_set(payload->'draft', '{signatureColor}', '"#112233"'::jsonb)
)
FROM audit_results
WHERE name = 'config_owner';
SELECT pg_temp.audit_assert(
  (SELECT payload->>'success' = 'true'
      AND payload->'draft'->>'signatureColor' = '#112233'
   FROM audit_results WHERE name = 'config_save'),
  'valid profile configuration draft was not saved'
);
INSERT INTO audit_results VALUES ('config_publish', public.publish_profile_configuration());
SELECT pg_temp.audit_assert(
  (SELECT payload->>'success' = 'true'
      AND payload->'published'->>'signatureColor' = '#112233'
   FROM audit_results WHERE name = 'config_publish'),
  'profile configuration publish did not promote the saved draft'
);
SELECT set_config('request.jwt.claims', '{"role":"anon"}', true);
INSERT INTO audit_results VALUES ('config_anon_owner', public.get_my_profile_configuration());
SELECT pg_temp.audit_assert(
  (SELECT payload->>'success' = 'false' FROM audit_results WHERE name = 'config_anon_owner'),
  'anonymous users received the owner profile configuration'
);
INSERT INTO audit_results
SELECT 'config_public', public.get_public_profile_configuration('10000000-0000-0000-0000-000000000001');
SELECT pg_temp.audit_assert(
  (SELECT payload->>'signatureColor' = '#112233'
      AND NOT (payload ? 'draft')
   FROM audit_results WHERE name = 'config_public'),
  'public profile configuration exposed drafts or missed the published projection'
);
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
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
SELECT pg_temp.audit_assert(
  NOT EXISTS (
    SELECT 1 FROM public.profile_configurations
    WHERE user_id = '10000000-0000-0000-0000-000000000001'
  ),
  'profile configuration did not follow account deletion'
);
SELECT pg_temp.audit_assert(
  NOT EXISTS (
    SELECT 1 FROM public.profile_events
    WHERE user_id = '10000000-0000-0000-0000-000000000001'
  ),
  'profile events did not follow account deletion'
);
SELECT pg_temp.audit_assert(
  NOT EXISTS (
    SELECT 1 FROM public.profile_entitlements
    WHERE user_id = '10000000-0000-0000-0000-000000000001'
  ),
  'profile entitlements did not follow account deletion'
);
SELECT pg_temp.audit_assert(
  NOT EXISTS (SELECT 1 FROM public.profile_favorites WHERE favoriter_id = '10000000-0000-0000-0000-000000000001' OR profile_id = '10000000-0000-0000-0000-000000000001')
    AND NOT EXISTS (SELECT 1 FROM public.profile_reactions WHERE reactor_id = '10000000-0000-0000-0000-000000000001' OR profile_id = '10000000-0000-0000-0000-000000000001')
    AND NOT EXISTS (SELECT 1 FROM public.profile_guestbook_entries WHERE author_id = '10000000-0000-0000-0000-000000000001' OR profile_id = '10000000-0000-0000-0000-000000000001')
    AND NOT EXISTS (SELECT 1 FROM public.profile_blocks WHERE blocker_id = '10000000-0000-0000-0000-000000000001' OR blocked_id = '10000000-0000-0000-0000-000000000001')
    AND NOT EXISTS (SELECT 1 FROM public.profile_reports WHERE reporter_id = '10000000-0000-0000-0000-000000000001' OR target_profile_id = '10000000-0000-0000-0000-000000000001')
    AND NOT EXISTS (SELECT 1 FROM public.profile_social_rate_limits WHERE user_id = '10000000-0000-0000-0000-000000000001')
    AND NOT EXISTS (SELECT 1 FROM public.profile_social_settings WHERE user_id = '10000000-0000-0000-0000-000000000001'),
  'social data did not follow account deletion'
);

ROLLBACK;

\echo 'Database security and integrity checks passed.'
