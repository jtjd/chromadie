BEGIN;

-- Supabase is the profile-media control plane only. Historical migrations
-- created Storage-backed RPCs and a profile-delete trigger; leave their names
-- in place for migration compatibility, but make the active runtime unable to
-- inspect, delete, verify, or select Supabase Storage objects.
CREATE OR REPLACE FUNCTION public.delete_profile_expression_media()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, pg_catalog
AS $function$
BEGIN
  -- Account deletion queues R2 keys through the current control-plane path.
  -- This trigger must never perform media-provider I/O.
  RETURN OLD;
END;
$function$;

REVOKE ALL ON FUNCTION public.delete_profile_expression_media() FROM PUBLIC, anon, authenticated, service_role;

-- Account deletion captures only R2 objects. A historical storage_path may
-- remain on a metadata row, but it is never placed into a cleanup job and can
-- never become a provider operation.
CREATE OR REPLACE FUNCTION public.profile_media_account_cleanup_enqueue_internal(p_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, pg_catalog
AS $function$
DECLARE
  v_job_id uuid;
  v_object_keys jsonb;
BEGIN
  IF p_user_id IS NULL THEN RETURN NULL; END IF;

  SELECT id INTO v_job_id
  FROM public.profile_media_account_cleanup_jobs
  WHERE user_id = p_user_id AND status IN ('pending', 'processing', 'retry')
  ORDER BY created_at DESC
  LIMIT 1;
  IF v_job_id IS NOT NULL THEN RETURN v_job_id; END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('bucket', bucket, 'key', object_key) ORDER BY bucket, object_key), '[]'::jsonb)
  INTO v_object_keys
  FROM (
    SELECT DISTINCT 'private'::text AS bucket, r2_private_key AS object_key
    FROM public.profile_media_assets
    WHERE user_id = p_user_id AND NULLIF(r2_private_key, '') IS NOT NULL
    UNION
    SELECT DISTINCT 'public'::text AS bucket, r2_public_key AS object_key
    FROM public.profile_media_assets
    WHERE user_id = p_user_id AND NULLIF(r2_public_key, '') IS NOT NULL
  ) objects;

  IF jsonb_array_length(v_object_keys) = 0 THEN RETURN NULL; END IF;
  INSERT INTO public.profile_media_account_cleanup_jobs (user_id, object_keys)
  VALUES (p_user_id, v_object_keys)
  RETURNING id INTO v_job_id;
  RETURN v_job_id;
END;
$function$;

-- Keep retired signatures inert for old database references. They contain no
-- provider operation and are not executable by application roles below.
CREATE OR REPLACE FUNCTION public.register_my_profile_media_asset(p_kind text, p_asset_id uuid, p_label text DEFAULT '')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, pg_catalog
AS $function$
BEGIN
  PERFORM p_kind, p_asset_id, p_label;
  RAISE EXCEPTION USING ERRCODE = '0A000', MESSAGE = 'Profile media uploads must use the R2 control plane.';
END;
$function$;

CREATE OR REPLACE FUNCTION public.stage_my_profile_media_asset(p_kind text, p_asset_id uuid, p_extension text, p_byte_size bigint, p_label text DEFAULT '', p_metadata jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, pg_catalog
AS $function$
BEGIN
  PERFORM p_kind, p_asset_id, p_extension, p_byte_size, p_label, p_metadata;
  RAISE EXCEPTION USING ERRCODE = '0A000', MESSAGE = 'Profile media uploads must use the R2 control plane.';
END;
$function$;

CREATE OR REPLACE FUNCTION public.finalize_my_profile_media_asset(p_asset_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, pg_catalog
AS $function$
BEGIN
  PERFORM p_asset_id;
  RAISE EXCEPTION USING ERRCODE = '0A000', MESSAGE = 'Profile media verification is owned by the R2 control plane.';
END;
$function$;

CREATE OR REPLACE FUNCTION public.stage_my_profile_media_replacement(p_kind text, p_asset_id uuid, p_extension text, p_byte_size bigint, p_replace_asset_id uuid, p_label text DEFAULT '', p_metadata jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, pg_catalog
AS $function$
BEGIN
  PERFORM p_kind, p_asset_id, p_extension, p_byte_size, p_replace_asset_id, p_label, p_metadata;
  RAISE EXCEPTION USING ERRCODE = '0A000', MESSAGE = 'Profile media replacements must use the R2 control plane.';
END;
$function$;

CREATE OR REPLACE FUNCTION public.commit_my_profile_media_replacement(p_kind text, p_old_asset_id uuid, p_new_asset_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, pg_catalog
AS $function$
BEGIN
  PERFORM p_kind, p_old_asset_id, p_new_asset_id;
  RAISE EXCEPTION USING ERRCODE = '0A000', MESSAGE = 'Profile media replacements must use the R2 control plane.';
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_my_profile_audio(p_audio_path text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, pg_catalog
AS $function$
BEGIN
  PERFORM p_audio_path;
  RAISE EXCEPTION USING ERRCODE = '0A000', MESSAGE = 'Profile audio must use the R2 control plane.';
END;
$function$;

CREATE OR REPLACE FUNCTION public.cleanup_staged_profile_media()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, pg_catalog
AS $function$
BEGIN
  RAISE EXCEPTION USING ERRCODE = '0A000', MESSAGE = 'Profile media cleanup is owned by the R2 control plane.';
END;
$function$;

CREATE OR REPLACE FUNCTION public.delete_profile_media_legacy_storage_object(p_storage_path text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, pg_catalog
AS $function$
BEGIN
  RETURN jsonb_build_object('success', false, 'deleted', false, 'unavailable', true, 'storage_path', NULLIF(btrim(p_storage_path), ''));
END;
$function$;

-- R2 upload-intent, complete, promote, selection, and deletion are the only
-- active profile-media paths.
REVOKE ALL ON FUNCTION public.register_my_profile_media_asset(text, uuid, text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.stage_my_profile_media_asset(text, uuid, text, bigint, text, jsonb) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.finalize_my_profile_media_asset(uuid) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.stage_my_profile_media_replacement(text, uuid, text, bigint, uuid, text, jsonb) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.commit_my_profile_media_replacement(text, uuid, uuid) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.update_my_profile_audio(text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.cleanup_staged_profile_media() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.delete_profile_media_legacy_storage_object(text) FROM PUBLIC, anon, authenticated, service_role;

COMMIT;
