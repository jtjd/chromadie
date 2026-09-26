BEGIN;

-- Existing files are preserved until an owner replaces or clears their slot.
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
  -- Serialize slot preparation with selection, including concurrent tabs.
  PERFORM 1 FROM public.profile_configurations WHERE user_id = v_user_id FOR UPDATE;
  IF NOT v_has_plus THEN
    -- Expired candidates never displace the currently equipped file.
    UPDATE public.profile_media_assets a
    SET status = 'deleted', deleted_at = now(), cleanup_at = now(), updated_at = now()
    WHERE a.user_id = v_user_id AND a.kind = v_kind
      AND a.status IN ('staged', 'active') AND a.metadata->>'free_slot_candidate' = 'true'
      AND a.created_at < now() - interval '15 minutes'
      AND NOT EXISTS (SELECT 1 FROM public.profile_configurations c WHERE c.user_id = v_user_id
        AND a.id IN (c.avatar_asset_id, c.background_asset_id));
    IF EXISTS (
      SELECT 1 FROM public.profile_media_assets a
      WHERE a.user_id = v_user_id AND a.kind = v_kind
        AND a.status IN ('staged', 'active') AND a.metadata->>'free_slot_candidate' = 'true'
        AND NOT EXISTS (SELECT 1 FROM public.profile_configurations c WHERE c.user_id = v_user_id
          AND a.id IN (c.avatar_asset_id, c.background_asset_id))
    ) THEN
      RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'An upload for this slot is already in progress. Try again in a few minutes.';
    END IF;
    v_metadata := v_metadata || '{"free_slot_candidate":true}'::jsonb;
  ELSE
    v_metadata := v_metadata - 'free_slot_candidate';
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
  IF v_has_plus AND v_asset_count >= 200 THEN
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
    AND status IN ('staged', 'active')
    AND (v_has_plus OR kind <> v_kind);
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
  v_retired_ids jsonb := '[]'::jsonb;
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
      AND storage_provider = 'r2' AND ever_public IS TRUE
      AND content_validation_version = 1 AND r2_public_key IS NOT NULL;
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
      AND storage_provider = 'r2' AND ever_public IS TRUE
      AND content_validation_version = 1 AND r2_public_key IS NOT NULL;
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
  IF NOT public.profile_rich_media_access(v_user_id) THEN
    -- Commit selection and retirement together. The existing cleanup worker owns
    -- object deletion and CDN purge; no browser can choose whose files to retire.
    WITH retired AS (
      UPDATE public.profile_media_assets a
      SET status = 'deleted', deleted_at = now(), cleanup_at = now(), updated_at = now()
      WHERE a.user_id = v_user_id AND a.status = 'active'
        AND (
          (a.kind = 'avatar' AND (p_avatar_id IS NOT NULL OR p_clear_avatar)
            AND a.id IS DISTINCT FROM v_record.avatar_asset_id)
          OR (a.kind = 'background' AND (p_background_id IS NOT NULL OR p_clear_background)
            AND a.id IS DISTINCT FROM v_record.background_asset_id)
        )
      RETURNING a.id
    ) SELECT coalesce(jsonb_agg(id), '[]'::jsonb) INTO v_retired_ids FROM retired;
  END IF;
  RETURN jsonb_build_object(
    'success', true,
    'retired_asset_ids', v_retired_ids,
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

-- Preserve the legacy two-argument replacement/clear contract through the same
-- validated slot lifecycle; older clients must not bypass retirement.
CREATE OR REPLACE FUNCTION public.select_my_profile_expression_assets(
  p_avatar_id uuid DEFAULT NULL,
  p_background_id uuid DEFAULT NULL
)
RETURNS jsonb LANGUAGE sql SECURITY DEFINER
SET search_path TO public, pg_catalog
AS $function$
  SELECT public.select_my_profile_expression_assets(
    p_avatar_id, p_background_id, p_avatar_id IS NULL, p_background_id IS NULL
  );
$function$;

COMMIT;
