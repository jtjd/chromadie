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

CREATE OR REPLACE FUNCTION pg_temp.audit_expect_error(statement text, message text)
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
    RAISE EXCEPTION 'AUDIT ASSERTION FAILED: %', message;
  END IF;
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
  EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'profile_configurations' AND column_name = 'avatar_path')
    AND EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'profile_configurations' AND column_name = 'background_path')
    AND EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'profile_configurations' AND column_name = 'spotify_type')
    AND EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'profile_configurations' AND column_name = 'spotify_id')
    AND has_function_privilege('authenticated', 'public.update_my_profile_expression(text,text,text)', 'EXECUTE')
    AND NOT has_function_privilege('anon', 'public.update_my_profile_expression(text,text,text)', 'EXECUTE'),
  'profile expression fields must use the authenticated bounded RPC'
);
SELECT pg_temp.audit_assert(
  (SELECT p.proconfig @> ARRAY['search_path=public']
   FROM pg_proc p
   WHERE p.oid = 'public.update_my_profile_expression(text,text,text)'::regprocedure),
  'profile expression RPC must have a fixed search_path'
);
SELECT pg_temp.audit_assert(
  (SELECT public AND file_size_limit = 262144 AND allowed_mime_types = ARRAY['image/webp']::text[]
   FROM storage.buckets WHERE id = 'avatars')
    AND (SELECT public AND file_size_limit = 4194304 AND allowed_mime_types = ARRAY['image/webp']::text[]
         FROM storage.buckets WHERE id = 'backgrounds')
    AND (SELECT relrowsecurity FROM pg_class WHERE oid = 'storage.objects'::regclass)
    AND (SELECT count(*) = 4 FROM pg_policies
         WHERE schemaname = 'storage' AND tablename = 'objects'
           AND policyname IN (
             'Public profile expression media read',
             'Owners can upload profile expression media',
             'Owners can replace profile expression media',
             'Owners can delete profile expression media'
           )),
  'profile media buckets and owner-scoped storage policies must remain bounded'
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
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'shop_items' AND column_name = 'catalog_status'
  )
  AND EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.shop_items'::regclass AND conname = 'shop_items_catalog_status_check'
  )
  AND (SELECT count(*) = 64 FROM public.shop_items WHERE slot IN ('name_font', 'name_material', 'name_motion') AND catalog_status = 'active')
  AND (SELECT count(*) = 18 FROM public.shop_items WHERE slot = 'name_font' AND catalog_status = 'active')
  AND (SELECT count(*) = 22 FROM public.shop_items WHERE slot = 'name_material' AND catalog_status = 'active')
  AND (SELECT count(*) = 24 FROM public.shop_items WHERE slot = 'name_motion' AND catalog_status = 'active')
  AND (SELECT count(*) = 9 FROM public.shop_items WHERE slot = 'profile_border' AND catalog_status = 'active')
  AND (SELECT count(*) = 16 FROM public.shop_items WHERE slot = 'cursor_trail' AND catalog_status = 'active')
  AND (SELECT count(*) = 18 FROM public.shop_items WHERE slot = 'avatar_effect' AND catalog_status = 'active')
  AND (SELECT count(*) = 5 FROM public.shop_items WHERE slot = 'profile_layout' AND catalog_status = 'active')
  AND (SELECT count(*) = 5 FROM public.shop_items WHERE slot = 'profile_atmosphere' AND catalog_status = 'active')
  AND (SELECT count(*) = 119 FROM public.shop_items WHERE catalog_status = 'active')
  AND NOT EXISTS (
    SELECT 1 FROM public.shop_items
    WHERE item_key IN ('name_material_plain', 'name_motion_none')
  )
  AND NOT EXISTS (SELECT 1 FROM public.shop_items WHERE slot IN ('name_effect', 'frame', 'profile_bg', 'orb_shape', 'roll_effect', 'lb_theme'))
  AND (SELECT bool_and(catalog_status = 'active') FROM public.shop_items),
  'lean catalog status and slot counts are not valid'
);
SELECT pg_temp.audit_assert(
  has_function_privilege('anon', 'public.get_shop_catalog()', 'EXECUTE')
    AND has_function_privilege('authenticated', 'public.get_shop_catalog()', 'EXECUTE')
    AND (SELECT p.proconfig @> ARRAY['search_path=public']
         FROM pg_proc p WHERE p.oid = 'public.get_shop_catalog()'::regprocedure)
    AND (SELECT count(*) = 117
         FROM public.get_shop_catalog()
         WHERE slot IN ('name_font', 'name_material', 'name_motion', 'profile_border', 'cursor_trail', 'avatar_effect', 'profile_layout', 'profile_atmosphere') AND catalog_status = 'active')
    AND NOT EXISTS (SELECT 1 FROM public.get_shop_catalog() WHERE catalog_status = 'retired'),
  'shop catalog RPC must expose only active retained rows with bounded renderer access'
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
        AND column_name IN ('is_admin', 'force_cotw_next_roll')
    ),
  'legacy admin/test profile surface must be removed'
);
SELECT pg_temp.audit_assert(
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles'
      AND column_name = 'display_name'
  )
  AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles'
      AND column_name = 'bio'
  )
  AND (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.profiles'::regclass),
  'public identity fields must remain on the protected profiles table'
);
SELECT pg_temp.audit_assert(
  has_function_privilege('authenticated', 'public.update_my_profile_identity(text,text)', 'EXECUTE')
    AND NOT has_function_privilege('anon', 'public.update_my_profile_identity(text,text)', 'EXECUTE')
    AND has_function_privilege('anon', 'public.get_public_profile_identity(text)', 'EXECUTE')
    AND has_function_privilege('authenticated', 'public.get_public_profile_identity(text)', 'EXECUTE')
    AND has_function_privilege('authenticated', 'public.get_public_profile_identity_by_id(uuid)', 'EXECUTE'),
  'identity RPCs must be available only to their intended browser roles'
);
SELECT pg_temp.audit_assert(
  (SELECT bool_and(p.proconfig @> ARRAY['search_path=public'])
   FROM pg_proc p
   WHERE p.oid IN (
     'public.update_my_profile_identity(text,text)'::regprocedure,
     'public.get_public_profile_identity(text)'::regprocedure,
     'public.get_public_profile_identity_by_id(uuid)'::regprocedure,
     'public.public_profile_identity_projection(uuid)'::regprocedure
   )),
  'identity SECURITY DEFINER functions must have fixed search paths'
);
SELECT pg_temp.audit_assert(
  position('ep_spent' IN pg_get_functiondef('public.public_profile_identity_projection(uuid)'::regprocedure)) = 0
    AND position('reroll_shards' IN pg_get_functiondef('public.public_profile_identity_projection(uuid)'::regprocedure)) = 0
    AND position('staff_test_ep' IN pg_get_functiondef('public.public_profile_identity_projection(uuid)'::regprocedure)) = 0
    AND position('auth.users' IN pg_get_functiondef('public.public_profile_identity_projection(uuid)'::regprocedure)) = 0,
  'public identity projection must exclude private account fields'
);
SELECT pg_temp.audit_assert(
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.username_blocklist'::regclass)
    AND (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.reserved_usernames'::regclass)
    AND NOT has_table_privilege('anon', 'public.username_blocklist', 'SELECT')
    AND NOT has_table_privilege('authenticated', 'public.username_blocklist', 'SELECT')
    AND NOT has_table_privilege('anon', 'public.reserved_usernames', 'SELECT')
    AND NOT has_table_privilege('authenticated', 'public.reserved_usernames', 'SELECT')
    AND has_table_privilege('service_role', 'public.reserved_usernames', 'SELECT'),
  'username policy tables must remain RLS-protected and unavailable to browser roles'
);
SELECT pg_temp.audit_assert(
  has_function_privilege('anon', 'public.is_username_available(text)', 'EXECUTE')
    AND has_function_privilege('authenticated', 'public.is_username_available(text)', 'EXECUTE')
    AND has_function_privilege('anon', 'public.is_username_reserved(text)', 'EXECUTE')
    AND has_function_privilege('authenticated', 'public.is_username_reserved(text)', 'EXECUTE')
    AND (SELECT p.proconfig @> ARRAY['search_path=public']
         FROM pg_proc p
         WHERE p.oid = 'public.is_username_reserved(text)'::regprocedure)
    AND (SELECT p.proconfig @> ARRAY['search_path=public']
         FROM pg_proc p
         WHERE p.oid = 'public.is_username_available(text)'::regprocedure),
  'username policy RPCs must have bounded browser grants and fixed search paths'
);
SELECT pg_temp.audit_assert(
  public.is_username_reserved('  ADMIN  ')
    AND NOT public.is_username_reserved('administratorx')
    AND NOT public.is_username_reserved('myspotifylist')
    AND NOT public.is_username_reserved('chromadiefan')
    AND NOT public.is_username_available('admin')
    AND NOT public.is_username_available('ABOUT')
    AND public.is_username_available('supporter')
    AND public.is_username_available('administratorx'),
  'username reservation must use exact normalized equality without substring overblocking'
);

INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  '10000000-0000-0000-0000-000000000003',
  'authenticated', 'authenticated', 'policy-user@example.invalid', '', now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"username":"policy_user"}'::jsonb, now(), now()
);
SELECT pg_temp.audit_expect_check(
  'UPDATE public.profiles SET username = ''Admin'' WHERE id = ''10000000-0000-0000-0000-000000000003''',
  'direct profile update bypassed the hard reservation'
);
SELECT pg_temp.audit_expect_check(
  'UPDATE public.profiles SET username = ''bad/name'' WHERE id = ''10000000-0000-0000-0000-000000000003''',
  'direct profile update bypassed username format validation'
);
SELECT pg_temp.audit_expect_check(
  'UPDATE public.profiles SET username = ''fuck_player'' WHERE id = ''10000000-0000-0000-0000-000000000003''',
  'direct profile update bypassed moderation'
);
UPDATE public.reserved_usernames
SET grandfathered_profile_id = '10000000-0000-0000-0000-000000000003'
WHERE username_key = 'admin';
UPDATE public.profiles
SET username = 'Admin'
WHERE id = '10000000-0000-0000-0000-000000000003';
SELECT pg_temp.audit_assert(
  (SELECT username = 'Admin' FROM public.profiles WHERE id = '10000000-0000-0000-0000-000000000003'),
  'approved grandfathered profile could not retain its username'
);
SELECT pg_temp.audit_expect_check(
  $policy_signup$
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      '10000000-0000-0000-0000-000000000004',
      'authenticated', 'authenticated', 'policy-reserved@example.invalid', '', now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"username":"Admin"}'::jsonb, now(), now()
    )
  $policy_signup$,
  'explicit reserved signup silently fell back instead of being rejected'
);
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  '10000000-0000-0000-0000-000000000005',
  'authenticated', 'authenticated', 'pending-policy@example.invalid', '',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"username":"reclaimable"}'::jsonb, now(), now()
);
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  '10000000-0000-0000-0000-000000000006',
  'authenticated', 'authenticated', 'confirmed-policy@example.invalid', '', now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"username":"reclaimable"}'::jsonb, now(), now()
);
SELECT pg_temp.audit_assert(
  (SELECT username = 'reclaimable' FROM public.profiles WHERE id = '10000000-0000-0000-0000-000000000006')
    AND (SELECT username <> 'reclaimable' FROM public.profiles WHERE id = '10000000-0000-0000-0000-000000000005'),
  'valid username reclaim from a pending account no longer works'
);
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  '10000000-0000-0000-0000-000000000009',
  'authenticated', 'authenticated', 'confirmed-holder@example.invalid', '', now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"username":"confirmed_holder"}'::jsonb, now(), now()
);
SELECT pg_temp.audit_assert(
  NOT public.is_username_available('confirmed_holder')
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      JOIN auth.users u ON u.id = p.id
      WHERE p.username_key = 'confirmed_holder'
        AND u.email_confirmed_at IS NOT NULL
    ),
  'confirmed username collision was not visible to the authoritative availability check'
);
SELECT pg_temp.audit_expect_check(
  $taken_signup$
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      '10000000-0000-0000-0000-000000000007',
      'authenticated', 'authenticated', 'taken-policy@example.invalid', '', now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"username":"confirmed_holder"}'::jsonb, now(), now()
    )
  $taken_signup$,
  'explicit confirmed username collision silently fell back'
);
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  '80000000-0000-0000-0000-000000000008',
  'authenticated', 'authenticated', 'fallback-policy@example.invalid', '', now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{}'::jsonb, now(), now()
);
SELECT pg_temp.audit_assert(
  (SELECT username LIKE 'player_%' FROM public.profiles WHERE id = '80000000-0000-0000-0000-000000000008'),
  'missing requested username did not use the generated fallback'
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
INSERT INTO audit_results VALUES (
  'identity_update',
  public.update_my_profile_identity('  Renée ✦  ', '  A quiet record of daily colors.  ')
);
SELECT pg_temp.audit_assert(
  (SELECT payload->>'username' = 'audit_recovery'
      AND payload->>'display_name' = 'audit_recovery'
      AND payload->>'bio' = 'A quiet record of daily colors.'
      AND NOT (payload ? 'ep_spent')
   FROM audit_results WHERE name = 'identity_update')
    AND (SELECT display_name = 'audit_recovery' AND bio = 'A quiet record of daily colors.'
         FROM public.profiles WHERE id = '10000000-0000-0000-0000-000000000002'),
  'identity update did not normalize and persist the authenticated projection'
);
INSERT INTO audit_results VALUES (
  'identity_retry',
  public.update_my_profile_identity('Renée ✦', 'A quiet record of daily colors.')
);
SELECT pg_temp.audit_assert(
  (SELECT payload->>'display_name' = 'audit_recovery' AND payload->>'bio' = 'A quiet record of daily colors.'
   FROM audit_results WHERE name = 'identity_retry'),
  'identity retry was not idempotent'
);
INSERT INTO audit_results VALUES (
  'identity_public',
  public.get_public_profile_identity('AUDIT_RECOVERY')
);
SELECT pg_temp.audit_assert(
  (SELECT payload->>'display_name' = 'audit_recovery'
      AND payload->>'bio' = 'A quiet record of daily colors.'
      AND NOT (payload ? 'ep_spent')
      AND NOT (payload ? 'reroll_shards')
   FROM audit_results WHERE name = 'identity_public'),
  'public identity lookup did not return the bounded published projection'
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

INSERT INTO public.inventory (user_id, item_key, quantity)
VALUES
  ('10000000-0000-0000-0000-000000000001', 'name_font_editorial_serif', 1),
  ('10000000-0000-0000-0000-000000000001', 'name_font_mono_compact', 1),
  ('10000000-0000-0000-0000-000000000001', 'name_material_copper_press', 1),
  ('10000000-0000-0000-0000-000000000001', 'name_motion_soft_rise', 1),
  ('10000000-0000-0000-0000-000000000001', 'name_motion_daily_pulse', 1),
  ('10000000-0000-0000-0000-000000000001', 'border_signal', 1),
  ('10000000-0000-0000-0000-000000000001', 'cursor_trail_signal_trace', 1),
  ('10000000-0000-0000-0000-000000000001', 'avatar_effect_signal_ring', 1),
  ('10000000-0000-0000-0000-000000000001', 'profile_layout_split_signal', 1);
UPDATE public.profiles
SET equipped_cosmetics = jsonb_build_object(
  'profile_border', 'border_signal',
  'name_material', 'name_material_copper_press',
  'name_motion', 'name_motion_soft_rise'
)
WHERE id = '10000000-0000-0000-0000-000000000001';

SELECT set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);
INSERT INTO audit_results VALUES ('d2_equip_font', public.equip_item('name_font_editorial_serif'));
SELECT pg_temp.audit_assert(
  (SELECT payload->>'success' = 'true'
      AND payload->'cosmetics'->>'name_font' = 'name_font_editorial_serif'
      AND payload->'cosmetics'->>'name_material' = 'name_material_copper_press'
      AND payload->'cosmetics'->>'name_motion' = 'name_motion_soft_rise'
      AND payload->'cosmetics'->>'profile_border' = 'border_signal'
   FROM audit_results WHERE name = 'd2_equip_font'),
  'equipping a Name Font did not preserve the other independent layers'
);
INSERT INTO audit_results VALUES ('lean_equip_border', public.equip_item('border_signal'));
SELECT pg_temp.audit_assert(
  (SELECT payload->>'success' = 'true'
      AND payload->'cosmetics'->>'profile_border' = 'border_signal'
      AND payload->'cosmetics'->>'name_font' = 'name_font_editorial_serif'
      AND payload->'cosmetics'->>'name_material' = 'name_material_copper_press'
      AND payload->'cosmetics'->>'name_motion' = 'name_motion_soft_rise'
   FROM audit_results WHERE name = 'lean_equip_border'),
  'equipping a Profile Border did not preserve modern Name layers'
);
INSERT INTO audit_results VALUES ('launch_equip_cursor', public.equip_item('cursor_trail_signal_trace'));
SELECT pg_temp.audit_assert(
  (SELECT payload->>'success' = 'true'
      AND payload->'cosmetics'->>'cursor_trail' = 'cursor_trail_signal_trace'
      AND payload->'cosmetics'->>'profile_border' = 'border_signal'
      AND payload->'cosmetics'->>'name_font' = 'name_font_editorial_serif'
   FROM audit_results WHERE name = 'launch_equip_cursor'),
  'equipping a Cursor Trail did not preserve unrelated cosmetic slots'
);
INSERT INTO audit_results VALUES ('launch_equip_avatar', public.equip_item('avatar_effect_signal_ring'));
SELECT pg_temp.audit_assert(
  (SELECT payload->>'success' = 'true'
      AND payload->'cosmetics'->>'avatar_effect' = 'avatar_effect_signal_ring'
      AND payload->'cosmetics'->>'cursor_trail' = 'cursor_trail_signal_trace'
   FROM audit_results WHERE name = 'launch_equip_avatar'),
  'equipping an Avatar Effect did not preserve the Cursor Trail slot'
);
INSERT INTO audit_results VALUES ('launch_equip_layout', public.equip_item('profile_layout_split_signal'));
SELECT pg_temp.audit_assert(
  (SELECT payload->>'success' = 'true'
      AND payload->'cosmetics'->>'profile_layout' = 'profile_layout_split_signal'
      AND payload->'cosmetics'->>'avatar_effect' = 'avatar_effect_signal_ring'
   FROM audit_results WHERE name = 'launch_equip_layout'),
  'equipping a paid Profile Layout did not preserve Avatar Effect state'
);
INSERT INTO audit_results VALUES ('launch_wrong_slot', public.equip_item('streak_freeze'));
SELECT pg_temp.audit_assert(
  (SELECT payload->>'success' = 'false' AND payload->>'error' = 'Invalid item'
   FROM audit_results WHERE name = 'launch_wrong_slot'),
  'non-cosmetic utility rows remained equipable'
);
INSERT INTO audit_results VALUES ('launch_unequip_cursor', public.unequip_item('cursor_trail'));
SELECT pg_temp.audit_assert(
  (SELECT payload->>'success' = 'true'
      AND NOT (payload->'cosmetics' ? 'cursor_trail')
      AND payload->'cosmetics'->>'avatar_effect' = 'avatar_effect_signal_ring'
      AND payload->'cosmetics'->>'profile_layout' = 'profile_layout_split_signal'
   FROM audit_results WHERE name = 'launch_unequip_cursor'),
  'unequipping Cursor Trail cleared unrelated new slots'
);
INSERT INTO audit_results VALUES ('d2_equip_material', public.equip_item('name_material_copper_press'));
INSERT INTO audit_results VALUES ('d2_equip_motion', public.equip_item('name_motion_daily_pulse'));
INSERT INTO audit_results VALUES ('d2_equip_font_again', public.equip_item('name_font_mono_compact'));
SELECT pg_temp.audit_assert(
  (SELECT payload->'cosmetics'->>'name_font' = 'name_font_mono_compact'
      AND payload->'cosmetics'->>'name_material' = 'name_material_copper_press'
      AND payload->'cosmetics'->>'name_motion' = 'name_motion_daily_pulse'
   FROM audit_results WHERE name = 'd2_equip_font_again'),
  'composable Name layers did not preserve each other across atomic equip calls'
);
INSERT INTO audit_results VALUES ('d2_unequip_material', public.unequip_item('name_material'));
SELECT pg_temp.audit_assert(
  (SELECT payload->>'success' = 'true'
      AND NOT (payload->'cosmetics' ? 'name_material')
      AND payload->'cosmetics'->>'name_font' = 'name_font_mono_compact'
      AND payload->'cosmetics'->>'name_motion' = 'name_motion_daily_pulse'
   FROM audit_results WHERE name = 'd2_unequip_material'),
  'unequipping one Name layer removed unrelated modern layers'
);
INSERT INTO audit_results VALUES ('lean_deleted_purchase', public.purchase_item('name_void'));
SELECT pg_temp.audit_assert(
  (SELECT payload->>'success' = 'false'
      AND payload->>'error' = 'Invalid item'
   FROM audit_results WHERE name = 'lean_deleted_purchase'),
  'deleted Name rows remained purchasable through purchase_item'
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
INSERT INTO storage.objects (id, bucket_id, name, owner_id, metadata)
VALUES
  (gen_random_uuid(), 'avatars', '10000000-0000-0000-0000-000000000001/avatar.webp', '10000000-0000-0000-0000-000000000001', '{"mimetype":"image/webp"}'::jsonb),
  (gen_random_uuid(), 'backgrounds', '10000000-0000-0000-0000-000000000001/background.webp', '10000000-0000-0000-0000-000000000001', '{"mimetype":"image/webp"}'::jsonb),
  (gen_random_uuid(), 'profile_audio', '10000000-0000-0000-0000-000000000001/profile.mp3', '10000000-0000-0000-0000-000000000001', '{"mimetype":"audio/mpeg"}'::jsonb);
UPDATE public.profiles SET is_staff = true WHERE id = '10000000-0000-0000-0000-000000000001';
INSERT INTO audit_results VALUES (
  'expression_save',
  public.update_my_profile_expression(
    'avatars/10000000-0000-0000-0000-000000000001/avatar.webp',
    'backgrounds/10000000-0000-0000-0000-000000000001/background.webp',
    'https://open.spotify.com/track/1234567890123456789012?si=test'
  )
);
SELECT pg_temp.audit_assert(
  (SELECT payload->>'success' = 'true'
      AND payload->>'avatar_path' = 'avatars/10000000-0000-0000-0000-000000000001/avatar.webp'
      AND payload->>'spotify_type' = 'track'
      AND payload->>'spotify_id' = '1234567890123456789012'
   FROM audit_results WHERE name = 'expression_save'),
  'valid profile expression values were not saved'
);
INSERT INTO audit_results VALUES (
  'audio_save',
  public.update_my_profile_audio('profile_audio/10000000-0000-0000-0000-000000000001/profile.mp3')
);
SELECT pg_temp.audit_assert(
  (SELECT payload->>'success' = 'true'
      AND payload->>'audio_path' = 'profile_audio/10000000-0000-0000-0000-000000000001/profile.mp3'
   FROM audit_results WHERE name = 'audio_save'),
  'valid staff profile audio was not saved'
);
SELECT pg_temp.audit_expect_error(
  $expression_path$SELECT public.update_my_profile_expression(
    'avatars/10000000-0000-0000-0000-000000000002/avatar.webp', NULL, NULL
  )$expression_path$,
  'profile expression RPC accepted another user''s storage path'
);
SELECT pg_temp.audit_expect_error(
  $expression_spotify$SELECT public.update_my_profile_expression(
    NULL, NULL, 'https://evil.example/track/1234567890123456789012'
  )$expression_spotify$,
  'profile expression RPC accepted an arbitrary Spotify host'
);
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000002","role":"authenticated"}',
  true
);
SELECT pg_temp.audit_expect_error(
  $staff_audio$SELECT public.update_my_profile_audio(NULL)$staff_audio$,
  'non-staff account received the staff-only profile audio boundary'
);
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);
INSERT INTO audit_results VALUES ('config_public_expression', public.get_public_profile_configuration('10000000-0000-0000-0000-000000000001'));
SELECT pg_temp.audit_assert(
  (SELECT payload->>'avatar_path' = 'avatars/10000000-0000-0000-0000-000000000001/avatar.webp'
      AND payload->>'background_path' = 'backgrounds/10000000-0000-0000-0000-000000000001/background.webp'
      AND payload->>'audio_path' = 'profile_audio/10000000-0000-0000-0000-000000000001/profile.mp3'
      AND payload->>'spotify_type' = 'track'
      AND payload->>'spotify_id' = '1234567890123456789012'
      AND NOT (payload ? 'draft')
   FROM audit_results WHERE name = 'config_public_expression'),
  'public profile expression projection was not bounded'
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
    SELECT 1 FROM storage.objects
    WHERE (bucket_id = 'avatars' AND name = '10000000-0000-0000-0000-000000000001/avatar.webp')
       OR (bucket_id = 'backgrounds' AND name = '10000000-0000-0000-0000-000000000001/background.webp')
       OR (bucket_id = 'profile_audio' AND name = '10000000-0000-0000-0000-000000000001/profile.mp3')
  ),
  'profile expression storage objects did not follow account deletion'
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
