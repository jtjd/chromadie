-- Keep legacy profile expression columns visible through the V2 configuration
-- contract. Avatar/background writes intentionally remain behind the existing
-- owner RPC; this migration only makes the persisted read projection complete.

BEGIN;

CREATE OR REPLACE FUNCTION public.profile_configuration_v2_with_expression(
  p_configuration jsonb,
  p_expression jsonb
)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
SET search_path TO public, pg_catalog
AS $function$
  SELECT
    jsonb_set(
      COALESCE(p_configuration, '{}'::jsonb),
      '{base}',
      COALESCE(p_configuration->'base', '{}'::jsonb) || jsonb_build_object(
        'avatar_path', p_expression->'avatar_path',
        'background_path', p_expression->'background_path',
        'audio_path', p_expression->'audio_path',
        'spotify_type', p_expression->'spotify_type',
        'spotify_id', p_expression->'spotify_id',
        'background_video_path', p_expression->'background_video_path',
        'banner_path', p_expression->'banner_path',
        'cursor_path', p_expression->'cursor_path',
        'pointer_cursor_path', p_expression->'pointer_cursor_path',
        'audio_playlist', p_expression->'audio_playlist'
      ),
      true
    ) || jsonb_build_object(
      'avatar_path', p_expression->'avatar_path',
      'background_path', p_expression->'background_path',
      'audio_path', p_expression->'audio_path',
      'spotify_type', p_expression->'spotify_type',
      'spotify_id', p_expression->'spotify_id',
      'background_video_path', p_expression->'background_video_path',
      'banner_path', p_expression->'banner_path',
      'cursor_path', p_expression->'cursor_path',
      'pointer_cursor_path', p_expression->'pointer_cursor_path',
      'audio_playlist', p_expression->'audio_playlist'
    );
$function$;

REVOKE ALL ON FUNCTION public.profile_configuration_v2_with_expression(jsonb, jsonb) FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_my_profile_configuration_v2()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, pg_catalog
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_record public.profile_configurations%ROWTYPE;
  v_is_staff boolean := false;
  v_expression jsonb;
  v_draft jsonb;
  v_published jsonb;
BEGIN
  IF v_user_id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Not authenticated'); END IF;
  SELECT * INTO v_record FROM public.profile_configurations WHERE user_id = v_user_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Profile not found'); END IF;
  SELECT COALESCE(is_staff, false) INTO v_is_staff FROM public.profiles WHERE id = v_user_id;

  v_expression := jsonb_build_object(
    'avatar_path', v_record.avatar_path,
    'background_path', v_record.background_path,
    'spotify_type', v_record.spotify_type,
    'spotify_id', v_record.spotify_id,
    'audio_path', CASE WHEN v_is_staff THEN v_record.audio_path ELSE NULL END,
    'background_video_path', v_record.background_video_path,
    'banner_path', v_record.banner_path,
    'cursor_path', v_record.cursor_path,
    'pointer_cursor_path', v_record.pointer_cursor_path,
    'audio_playlist', COALESCE(v_record.audio_playlist, '{"tracks":[]}'::jsonb)
  );
  v_draft := public.profile_configuration_v2_with_expression(
    COALESCE(v_record.draft_config_v2, public.profile_configuration_v2_from_v1(v_record.draft_config)),
    v_expression
  );
  v_published := public.profile_configuration_v2_with_expression(
    COALESCE(v_record.published_config_v2, public.profile_configuration_v2_from_v1(v_record.published_config)),
    v_expression
  );

  RETURN jsonb_build_object(
    'success', true,
    'version', 2,
    'draft', v_draft,
    'published', v_published,
    'updated_at', v_record.updated_at,
    'published_at', v_record.published_at
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_public_profile_configuration_v2(p_user_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $function$
  WITH public_projection AS (
    SELECT public.get_public_profile_configuration(p_user_id) AS expression
  ), configuration AS (
    SELECT
      c.published_config_v2,
      public_projection.expression
    FROM public_projection
    LEFT JOIN public.profile_configurations c ON c.user_id = p_user_id
  )
  SELECT CASE
    WHEN expression IS NULL THEN NULL
    ELSE public.profile_configuration_v2_with_expression(
      COALESCE(
        published_config_v2,
        public.profile_configuration_v2_from_v1(expression)
      ),
      expression
    )
  END
  FROM configuration;
$function$;

REVOKE ALL ON FUNCTION public.get_my_profile_configuration_v2() FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.get_my_profile_configuration_v2() TO authenticated;
REVOKE ALL ON FUNCTION public.get_public_profile_configuration_v2(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_profile_configuration_v2(uuid) TO anon, authenticated;

COMMENT ON FUNCTION public.get_my_profile_configuration_v2() IS
  'Owner V2 configuration projection including the dedicated profile expression columns.';
COMMENT ON FUNCTION public.get_public_profile_configuration_v2(uuid) IS
  'Public V2 configuration projection including safe avatar/background expression columns.';

COMMIT;
