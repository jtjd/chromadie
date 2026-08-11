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
  has_function_privilege('authenticated', 'public.save_profile_configuration_section(text,jsonb,timestamptz)', 'EXECUTE')
    AND has_function_privilege('authenticated', 'public.publish_profile_configuration_section(text,jsonb,timestamptz)', 'EXECUTE')
    AND NOT has_function_privilege('anon', 'public.save_profile_configuration_section(text,jsonb,timestamptz)', 'EXECUTE')
    AND NOT has_function_privilege('anon', 'public.publish_profile_configuration_section(text,jsonb,timestamptz)', 'EXECUTE')
    AND NOT has_function_privilege('anon', 'public.profile_composition_patch(jsonb)', 'EXECUTE')
    AND NOT has_function_privilege('authenticated', 'public.profile_composition_patch(jsonb)', 'EXECUTE')
    AND NOT has_function_privilege('anon', 'public.normalize_profile_configuration(jsonb,text)', 'EXECUTE'),
  'template composition must remain behind the owner configuration RPC boundary'
);
SELECT pg_temp.audit_assert(
  (SELECT bool_and(p.proconfig @> ARRAY['search_path=public, pg_catalog'])
   FROM pg_proc p
   WHERE p.oid IN (
     'public.profile_composition_patch(jsonb)'::regprocedure,
     'public.normalize_profile_configuration(jsonb,text)'::regprocedure,
     'public.save_profile_configuration_section(text,jsonb,timestamptz)'::regprocedure,
     'public.publish_profile_configuration_section(text,jsonb,timestamptz)'::regprocedure
   )),
  'template configuration functions must have fixed search paths'
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
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.profile_view_daily'::regclass)
    AND NOT has_table_privilege('anon', 'public.profile_view_daily', 'SELECT')
    AND NOT has_table_privilege('authenticated', 'public.profile_view_daily', 'SELECT')
    AND NOT has_table_privilege('anon', 'public.profile_view_daily', 'INSERT')
    AND NOT has_table_privilege('authenticated', 'public.profile_view_daily', 'INSERT'),
  'profile insights aggregate table must remain RLS-protected and service-owned'
);
SELECT pg_temp.audit_assert(
  has_function_privilege('anon', 'public.record_public_profile_view(text)', 'EXECUTE')
    AND has_function_privilege('authenticated', 'public.record_public_profile_view(text)', 'EXECUTE')
    AND has_function_privilege('authenticated', 'public.get_my_profile_insights(integer)', 'EXECUTE')
    AND has_function_privilege('authenticated', 'public.update_my_profile_insights_settings(boolean)', 'EXECUTE')
    AND NOT has_function_privilege('anon', 'public.get_my_profile_insights(integer)', 'EXECUTE')
    AND NOT has_function_privilege('anon', 'public.update_my_profile_insights_settings(boolean)', 'EXECUTE'),
  'profile insights RPCs must expose recording separately from owner reads and settings'
);
SELECT pg_temp.audit_assert(
  (SELECT bool_and(p.proconfig @> ARRAY['search_path=public'])
   FROM pg_proc p
   WHERE p.oid IN (
     'public.record_public_profile_view(text)'::regprocedure,
     'public.get_my_profile_insights(integer)'::regprocedure,
     'public.update_my_profile_insights_settings(boolean)'::regprocedure,
     'public.cleanup_profile_view_daily()'::regprocedure
   )),
  'profile insights SECURITY DEFINER functions must have a fixed search_path'
);
SELECT pg_temp.audit_assert(
  (SELECT bool_and(relrowsecurity)
   FROM pg_class
   WHERE oid IN (
     'public.profile_insight_daily'::regclass,
     'public.profile_guestbook_replies'::regclass,
     'public.profile_guestbook_likes'::regclass,
     'public.profile_guestbook_pins'::regclass,
     'public.profile_notifications'::regclass
   ))
    AND NOT has_table_privilege('anon', 'public.profile_insight_daily', 'SELECT')
    AND NOT has_table_privilege('authenticated', 'public.profile_insight_daily', 'SELECT')
    AND NOT has_table_privilege('authenticated', 'public.profile_guestbook_replies', 'INSERT')
    AND NOT has_table_privilege('authenticated', 'public.profile_guestbook_likes', 'INSERT')
    AND NOT has_table_privilege('authenticated', 'public.profile_guestbook_pins', 'INSERT')
    AND NOT has_table_privilege('authenticated', 'public.profile_notifications', 'SELECT'),
  'Milestone 12 aggregate and social-depth tables must remain RLS-protected and RPC-only'
);
SELECT pg_temp.audit_assert(
  has_function_privilege('anon', 'public.record_profile_insight(text,text,text,text,text,text)', 'EXECUTE')
    AND has_function_privilege('authenticated', 'public.record_profile_insight(text,text,text,text,text,text)', 'EXECUTE')
    AND has_function_privilege('authenticated', 'public.update_my_profile_view_visibility(boolean)', 'EXECUTE')
    AND has_function_privilege('authenticated', 'public.get_my_profile_notifications(integer)', 'EXECUTE')
    AND has_function_privilege('authenticated', 'public.mark_my_profile_notifications_read(uuid[])', 'EXECUTE')
    AND has_function_privilege('authenticated', 'public.create_profile_guestbook_reply(uuid,text)', 'EXECUTE')
    AND has_function_privilege('authenticated', 'public.delete_profile_guestbook_reply(uuid)', 'EXECUTE')
    AND has_function_privilege('authenticated', 'public.toggle_profile_guestbook_like(uuid)', 'EXECUTE')
    AND has_function_privilege('authenticated', 'public.toggle_profile_guestbook_pin(uuid)', 'EXECUTE')
    AND has_function_privilege('anon', 'public.get_public_profile_social(uuid,text)', 'EXECUTE')
    AND has_function_privilege('authenticated', 'public.report_profile_social_content(uuid,uuid,uuid,text,text)', 'EXECUTE')
    AND NOT has_function_privilege('anon', 'public.get_my_profile_notifications(integer)', 'EXECUTE')
    AND NOT has_function_privilege('anon', 'public.update_my_profile_view_visibility(boolean)', 'EXECUTE'),
  'Milestone 12 RPCs must expose recording/public reads separately from owner actions'
);
SELECT pg_temp.audit_assert(
  (SELECT bool_and(p.proconfig @> ARRAY['search_path=public'])
   FROM pg_proc p
   WHERE p.oid IN (
     'public.record_profile_insight(text,text,text,text,text,text)'::regprocedure,
     'public.update_my_profile_view_visibility(boolean)'::regprocedure,
     'public.get_my_profile_notifications(integer)'::regprocedure,
     'public.mark_my_profile_notifications_read(uuid[])'::regprocedure,
     'public.create_profile_guestbook_reply(uuid,text)'::regprocedure,
     'public.delete_profile_guestbook_reply(uuid)'::regprocedure,
     'public.toggle_profile_guestbook_like(uuid)'::regprocedure,
     'public.toggle_profile_guestbook_pin(uuid)'::regprocedure,
     'public.get_public_profile_social(uuid,text)'::regprocedure,
     'public.report_profile_social_content(uuid,uuid,uuid,text,text)'::regprocedure
   )),
  'Milestone 12 SECURITY DEFINER functions must have fixed search paths'
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
  AND (SELECT count(*) = 36 FROM public.shop_items WHERE slot IN ('name_font', 'name_material', 'name_motion') AND catalog_status = 'active')
  AND (SELECT count(*) = 18 FROM public.shop_items WHERE slot = 'name_font' AND catalog_status = 'active')
  AND (SELECT count(*) = 7 FROM public.shop_items WHERE slot = 'name_material' AND catalog_status = 'active')
  AND (SELECT count(*) = 11 FROM public.shop_items WHERE slot = 'name_motion' AND catalog_status = 'active')
  AND (SELECT count(*) = 9 FROM public.shop_items WHERE slot = 'profile_border' AND catalog_status = 'active')
  AND (SELECT count(*) = 16 FROM public.shop_items WHERE slot = 'cursor_trail' AND catalog_status = 'active')
  AND (SELECT count(*) = 18 FROM public.shop_items WHERE slot = 'avatar_effect' AND catalog_status = 'active')
  AND (SELECT count(*) = 5 FROM public.shop_items WHERE slot = 'profile_layout' AND catalog_status = 'active')
  AND (SELECT count(*) = 13 FROM public.shop_items WHERE slot = 'profile_atmosphere' AND catalog_status = 'active')
  AND (SELECT count(*) = 99 FROM public.shop_items WHERE catalog_status = 'active')
  AND NOT EXISTS (
    SELECT 1 FROM public.shop_items
    WHERE item_key IN ('name_material_plain', 'name_motion_none')
  )
  AND NOT EXISTS (SELECT 1 FROM public.shop_items WHERE slot IN ('name_effect', 'frame', 'profile_bg', 'orb_shape', 'roll_effect', 'lb_theme'))
  AND (SELECT bool_and(catalog_status IN ('active', 'legacy')) FROM public.shop_items),
  'lean catalog status and slot counts are not valid'
);
SELECT pg_temp.audit_assert(
  has_function_privilege('anon', 'public.get_shop_catalog()', 'EXECUTE')
    AND has_function_privilege('authenticated', 'public.get_shop_catalog()', 'EXECUTE')
    AND (SELECT p.proconfig @> ARRAY['search_path=public']
         FROM pg_proc p WHERE p.oid = 'public.get_shop_catalog()'::regprocedure)
    AND (SELECT count(*) = 97
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
  has_function_privilege('authenticated', 'public.publish_profile_studio_v2(jsonb,text,text,timestamptz)', 'EXECUTE')
    AND NOT has_function_privilege('anon', 'public.publish_profile_studio_v2(jsonb,text,text,timestamptz)', 'EXECUTE')
    AND (SELECT p.proconfig @> ARRAY['search_path=public, pg_catalog']
         FROM pg_proc p
         WHERE p.oid = 'public.publish_profile_studio_v2(jsonb,text,text,timestamptz)'::regprocedure),
  'Profile Studio publish must be an authenticated fixed-search-path RPC'
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
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.profile_aliases'::regclass)
    AND NOT has_table_privilege('anon', 'public.profile_aliases', 'SELECT')
    AND NOT has_table_privilege('authenticated', 'public.profile_aliases', 'SELECT')
    AND NOT has_table_privilege('authenticated', 'public.profile_aliases', 'INSERT')
    AND has_table_privilege('service_role', 'public.profile_aliases', 'SELECT'),
  'profile aliases must remain RLS-protected and RPC-only'
);
SELECT pg_temp.audit_assert(
  has_function_privilege('authenticated', 'public.get_my_profile_aliases()', 'EXECUTE')
    AND has_function_privilege('anon', 'public.get_public_profile_alias(text)', 'EXECUTE')
    AND has_function_privilege('authenticated', 'public.get_public_profile_alias(text)', 'EXECUTE')
    AND has_function_privilege('authenticated', 'public.create_profile_alias(text)', 'EXECUTE')
    AND has_function_privilege('authenticated', 'public.delete_profile_alias(text)', 'EXECUTE')
    AND NOT has_function_privilege('anon', 'public.get_my_profile_aliases()', 'EXECUTE')
    AND NOT has_function_privilege('anon', 'public.create_profile_alias(text)', 'EXECUTE')
    AND NOT has_function_privilege('anon', 'public.delete_profile_alias(text)', 'EXECUTE'),
  'profile alias RPCs must be available only to their intended browser roles'
);
SELECT pg_temp.audit_assert(
  (SELECT bool_and(p.proconfig @> ARRAY['search_path=public, pg_catalog'])
   FROM pg_proc p
   WHERE p.oid IN (
     'public.get_my_profile_aliases()'::regprocedure,
     'public.get_public_profile_alias(text)'::regprocedure,
     'public.create_profile_alias(text)'::regprocedure,
     'public.delete_profile_alias(text)'::regprocedure
   )),
  'profile alias SECURITY DEFINER functions must have fixed search paths'
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
    AND public.is_username_reserved('c')
    AND public.is_username_reserved('OG')
    AND public.is_username_reserved('u')
    AND NOT public.is_username_reserved('administratorx')
    AND NOT public.is_username_reserved('myspotifylist')
    AND NOT public.is_username_reserved('chromadiefan')
    AND NOT public.is_username_available('admin')
    AND NOT public.is_username_available('ABOUT')
    AND NOT public.is_username_available('c')
    AND public.is_username_available('q')
    AND public.is_username_available('Q7')
    AND public.is_username_available('_')
    AND public.is_username_available('supporter')
    AND public.is_username_available('administratorx'),
  'username reservation must use exact normalized equality without substring overblocking'
);

INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  '10000000-0000-0000-0000-000000000011',
  'authenticated', 'authenticated', 'short-policy@example.invalid', '', now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"username":"q"}'::jsonb, now(), now()
);
SELECT pg_temp.audit_assert(
  (SELECT username = 'q' AND username_key = 'q'
   FROM public.profiles
   WHERE id = '10000000-0000-0000-0000-000000000011')
    AND NOT public.is_username_available('Q')
    AND (public.get_public_profile_identity('Q')->>'username') = 'q',
  'one-character signup, case-insensitive uniqueness, or public projection drifted'
);
INSERT INTO public.challenges (sender_user_id, sender_username, target_score, target_hex)
VALUES ('10000000-0000-0000-0000-000000000011', 'q', 0, '#000000');
SELECT pg_temp.audit_assert(
  EXISTS (
    SELECT 1
    FROM public.challenges
    WHERE sender_user_id = '10000000-0000-0000-0000-000000000011'
      AND sender_username = 'q'
  ),
  'challenge storage rejected a one-character authoritative sender username'
);
SELECT pg_temp.audit_expect_check(
  $short_duplicate_signup$
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      '10000000-0000-0000-0000-000000000012',
      'authenticated', 'authenticated', 'short-duplicate@example.invalid', '', now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"username":"Q"}'::jsonb, now(), now()
    )
  $short_duplicate_signup$,
  'case-insensitive one-character duplicate signup was accepted'
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
  ('10000000-0000-0000-0000-000000000001', 'name_material_velvet_ink', 1),
  ('10000000-0000-0000-0000-000000000001', 'name_motion_haunt_glow', 1),
  ('10000000-0000-0000-0000-000000000001', 'name_motion_haunt_flash', 1),
  ('10000000-0000-0000-0000-000000000001', 'border_signal', 1),
  ('10000000-0000-0000-0000-000000000001', 'cursor_trail_signal_trace', 1),
  ('10000000-0000-0000-0000-000000000001', 'avatar_effect_signal_ring', 1),
  ('10000000-0000-0000-0000-000000000001', 'profile_layout_split_signal', 1);
