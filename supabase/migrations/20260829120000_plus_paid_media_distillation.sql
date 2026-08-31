BEGIN;

-- Plus now sells hosted media, once. Keep legacy banner data and RPCs for
-- compatibility, while adding the two new selections behind the same
-- server-authoritative entitlement boundary.
ALTER TABLE public.profile_media_assets
  DROP CONSTRAINT IF EXISTS profile_media_assets_kind_check;

ALTER TABLE public.profile_media_assets
  ADD CONSTRAINT profile_media_assets_kind_check CHECK (
    kind IN (
      'avatar', 'background', 'background_video', 'banner', 'animated_avatar',
      'share_image', 'audio', 'cursor', 'pointer_cursor'
    )
  );

ALTER TABLE public.profile_configurations
  ADD COLUMN IF NOT EXISTS animated_avatar_asset_id uuid REFERENCES public.profile_media_assets(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS share_image_asset_id uuid REFERENCES public.profile_media_assets(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.prepare_my_profile_media_upload_r2(
  p_kind text,
  p_extension text,
  p_mime_type text,
  p_byte_size bigint,
  p_content_hash_sha256 text,
  p_label text DEFAULT '',
  p_metadata jsonb DEFAULT '{}'::jsonb,
  p_replace_asset_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, pg_temp
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_kind text := lower(btrim(coalesce(p_kind, '')));
  v_extension text := lower(ltrim(btrim(coalesce(p_extension, '')), '.'));
  v_mime text := lower(btrim(coalesce(p_mime_type, '')));
  v_hash text := lower(btrim(coalesce(p_content_hash_sha256, '')));
  v_limit bigint;
  v_total bigint;
  v_r2_total bigint;
  v_asset_count integer;
  v_asset_id uuid := gen_random_uuid();
  v_private_key text;
  v_metadata jsonb := CASE WHEN jsonb_typeof(p_metadata) = 'object' THEN p_metadata ELSE '{}'::jsonb END;
  v_has_plus boolean := false;
  v_quota bigint := 157286400;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '28000', MESSAGE = 'Not authenticated';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('chromadie:r2-profile-media-cap'));
  v_has_plus := public.profile_rich_media_access(v_user_id);

  IF v_kind NOT IN ('avatar', 'background', 'background_video', 'animated_avatar', 'share_image', 'audio', 'cursor', 'pointer_cursor') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'That media kind is not supported.';
  END IF;
  IF p_byte_size IS NULL OR p_byte_size <= 0 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'The uploaded file is empty.';
  END IF;
  v_limit := CASE v_kind
    WHEN 'avatar' THEN 262144
    WHEN 'background' THEN 4194304
    WHEN 'background_video' THEN 26214400
    WHEN 'animated_avatar' THEN 5242880
    WHEN 'share_image' THEN 1048576
    WHEN 'audio' THEN 10485760
    WHEN 'cursor' THEN 131072
    WHEN 'pointer_cursor' THEN 131072
  END;
  IF p_byte_size > v_limit THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'The uploaded file exceeds its media limit.';
  END IF;
  IF octet_length(v_metadata::text) > 8192 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Media metadata is too large.';
  END IF;
  IF v_hash !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'A valid SHA-256 content hash is required.';
  END IF;

  IF v_kind IN ('avatar', 'background') AND (v_extension <> 'webp' OR v_mime <> 'image/webp') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'This image must be a WebP file.';
  END IF;
  IF v_kind = 'background_video' AND (v_extension NOT IN ('mp4', 'webm') OR v_mime NOT IN ('video/mp4', 'video/webm')) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Use an MP4 or WebM video.';
  END IF;
  IF v_kind = 'animated_avatar' AND NOT (
    (v_extension = 'gif' AND v_mime = 'image/gif') OR
    (v_extension = 'webp' AND v_mime = 'image/webp')
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Use an animated GIF or animated WebP.';
  END IF;
  IF v_kind = 'share_image' AND (v_extension <> 'jpg' OR v_mime <> 'image/jpeg') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Share previews must use the processed JPEG format.';
  END IF;
  IF v_kind = 'share_image' AND (
    COALESCE(v_metadata->>'width', '') <> '1200'
    OR COALESCE(v_metadata->>'height', '') <> '630'
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Share previews must be 1200 by 630 pixels.';
  END IF;
  IF v_kind = 'audio' AND (v_extension <> 'mp3' OR v_mime <> 'audio/mpeg') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Use an MP3 audio file.';
  END IF;
  IF v_kind IN ('cursor', 'pointer_cursor') AND (
    (v_extension = 'webp' AND v_mime <> 'image/webp')
    OR (v_extension = 'ani' AND v_mime NOT IN ('application/x-navi-animation', 'application/octet-stream', 'application/x-ani', 'image/x-ani', 'application/vnd.microsoft.ani'))
    OR v_extension NOT IN ('webp', 'ani')
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Use a WebP or ANI cursor.';
  END IF;
  IF v_kind IN ('cursor', 'pointer_cursor') AND (
    COALESCE(v_metadata->>'width', '') !~ '^[0-9]{1,5}$'
    OR COALESCE(v_metadata->>'height', '') !~ '^[0-9]{1,5}$'
    OR (CASE WHEN COALESCE(v_metadata->>'width', '') ~ '^[0-9]{1,5}$' THEN (v_metadata->>'width')::integer ELSE 0 END) NOT BETWEEN 1 AND 128
    OR (CASE WHEN COALESCE(v_metadata->>'height', '') ~ '^[0-9]{1,5}$' THEN (v_metadata->>'height')::integer ELSE 0 END) NOT BETWEEN 1 AND 128
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Cursor media must declare dimensions at most 128 by 128 pixels.';
  END IF;

  IF v_kind IN ('background_video', 'animated_avatar', 'share_image', 'audio', 'cursor', 'pointer_cursor') AND NOT v_has_plus THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Hosted profile media requires Chromadie Plus.';
  END IF;
  IF p_replace_asset_id IS NOT NULL THEN
    PERFORM 1 FROM public.profile_media_assets
    WHERE id = p_replace_asset_id AND user_id = v_user_id AND kind = v_kind AND status = 'active'
    FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'The media asset being replaced is no longer available.';
    END IF;
  END IF;

  SELECT count(*) INTO v_asset_count
  FROM public.profile_media_assets
  WHERE user_id = v_user_id
    AND status IN ('staged', 'active')
    AND (p_replace_asset_id IS NULL OR id <> p_replace_asset_id);
  IF v_asset_count >= 200 THEN
    RAISE EXCEPTION USING ERRCODE = '54000', MESSAGE = 'Your media library has reached its 200 asset operational limit.';
  END IF;

  SELECT coalesce(sum(byte_size * (
    CASE WHEN r2_private_key IS NOT NULL THEN 1 ELSE 0 END
    + CASE WHEN r2_public_key IS NOT NULL THEN 1 ELSE 0 END
  )), 0) INTO v_r2_total
  FROM public.profile_media_assets
  WHERE storage_provider = 'r2'
    AND (r2_private_key IS NOT NULL OR r2_public_key IS NOT NULL)
    AND status IN ('staged', 'active', 'abandoned', 'deleted');
  IF v_r2_total + p_byte_size > 1099511627776 THEN
    RAISE EXCEPTION USING ERRCODE = '54000', MESSAGE = 'Profile media storage is temporarily at its safety cap.';
  END IF;

  SELECT coalesce(sum(byte_size * (
    CASE WHEN r2_private_key IS NOT NULL THEN 1 ELSE 0 END
    + CASE WHEN r2_public_key IS NOT NULL THEN 1 ELSE 0 END
  )), 0) INTO v_total
  FROM public.profile_media_assets
  WHERE user_id = v_user_id
    AND storage_provider = 'r2'
    AND (r2_private_key IS NOT NULL OR r2_public_key IS NOT NULL)
    AND status IN ('staged', 'active');
  IF v_has_plus THEN v_quota := 1073741824; END IF;
  IF v_total + p_byte_size > v_quota THEN
    RAISE EXCEPTION USING ERRCODE = '54000', MESSAGE = 'Your profile media quota has been reached.';
  END IF;

  v_private_key := format('profiles/%s/%s/%s.%s', v_user_id, v_asset_id, v_hash, v_extension);
  INSERT INTO public.profile_media_assets (
    id, user_id, kind, storage_path, storage_provider, r2_private_key,
    r2_public_key, content_hash_sha256, delivery_status, status, label,
    mime_type, byte_size, metadata, cleanup_at, upload_expires_at
  ) VALUES (
    v_asset_id, v_user_id, v_kind, NULL, 'r2', v_private_key, NULL, v_hash,
    'pending', 'staged', left(coalesce(p_label, ''), 80), v_mime, p_byte_size,
    v_metadata, now() + interval '24 hours', now() + interval '15 minutes'
  );

  RETURN jsonb_build_object(
    'success', true, 'asset_id', v_asset_id, 'storage_provider', 'r2',
    'r2_private_key', v_private_key, 'r2_public_key', NULL,
    'content_hash_sha256', v_hash, 'expires_at', now() + interval '15 minutes',
    'mime_type', v_mime, 'byte_size', p_byte_size, 'replace_asset_id', p_replace_asset_id
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.profile_media_expression_projection(
  p_record public.profile_configurations,
  p_is_staff boolean,
  p_rich_access boolean,
  p_public boolean
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public, pg_catalog
AS $function$
  SELECT jsonb_build_object(
    'avatar_path', p_record.avatar_path,
    'background_path', p_record.background_path,
    'avatar_asset_id', p_record.avatar_asset_id,
    'background_asset_id', p_record.background_asset_id,
    'spotify_type', p_record.spotify_type,
    'spotify_id', p_record.spotify_id,
    'audio_path', CASE WHEN p_is_staff THEN p_record.audio_path ELSE NULL END,
    'audio_asset_id', CASE WHEN p_is_staff THEN p_record.audio_asset_id ELSE NULL END,
    'background_video_path', CASE WHEN p_rich_access OR NOT p_public THEN p_record.background_video_path ELSE NULL END,
    'background_video_asset_id', CASE WHEN p_rich_access OR NOT p_public THEN p_record.background_video_asset_id ELSE NULL END,
    'animated_avatar_path', NULL,
    'animated_avatar_asset_id', CASE WHEN p_rich_access OR NOT p_public THEN p_record.animated_avatar_asset_id ELSE NULL END,
    'share_image_path', NULL,
    'share_image_asset_id', CASE WHEN p_rich_access OR NOT p_public THEN p_record.share_image_asset_id ELSE NULL END,
    'banner_path', CASE WHEN p_rich_access OR NOT p_public THEN p_record.banner_path ELSE NULL END,
    'banner_asset_id', CASE WHEN p_rich_access OR NOT p_public THEN p_record.banner_asset_id ELSE NULL END,
    'cursor_path', CASE WHEN p_rich_access OR NOT p_public THEN p_record.cursor_path ELSE NULL END,
    'cursor_asset_id', CASE WHEN p_rich_access OR NOT p_public THEN p_record.cursor_asset_id ELSE NULL END,
    'pointer_cursor_path', CASE WHEN p_rich_access OR NOT p_public THEN p_record.pointer_cursor_path ELSE NULL END,
    'pointer_cursor_asset_id', CASE WHEN p_rich_access OR NOT p_public THEN p_record.pointer_cursor_asset_id ELSE NULL END,
    'audio_playlist', CASE WHEN p_rich_access OR NOT p_public
      THEN public.profile_media_playlist_with_references(p_record.audio_playlist)
      ELSE '{"tracks":[],"shuffle":false,"loop":true,"autoplay":false,"volume":0.75,"controls":true}'::jsonb
    END,
    'media_references', jsonb_build_object(
      'avatar', public.profile_media_public_reference(p_record.avatar_asset_id, p_record.avatar_path),
      'background', public.profile_media_public_reference(p_record.background_asset_id, p_record.background_path),
      'audio', CASE WHEN p_is_staff THEN public.profile_media_public_reference(p_record.audio_asset_id, p_record.audio_path) ELSE NULL END,
      'background_video', CASE WHEN p_rich_access OR NOT p_public THEN public.profile_media_public_reference(p_record.background_video_asset_id, p_record.background_video_path) ELSE NULL END,
      'animated_avatar', CASE WHEN p_rich_access OR NOT p_public THEN public.profile_media_public_reference(p_record.animated_avatar_asset_id, NULL) ELSE NULL END,
      'share_image', CASE WHEN p_rich_access OR NOT p_public THEN public.profile_media_public_reference(p_record.share_image_asset_id, NULL) ELSE NULL END,
      'banner', CASE WHEN p_rich_access OR NOT p_public THEN public.profile_media_public_reference(p_record.banner_asset_id, p_record.banner_path) ELSE NULL END,
      'cursor', CASE WHEN p_rich_access OR NOT p_public THEN public.profile_media_public_reference(p_record.cursor_asset_id, p_record.cursor_path) ELSE NULL END,
      'pointer_cursor', CASE WHEN p_rich_access OR NOT p_public THEN public.profile_media_public_reference(p_record.pointer_cursor_asset_id, p_record.pointer_cursor_path) ELSE NULL END
    )
  );
$function$;

CREATE OR REPLACE FUNCTION public.select_my_profile_r2_media_v2(
  p_background_video_id uuid DEFAULT NULL,
  p_animated_avatar_id uuid DEFAULT NULL,
  p_avatar_fallback_id uuid DEFAULT NULL,
  p_share_image_id uuid DEFAULT NULL,
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
  IF NOT public.profile_rich_media_access(v_user_id) THEN RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Hosted profile media requires Chromadie Plus.'; END IF;

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
      'asset_id', v_asset.id, 'path', NULL,
      'label', left(COALESCE(v_asset.label, 'Track ' || (v_index + 1)::text), 80),
      'duration_ms', COALESCE(v_asset.duration_ms, 0),
      'trim_start_ms', GREATEST(0, LEAST(CASE WHEN v_track->>'trim_start_ms' ~ '^-?[0-9]{1,9}$' THEN (v_track->>'trim_start_ms')::integer ELSE 0 END, COALESCE(v_asset.duration_ms, 86400000))),
      'trim_end_ms', GREATEST(0, LEAST(CASE WHEN v_track->>'trim_end_ms' ~ '^-?[0-9]{1,9}$' THEN (v_track->>'trim_end_ms')::integer ELSE COALESCE(v_asset.duration_ms, 0) END, GREATEST(COALESCE(v_asset.duration_ms, 0), 86400000))),
      'order', v_index
    ));
    v_index := v_index + 1;
  END LOOP;
  IF v_index > 5 THEN RAISE EXCEPTION USING ERRCODE = '54000', MESSAGE = 'You can select up to five audio tracks.'; END IF;

  IF p_animated_avatar_id IS NULL AND p_avatar_fallback_id IS NOT NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'An avatar fallback must accompany an animated avatar.';
  END IF;
  IF (p_background_video_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.profile_media_assets WHERE id = p_background_video_id AND user_id = v_user_id AND kind = 'background_video' AND status = 'active' AND delivery_status = 'ready' AND storage_provider = 'r2' AND ever_public IS TRUE AND NULLIF(r2_public_key, '') IS NOT NULL))
    OR (p_animated_avatar_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.profile_media_assets WHERE id = p_animated_avatar_id AND user_id = v_user_id AND kind = 'animated_avatar' AND status = 'active' AND delivery_status = 'ready' AND storage_provider = 'r2' AND ever_public IS TRUE AND NULLIF(r2_public_key, '') IS NOT NULL))
    OR (p_avatar_fallback_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.profile_media_assets WHERE id = p_avatar_fallback_id AND user_id = v_user_id AND kind = 'avatar' AND status = 'active' AND delivery_status = 'ready' AND storage_provider = 'r2' AND ever_public IS TRUE AND NULLIF(r2_public_key, '') IS NOT NULL))
    OR (p_share_image_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.profile_media_assets WHERE id = p_share_image_id AND user_id = v_user_id AND kind = 'share_image' AND status = 'active' AND delivery_status = 'ready' AND storage_provider = 'r2' AND ever_public IS TRUE AND NULLIF(r2_public_key, '') IS NOT NULL))
    OR (p_cursor_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.profile_media_assets WHERE id = p_cursor_id AND user_id = v_user_id AND kind = 'cursor' AND status = 'active' AND delivery_status = 'ready' AND storage_provider = 'r2' AND ever_public IS TRUE AND NULLIF(r2_public_key, '') IS NOT NULL))
    OR (p_pointer_cursor_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.profile_media_assets WHERE id = p_pointer_cursor_id AND user_id = v_user_id AND kind = 'pointer_cursor' AND status = 'active' AND delivery_status = 'ready' AND storage_provider = 'r2' AND ever_public IS TRUE AND NULLIF(r2_public_key, '') IS NOT NULL)) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'One or more selected media assets are not available.';
  END IF;

  v_playlist := jsonb_build_object(
    'tracks', v_tracks,
    'shuffle', v_source->>'shuffle' = 'true',
    'loop', COALESCE(v_source->>'loop', 'true') = 'true',
    'autoplay', v_source->>'autoplay' = 'true',
    'volume', LEAST(1, GREATEST(0, CASE WHEN v_source->>'volume' ~ '^-?(?:[0-9]+(?:\.[0-9]+)?|\.[0-9]+)$' THEN (v_source->>'volume')::numeric ELSE .75 END)),
    'controls', COALESCE(v_source->>'controls', 'true') = 'true'
  );

  UPDATE public.profile_configurations
  SET background_video_asset_id = p_background_video_id,
      animated_avatar_asset_id = p_animated_avatar_id,
      avatar_asset_id = CASE WHEN p_animated_avatar_id IS NOT NULL THEN p_avatar_fallback_id ELSE avatar_asset_id END,
      share_image_asset_id = p_share_image_id,
      cursor_asset_id = p_cursor_id,
      pointer_cursor_asset_id = p_pointer_cursor_id,
      background_video_path = CASE WHEN p_background_video_id IS NOT NULL THEN NULL ELSE background_video_path END,
      avatar_path = CASE WHEN p_animated_avatar_id IS NOT NULL THEN NULL ELSE avatar_path END,
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
    'background_video_asset_id', v_record.background_video_asset_id,
    'animated_avatar_asset_id', v_record.animated_avatar_asset_id,
    'avatar_asset_id', v_record.avatar_asset_id,
    'share_image_asset_id', v_record.share_image_asset_id,
    'cursor_asset_id', v_record.cursor_asset_id,
    'pointer_cursor_asset_id', v_record.pointer_cursor_asset_id,
    'audio_playlist', public.profile_media_playlist_with_references(v_playlist),
    'media_references', public.profile_media_expression_projection(v_record, false, true, false)->'media_references',
    'updated_at', v_updated_at
  );
