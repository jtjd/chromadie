BEGIN;

-- R2 is the only profile-media provider in the live application. Historical
-- storage_path values remain in the data model as inert metadata, but public
-- projections must never turn them into a browser source.
CREATE OR REPLACE FUNCTION public.profile_media_public_reference(
  p_asset_id uuid,
  p_storage_path text
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO public, pg_catalog
AS $function$
DECLARE
  v_asset public.profile_media_assets%ROWTYPE;
BEGIN
  IF p_asset_id IS NOT NULL THEN
    SELECT * INTO v_asset FROM public.profile_media_assets WHERE id = p_asset_id;
  ELSIF p_storage_path IS NOT NULL THEN
    SELECT * INTO v_asset FROM public.profile_media_assets WHERE storage_path = p_storage_path LIMIT 1;
  END IF;

  IF FOUND
     AND v_asset.storage_provider = 'r2'
     AND v_asset.status = 'active'
     AND v_asset.delivery_status = 'ready'
     AND v_asset.ever_public IS TRUE
     AND NULLIF(v_asset.r2_public_key, '') IS NOT NULL THEN
    RETURN jsonb_build_object(
      'asset_id', v_asset.id,
      'storage_provider', 'r2',
      'r2_public_key', v_asset.r2_public_key,
      'mime_type', v_asset.mime_type,
      'byte_size', v_asset.byte_size
    );
  END IF;

  RETURN NULL;
END;
$function$;

-- Do not allow a direct authenticated RPC caller to select a historical
-- provider. This is intentionally an R2-only replacement of the earlier
-- compatibility function.
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
  v_record public.profile_configurations%ROWTYPE;
  v_profile public.profiles%ROWTYPE;
  v_updated_at timestamptz;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION USING ERRCODE = '28000', MESSAGE = 'Not authenticated'; END IF;
  SELECT * INTO v_record FROM public.profile_configurations WHERE user_id = v_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Profile configuration not found.'; END IF;

  IF p_avatar_id IS NOT NULL THEN
    PERFORM 1 FROM public.profile_media_assets
    WHERE id = p_avatar_id AND user_id = v_user_id AND kind = 'avatar' AND status = 'active'
      AND delivery_status = 'ready' AND storage_provider = 'r2' AND ever_public IS TRUE
      AND NULLIF(r2_public_key, '') IS NOT NULL;
    IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'That avatar is not available.'; END IF;
  END IF;
  IF p_background_id IS NOT NULL THEN
    PERFORM 1 FROM public.profile_media_assets
    WHERE id = p_background_id AND user_id = v_user_id AND kind = 'background' AND status = 'active'
      AND delivery_status = 'ready' AND storage_provider = 'r2' AND ever_public IS TRUE
      AND NULLIF(r2_public_key, '') IS NOT NULL;
    IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'That background is not available.'; END IF;
  END IF;

  UPDATE public.profile_configurations
  SET avatar_asset_id = CASE WHEN p_clear_avatar THEN NULL WHEN p_avatar_id IS NOT NULL THEN p_avatar_id ELSE avatar_asset_id END,
      background_asset_id = CASE WHEN p_clear_background THEN NULL WHEN p_background_id IS NOT NULL THEN p_background_id ELSE background_asset_id END,
      avatar_path = CASE WHEN p_clear_avatar OR p_avatar_id IS NOT NULL THEN NULL ELSE avatar_path END,
      background_path = CASE WHEN p_clear_background OR p_background_id IS NOT NULL THEN NULL ELSE background_path END,
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
      AND delivery_status = 'ready' AND storage_provider = 'r2' AND ever_public IS TRUE
      AND NULLIF(r2_public_key, '') IS NOT NULL;
    IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'That audio track is not available.'; END IF;
    v_tracks := v_tracks || jsonb_build_array(jsonb_build_object(
      'asset_id', v_asset.id,
      'path', NULL,
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
    PERFORM 1 FROM public.profile_media_assets WHERE id = p_background_video_id AND user_id = v_user_id AND kind = 'background_video' AND status = 'active' AND delivery_status = 'ready' AND storage_provider = 'r2' AND ever_public IS TRUE AND NULLIF(r2_public_key, '') IS NOT NULL;
    IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'That background video is not available.'; END IF;
  END IF;
  IF p_banner_id IS NOT NULL THEN
    PERFORM 1 FROM public.profile_media_assets WHERE id = p_banner_id AND user_id = v_user_id AND kind = 'banner' AND status = 'active' AND delivery_status = 'ready' AND storage_provider = 'r2' AND ever_public IS TRUE AND NULLIF(r2_public_key, '') IS NOT NULL;
    IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'That banner is not available.'; END IF;
  END IF;
  IF p_cursor_id IS NOT NULL THEN
    PERFORM 1 FROM public.profile_media_assets WHERE id = p_cursor_id AND user_id = v_user_id AND kind = 'cursor' AND status = 'active' AND delivery_status = 'ready' AND storage_provider = 'r2' AND ever_public IS TRUE AND NULLIF(r2_public_key, '') IS NOT NULL;
    IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'That cursor is not available.'; END IF;
  END IF;
  IF p_pointer_cursor_id IS NOT NULL THEN
    PERFORM 1 FROM public.profile_media_assets WHERE id = p_pointer_cursor_id AND user_id = v_user_id AND kind = 'pointer_cursor' AND status = 'active' AND delivery_status = 'ready' AND storage_provider = 'r2' AND ever_public IS TRUE AND NULLIF(r2_public_key, '') IS NOT NULL;
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
      background_video_path = CASE WHEN p_background_video_id IS NOT NULL THEN NULL ELSE background_video_path END,
      banner_path = CASE WHEN p_banner_id IS NOT NULL THEN NULL ELSE banner_path END,
      cursor_path = CASE WHEN p_cursor_id IS NOT NULL THEN NULL ELSE cursor_path END,
      pointer_cursor_path = CASE WHEN p_pointer_cursor_id IS NOT NULL THEN NULL ELSE pointer_cursor_path END,
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
  v_record public.profile_configurations%ROWTYPE;
  v_updated_at timestamptz;
  v_is_staff boolean := false;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION USING ERRCODE = '28000', MESSAGE = 'Not authenticated'; END IF;
  SELECT COALESCE(is_staff, false) INTO v_is_staff FROM public.profiles WHERE id = v_user_id;
  IF NOT v_is_staff THEN RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Profile audio is not available for this account.'; END IF;

  IF p_audio_id IS NOT NULL AND NOT p_clear_audio THEN
    PERFORM 1 FROM public.profile_media_assets
    WHERE id = p_audio_id AND user_id = v_user_id AND kind = 'audio' AND status = 'active'
      AND delivery_status = 'ready' AND storage_provider = 'r2' AND ever_public IS TRUE
      AND NULLIF(r2_public_key, '') IS NOT NULL;
    IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'That audio asset is not available.'; END IF;
  END IF;

  UPDATE public.profile_configurations
  SET audio_asset_id = CASE WHEN p_clear_audio THEN NULL WHEN p_audio_id IS NOT NULL THEN p_audio_id ELSE audio_asset_id END,
      audio_path = CASE WHEN p_clear_audio OR p_audio_id IS NOT NULL THEN NULL ELSE audio_path END,
      updated_at = CASE WHEN p_clear_audio OR p_audio_id IS NOT NULL THEN now() ELSE updated_at END
  WHERE user_id = v_user_id
  RETURNING updated_at INTO v_updated_at;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Profile configuration not found.'; END IF;

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

REVOKE ALL ON FUNCTION public.profile_media_public_reference(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.select_my_profile_expression_assets(uuid, uuid, boolean, boolean) FROM PUBLIC, anon, service_role;
REVOKE ALL ON FUNCTION public.select_my_profile_r2_media(uuid, uuid, uuid, uuid, jsonb) FROM PUBLIC, anon, service_role;
REVOKE ALL ON FUNCTION public.select_my_profile_audio_asset(uuid, boolean) FROM PUBLIC, anon, service_role;
-- Retire the pre-R2 client RPCs so authenticated callers cannot create or
-- select new legacy-provider media through an old browser bundle.
REVOKE ALL ON FUNCTION public.register_my_profile_media_asset(text, uuid, text) FROM authenticated;
REVOKE ALL ON FUNCTION public.stage_my_profile_media_asset(text, uuid, text, bigint, text, jsonb) FROM authenticated;
REVOKE ALL ON FUNCTION public.finalize_my_profile_media_asset(uuid) FROM authenticated;
REVOKE ALL ON FUNCTION public.select_my_profile_rich_media(uuid, uuid, uuid, uuid, jsonb) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.select_my_profile_expression_assets(uuid, uuid, boolean, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.select_my_profile_r2_media(uuid, uuid, uuid, uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.select_my_profile_audio_asset(uuid, boolean) TO authenticated;

COMMIT;
