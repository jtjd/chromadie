-- Keep Profile Studio's optimistic publish token current after an owner saves
-- avatar, background, or Spotify through the expression RPC.  Media saves are
-- intentionally independent of the structured draft, but they still update
-- profile_configurations.updated_at; returning that token prevents the next
-- publish from being reported as a false "changed in another tab" conflict.

BEGIN;

CREATE OR REPLACE FUNCTION public.update_my_profile_expression(
  p_avatar_path text,
  p_background_path text,
  p_spotify_url text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_avatar_path text := NULLIF(btrim(p_avatar_path), '');
  v_background_path text := NULLIF(btrim(p_background_path), '');
  v_spotify_url text := NULLIF(btrim(p_spotify_url), '');
  v_spotify_match text[];
  v_spotify_type text;
  v_spotify_id text;
  v_signature_color text;
  v_default jsonb;
  v_updated_at timestamptz;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '28000', MESSAGE = 'Not authenticated';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_user_id) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Profile not found';
  END IF;

  IF v_avatar_path IS NOT NULL
     AND v_avatar_path <> 'avatars/' || v_user_id::text || '/avatar.webp'
     AND NOT EXISTS (
       SELECT 1 FROM public.profile_media_assets
       WHERE user_id = v_user_id AND kind = 'avatar' AND storage_path = v_avatar_path
     ) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'That profile expression is not valid.';
  END IF;

  IF v_background_path IS NOT NULL
     AND v_background_path <> 'backgrounds/' || v_user_id::text || '/background.webp'
     AND NOT EXISTS (
       SELECT 1 FROM public.profile_media_assets
       WHERE user_id = v_user_id AND kind = 'background' AND storage_path = v_background_path
     ) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'That profile expression is not valid.';
  END IF;

  IF v_spotify_url IS NOT NULL THEN
    v_spotify_match := regexp_match(
      v_spotify_url,
      '^https://open[.]spotify[.]com/(track|playlist|album)/([A-Za-z0-9]{22})/?([?][^#[:space:]]*)?$'
    );
    IF v_spotify_match IS NULL THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'That Spotify URL is not supported.';
    END IF;
    v_spotify_type := v_spotify_match[1];
    v_spotify_id := v_spotify_match[2];
  END IF;

  SELECT mood_color INTO v_signature_color FROM public.profiles WHERE id = v_user_id;
  v_default := public.profile_default_configuration(v_signature_color);

  INSERT INTO public.profile_configurations (user_id, draft_config, published_config)
  VALUES (v_user_id, v_default, v_default)
  ON CONFLICT (user_id) DO NOTHING;

  UPDATE public.profile_configurations
  SET avatar_path = v_avatar_path,
      background_path = v_background_path,
      spotify_type = v_spotify_type,
      spotify_id = v_spotify_id,
      updated_at = now()
  WHERE user_id = v_user_id
  RETURNING updated_at INTO v_updated_at;

  RETURN jsonb_build_object(
    'success', true,
    'avatar_path', v_avatar_path,
    'background_path', v_background_path,
    'spotify_type', v_spotify_type,
    'spotify_id', v_spotify_id,
    'updated_at', v_updated_at
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.update_my_profile_expression(text, text, text) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.update_my_profile_expression(text, text, text) TO authenticated;

COMMIT;
