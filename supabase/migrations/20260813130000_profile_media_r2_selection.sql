BEGIN;

CREATE OR REPLACE FUNCTION public.select_my_profile_expression_assets(
  p_avatar_id uuid DEFAULT NULL,
  p_background_id uuid DEFAULT NULL,
  p_clear_avatar boolean DEFAULT false,
  p_clear_background boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, pg_catalog
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_avatar public.profile_media_assets%ROWTYPE;
  v_background public.profile_media_assets%ROWTYPE;
  v_record public.profile_configurations%ROWTYPE;
  v_profile public.profiles%ROWTYPE;
  v_updated_at timestamptz;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION USING ERRCODE = '28000', MESSAGE = 'Not authenticated'; END IF;
  SELECT * INTO v_record FROM public.profile_configurations WHERE user_id = v_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Profile configuration not found.'; END IF;

  IF p_avatar_id IS NOT NULL THEN
    SELECT * INTO v_avatar FROM public.profile_media_assets
    WHERE id = p_avatar_id AND user_id = v_user_id AND kind = 'avatar' AND status = 'active'
      AND delivery_status = 'ready' AND (storage_provider = 'supabase' OR ever_public IS TRUE);
    IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'That avatar is not available.'; END IF;
  END IF;
  IF p_background_id IS NOT NULL THEN
    SELECT * INTO v_background FROM public.profile_media_assets
    WHERE id = p_background_id AND user_id = v_user_id AND kind = 'background' AND status = 'active'
      AND delivery_status = 'ready' AND (storage_provider = 'supabase' OR ever_public IS TRUE);
    IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'That background is not available.'; END IF;
  END IF;

  UPDATE public.profile_configurations
  SET avatar_asset_id = CASE WHEN p_clear_avatar THEN NULL WHEN p_avatar_id IS NOT NULL THEN p_avatar_id ELSE avatar_asset_id END,
      background_asset_id = CASE WHEN p_clear_background THEN NULL WHEN p_background_id IS NOT NULL THEN p_background_id ELSE background_asset_id END,
      avatar_path = CASE WHEN p_clear_avatar THEN NULL WHEN p_avatar_id IS NOT NULL THEN CASE WHEN v_avatar.storage_provider = 'supabase' THEN v_avatar.storage_path ELSE NULL END ELSE avatar_path END,
      background_path = CASE WHEN p_clear_background THEN NULL WHEN p_background_id IS NOT NULL THEN CASE WHEN v_background.storage_provider = 'supabase' THEN v_background.storage_path ELSE NULL END ELSE background_path END,
      updated_at = CASE WHEN p_clear_avatar OR p_clear_background OR p_avatar_id IS NOT NULL OR p_background_id IS NOT NULL THEN now() ELSE updated_at END
  WHERE user_id = v_user_id
  RETURNING updated_at INTO v_updated_at;

  SELECT * INTO v_record FROM public.profile_configurations WHERE user_id = v_user_id;
  SELECT * INTO v_profile FROM public.profiles WHERE id = v_user_id;
  RETURN jsonb_build_object(
    'success', true,
    'avatar_path', v_record.avatar_path,
    'background_path', v_record.background_path,
    'avatar_asset_id', v_record.avatar_asset_id,
    'background_asset_id', v_record.background_asset_id,
    'media_references', public.profile_media_expression_projection(v_record, COALESCE(v_profile.is_staff, false), true, false)->'media_references',
    'updated_at', v_updated_at
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.select_my_profile_r2_media(
  p_background_video_id uuid DEFAULT NULL,
  p_banner_id uuid DEFAULT NULL,
  p_cursor_id uuid DEFAULT NULL,
  p_pointer_cursor_id uuid DEFAULT NULL,
  p_audio_config jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, pg_catalog
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_source jsonb := CASE WHEN jsonb_typeof(p_audio_config) = 'object' THEN p_audio_config ELSE '{}'::jsonb END;
  v_tracks jsonb := '[]'::jsonb;
  v_track jsonb;
  v_asset public.profile_media_assets%ROWTYPE;
  v_id uuid;
  v_seen uuid[] := ARRAY[]::uuid[];
  v_index integer := 0;
  v_background_video public.profile_media_assets%ROWTYPE;
  v_banner public.profile_media_assets%ROWTYPE;
  v_cursor public.profile_media_assets%ROWTYPE;
  v_pointer public.profile_media_assets%ROWTYPE;
  v_playlist jsonb;
  v_record public.profile_configurations%ROWTYPE;
  v_updated_at timestamptz;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION USING ERRCODE = '28000', MESSAGE = 'Not authenticated'; END IF;
  IF NOT public.profile_rich_media_access(v_user_id) THEN RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Rich profile media requires Chromadie Plus.'; END IF;

  FOR v_id, v_track IN
    SELECT CASE WHEN value->>'asset_id' ~* '^[0-9a-f-]{36}$' THEN (value->>'asset_id')::uuid END, value
    FROM jsonb_array_elements(COALESCE(v_source->'tracks', '[]'::jsonb)) value
    LIMIT 6
  LOOP
    IF v_id IS NULL OR v_id = ANY(v_seen) THEN RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Audio tracks must be unique library assets.'; END IF;
    v_seen := array_append(v_seen, v_id);
    SELECT * INTO v_asset FROM public.profile_media_assets
    WHERE id = v_id AND user_id = v_user_id AND kind = 'audio' AND status = 'active'
      AND delivery_status = 'ready' AND (storage_provider = 'supabase' OR ever_public IS TRUE);
    IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'That audio track is not available.'; END IF;
    v_tracks := v_tracks || jsonb_build_array(jsonb_build_object(
      'asset_id', v_asset.id,
      'path', v_asset.storage_path,
      'label', left(COALESCE(v_asset.label, 'Track ' || (v_index + 1)::text), 80),
      'duration_ms', COALESCE(v_asset.duration_ms, 0),
      'trim_start_ms', GREATEST(0, LEAST(
        CASE WHEN v_track->>'trim_start_ms' ~ '^-?[0-9]{1,9}$' THEN (v_track->>'trim_start_ms')::integer ELSE 0 END,
        COALESCE(v_asset.duration_ms, 86400000)
      )),
      'trim_end_ms', GREATEST(0, LEAST(
        CASE WHEN v_track->>'trim_end_ms' ~ '^-?[0-9]{1,9}$' THEN (v_track->>'trim_end_ms')::integer ELSE COALESCE(v_asset.duration_ms, 0) END,
        GREATEST(COALESCE(v_asset.duration_ms, 0), 86400000)
      )),
      'order', v_index
    ));
    v_index := v_index + 1;
  END LOOP;
  IF v_index > 5 THEN RAISE EXCEPTION USING ERRCODE = '54000', MESSAGE = 'You can select up to five audio tracks.'; END IF;

  IF p_background_video_id IS NOT NULL THEN
    SELECT * INTO v_background_video FROM public.profile_media_assets WHERE id = p_background_video_id AND user_id = v_user_id AND kind = 'background_video' AND status = 'active' AND delivery_status = 'ready' AND (storage_provider = 'supabase' OR ever_public IS TRUE);
    IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'That background video is not available.'; END IF;
  END IF;
  IF p_banner_id IS NOT NULL THEN
    SELECT * INTO v_banner FROM public.profile_media_assets WHERE id = p_banner_id AND user_id = v_user_id AND kind = 'banner' AND status = 'active' AND delivery_status = 'ready' AND (storage_provider = 'supabase' OR ever_public IS TRUE);
    IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'That banner is not available.'; END IF;
  END IF;
  IF p_cursor_id IS NOT NULL THEN
    SELECT * INTO v_cursor FROM public.profile_media_assets WHERE id = p_cursor_id AND user_id = v_user_id AND kind = 'cursor' AND status = 'active' AND delivery_status = 'ready' AND (storage_provider = 'supabase' OR ever_public IS TRUE);
    IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'That cursor is not available.'; END IF;
  END IF;
  IF p_pointer_cursor_id IS NOT NULL THEN
    SELECT * INTO v_pointer FROM public.profile_media_assets WHERE id = p_pointer_cursor_id AND user_id = v_user_id AND kind = 'pointer_cursor' AND status = 'active' AND delivery_status = 'ready' AND (storage_provider = 'supabase' OR ever_public IS TRUE);
    IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'That pointer cursor is not available.'; END IF;
  END IF;

  v_playlist := jsonb_build_object(
    'tracks', v_tracks,
    'shuffle', v_source->>'shuffle' = 'true',
    'loop', COALESCE(v_source->>'loop', 'true') = 'true',
    'autoplay', v_source->>'autoplay' = 'true',
    'volume', LEAST(1, GREATEST(0, CASE
      WHEN v_source->>'volume' ~ '^-?(?:[0-9]+(?:\.[0-9]+)?|\.[0-9]+)$' THEN (v_source->>'volume')::numeric
      ELSE .75
    END)),
    'controls', COALESCE(v_source->>'controls', 'true') = 'true'
  );

  UPDATE public.profile_configurations
  SET background_video_asset_id = p_background_video_id,
      banner_asset_id = p_banner_id,
      cursor_asset_id = p_cursor_id,
      pointer_cursor_asset_id = p_pointer_cursor_id,
      background_video_path = CASE WHEN v_background_video.storage_provider = 'supabase' THEN v_background_video.storage_path ELSE NULL END,
      banner_path = CASE WHEN v_banner.storage_provider = 'supabase' THEN v_banner.storage_path ELSE NULL END,
      cursor_path = CASE WHEN v_cursor.storage_provider = 'supabase' THEN v_cursor.storage_path ELSE NULL END,
      pointer_cursor_path = CASE WHEN v_pointer.storage_provider = 'supabase' THEN v_pointer.storage_path ELSE NULL END,
      audio_playlist = v_playlist,
      updated_at = now()
  WHERE user_id = v_user_id
  RETURNING updated_at INTO v_updated_at;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Profile configuration not found.'; END IF;

  SELECT * INTO v_record FROM public.profile_configurations WHERE user_id = v_user_id;
  RETURN jsonb_build_object(
    'success', true,
    'background_video_path', v_record.background_video_path,
    'background_video_asset_id', v_record.background_video_asset_id,
    'banner_path', v_record.banner_path,
    'banner_asset_id', v_record.banner_asset_id,
    'cursor_path', v_record.cursor_path,
    'cursor_asset_id', v_record.cursor_asset_id,
    'pointer_cursor_path', v_record.pointer_cursor_path,
    'pointer_cursor_asset_id', v_record.pointer_cursor_asset_id,
    'audio_playlist', public.profile_media_playlist_with_references(v_playlist),
    'media_references', public.profile_media_expression_projection(v_record, false, true, false)->'media_references',
    'updated_at', v_updated_at
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.select_my_profile_expression_assets(uuid, uuid, boolean, boolean) FROM PUBLIC, anon, service_role;
REVOKE ALL ON FUNCTION public.select_my_profile_r2_media(uuid, uuid, uuid, uuid, jsonb) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.select_my_profile_expression_assets(uuid, uuid, boolean, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.select_my_profile_r2_media(uuid, uuid, uuid, uuid, jsonb) TO authenticated;

COMMIT;
