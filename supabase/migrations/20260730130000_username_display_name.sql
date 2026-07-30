-- The account username is the single public display name.
-- Keep the legacy column for additive compatibility, but do not allow a
-- second user-controlled name to diverge from username.

BEGIN;

UPDATE public.profiles
SET display_name = username
WHERE display_name IS DISTINCT FROM username;

CREATE OR REPLACE FUNCTION public.update_my_profile_identity(
  p_display_name text,
  p_bio text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_bio text;
  v_username text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '28000', MESSAGE = 'Not authenticated';
  END IF;

  v_bio := public.normalize_profile_identity_text(p_bio, 'Bio', 160);

  UPDATE public.profiles
  SET display_name = username,
      bio = v_bio
  WHERE id = v_user_id
  RETURNING username INTO v_username;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Profile not found';
  END IF;

  RETURN jsonb_build_object(
    'username', v_username,
    'display_name', v_username,
    'bio', v_bio
  );
END;
$function$;

COMMENT ON FUNCTION public.update_my_profile_identity(text, text) IS
  'Authenticated public-identity boundary. Username is the sole display name; only the optional plain-text bio is user-editable.';

COMMIT;
