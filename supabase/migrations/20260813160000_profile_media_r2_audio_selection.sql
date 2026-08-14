BEGIN;

-- Standalone profile audio is a staff-only expression slot and is separate
-- from the optional playlist. Give it the same ready/public R2 selection
-- contract as avatar and background without changing the legacy RPC used by
-- the rollback path.
CREATE OR REPLACE FUNCTION public.select_my_profile_audio_asset(
  p_audio_id uuid DEFAULT NULL,
  p_clear_audio boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, pg_catalog
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_audio public.profile_media_assets%ROWTYPE;
  v_record public.profile_configurations%ROWTYPE;
  v_updated_at timestamptz;
  v_is_staff boolean := false;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '28000', MESSAGE = 'Not authenticated';
  END IF;

  SELECT COALESCE(is_staff, false)
  INTO v_is_staff
  FROM public.profiles
  WHERE id = v_user_id;
  IF NOT v_is_staff THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Profile audio is not available for this account.';
  END IF;

  IF p_audio_id IS NOT NULL AND NOT p_clear_audio THEN
    SELECT * INTO v_audio
    FROM public.profile_media_assets
    WHERE id = p_audio_id
      AND user_id = v_user_id
      AND kind = 'audio'
      AND status = 'active'
      AND delivery_status = 'ready'
      AND (storage_provider = 'supabase' OR ever_public IS TRUE);
    IF NOT FOUND THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'That audio asset is not available.';
    END IF;
  END IF;

  UPDATE public.profile_configurations
  SET audio_asset_id = CASE
        WHEN p_clear_audio THEN NULL
        WHEN p_audio_id IS NOT NULL THEN p_audio_id
        ELSE audio_asset_id
      END,
      audio_path = CASE
        WHEN p_clear_audio THEN NULL
        WHEN p_audio_id IS NOT NULL AND v_audio.storage_provider = 'supabase' THEN v_audio.storage_path
        WHEN p_audio_id IS NOT NULL THEN NULL
        ELSE audio_path
      END,
      updated_at = CASE
        WHEN p_clear_audio OR p_audio_id IS NOT NULL THEN now()
        ELSE updated_at
      END
  WHERE user_id = v_user_id
  RETURNING updated_at INTO v_updated_at;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Profile configuration not found.';
  END IF;

  SELECT * INTO v_record FROM public.profile_configurations WHERE user_id = v_user_id;
  RETURN jsonb_build_object(
    'success', true,
    'audio_path', v_record.audio_path,
    'audio_asset_id', v_record.audio_asset_id,
    'media_references', public.profile_media_expression_projection(v_record, true, true, false)->'media_references',
    'updated_at', v_updated_at
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.select_my_profile_audio_asset(uuid, boolean) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.select_my_profile_audio_asset(uuid, boolean) TO authenticated;

COMMIT;
