\set ON_ERROR_STOP on
BEGIN;
CREATE FUNCTION pg_temp.assert_slot(ok boolean, message text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION '%', message; END IF; END;
$$;
INSERT INTO auth.users (id, aud, role, email, raw_app_meta_data, raw_user_meta_data)
VALUES ('a1260000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'media-slot@example.invalid', '{"provider":"email"}', '{"username":"mediaslottest"}');
INSERT INTO public.profile_configurations(user_id, draft_config, published_config)
VALUES ('a1260000-0000-4000-8000-000000000001', public.profile_default_configuration('#445566'), public.profile_default_configuration('#445566')) ON CONFLICT DO NOTHING;
SELECT set_config('request.jwt.claim.sub','a1260000-0000-4000-8000-000000000001', true);
SELECT set_config('request.jwt.claim.role','authenticated', true);

-- Existing files survive migration; one is old/unverified, the new one verified.
INSERT INTO public.profile_media_assets (id,user_id,kind,storage_provider,status,delivery_status,r2_public_key,ever_public,content_hash_sha256,content_validation_version,mime_type,byte_size)
SELECT ('a1260000-0000-4000-8000-00000000000' || n)::uuid,
 'a1260000-0000-4000-8000-000000000001', CASE WHEN n = 4 THEN 'background' ELSE 'avatar' END,
 'r2','active','ready','profiles/slot-test/' || n || '.webp',true,repeat('a',64),CASE WHEN n = 2 THEN 0 ELSE 1 END,'image/webp',100
FROM generate_series(2,5) n;
UPDATE public.profile_configurations SET avatar_asset_id='a1260000-0000-4000-8000-000000000002', background_asset_id='a1260000-0000-4000-8000-000000000004'
WHERE user_id=auth.uid();

-- Invalid or foreign selection cannot retire the current file.
DO $$ BEGIN
 BEGIN
  PERFORM public.select_my_profile_expression_assets('a1260000-0000-4000-8000-000000000099',NULL,false,false);
  RAISE EXCEPTION 'invalid selection accepted';
 EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 BEGIN
  PERFORM public.select_my_profile_expression_assets('a1260000-0000-4000-8000-000000000002',NULL,false,false);
  RAISE EXCEPTION 'unverified selection accepted';
 EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
END $$;
SELECT pg_temp.assert_slot((SELECT count(*)=4 FROM public.profile_media_assets WHERE user_id=auth.uid() AND status='active'),'failed selection deleted media');
SET LOCAL ROLE authenticated;
SELECT public.select_my_profile_expression_assets('a1260000-0000-4000-8000-000000000003',NULL,false,false);
RESET ROLE;
SELECT pg_temp.assert_slot((SELECT count(*)=1 FROM public.profile_media_assets WHERE user_id=auth.uid() AND kind='avatar' AND status='active'),'free avatar did not replace old files');
SELECT pg_temp.assert_slot((SELECT count(*)=2 FROM public.profile_media_assets WHERE user_id=auth.uid() AND status='deleted' AND cleanup_at IS NOT NULL),'retired files missing durable cleanup');
SELECT pg_temp.assert_slot((SELECT background_asset_id='a1260000-0000-4000-8000-000000000004' FROM public.profile_configurations WHERE user_id=auth.uid()),'avatar replacement changed background');

-- One candidate per slot; a second tab cannot build a library of pending files.
CREATE TEMP TABLE slot_candidate AS SELECT public.prepare_my_profile_media_upload_r2('avatar','webp','image/webp',100,repeat('b',64)) AS result;
DO $$ BEGIN
 BEGIN
  PERFORM public.prepare_my_profile_media_upload_r2('avatar','webp','image/webp',100,repeat('c',64));
  RAISE EXCEPTION 'second concurrent candidate accepted';
 EXCEPTION WHEN object_not_in_prerequisite_state THEN NULL; END;
END $$;
SELECT pg_temp.assert_slot((SELECT avatar_asset_id='a1260000-0000-4000-8000-000000000003' FROM public.profile_configurations WHERE user_id=auth.uid()),'upload intent displaced equipped avatar');
UPDATE public.profile_media_assets SET created_at=now()-interval '16 minutes' WHERE id=(SELECT (result->>'asset_id')::uuid FROM slot_candidate);
SELECT public.prepare_my_profile_media_upload_r2('avatar','webp','image/webp',100,repeat('c',64));
SELECT pg_temp.assert_slot((SELECT status='deleted' FROM public.profile_media_assets WHERE id=(SELECT (result->>'asset_id')::uuid FROM slot_candidate)),'expired candidate not queued for deletion');

-- Paid retention is server-authoritative and stays compatible with Plus.
INSERT INTO public.profile_entitlements(user_id,entitlement_key) VALUES(auth.uid(),'chromadie_plus');
INSERT INTO public.billing_premium_access(user_id,active) VALUES(auth.uid(),true);
UPDATE public.profile_media_assets SET status='active', deleted_at=NULL, cleanup_at=NULL WHERE id='a1260000-0000-4000-8000-000000000005';
SELECT public.select_my_profile_expression_assets('a1260000-0000-4000-8000-000000000005',NULL,false,false);
SELECT pg_temp.assert_slot((SELECT status='active' FROM public.profile_media_assets WHERE id='a1260000-0000-4000-8000-000000000003'),'Plus replacement deleted saved avatar');
SELECT public.select_my_profile_expression_assets(NULL,NULL,true,false);
SELECT pg_temp.assert_slot((SELECT status='active' FROM public.profile_media_assets WHERE id='a1260000-0000-4000-8000-000000000005'),'Plus unequip deleted saved avatar');
UPDATE public.billing_premium_access SET active=false WHERE user_id=auth.uid();
SELECT public.select_my_profile_expression_assets(NULL,NULL,false,true);
SELECT pg_temp.assert_slot((SELECT status='deleted' FROM public.profile_media_assets WHERE id='a1260000-0000-4000-8000-000000000004'),'free remove did not delete background');
ROLLBACK;
