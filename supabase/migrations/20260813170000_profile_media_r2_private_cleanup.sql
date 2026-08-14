BEGIN;

-- Promotion normally removes the temporary private copy immediately. These
-- service-only helpers make that removal retryable when R2 has a transient
-- failure, without changing the public asset or its stable URL.
CREATE OR REPLACE FUNCTION public.mark_profile_media_private_cleanup_pending(
  p_user_id uuid,
  p_asset_id uuid,
  p_error text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, pg_catalog
AS $function$
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Control-plane access required.';
  END IF;

  UPDATE public.profile_media_assets
  SET cleanup_at = now(),
      last_error = left(COALESCE(p_error, 'Temporary private R2 cleanup is pending.'), 1000),
      updated_at = now()
  WHERE id = p_asset_id
    AND user_id = p_user_id
    AND storage_provider = 'r2'
    AND status = 'active'
    AND delivery_status = 'ready'
    AND ever_public IS TRUE
    AND NULLIF(r2_private_key, '') IS NOT NULL;

  RETURN jsonb_build_object('success', true, 'asset_id', p_asset_id, 'marked', FOUND);
END;
$function$;

CREATE OR REPLACE FUNCTION public.claim_profile_media_private_cleanup(
  p_limit integer DEFAULT 25
)
RETURNS TABLE (id uuid, user_id uuid, r2_private_key text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, pg_catalog
AS $function$
DECLARE
  v_limit integer := LEAST(100, GREATEST(1, COALESCE(p_limit, 25)));
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Control-plane access required.';
  END IF;

  RETURN QUERY
  WITH candidates AS (
    SELECT asset.id
    FROM public.profile_media_assets asset
    WHERE asset.storage_provider = 'r2'
      AND asset.status = 'active'
      AND asset.delivery_status = 'ready'
      AND asset.ever_public IS TRUE
      AND NULLIF(asset.r2_private_key, '') IS NOT NULL
      AND asset.cleanup_at IS NOT NULL
      AND asset.cleanup_at <= now()
    ORDER BY asset.cleanup_at, asset.updated_at
    FOR UPDATE SKIP LOCKED
    LIMIT v_limit
  )
  UPDATE public.profile_media_assets asset
  SET cleanup_at = now() + interval '15 minutes',
      updated_at = now()
  FROM candidates
  WHERE asset.id = candidates.id
  RETURNING asset.id, asset.user_id, asset.r2_private_key;
END;
$function$;

CREATE OR REPLACE FUNCTION public.complete_profile_media_private_cleanup(
  p_asset_id uuid,
  p_success boolean,
  p_error text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, pg_catalog
AS $function$
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Control-plane access required.';
  END IF;

  IF p_success THEN
    UPDATE public.profile_media_assets
    SET r2_private_key = NULL,
        cleanup_at = NULL,
        last_error = NULL,
        updated_at = now()
    WHERE id = p_asset_id
      AND storage_provider = 'r2'
      AND status = 'active'
      AND ever_public IS TRUE;
  ELSE
    UPDATE public.profile_media_assets
    SET cleanup_at = now() + interval '15 minutes',
        last_error = left(COALESCE(p_error, 'Temporary private R2 cleanup failed.'), 1000),
        updated_at = now()
    WHERE id = p_asset_id
      AND storage_provider = 'r2'
      AND status = 'active'
      AND ever_public IS TRUE;
  END IF;

  RETURN jsonb_build_object('success', true, 'asset_id', p_asset_id, 'completed', FOUND);
END;
$function$;

REVOKE ALL ON FUNCTION public.mark_profile_media_private_cleanup_pending(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_profile_media_private_cleanup(integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_profile_media_private_cleanup(uuid, boolean, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_profile_media_private_cleanup_pending(uuid, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_profile_media_private_cleanup(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_profile_media_private_cleanup(uuid, boolean, text) TO service_role;

COMMIT;
