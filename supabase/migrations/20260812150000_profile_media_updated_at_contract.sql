-- Keep Studio's optimistic-concurrency token synchronized after every
-- immediate rich-media mutation that updates profile_configurations.updated_at.

BEGIN;

CREATE OR REPLACE FUNCTION public.update_my_profile_audio(p_audio_path text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_audio_path text := NULLIF(btrim(p_audio_path), '');
  v_updated_at timestamptz;
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

  IF v_audio_path IS NOT NULL
     AND v_audio_path <> 'profile_audio/' || v_user_id::text || '/profile.mp3' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'That profile audio path is not valid.';
  END IF;

  IF v_audio_path IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM storage.objects
    WHERE bucket_id = 'profile_audio'
      AND name = v_user_id::text || '/profile.mp3'
      AND COALESCE(metadata->>'mimetype', '') = 'audio/mpeg'
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'The profile audio file was not found.';
  END IF;

  UPDATE public.profile_configurations
  SET audio_path = v_audio_path,
      updated_at = now()
  WHERE user_id = v_user_id
  RETURNING updated_at INTO v_updated_at;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Profile configuration not found.';
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'audio_path', v_audio_path,
    'updated_at', v_updated_at
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.select_my_profile_rich_media(
  p_background_video_id uuid DEFAULT NULL,
  p_banner_id uuid DEFAULT NULL,
  p_cursor_id uuid DEFAULT NULL,
  p_pointer_cursor_id uuid DEFAULT NULL,
  p_audio_config jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, pg_temp
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_audio_source jsonb := CASE WHEN jsonb_typeof(p_audio_config) = 'object' THEN p_audio_config ELSE '{}'::jsonb END;
  v_track_array jsonb := '[]'::jsonb;
  v_tracks jsonb := '[]'::jsonb;
  v_track jsonb;
  v_asset public.profile_media_assets%ROWTYPE;
  v_asset_id uuid;
  v_seen uuid[] := ARRAY[]::uuid[];
  v_index integer := 0;
  v_background_video_path text;
  v_banner_path text;
  v_cursor_path text;
  v_pointer_cursor_path text;
  v_playlist jsonb;
  v_start integer;
  v_end integer;
  v_duration integer;
  v_updated_at timestamptz;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION USING ERRCODE = '28000', MESSAGE = 'Not authenticated'; END IF;
  IF NOT public.profile_rich_media_access(v_user_id) THEN RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Rich profile media requires Chromadie Plus.'; END IF;

  v_track_array := CASE WHEN jsonb_typeof(v_audio_source->'tracks') = 'array' THEN v_audio_source->'tracks' ELSE '[]'::jsonb END;

  FOR v_asset_id, v_track IN
    SELECT CASE WHEN value->>'asset_id' ~* '^[0-9a-f-]{36}$' THEN (value->>'asset_id')::uuid END, value
    FROM jsonb_array_elements(v_track_array) value
    LIMIT 6
  LOOP
    IF v_asset_id IS NULL OR v_asset_id = ANY(v_seen) THEN RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Audio tracks must be unique library assets.'; END IF;
    v_seen := array_append(v_seen, v_asset_id);
    SELECT * INTO v_asset FROM public.profile_media_assets WHERE id = v_asset_id AND user_id = v_user_id AND kind = 'audio' AND status = 'active';
    IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'That audio track is not available.'; END IF;
    v_duration := COALESCE(v_asset.duration_ms, 0);
    v_start := GREATEST(0, LEAST(CASE WHEN (v_track->>'trim_start_ms') ~ '^[0-9]{1,9}$' THEN (v_track->>'trim_start_ms')::integer ELSE 0 END, GREATEST(v_duration, 86400000)));
    v_end := GREATEST(v_start, LEAST(CASE WHEN (v_track->>'trim_end_ms') ~ '^[0-9]{1,9}$' THEN (v_track->>'trim_end_ms')::integer ELSE v_duration END, GREATEST(v_duration, 86400000)));
    v_tracks := v_tracks || jsonb_build_array(jsonb_build_object(
      'path', v_asset.storage_path,
      'label', left(COALESCE(v_asset.label, 'Track ' || (v_index + 1)::text), 80),
      'duration_ms', v_duration,
      'trim_start_ms', v_start,
      'trim_end_ms', v_end,
      'order', v_index
    ));
    v_index := v_index + 1;
  END LOOP;
  IF v_index > 5 THEN RAISE EXCEPTION USING ERRCODE = '54000', MESSAGE = 'You can select up to five audio tracks.'; END IF;

  SELECT storage_path INTO v_background_video_path FROM public.profile_media_assets WHERE id = p_background_video_id AND user_id = v_user_id AND kind = 'background_video' AND status = 'active';
  IF p_background_video_id IS NOT NULL AND v_background_video_path IS NULL THEN RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'That background video is not available.'; END IF;
  SELECT storage_path INTO v_banner_path FROM public.profile_media_assets WHERE id = p_banner_id AND user_id = v_user_id AND kind = 'banner' AND status = 'active';
  IF p_banner_id IS NOT NULL AND v_banner_path IS NULL THEN RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'That banner is not available.'; END IF;
  SELECT storage_path INTO v_cursor_path FROM public.profile_media_assets WHERE id = p_cursor_id AND user_id = v_user_id AND kind = 'cursor' AND status = 'active';
  IF p_cursor_id IS NOT NULL AND v_cursor_path IS NULL THEN RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'That cursor is not available.'; END IF;
  SELECT storage_path INTO v_pointer_cursor_path FROM public.profile_media_assets WHERE id = p_pointer_cursor_id AND user_id = v_user_id AND kind = 'pointer_cursor' AND status = 'active';
  IF p_pointer_cursor_id IS NOT NULL AND v_pointer_cursor_path IS NULL THEN RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'That pointer cursor is not available.'; END IF;

  v_playlist := jsonb_build_object(
    'tracks', v_tracks,
    'shuffle', v_audio_source->>'shuffle' = 'true',
    'loop', COALESCE(v_audio_source->>'loop', 'true') = 'true',
    'autoplay', v_audio_source->>'autoplay' = 'true',
    'volume', LEAST(1, GREATEST(0, CASE WHEN (v_audio_source->>'volume') ~ '^[0-9]+([.][0-9]+)?$' THEN (v_audio_source->>'volume')::numeric ELSE 0.75 END)),
    'controls', COALESCE(v_audio_source->>'controls', 'true') = 'true'
  );

  INSERT INTO public.profile_configurations (user_id, draft_config, published_config)
  SELECT v_user_id, public.profile_default_configuration(p.mood_color), public.profile_default_configuration(p.mood_color)
  FROM public.profiles p WHERE p.id = v_user_id
  ON CONFLICT (user_id) DO NOTHING;

  UPDATE public.profile_configurations
  SET background_video_path = v_background_video_path,
      banner_path = v_banner_path,
      cursor_path = v_cursor_path,
      pointer_cursor_path = v_pointer_cursor_path,
      audio_playlist = v_playlist,
      updated_at = now()
  WHERE user_id = v_user_id
  RETURNING updated_at INTO v_updated_at;

  RETURN jsonb_build_object(
    'success', true,
    'background_video_path', v_background_video_path,
    'banner_path', v_banner_path,
    'cursor_path', v_cursor_path,
    'pointer_cursor_path', v_pointer_cursor_path,
    'audio_playlist', v_playlist,
    'updated_at', v_updated_at
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.delete_my_profile_media_asset(p_asset_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, storage, pg_temp
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_asset public.profile_media_assets%ROWTYPE;
  v_bucket text;
  v_object_path text;
  v_playlist jsonb;
  v_tracks jsonb;
  v_updated_at timestamptz;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION USING ERRCODE = '28000', MESSAGE = 'Not authenticated'; END IF;
  SELECT * INTO v_asset FROM public.profile_media_assets WHERE id = p_asset_id AND user_id = v_user_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Media asset not found.'); END IF;

  SELECT COALESCE(audio_playlist, '{}'::jsonb) INTO v_playlist FROM public.profile_configurations WHERE user_id = v_user_id;
  v_tracks := COALESCE((SELECT jsonb_agg(track ORDER BY COALESCE((track->>'order')::integer, 0)) FROM jsonb_array_elements(COALESCE(v_playlist->'tracks', '[]'::jsonb)) track WHERE track->>'path' <> v_asset.storage_path), '[]'::jsonb);
  UPDATE public.profile_configurations
  SET avatar_path = CASE WHEN v_asset.kind = 'avatar' AND avatar_path = v_asset.storage_path THEN NULL ELSE avatar_path END,
      background_path = CASE WHEN v_asset.kind = 'background' AND background_path = v_asset.storage_path THEN NULL ELSE background_path END,
      background_video_path = CASE WHEN v_asset.kind = 'background_video' AND background_video_path = v_asset.storage_path THEN NULL ELSE background_video_path END,
      banner_path = CASE WHEN v_asset.kind = 'banner' AND banner_path = v_asset.storage_path THEN NULL ELSE banner_path END,
      cursor_path = CASE WHEN v_asset.kind = 'cursor' AND cursor_path = v_asset.storage_path THEN NULL ELSE cursor_path END,
      pointer_cursor_path = CASE WHEN v_asset.kind = 'pointer_cursor' AND pointer_cursor_path = v_asset.storage_path THEN NULL ELSE pointer_cursor_path END,
      audio_playlist = CASE WHEN v_asset.kind = 'audio' THEN jsonb_set(COALESCE(v_playlist, '{}'::jsonb), '{tracks}', v_tracks, true) ELSE audio_playlist END,
      updated_at = now()
  WHERE user_id = v_user_id
  RETURNING updated_at INTO v_updated_at;

  v_bucket := split_part(v_asset.storage_path, '/', 1);
  v_object_path := regexp_replace(v_asset.storage_path, '^[^/]+/', '');
  DELETE FROM storage.objects WHERE bucket_id = v_bucket AND name = v_object_path;
  DELETE FROM public.profile_media_assets WHERE id = v_asset.id;
  RETURN jsonb_build_object('success', true, 'storage_path', v_asset.storage_path, 'cleared_reference', v_asset.kind, 'updated_at', v_updated_at);
END;
$function$;

CREATE OR REPLACE FUNCTION public.commit_my_profile_media_replacement(
  p_kind text,
  p_old_asset_id uuid,
  p_new_asset_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, storage, pg_temp
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_kind text := lower(btrim(COALESCE(p_kind, '')));
  v_old public.profile_media_assets%ROWTYPE;
  v_new public.profile_media_assets%ROWTYPE;
  v_selected_path text;
  v_updated_at timestamptz;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION USING ERRCODE = '28000', MESSAGE = 'Not authenticated'; END IF;
  IF NOT public.profile_rich_media_access(v_user_id) THEN RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Rich profile media requires Chromadie Plus.'; END IF;
  IF v_kind NOT IN ('cursor', 'pointer_cursor') OR p_old_asset_id IS NULL OR p_new_asset_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'That media replacement is not supported.';
  END IF;

  SELECT CASE WHEN v_kind = 'cursor' THEN cursor_path ELSE pointer_cursor_path END
  INTO v_selected_path
  FROM public.profile_configurations
  WHERE user_id = v_user_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'The profile cursor configuration is not available.'; END IF;

  SELECT * INTO v_old FROM public.profile_media_assets
  WHERE id = p_old_asset_id AND user_id = v_user_id AND kind = v_kind AND status = 'active'
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'The cursor replacement is no longer valid.';
  END IF;
  SELECT * INTO v_new FROM public.profile_media_assets
  WHERE id = p_new_asset_id AND user_id = v_user_id AND kind = v_kind AND status = 'active'
  FOR UPDATE;
  IF NOT FOUND OR v_selected_path IS DISTINCT FROM v_old.storage_path THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'The cursor replacement is no longer valid.';
  END IF;

  IF v_kind = 'cursor' THEN
    UPDATE public.profile_configurations SET cursor_path = v_new.storage_path, updated_at = now() WHERE user_id = v_user_id RETURNING updated_at INTO v_updated_at;
  ELSE
    UPDATE public.profile_configurations SET pointer_cursor_path = v_new.storage_path, updated_at = now() WHERE user_id = v_user_id RETURNING updated_at INTO v_updated_at;
  END IF;
  UPDATE public.profile_media_assets SET cleanup_at = NULL, updated_at = now() WHERE id = v_new.id;

  PERFORM set_config('storage.allow_delete_query', 'true', true);
  DELETE FROM storage.objects
  WHERE bucket_id = split_part(v_old.storage_path, '/', 1)
    AND name = regexp_replace(v_old.storage_path, '^[^/]+/', '');
  DELETE FROM public.profile_media_assets WHERE id = v_old.id;

  RETURN jsonb_build_object('success', true, 'kind', v_kind, 'storage_path', v_new.storage_path, 'old_asset_id', v_old.id, 'new_asset_id', v_new.id, 'updated_at', v_updated_at);
END;
$function$;

COMMIT;
