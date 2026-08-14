BEGIN;

-- Explicit asset deletion is allowed to finish its database side even when
-- Cloudflare is temporarily unavailable. Deleted rows retain their immutable
-- keys until a service retry removes both possible copies.
CREATE OR REPLACE FUNCTION public.claim_profile_media_deleted_cleanup(
  p_limit integer DEFAULT 25
)
RETURNS TABLE (id uuid, user_id uuid, r2_private_key text, r2_public_key text)
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
      AND asset.status = 'deleted'
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
  RETURNING asset.id, asset.user_id, asset.r2_private_key, asset.r2_public_key;
END;
$function$;

CREATE OR REPLACE FUNCTION public.complete_profile_media_deleted_cleanup(
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
    DELETE FROM public.profile_media_assets
    WHERE id = p_asset_id AND storage_provider = 'r2' AND status = 'deleted';
  ELSE
    UPDATE public.profile_media_assets
    SET cleanup_at = now() + interval '15 minutes',
        last_error = left(COALESCE(p_error, 'R2 asset deletion failed.'), 1000),
        updated_at = now()
    WHERE id = p_asset_id AND storage_provider = 'r2' AND status = 'deleted';
  END IF;

  RETURN jsonb_build_object('success', true, 'asset_id', p_asset_id, 'completed', FOUND);
END;
$function$;

REVOKE ALL ON FUNCTION public.claim_profile_media_deleted_cleanup(integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_profile_media_deleted_cleanup(uuid, boolean, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_profile_media_deleted_cleanup(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_profile_media_deleted_cleanup(uuid, boolean, text) TO service_role;

COMMIT;
