BEGIN;

-- Migrated R2 assets may retain their original Supabase Storage path during
-- the compatibility window. The control plane removes that one exact object
-- after R2 deletion succeeds; it never accepts a bucket prefix or a broad
-- user directory as a deletion target.
CREATE OR REPLACE FUNCTION public.delete_profile_media_legacy_storage_object(
  p_storage_path text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, storage, pg_catalog
AS $function$
DECLARE
  v_storage_path text := NULLIF(p_storage_path, '');
  v_bucket text;
  v_object_path text;
  v_deleted_count integer := 0;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Control-plane access required.';
  END IF;

  IF v_storage_path IS NULL THEN
    RETURN jsonb_build_object('success', true, 'deleted', false, 'storage_path', NULL);
  END IF;

  v_bucket := split_part(v_storage_path, '/', 1);
  v_object_path := regexp_replace(v_storage_path, '^[^/]+/', '');
  IF v_bucket NOT IN ('avatars', 'backgrounds', 'profile_audio', 'profile_media')
     OR v_object_path IS NULL
     OR v_object_path = ''
     OR v_object_path ~ '(^|/)\.\.?(/|$)' THEN
    RETURN jsonb_build_object('success', false, 'error', 'The legacy profile media path is invalid.');
  END IF;

  PERFORM set_config('storage.allow_delete_query', 'true', true);
  DELETE FROM storage.objects
  WHERE bucket_id = v_bucket
    AND name = v_object_path;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN jsonb_build_object(
    'success', true,
    'deleted', v_deleted_count > 0,
    'storage_path', v_storage_path
  );
END;
$function$;

-- Account deletion must capture legacy paths before profile media metadata is
-- cascaded away. The queue keeps the exact path alongside R2 objects so a
-- later retry can remove both providers independently and idempotently.
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
  IF p_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT id INTO v_job_id
  FROM public.profile_media_account_cleanup_jobs
  WHERE user_id = p_user_id
    AND status IN ('pending', 'processing', 'retry')
  ORDER BY created_at DESC
  LIMIT 1;
  IF v_job_id IS NOT NULL THEN
    RETURN v_job_id;
  END IF;

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
    UNION
    SELECT DISTINCT 'supabase'::text AS bucket, storage_path AS object_key
    FROM public.profile_media_assets
    WHERE user_id = p_user_id AND NULLIF(storage_path, '') IS NOT NULL
  ) objects;

  IF jsonb_array_length(v_object_keys) = 0 THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.profile_media_account_cleanup_jobs (user_id, object_keys)
  VALUES (p_user_id, v_object_keys)
  RETURNING id INTO v_job_id;
  RETURN v_job_id;
END;
$function$;

-- Retain the legacy path in the deleted tombstone until the control plane has
-- removed it. A retry can therefore recover from either provider failing.
DROP FUNCTION IF EXISTS public.claim_profile_media_deleted_cleanup_v2(integer);

CREATE OR REPLACE FUNCTION public.claim_profile_media_deleted_cleanup_v2(
  p_limit integer DEFAULT 25
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  storage_path text,
  r2_private_key text,
  r2_public_key text,
  cache_purge_required boolean,
  cache_purge_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, pg_catalog
AS $function$
DECLARE
  v_limit integer := LEAST(100, GREATEST(1, coalesce(p_limit, 25)));
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Control-plane access required.';
  END IF;

  RETURN QUERY
  WITH candidates AS (
    SELECT asset.id
    FROM public.profile_media_assets asset
    WHERE asset.storage_provider = 'r2'
      AND asset.status = 'deleted'
      AND asset.cleanup_at IS NOT NULL
      AND asset.cleanup_at <= now()
    ORDER BY asset.cleanup_at, asset.updated_at
    FOR UPDATE SKIP LOCKED
    LIMIT v_limit
  )
  UPDATE public.profile_media_assets asset
  SET cleanup_at = now() + interval '15 minutes',
      cache_purge_status = CASE
        WHEN NULLIF(asset.r2_public_key, '') IS NOT NULL
             AND asset.cache_purge_status <> 'completed' THEN 'processing'
        ELSE asset.cache_purge_status
      END,
      cache_purge_at = CASE
        WHEN NULLIF(asset.r2_public_key, '') IS NOT NULL
             AND asset.cache_purge_status <> 'completed' THEN now()
        ELSE asset.cache_purge_at
      END,
      updated_at = now()
  FROM candidates
  WHERE asset.id = candidates.id
  RETURNING asset.id,
    asset.user_id,
    asset.storage_path,
    asset.r2_private_key,
    asset.r2_public_key,
    NULLIF(asset.r2_public_key, '') IS NOT NULL,
    asset.cache_purge_status;
END;
$function$;

REVOKE ALL ON FUNCTION public.delete_profile_media_legacy_storage_object(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_profile_media_legacy_storage_object(text) TO service_role;
REVOKE ALL ON FUNCTION public.claim_profile_media_deleted_cleanup_v2(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_profile_media_deleted_cleanup_v2(integer) TO service_role;

COMMIT;