END;
$function$;

-- Selecting a regular avatar through the long-lived expression editor must
-- also turn off an animated avatar. Keep the historical RPC signature, but
-- make the two avatar modes mutually exclusive while returning the new field
-- so the Studio preview can update without a full profile reload.
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
  v_updated_at timestamptz;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '28000', MESSAGE = 'Not authenticated';
  END IF;
  SELECT * INTO v_record
  FROM public.profile_configurations
  WHERE user_id = v_user_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Profile configuration not found.';
  END IF;

  IF p_avatar_id IS NOT NULL THEN
    SELECT * INTO v_avatar
    FROM public.profile_media_assets
    WHERE id = p_avatar_id
      AND user_id = v_user_id
      AND kind = 'avatar'
      AND status = 'active'
      AND delivery_status = 'ready'
      AND (storage_provider = 'supabase' OR ever_public IS TRUE);
    IF NOT FOUND THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'That avatar is not available.';
    END IF;
  END IF;
  IF p_background_id IS NOT NULL THEN
    SELECT * INTO v_background
    FROM public.profile_media_assets
    WHERE id = p_background_id
      AND user_id = v_user_id
      AND kind = 'background'
      AND status = 'active'
      AND delivery_status = 'ready'
      AND (storage_provider = 'supabase' OR ever_public IS TRUE);
    IF NOT FOUND THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'That background is not available.';
    END IF;
  END IF;

  UPDATE public.profile_configurations
  SET avatar_asset_id = CASE WHEN p_clear_avatar THEN NULL WHEN p_avatar_id IS NOT NULL THEN p_avatar_id ELSE avatar_asset_id END,
      background_asset_id = CASE WHEN p_clear_background THEN NULL WHEN p_background_id IS NOT NULL THEN p_background_id ELSE background_asset_id END,
      avatar_path = CASE WHEN p_clear_avatar THEN NULL WHEN p_avatar_id IS NOT NULL THEN CASE WHEN v_avatar.storage_provider = 'supabase' THEN v_avatar.storage_path ELSE NULL END ELSE avatar_path END,
      background_path = CASE WHEN p_clear_background THEN NULL WHEN p_background_id IS NOT NULL THEN CASE WHEN v_background.storage_provider = 'supabase' THEN v_background.storage_path ELSE NULL END ELSE background_path END,
      animated_avatar_asset_id = CASE WHEN p_clear_avatar OR p_avatar_id IS NOT NULL THEN NULL ELSE animated_avatar_asset_id END,
      updated_at = CASE WHEN p_clear_avatar OR p_clear_background OR p_avatar_id IS NOT NULL OR p_background_id IS NOT NULL THEN now() ELSE updated_at END
  WHERE user_id = v_user_id
  RETURNING updated_at INTO v_updated_at;

  SELECT * INTO v_record FROM public.profile_configurations WHERE user_id = v_user_id;
  RETURN jsonb_build_object(
    'success', true,
    'avatar_path', v_record.avatar_path,
    'background_path', v_record.background_path,
    'avatar_asset_id', v_record.avatar_asset_id,
    'animated_avatar_asset_id', v_record.animated_avatar_asset_id,
    'background_asset_id', v_record.background_asset_id,
    'media_references', public.profile_media_expression_projection(v_record, false, true, false)->'media_references',
    'updated_at', v_updated_at
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.clear_new_profile_media_reference_on_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, pg_catalog
AS $function$
BEGIN
  IF OLD.status <> 'deleted' AND NEW.status = 'deleted' THEN
    UPDATE public.profile_configurations
    SET animated_avatar_asset_id = CASE
          WHEN animated_avatar_asset_id = NEW.id
            OR (NEW.kind = 'avatar' AND EXISTS (
              SELECT 1
              FROM public.profile_media_assets animated
              WHERE animated.id = animated_avatar_asset_id
                AND animated.kind = 'animated_avatar'
                AND animated.metadata->>'fallback_asset_id' = NEW.id::text
            ))
            THEN NULL
          ELSE animated_avatar_asset_id
        END,
        share_image_asset_id = CASE WHEN share_image_asset_id = NEW.id THEN NULL ELSE share_image_asset_id END,
        updated_at = CASE
          WHEN animated_avatar_asset_id = NEW.id
            OR share_image_asset_id = NEW.id
            OR (NEW.kind = 'avatar' AND EXISTS (
              SELECT 1
              FROM public.profile_media_assets animated
              WHERE animated.id = animated_avatar_asset_id
                AND animated.kind = 'animated_avatar'
                AND animated.metadata->>'fallback_asset_id' = NEW.id::text
            ))
            THEN now()
          ELSE updated_at
        END
    WHERE user_id = NEW.user_id
      AND (
        animated_avatar_asset_id = NEW.id
        OR share_image_asset_id = NEW.id
        OR (NEW.kind = 'avatar' AND EXISTS (
          SELECT 1
          FROM public.profile_media_assets animated
          WHERE animated.id = animated_avatar_asset_id
            AND animated.kind = 'animated_avatar'
            AND animated.metadata->>'fallback_asset_id' = NEW.id::text
        ))
      );
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS profile_media_clear_new_reference_on_delete ON public.profile_media_assets;
CREATE TRIGGER profile_media_clear_new_reference_on_delete
BEFORE UPDATE OF status ON public.profile_media_assets
FOR EACH ROW EXECUTE FUNCTION public.clear_new_profile_media_reference_on_delete();

-- Keep deletion selection checks tied to typed asset IDs. A NULL legacy path
-- is not a selection marker: treating NULL as equal to NULL would make every
-- R2 asset appear selected and would mutate the profile when an unused asset
-- is removed. Include the new Plus references and animated-avatar fallback in
-- the same atomic unequip path.
CREATE OR REPLACE FUNCTION public.delete_my_profile_media_asset(p_asset_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, pg_catalog
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_asset public.profile_media_assets%ROWTYPE;
  v_config public.profile_configurations%ROWTYPE;
  v_playlist jsonb;
  v_tracks jsonb;
  v_selected boolean := false;
  v_updated_at timestamptz;
  v_provider text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '28000', MESSAGE = 'Not authenticated';
  END IF;

  SELECT * INTO v_asset
  FROM public.profile_media_assets
  WHERE id = p_asset_id AND user_id = v_user_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Media asset not found.');
  END IF;

  v_provider := COALESCE(v_asset.storage_provider, 'supabase');
  IF v_asset.status = 'deleted' THEN
    RETURN jsonb_build_object(
      'success', true,
      'storage_provider', v_provider,
      'storage_path', v_asset.storage_path,
      'r2_private_key', v_asset.r2_private_key,
      'r2_public_key', v_asset.r2_public_key,
      'ever_public', v_asset.ever_public,
      'cleanup_pending', true,
      'already_deleted', true
    );
  END IF;

  SELECT * INTO v_config
  FROM public.profile_configurations
  WHERE user_id = v_user_id
  FOR UPDATE;
  IF FOUND THEN
    v_playlist := COALESCE(v_config.audio_playlist, '{}'::jsonb);
    v_selected :=
      (v_asset.kind = 'avatar' AND (
        v_config.avatar_asset_id = v_asset.id
        OR (v_asset.storage_path IS NOT NULL AND v_config.avatar_path = v_asset.storage_path)
        OR (v_config.animated_avatar_asset_id IS NOT NULL AND EXISTS (
          SELECT 1
          FROM public.profile_media_assets animated
          WHERE animated.id = v_config.animated_avatar_asset_id
            AND animated.kind = 'animated_avatar'
            AND animated.metadata->>'fallback_asset_id' = v_asset.id::text
        ))
      ))
      OR (v_asset.kind = 'background' AND (
        v_config.background_asset_id = v_asset.id
        OR (v_asset.storage_path IS NOT NULL AND v_config.background_path = v_asset.storage_path)
      ))
      OR (v_asset.kind = 'audio' AND (
        v_config.audio_asset_id = v_asset.id
        OR (v_asset.storage_path IS NOT NULL AND v_config.audio_path = v_asset.storage_path)
      ))
      OR (v_asset.kind = 'background_video' AND (
        v_config.background_video_asset_id = v_asset.id
        OR (v_asset.storage_path IS NOT NULL AND v_config.background_video_path = v_asset.storage_path)
      ))
      OR (v_asset.kind = 'banner' AND (
        v_config.banner_asset_id = v_asset.id
        OR (v_asset.storage_path IS NOT NULL AND v_config.banner_path = v_asset.storage_path)
      ))
      OR (v_asset.kind = 'animated_avatar' AND v_config.animated_avatar_asset_id = v_asset.id)
      OR (v_asset.kind = 'share_image' AND v_config.share_image_asset_id = v_asset.id)
      OR (v_asset.kind = 'cursor' AND (
        v_config.cursor_asset_id = v_asset.id
        OR (v_asset.storage_path IS NOT NULL AND v_config.cursor_path = v_asset.storage_path)
      ))
      OR (v_asset.kind = 'pointer_cursor' AND (
        v_config.pointer_cursor_asset_id = v_asset.id
        OR (v_asset.storage_path IS NOT NULL AND v_config.pointer_cursor_path = v_asset.storage_path)
      ));

    IF v_asset.kind = 'audio' THEN
      v_tracks := COALESCE((
        SELECT jsonb_agg(track ORDER BY COALESCE((track->>'order')::integer, 0))
        FROM jsonb_array_elements(COALESCE(v_playlist->'tracks', '[]'::jsonb)) track
        WHERE NOT (
          (track->>'asset_id' ~* '^[0-9a-f-]{36}$' AND (track->>'asset_id')::uuid = v_asset.id)
          OR (v_asset.storage_path IS NOT NULL AND track->>'path' = v_asset.storage_path)
        )
      ), '[]'::jsonb);
      v_selected := v_selected OR EXISTS (
        SELECT 1
        FROM jsonb_array_elements(COALESCE(v_playlist->'tracks', '[]'::jsonb)) track
        WHERE (track->>'asset_id' ~* '^[0-9a-f-]{36}$' AND (track->>'asset_id')::uuid = v_asset.id)
           OR (v_asset.storage_path IS NOT NULL AND track->>'path' = v_asset.storage_path)
      );
    END IF;
  END IF;

  IF v_provider = 'r2' THEN
    IF v_selected THEN
      UPDATE public.profile_configurations
      SET avatar_asset_id = CASE WHEN v_asset.kind = 'avatar' THEN NULL ELSE avatar_asset_id END,
          background_asset_id = CASE WHEN v_asset.kind = 'background' THEN NULL ELSE background_asset_id END,
          audio_asset_id = CASE WHEN v_asset.kind = 'audio' AND v_config.audio_asset_id = v_asset.id THEN NULL ELSE audio_asset_id END,
          background_video_asset_id = CASE WHEN v_asset.kind = 'background_video' THEN NULL ELSE background_video_asset_id END,
          banner_asset_id = CASE WHEN v_asset.kind = 'banner' THEN NULL ELSE banner_asset_id END,
          animated_avatar_asset_id = CASE
            WHEN v_asset.kind = 'animated_avatar'
              OR (v_asset.kind = 'avatar' AND v_config.animated_avatar_asset_id IS NOT NULL AND EXISTS (
                SELECT 1
                FROM public.profile_media_assets animated
                WHERE animated.id = v_config.animated_avatar_asset_id
                  AND animated.kind = 'animated_avatar'
                  AND animated.metadata->>'fallback_asset_id' = v_asset.id::text
              ))
              THEN NULL
            ELSE animated_avatar_asset_id
          END,
          share_image_asset_id = CASE WHEN v_asset.kind = 'share_image' THEN NULL ELSE share_image_asset_id END,
          cursor_asset_id = CASE WHEN v_asset.kind = 'cursor' THEN NULL ELSE cursor_asset_id END,
          pointer_cursor_asset_id = CASE WHEN v_asset.kind = 'pointer_cursor' THEN NULL ELSE pointer_cursor_asset_id END,
          avatar_path = CASE WHEN v_asset.kind = 'avatar' THEN NULL ELSE avatar_path END,
          background_path = CASE WHEN v_asset.kind = 'background' THEN NULL ELSE background_path END,
          audio_path = CASE WHEN v_asset.kind = 'audio' AND v_config.audio_asset_id = v_asset.id THEN NULL ELSE audio_path END,
          background_video_path = CASE WHEN v_asset.kind = 'background_video' THEN NULL ELSE background_video_path END,
          banner_path = CASE WHEN v_asset.kind = 'banner' THEN NULL ELSE banner_path END,
          cursor_path = CASE WHEN v_asset.kind = 'cursor' THEN NULL ELSE cursor_path END,
          pointer_cursor_path = CASE WHEN v_asset.kind = 'pointer_cursor' THEN NULL ELSE pointer_cursor_path END,
          audio_playlist = CASE WHEN v_asset.kind = 'audio' THEN jsonb_set(v_playlist, '{tracks}', v_tracks, true) ELSE audio_playlist END,
          updated_at = clock_timestamp()
      WHERE user_id = v_user_id
      RETURNING updated_at INTO v_updated_at;
    END IF;

    UPDATE public.profile_media_assets
    SET status = 'deleted', deleted_at = now(), cleanup_at = now(), updated_at = now()
    WHERE id = v_asset.id;

    RETURN jsonb_build_object(
      'success', true,
      'storage_provider', 'r2',
      'r2_private_key', v_asset.r2_private_key,
      'r2_public_key', v_asset.r2_public_key,
      'ever_public', v_asset.ever_public,
      'cleared_reference', CASE WHEN v_selected THEN v_asset.kind ELSE NULL END,
      'configuration_changed', v_selected,
      'updated_at', v_updated_at,
      'cleanup_pending', true
    );
  END IF;

  -- Preserve the existing Supabase Storage lifecycle during the migration.
  IF v_selected THEN
    UPDATE public.profile_configurations
    SET avatar_asset_id = CASE WHEN v_asset.kind = 'avatar' THEN NULL ELSE avatar_asset_id END,
        background_asset_id = CASE WHEN v_asset.kind = 'background' THEN NULL ELSE background_asset_id END,
        audio_asset_id = CASE WHEN v_asset.kind = 'audio' AND v_config.audio_asset_id = v_asset.id THEN NULL ELSE audio_asset_id END,
        background_video_asset_id = CASE WHEN v_asset.kind = 'background_video' THEN NULL ELSE background_video_asset_id END,
        banner_asset_id = CASE WHEN v_asset.kind = 'banner' THEN NULL ELSE banner_asset_id END,
        animated_avatar_asset_id = CASE WHEN v_asset.kind = 'animated_avatar' THEN NULL ELSE animated_avatar_asset_id END,
        share_image_asset_id = CASE WHEN v_asset.kind = 'share_image' THEN NULL ELSE share_image_asset_id END,
        cursor_asset_id = CASE WHEN v_asset.kind = 'cursor' THEN NULL ELSE cursor_asset_id END,
        pointer_cursor_asset_id = CASE WHEN v_asset.kind = 'pointer_cursor' THEN NULL ELSE pointer_cursor_asset_id END,
        avatar_path = CASE WHEN v_asset.kind = 'avatar' THEN NULL ELSE avatar_path END,
        background_path = CASE WHEN v_asset.kind = 'background' THEN NULL ELSE background_path END,
        background_video_path = CASE WHEN v_asset.kind = 'background_video' THEN NULL ELSE background_video_path END,
        banner_path = CASE WHEN v_asset.kind = 'banner' THEN NULL ELSE banner_path END,
        cursor_path = CASE WHEN v_asset.kind = 'cursor' THEN NULL ELSE cursor_path END,
        pointer_cursor_path = CASE WHEN v_asset.kind = 'pointer_cursor' THEN NULL ELSE pointer_cursor_path END,
        audio_path = CASE WHEN v_asset.kind = 'audio' AND v_config.audio_path IS NOT DISTINCT FROM v_asset.storage_path THEN NULL ELSE audio_path END,
        audio_playlist = CASE WHEN v_asset.kind = 'audio' THEN jsonb_set(v_playlist, '{tracks}', v_tracks, true) ELSE audio_playlist END,
        updated_at = clock_timestamp()
    WHERE user_id = v_user_id
    RETURNING updated_at INTO v_updated_at;
  END IF;

  -- Legacy Supabase rows follow the same provider-neutral tombstone path.
  -- The control plane owns external object deletion; SQL must not touch the
  -- storage schema directly.
  UPDATE public.profile_media_assets
  SET status = 'deleted',
      deleted_at = COALESCE(deleted_at, now()),
      cleanup_at = now(),
      updated_at = now()
  WHERE id = v_asset.id;
  RETURN jsonb_build_object(
    'success', true,
    'storage_provider', v_provider,
    'storage_path', v_asset.storage_path,
    'r2_private_key', v_asset.r2_private_key,
    'r2_public_key', v_asset.r2_public_key,
    'ever_public', v_asset.ever_public,
    'cleared_reference', CASE WHEN v_selected THEN v_asset.kind ELSE NULL END,
    'configuration_changed', v_selected,
    'updated_at', v_updated_at,
    'cleanup_pending', true
  );
END;
$function$;

-- Profile structure is no longer an entitlement. Keep the existing bounded
-- normalizers, but give every account the current maximum project/widget
-- limits. V2 links share the six-link profile contract applied afterward.
CREATE OR REPLACE FUNCTION public.normalize_profile_configuration(p_input jsonb, p_fallback_color text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SET search_path TO public, pg_catalog
AS $function$
DECLARE
  v_base_input jsonb := coalesce(p_input, '{}'::jsonb);
  v_v2_input jsonb := coalesce(p_input, '{}'::jsonb);
  v_base jsonb;
  v_layout text;
  v_project_limit integer := 10;
  v_widget_limit integer := 4;
BEGIN
  IF jsonb_typeof(v_base_input) <> 'object' OR coalesce(v_base_input->>'version','1') <> '1' THEN RETURN NULL; END IF;
  v_layout := public.profile_layout_key(
    v_base_input->>'layoutVariant',
    'compact'
  );
  -- The legacy validator still expects its former layout vocabulary. Feed it
  -- a bounded compatibility value, then overwrite both public layout fields
  -- with the canonical runtime key below.
  v_base_input := jsonb_set(
    v_base_input,
    '{layoutVariant}',
    to_jsonb(CASE WHEN v_layout = 'full-bleed' THEN 'immersive' ELSE 'focus' END),
    true
  );
  v_base_input := jsonb_set(v_base_input, '{links}', coalesce((SELECT jsonb_agg(item ORDER BY ord) FROM (SELECT value item, ord FROM jsonb_array_elements(CASE WHEN jsonb_typeof(v_base_input->'links') = 'array' THEN v_base_input->'links' ELSE '[]'::jsonb END) WITH ORDINALITY rows(value, ord) LIMIT 6) limited), '[]'::jsonb), true);
  v_base_input := jsonb_set(v_base_input, '{widgets}', coalesce((SELECT jsonb_agg(item ORDER BY ord) FROM (SELECT value item, ord FROM jsonb_array_elements(CASE WHEN jsonb_typeof(v_base_input->'widgets') = 'array' THEN v_base_input->'widgets' ELSE '[]'::jsonb END) WITH ORDINALITY rows(value, ord) LIMIT v_widget_limit) limited), '[]'::jsonb), true);
  IF jsonb_typeof(v_v2_input->'content') = 'object' AND v_v2_input->'content'->>'version' = '2' THEN
    v_v2_input := jsonb_set(v_v2_input, '{content,projects}', coalesce((SELECT jsonb_agg(item ORDER BY ord) FROM (SELECT value item, ord FROM jsonb_array_elements(CASE WHEN jsonb_typeof(v_v2_input->'content'->'projects') = 'array' THEN v_v2_input->'content'->'projects' ELSE '[]'::jsonb END) WITH ORDINALITY rows(value, ord) LIMIT v_project_limit) limited), '[]'::jsonb), true);
  END IF;
  v_v2_input := jsonb_set(v_v2_input, '{widgets}', coalesce((SELECT jsonb_agg(item ORDER BY ord) FROM (SELECT value item, ord FROM jsonb_array_elements(CASE WHEN jsonb_typeof(v_v2_input->'widgets') = 'array' THEN v_v2_input->'widgets' ELSE '[]'::jsonb END) WITH ORDINALITY rows(value, ord) LIMIT v_widget_limit) limited), '[]'::jsonb), true);
  v_base := public.normalize_profile_configuration_legacy_v2(v_base_input, p_fallback_color);
  IF v_base IS NULL THEN RETURN NULL; END IF;
  v_base := v_base || jsonb_build_object(
    'templateKey', v_layout,
    'layoutVariant', v_layout
  );
  RETURN v_base
    || jsonb_build_object(
      'links', public.profile_v2_normalize_links(p_input->'links'),
      'content', public.profile_v2_normalize_content(v_v2_input->'content'),
      'widgets', public.profile_v2_normalize_widgets(v_v2_input->'widgets', p_input->>'spotify_type', p_input->>'spotify_id')
    )
    || CASE WHEN jsonb_typeof(p_input->'identityPresentation') = 'object' THEN jsonb_build_object('identityPresentation', public.profile_v2_normalize_identity(p_input->'identityPresentation')) ELSE '{}'::jsonb END
    || CASE WHEN jsonb_typeof(p_input->'metadata') = 'object' THEN jsonb_build_object('metadata', public.profile_v2_normalize_metadata(p_input->'metadata')) ELSE '{}'::jsonb END
    || CASE WHEN jsonb_typeof(p_input->'linkStyle') = 'object' THEN jsonb_build_object('linkStyle', jsonb_build_object('alignment', CASE WHEN p_input->'linkStyle'->>'alignment' IN ('left','center','right') THEN p_input->'linkStyle'->>'alignment' ELSE 'left' END, 'monochrome', CASE WHEN p_input->'linkStyle'->>'monochrome' IN ('true', 'false') THEN (p_input->'linkStyle'->>'monochrome')::boolean ELSE false END, 'size', least(2, greatest(0, CASE WHEN p_input->'linkStyle'->>'size' ~ '^-?[0-9]{1,3}$' THEN (p_input->'linkStyle'->>'size')::integer ELSE 0 END)), 'glow', least(2, greatest(0, CASE WHEN p_input->'linkStyle'->>'glow' ~ '^-?[0-9]{1,3}$' THEN (p_input->'linkStyle'->>'glow')::integer ELSE 0 END)))) ELSE '{}'::jsonb END;
END;
$function$;

UPDATE public.shop_items
SET catalog_status = 'retired'
WHERE item_key IN ('name_prism_atelier', 'bg_prism_atmosphere')
  AND catalog_status = 'active';

REVOKE ALL ON FUNCTION public.prepare_my_profile_media_upload_r2(text, text, text, bigint, text, text, jsonb, uuid) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.prepare_my_profile_media_upload_r2(text, text, text, bigint, text, text, jsonb, uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.select_my_profile_r2_media_v2(uuid, uuid, uuid, uuid, uuid, uuid, jsonb) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.select_my_profile_r2_media_v2(uuid, uuid, uuid, uuid, uuid, uuid, jsonb) TO authenticated;
REVOKE ALL ON FUNCTION public.clear_new_profile_media_reference_on_delete() FROM PUBLIC, anon, authenticated;

COMMIT;