UPDATE public.profiles
SET equipped_cosmetics = jsonb_build_object(
  'profile_border', 'border_signal',
  'name_material', 'name_material_velvet_ink',
  'name_motion', 'name_motion_haunt_glow'
)
WHERE id = '10000000-0000-0000-0000-000000000001';

SELECT set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);
INSERT INTO audit_results VALUES ('alias_create', public.create_profile_alias('Neon_Handle'));
SELECT pg_temp.audit_assert(
  (SELECT payload->>'success' = 'true' AND payload->>'alias' = 'neon_handle'
   FROM audit_results WHERE name = 'alias_create'),
  'owner could not create a normalized profile alias'
);
INSERT INTO audit_results VALUES ('alias_repeat', public.create_profile_alias('NEON_HANDLE'));
SELECT pg_temp.audit_assert(
  (SELECT payload->>'success' = 'true' FROM audit_results WHERE name = 'alias_repeat'),
  'profile alias creation was not idempotent'
);
INSERT INTO audit_results VALUES ('alias_second', public.create_profile_alias('pixel_room'));
INSERT INTO audit_results VALUES ('alias_cleanup', public.create_profile_alias('cleanup_alias'));
INSERT INTO audit_results VALUES ('alias_fourth', public.create_profile_alias('fourth_alias'));
SELECT pg_temp.audit_assert(
  (SELECT payload->>'success' = 'false' AND payload->>'error' = 'You can have up to 3 aliases.'
   FROM audit_results WHERE name = 'alias_fourth'),
  'profile alias limit was not enforced'
);
INSERT INTO audit_results VALUES ('alias_reserved', public.create_profile_alias('leaderboard'));
INSERT INTO audit_results VALUES ('alias_canonical', public.create_profile_alias('audit_one'));
SELECT pg_temp.audit_assert(
  (SELECT payload->>'success' = 'false' FROM audit_results WHERE name = 'alias_reserved')
    AND (SELECT payload->>'success' = 'false' FROM audit_results WHERE name = 'alias_canonical'),
  'profile aliases bypassed reserved or canonical username protection'
);
INSERT INTO audit_results VALUES ('alias_owner', public.get_my_profile_aliases());
SELECT pg_temp.audit_assert(
  (SELECT payload->>'success' = 'true' AND jsonb_array_length(payload->'aliases') = 3
   FROM audit_results WHERE name = 'alias_owner'),
  'owner alias projection did not return the bounded alias set'
);
INSERT INTO audit_results VALUES ('alias_public', public.get_public_profile_alias('NEON_HANDLE'));
SELECT pg_temp.audit_assert(
  (SELECT payload->>'alias' = 'neon_handle' AND payload->>'username' = 'audit_one'
   FROM audit_results WHERE name = 'alias_public'),
  'public alias resolution did not return the canonical username only'
);
INSERT INTO audit_results VALUES ('alias_delete', public.delete_profile_alias('pixel_room'));
SELECT pg_temp.audit_assert(
  (SELECT payload->>'success' = 'true' FROM audit_results WHERE name = 'alias_delete')
    AND NOT EXISTS (SELECT 1 FROM public.profile_aliases WHERE alias_key = 'pixel_room'),
  'owner could not delete a profile alias'
);
INSERT INTO audit_results VALUES ('d2_equip_font', public.equip_item('name_font_editorial_serif'));
SELECT pg_temp.audit_assert(
  (SELECT payload->>'success' = 'true'
      AND payload->'cosmetics'->>'name_font' = 'name_font_editorial_serif'
      AND payload->'cosmetics'->>'name_material' = 'name_material_velvet_ink'
      AND payload->'cosmetics'->>'name_motion' = 'name_motion_haunt_glow'
      AND payload->'cosmetics'->>'profile_border' = 'border_signal'
   FROM audit_results WHERE name = 'd2_equip_font'),
  'equipping a Name Font did not preserve the other independent layers'
);
INSERT INTO audit_results VALUES ('lean_equip_border', public.equip_item('border_signal'));
SELECT pg_temp.audit_assert(
  (SELECT payload->>'success' = 'true'
      AND payload->'cosmetics'->>'profile_border' = 'border_signal'
      AND payload->'cosmetics'->>'name_font' = 'name_font_editorial_serif'
      AND payload->'cosmetics'->>'name_material' = 'name_material_velvet_ink'
      AND payload->'cosmetics'->>'name_motion' = 'name_motion_haunt_glow'
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
INSERT INTO audit_results VALUES ('d2_equip_material', public.equip_item('name_material_velvet_ink'));
INSERT INTO audit_results VALUES ('d2_equip_motion', public.equip_item('name_motion_haunt_flash'));
INSERT INTO audit_results VALUES ('d2_equip_font_again', public.equip_item('name_font_mono_compact'));
SELECT pg_temp.audit_assert(
  (SELECT payload->'cosmetics'->>'name_font' = 'name_font_mono_compact'
      AND payload->'cosmetics'->>'name_material' = 'name_material_velvet_ink'
      AND payload->'cosmetics'->>'name_motion' = 'name_motion_haunt_flash'
   FROM audit_results WHERE name = 'd2_equip_font_again'),
  'composable Name layers did not preserve each other across atomic equip calls'
);
INSERT INTO audit_results VALUES ('d2_unequip_material', public.unequip_item('name_material'));
SELECT pg_temp.audit_assert(
  (SELECT payload->>'success' = 'true'
      AND NOT (payload->'cosmetics' ? 'name_material')
      AND payload->'cosmetics'->>'name_font' = 'name_font_mono_compact'
      AND payload->'cosmetics'->>'name_motion' = 'name_motion_haunt_flash'
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
      AND payload->'draft'->'appearance'->'colors'->>'accent' = '#CDD2FF'
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

-- Profile Studio must not leave a configuration draft or public identity half
-- updated when one part of the aggregate publish fails.
CREATE TEMP TABLE profile_studio_snapshot AS
SELECT p.bio, c.draft_config_v2, c.published_config_v2, c.updated_at
FROM public.profiles p
JOIN public.profile_configurations c ON c.user_id = p.id
WHERE p.id = '10000000-0000-0000-0000-000000000001';

INSERT INTO audit_results VALUES (
  'profile_studio_atomic_failure',
  public.publish_profile_studio_v2(
    jsonb_set(public.get_my_profile_configuration_v2()->'draft', '{base,signatureColor}', '"#ABC123"'::jsonb, true),
    NULL,
    repeat('x', 161),
    (SELECT updated_at FROM profile_studio_snapshot)
  )
);
SELECT pg_temp.audit_assert(
  (SELECT payload->>'success' = 'false' FROM audit_results WHERE name = 'profile_studio_atomic_failure')
    AND (SELECT p.bio IS NOT DISTINCT FROM s.bio
              AND c.draft_config_v2 IS NOT DISTINCT FROM s.draft_config_v2
              AND c.published_config_v2 IS NOT DISTINCT FROM s.published_config_v2
              AND c.updated_at IS NOT DISTINCT FROM s.updated_at
         FROM profile_studio_snapshot s
         JOIN public.profiles p ON p.id = '10000000-0000-0000-0000-000000000001'
         JOIN public.profile_configurations c ON c.user_id = p.id),
  'Profile Studio publish partially committed before identity validation failed'
);
INSERT INTO audit_results VALUES (
  'config_composition_save',
  public.save_profile_configuration_section(
    'composition',
    jsonb_build_object(
      'templateKey', 'atelier',
      'layoutVariant', 'focus',
      'appearance', jsonb_build_object('colors', jsonb_build_object('accent', '#BADBAD')),
      'signatureColor', '#BADBAD',
      'colorEffectsEnabled', true,
      'background_path', 'backgrounds/other-user.webp'
    ),
    NULL
  )
);
SELECT pg_temp.audit_assert(
  (SELECT payload->>'success' = 'true'
      AND payload->'draft'->>'layoutVariant' = 'focus'
      AND payload->'draft'->>'templateKey' = 'signal'
      AND payload->'draft'->'appearance'->'colors'->>'accent' = '#112233'
      AND payload->'draft'->>'signatureColor' = '#112233'
      AND COALESCE(payload->'draft'->>'colorEffectsEnabled', 'false') = 'false'
   FROM audit_results WHERE name = 'config_composition_save'),
  'composition save accepted appearance or effect keys'
);
INSERT INTO public.profile_entitlements (user_id, entitlement_key, source)
VALUES ('10000000-0000-0000-0000-000000000001', 'atelier_plus', 'security-test');
INSERT INTO audit_results VALUES (
  'config_atelier_save',
  public.save_profile_configuration_section(
    'composition',
    jsonb_build_object('templateKey', 'atelier'),
    NULL
  )
);
SELECT pg_temp.audit_assert(
  (SELECT payload->>'success' = 'true'
      AND payload->'draft'->>'templateKey' = 'atelier'
   FROM audit_results WHERE name = 'config_atelier_save'),
  'an entitled owner could not persist the bounded Atelier template'
);
INSERT INTO audit_results VALUES (
  'config_composition_publish',
  public.publish_profile_configuration_section(
    'composition',
    jsonb_build_object(
      'layoutVariant', 'focus',
      'appearance', jsonb_build_object('colors', jsonb_build_object('accent', '#BADBAD')),
      'signatureColor', '#BADBAD',
      'colorEffectsEnabled', true,
      'background_path', 'backgrounds/other-user.webp'
    ),
    NULL
  )
);
SELECT pg_temp.audit_assert(
  (SELECT payload->>'success' = 'true'
      AND payload->'published'->>'layoutVariant' = 'focus'
      AND payload->'published'->'appearance'->'colors'->>'accent' = '#112233'
      AND payload->'published'->>'signatureColor' = '#112233'
      AND COALESCE(payload->'published'->>'colorEffectsEnabled', 'false') = 'false'
   FROM audit_results WHERE name = 'config_composition_publish'),
  'composition publish accepted appearance or effect keys'
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

-- Milestone 10 rich media remains staged, quota-accounted, owner-scoped, and
-- entitlement-aware. A staff flag is sufficient for this fixture; refunded
-- non-staff accounts are checked below through the public projection.
SELECT pg_temp.audit_assert(
  NOT has_table_privilege('authenticated', 'public.profile_media_assets', 'INSERT')
    AND NOT has_table_privilege('authenticated', 'public.profile_media_assets', 'UPDATE')
    AND NOT has_table_privilege('authenticated', 'public.profile_media_assets', 'DELETE')
    AND has_function_privilege('authenticated', 'public.stage_my_profile_media_asset(text,uuid,text,bigint,text,jsonb)', 'EXECUTE')
    AND has_function_privilege('authenticated', 'public.finalize_my_profile_media_asset(uuid)', 'EXECUTE')
    AND has_function_privilege('authenticated', 'public.select_my_profile_rich_media(uuid,uuid,uuid,uuid,jsonb)', 'EXECUTE')
    AND NOT has_function_privilege('anon', 'public.stage_my_profile_media_asset(text,uuid,text,bigint,text,jsonb)', 'EXECUTE')
    AND NOT has_function_privilege('authenticated', 'public.cleanup_staged_profile_media()', 'EXECUTE'),
  'rich media browser roles crossed the staged upload authority boundary'
);
SELECT pg_temp.audit_assert(
  EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Owners can stage rich profile media'
      AND with_check LIKE '%objects.metadata%'
  ),
  'rich media Storage INSERT policy did not qualify the uploaded object metadata'
);
SELECT pg_temp.audit_expect_error(
  $rich_kind$SELECT public.stage_my_profile_media_asset('background_video', '20000000-0000-0000-0000-000000000002', 'mp3', 1024, 'wrong', '{}'::jsonb)$rich_kind$,
  'rich media staging accepted a mismatched extension'
);
INSERT INTO audit_results VALUES (
  'rich_stage_video',
  public.stage_my_profile_media_asset('background_video', '20000000-0000-0000-0000-000000000002', 'mp4', 1024, 'Security video', '{"width":1920,"height":1080}'::jsonb)
);
-- Exercise the same Storage INSERT boundary used by the browser client. The
-- surrounding audit runs as postgres so it can inspect protected projections;
-- this statement deliberately runs as the authenticated role.
SET LOCAL ROLE authenticated;
INSERT INTO storage.objects (id, bucket_id, name, owner_id, metadata)
VALUES (
  gen_random_uuid(), 'profile_media', '10000000-0000-0000-0000-000000000001/20000000-0000-0000-0000-000000000002.mp4',
  '10000000-0000-0000-0000-000000000001', '{"mimetype":"video/mp4","size":"1024"}'::jsonb
);
RESET ROLE;
INSERT INTO audit_results VALUES (
  'rich_finalize_video',
  public.finalize_my_profile_media_asset('20000000-0000-0000-0000-000000000002')
);
SELECT pg_temp.audit_assert(
  (SELECT payload->>'status' = 'active' FROM audit_results WHERE name = 'rich_finalize_video')
    AND (SELECT status = 'active' FROM public.profile_media_assets WHERE id = '20000000-0000-0000-0000-000000000002'),
  'verified rich media did not become active'
);
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000002","role":"authenticated"}',
  true
);
SELECT pg_temp.audit_expect_error(
  $rich_cross_owner$SELECT public.select_my_profile_rich_media('20000000-0000-0000-0000-000000000002', NULL, NULL, NULL, '{}'::jsonb)$rich_cross_owner$,
  'another owner selected a rich media asset by UUID'
);
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);
INSERT INTO audit_results VALUES (
  'rich_select_video',
  public.select_my_profile_rich_media('20000000-0000-0000-0000-000000000002', NULL, NULL, NULL, '{}'::jsonb)
);
SELECT pg_temp.audit_assert(
  (SELECT payload->>'background_video_path' = 'profile_media/10000000-0000-0000-0000-000000000001/20000000-0000-0000-0000-000000000002.mp4' FROM audit_results WHERE name = 'rich_select_video')
    AND public.get_public_profile_configuration('10000000-0000-0000-0000-000000000001')->>'background_video_path' = 'profile_media/10000000-0000-0000-0000-000000000001/20000000-0000-0000-0000-000000000002.mp4',
  'active rich media selection was not projected for an authorized profile'
);
INSERT INTO audit_results VALUES (
  'rich_stage_bad_mime',
  public.stage_my_profile_media_asset('audio', '20000000-0000-0000-0000-000000000003', 'mp3', 1024, 'Bad audio', '{}'::jsonb)
);
INSERT INTO storage.objects (id, bucket_id, name, owner_id, metadata)
VALUES (
  gen_random_uuid(), 'profile_media', '10000000-0000-0000-0000-000000000001/20000000-0000-0000-0000-000000000003.mp3',
  '10000000-0000-0000-0000-000000000001', '{"mimetype":"video/mp4","size":"1024"}'::jsonb
);
SELECT pg_temp.audit_expect_error(
  $rich_bad_mime$SELECT public.finalize_my_profile_media_asset('20000000-0000-0000-0000-000000000003')$rich_bad_mime$,
  'rich media finalization accepted a malformed MIME type'
);
SELECT public.delete_my_profile_media_asset('20000000-0000-0000-0000-000000000003');
SELECT public.delete_my_profile_media_asset('20000000-0000-0000-0000-000000000002');
SELECT pg_temp.audit_assert(
  NOT EXISTS (SELECT 1 FROM public.profile_media_assets WHERE id = '20000000-0000-0000-0000-000000000002')
    AND public.get_public_profile_configuration('10000000-0000-0000-0000-000000000001')->>'background_video_path' IS NULL,
  'deleting an active rich asset left a public reference behind'
);

-- Stripe fulfillment is service-owned, transactional, and replay-safe.
SELECT pg_temp.audit_assert(
  NOT has_table_privilege('authenticated', 'public.billing_checkout_sessions', 'INSERT')
    AND NOT has_table_privilege('authenticated', 'public.billing_webhook_events', 'SELECT')
    AND NOT has_function_privilege('authenticated', 'public.process_stripe_billing_event(jsonb)', 'EXECUTE'),
  'browser roles received billing or entitlement fulfillment authority'
);
INSERT INTO public.billing_checkout_sessions (
  stripe_checkout_session_id, user_id, status, payment_status
) VALUES (
  'cs_test_security1', '10000000-0000-0000-0000-000000000002', 'open', 'unpaid'
);
INSERT INTO public.profile_configurations (user_id, draft_config, published_config)
SELECT
  '10000000-0000-0000-0000-000000000002',
  public.profile_default_configuration('#445566') || '{"templateKey":"atelier","layoutVariant":"editorial"}'::jsonb,
  public.profile_default_configuration('#445566') || '{"templateKey":"atelier","layoutVariant":"editorial"}'::jsonb
ON CONFLICT (user_id) DO UPDATE SET
  draft_config = EXCLUDED.draft_config,
  published_config = EXCLUDED.published_config;
SELECT pg_temp.audit_expect_error(
  $billing_retry$SELECT public.process_stripe_billing_event(
    '{"id":"evt_retry1","type":"checkout.session.completed","created":1800000000,"data":{"object":{"id":"cs_test_security1","mode":"payment","payment_status":"paid","amount_total":700,"currency":"usd","payment_intent":"pi_security1","customer":"cus_security1","metadata":{"user_id":"10000000-0000-0000-0000-000000000002","entitlement":"chromadie_plus"}}}}'::jsonb
  )$billing_retry$,
  'malformed checkout amount granted premium'
);
SELECT pg_temp.audit_assert(
  NOT EXISTS (SELECT 1 FROM public.billing_webhook_events WHERE stripe_event_id = 'evt_retry1'),
  'failed webhook attempt was committed and prevented a safe retry'
);
INSERT INTO audit_results VALUES (
  'billing_complete',
  public.process_stripe_billing_event(
    '{"id":"evt_retry1","type":"checkout.session.completed","created":1800000000,"data":{"object":{"id":"cs_test_security1","mode":"payment","payment_status":"paid","amount_total":799,"currency":"usd","payment_intent":"pi_security1","customer":"cus_security1","metadata":{"user_id":"10000000-0000-0000-0000-000000000002","entitlement":"chromadie_plus"}}}}'::jsonb
  )
);
INSERT INTO audit_results VALUES (
  'billing_duplicate',
  public.process_stripe_billing_event(
    '{"id":"evt_retry1","type":"checkout.session.completed","created":1800000000,"data":{"object":{"id":"cs_test_security1","mode":"payment","payment_status":"paid","amount_total":799,"currency":"usd","payment_intent":"pi_security1","customer":"cus_security1","metadata":{"user_id":"10000000-0000-0000-0000-000000000002","entitlement":"chromadie_plus"}}}}'::jsonb
  )
);
SELECT pg_temp.audit_assert(
  (SELECT payload->>'outcome' = 'granted' FROM audit_results WHERE name = 'billing_complete')
    AND (SELECT payload->>'duplicate' = 'true' FROM audit_results WHERE name = 'billing_duplicate')
    AND EXISTS (
      SELECT 1 FROM public.profile_entitlements
      WHERE user_id = '10000000-0000-0000-0000-000000000002' AND entitlement_key = 'chromadie_plus'
    )
    AND public.get_public_profile_configuration('10000000-0000-0000-0000-000000000002')->>'templateKey' = 'atelier',
  'completed or duplicate checkout handling did not preserve one premium grant'
);
INSERT INTO audit_results VALUES (
  'billing_refund',
  public.process_stripe_billing_event(
    '{"id":"evt_refund1","type":"charge.refunded","created":1800000100,"data":{"object":{"id":"ch_security1","payment_intent":"pi_security1"}}}'::jsonb
  )
);
SELECT pg_temp.audit_assert(
  (SELECT payload->>'outcome' = 'revoked' FROM audit_results WHERE name = 'billing_refund')
    AND NOT EXISTS (
      SELECT 1 FROM public.profile_entitlements
      WHERE user_id = '10000000-0000-0000-0000-000000000002' AND entitlement_key IN ('chromadie_plus', 'atelier_plus')
    )
    AND EXISTS (
      SELECT 1 FROM public.billing_premium_access
      WHERE user_id = '10000000-0000-0000-0000-000000000002'
        AND active = false AND revoked_reason = 'refund'
        AND recovery_until BETWEEN now() + interval '29 days' AND now() + interval '31 days'
    )
    AND public.get_public_profile_configuration('10000000-0000-0000-0000-000000000002')->>'templateKey' = 'signal',
  'refund did not revoke presentation with a bounded recovery window'
);
INSERT INTO public.billing_checkout_sessions (
  stripe_checkout_session_id, user_id, status, payment_status
) VALUES (
  'cs_test_security2', '10000000-0000-0000-0000-000000000002', 'open', 'unpaid'
);
INSERT INTO audit_results VALUES (
  'billing_early_chargeback',
  public.process_stripe_billing_event(
    '{"id":"evt_dispute2","type":"charge.dispute.created","created":1800000200,"data":{"object":{"id":"dp_security2","payment_intent":"pi_security2"}}}'::jsonb
  )
);
INSERT INTO audit_results VALUES (
  'billing_late_completion',
  public.process_stripe_billing_event(
    '{"id":"evt_complete2","type":"checkout.session.completed","created":1800000100,"data":{"object":{"id":"cs_test_security2","mode":"payment","payment_status":"paid","amount_total":799,"currency":"usd","payment_intent":"pi_security2","customer":"cus_security1","metadata":{"user_id":"10000000-0000-0000-0000-000000000002","entitlement":"chromadie_plus"}}}}'::jsonb
  )
);
SELECT pg_temp.audit_assert(
  (SELECT payload->>'outcome' = 'pending' FROM audit_results WHERE name = 'billing_early_chargeback')
    AND (SELECT payload->>'outcome' = 'revoked' FROM audit_results WHERE name = 'billing_late_completion')
    AND EXISTS (
      SELECT 1 FROM public.billing_premium_access
      WHERE user_id = '10000000-0000-0000-0000-000000000002'
        AND active = false AND revoked_reason = 'chargeback'
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.profile_entitlements
      WHERE user_id = '10000000-0000-0000-0000-000000000002' AND entitlement_key IN ('chromadie_plus', 'atelier_plus')
    ),
  'out-of-order chargeback was lost when checkout completion arrived later'
);
-- Expired refund recovery is service-cleaned; the immediate public projection
-- already omitted the rich selection when the entitlement was revoked.
UPDATE public.billing_premium_access
SET recovery_until = now() - interval '1 minute', updated_at = now()
WHERE user_id = '10000000-0000-0000-0000-000000000002';
INSERT INTO public.profile_media_assets (id, user_id, kind, storage_path, status, mime_type, byte_size, metadata)
VALUES (
  '40000000-0000-0000-0000-000000000004',
  '10000000-0000-0000-0000-000000000002',
  'background_video',
  'profile_media/10000000-0000-0000-0000-000000000002/40000000-0000-0000-0000-000000000004.mp4',
  'active', 'video/mp4', 1024, '{"width":1920,"height":1080}'::jsonb
);
INSERT INTO storage.objects (id, bucket_id, name, owner_id, metadata)
VALUES (
  gen_random_uuid(), 'profile_media', '10000000-0000-0000-0000-000000000002/40000000-0000-0000-0000-000000000004.mp4',
  '10000000-0000-0000-0000-000000000002', '{"mimetype":"video/mp4","size":"1024"}'::jsonb
);
UPDATE public.profile_configurations
SET background_video_path = 'profile_media/10000000-0000-0000-0000-000000000002/40000000-0000-0000-0000-000000000004.mp4'
WHERE user_id = '10000000-0000-0000-0000-000000000002';
SELECT public.cleanup_staged_profile_media();
SELECT pg_temp.audit_assert(
  NOT EXISTS (SELECT 1 FROM public.profile_media_assets WHERE id = '40000000-0000-0000-0000-000000000004')
    AND NOT EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = 'profile_media' AND name LIKE '10000000-0000-0000-0000-000000000002/%'),
  'expired rich media recovery was not cleaned by the service path'
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
    SELECT 1 FROM public.profile_aliases
    WHERE user_id = '10000000-0000-0000-0000-000000000001'
  ),
  'profile aliases did not follow account deletion'
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
