BEGIN;

-- The legacy staff-audio path has no profile_media_assets row. The historical
-- object is intentionally not requested by the application; this RPC clears
-- the exact metadata reference so the user can re-upload the asset to R2.
CREATE OR REPLACE FUNCTION public.clear_my_legacy_profile_audio(p_audio_path text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, pg_temp
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_audio_path text := NULLIF(btrim(p_audio_path), '');
  v_expected_path text;
  v_updated_at timestamptz;
  v_cleared boolean := false;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '28000', MESSAGE = 'Not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = v_user_id AND is_staff = true
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Profile audio is currently available to staff accounts only.';
  END IF;

  v_expected_path := 'profile_audio/' || v_user_id::text || '/profile.mp3';
  IF v_audio_path IS DISTINCT FROM v_expected_path THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'That legacy profile audio path is not valid.';
  END IF;

  UPDATE public.profile_configurations
  SET audio_path = NULL,
      updated_at = now()
  WHERE user_id = v_user_id
    AND audio_path = v_expected_path
  RETURNING updated_at INTO v_updated_at;

  v_cleared := FOUND;
  RETURN jsonb_build_object(
    'success', true,
    'cleared', v_cleared,
    'audio_path', NULL,
    'updated_at', v_updated_at
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.clear_my_legacy_profile_audio(text) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.clear_my_legacy_profile_audio(text) TO authenticated;

COMMIT;
