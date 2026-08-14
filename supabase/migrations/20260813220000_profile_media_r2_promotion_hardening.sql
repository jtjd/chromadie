BEGIN;

-- The direct R2 intent path keeps the public key empty until promotion. Record
-- the immutable destination key in the same database transition that marks an
-- asset public; otherwise selection could resolve a ready asset without a
-- public delivery reference.
CREATE OR REPLACE FUNCTION public.mark_my_profile_media_public(
  p_user_id uuid,
  p_asset_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, pg_temp
AS $function$
DECLARE
  v_asset public.profile_media_assets%ROWTYPE;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Control-plane access required.';
  END IF;

  UPDATE public.profile_media_assets
  SET r2_public_key = coalesce(r2_public_key, r2_private_key),
      ever_public = true,
      public_ready_at = coalesce(public_ready_at, now()),
      updated_at = now()
  WHERE id = p_asset_id
    AND user_id = p_user_id
    AND storage_provider = 'r2'
    AND status = 'active'
    AND delivery_status = 'ready'
    AND nullif(r2_private_key, '') IS NOT NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Media asset is not ready for publication.');
  END IF;

  SELECT * INTO v_asset
  FROM public.profile_media_assets
  WHERE id = p_asset_id;

  RETURN jsonb_build_object(
    'success', true,
    'asset_id', v_asset.id,
    'r2_public_key', v_asset.r2_public_key,
    'ever_public', v_asset.ever_public,
    'public_ready_at', v_asset.public_ready_at
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.mark_my_profile_media_public(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_my_profile_media_public(uuid, uuid) TO service_role;

COMMIT;
