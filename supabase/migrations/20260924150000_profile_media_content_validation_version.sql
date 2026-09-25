BEGIN;

-- Existing R2 rows were completed before encoded-dimension validation was
-- enforced. Keep their data, but hide their public references until the
-- control plane re-reads and validates the stored bytes under policy v1.
ALTER TABLE public.profile_media_assets
  ADD COLUMN IF NOT EXISTS content_validation_version smallint NOT NULL DEFAULT 0;

ALTER TABLE public.profile_media_assets
  DROP CONSTRAINT IF EXISTS profile_media_assets_content_validation_version_check;
ALTER TABLE public.profile_media_assets
  ADD CONSTRAINT profile_media_assets_content_validation_version_check
  CHECK (content_validation_version >= 0);

CREATE OR REPLACE FUNCTION public.complete_my_profile_media_upload(
  p_user_id uuid,
  p_asset_id uuid,
  p_byte_size bigint,
  p_mime_type text,
  p_content_hash_sha256 text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, pg_temp
AS $function$
DECLARE
  v_asset public.profile_media_assets%ROWTYPE;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Control-plane access required.';
  END IF;

  SELECT * INTO v_asset
  FROM public.profile_media_assets
  WHERE id = p_asset_id AND user_id = p_user_id AND storage_provider = 'r2'
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Media upload not found.');
  END IF;
  IF v_asset.delivery_status = 'ready' THEN
    RETURN jsonb_build_object(
      'success', v_asset.content_validation_version = 1,
      'already_ready', v_asset.content_validation_version = 1,
      'asset_id', v_asset.id,
      'updated_at', v_asset.updated_at,
      'error', CASE WHEN v_asset.content_validation_version = 1 THEN NULL ELSE 'Media content validation is required.' END
    );
  END IF;
  IF v_asset.status <> 'staged' OR v_asset.upload_expires_at < now() THEN
    UPDATE public.profile_media_assets
    SET delivery_status = 'failed', last_error = 'Upload expired.', updated_at = now()
    WHERE id = v_asset.id;
    RETURN jsonb_build_object('success', false, 'error', 'Media upload expired.');
  END IF;
  IF p_byte_size IS DISTINCT FROM v_asset.byte_size
     OR lower(coalesce(p_mime_type, '')) IS DISTINCT FROM lower(coalesce(v_asset.mime_type, ''))
     OR lower(coalesce(p_content_hash_sha256, '')) IS DISTINCT FROM lower(coalesce(v_asset.content_hash_sha256, '')) THEN
    UPDATE public.profile_media_assets
    SET delivery_status = 'failed', last_error = 'Uploaded object metadata did not match the authorized upload.', updated_at = now()
    WHERE id = v_asset.id;
    RETURN jsonb_build_object('success', false, 'error', 'Uploaded object metadata did not match the authorized upload.');
  END IF;

  UPDATE public.profile_media_assets
  SET status = 'active',
      delivery_status = 'ready',
      content_validation_version = 1,
      verified_at = now(),
      cleanup_at = NULL,
      upload_expires_at = NULL,
      last_error = NULL,
      updated_at = now()
  WHERE id = v_asset.id
  RETURNING * INTO v_asset;

  RETURN jsonb_build_object(
    'success', true,
    'asset_id', v_asset.id,
    'storage_provider', v_asset.storage_provider,
    'r2_private_key', v_asset.r2_private_key,
    'r2_public_key', v_asset.r2_public_key,
    'content_hash_sha256', v_asset.content_hash_sha256,
    'content_validation_version', v_asset.content_validation_version,
    'mime_type', v_asset.mime_type,
    'byte_size', v_asset.byte_size,
    'status', v_asset.status,
    'delivery_status', v_asset.delivery_status
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.mark_my_profile_media_content_validated(
  p_user_id uuid,
  p_asset_id uuid,
  p_content_hash_sha256 text,
  p_validation_policy_version smallint
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, pg_temp
AS $function$
DECLARE
  v_asset public.profile_media_assets%ROWTYPE;
  v_hash text := lower(btrim(coalesce(p_content_hash_sha256, '')));
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Control-plane access required.';
  END IF;
  IF p_validation_policy_version IS DISTINCT FROM 1 OR v_hash !~ '^[0-9a-f]{64}$' THEN
    RETURN jsonb_build_object('success', false, 'error', 'The media validation result is invalid.');
  END IF;

  UPDATE public.profile_media_assets
  SET content_validation_version = 1,
      verified_at = coalesce(verified_at, now()),
      updated_at = now()
  WHERE id = p_asset_id
    AND user_id = p_user_id
    AND storage_provider = 'r2'
    AND status = 'active'
    AND delivery_status = 'ready'
    AND lower(coalesce(content_hash_sha256, '')) = v_hash
    AND content_validation_version IN (0, 1)
  RETURNING * INTO v_asset;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'The media asset changed during validation.');
  END IF;
  RETURN jsonb_build_object('success', true, 'asset_id', v_asset.id, 'content_validation_version', 1);
END;
$function$;

CREATE OR REPLACE FUNCTION public.mark_my_profile_media_public(
  p_user_id uuid,
  p_asset_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, pg_temp
AS $function$
DECLARE
  v_asset public.profile_media_assets%ROWTYPE;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Control-plane access required.';
  END IF;

  UPDATE public.profile_media_assets
  SET r2_public_key = coalesce(r2_public_key, r2_private_key),
      ever_public = true,
      public_ready_at = coalesce(public_ready_at, now()),
      updated_at = now()
  WHERE id = p_asset_id
    AND user_id = p_user_id
    AND storage_provider = 'r2'
    AND status = 'active'
    AND delivery_status = 'ready'
    AND content_validation_version = 1
    AND lower(coalesce(content_hash_sha256, '')) ~ '^[0-9a-f]{64}$'
    AND COALESCE(NULLIF(r2_public_key, ''), NULLIF(r2_private_key, '')) IS NOT NULL
  RETURNING * INTO v_asset;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Media asset is not ready for publication.');
  END IF;
  RETURN jsonb_build_object(
    'success', true,
    'asset_id', v_asset.id,
    'r2_public_key', v_asset.r2_public_key,
    'ever_public', v_asset.ever_public,
    'public_ready_at', v_asset.public_ready_at
  );
END;
$function$;

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

  IF FOUND AND v_asset.storage_provider = 'r2' THEN
    IF v_asset.status <> 'active'
       OR v_asset.delivery_status <> 'ready'
       OR v_asset.content_validation_version <> 1
       OR lower(coalesce(v_asset.content_hash_sha256, '')) !~ '^[0-9a-f]{64}$'
       OR v_asset.ever_public IS NOT TRUE
       OR NULLIF(v_asset.r2_public_key, '') IS NULL THEN
      RETURN NULL;
    END IF;
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

-- Public profile payloads may retain these columns for owner-side recovery,
-- but the values are historical Supabase object paths, not usable media URLs.
-- Once the public reference is R2-only, do not serialize the legacy path
-- fields (or playlist track paths) alongside a NULL media reference.
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
    'avatar_path', CASE WHEN p_public THEN NULL ELSE p_record.avatar_path END,
    'background_path', CASE WHEN p_public THEN NULL ELSE p_record.background_path END,
    'avatar_asset_id', p_record.avatar_asset_id,
    'background_asset_id', p_record.background_asset_id,
    'spotify_type', p_record.spotify_type,
    'spotify_id', p_record.spotify_id,
    'audio_path', CASE WHEN p_is_staff AND NOT p_public THEN p_record.audio_path ELSE NULL END,
    'audio_asset_id', CASE WHEN p_is_staff THEN p_record.audio_asset_id ELSE NULL END,
    'background_video_path', CASE WHEN NOT p_public THEN p_record.background_video_path ELSE NULL END,
    'background_video_asset_id', CASE WHEN p_rich_access OR NOT p_public THEN p_record.background_video_asset_id ELSE NULL END,
    'animated_avatar_path', NULL,
    'animated_avatar_asset_id', CASE WHEN p_rich_access OR NOT p_public THEN p_record.animated_avatar_asset_id ELSE NULL END,
    'share_image_path', NULL,
    'share_image_asset_id', CASE WHEN p_rich_access OR NOT p_public THEN p_record.share_image_asset_id ELSE NULL END,
    'banner_path', CASE WHEN NOT p_public THEN p_record.banner_path ELSE NULL END,
    'banner_asset_id', CASE WHEN p_rich_access OR NOT p_public THEN p_record.banner_asset_id ELSE NULL END,
    'cursor_path', CASE WHEN NOT p_public THEN p_record.cursor_path ELSE NULL END,
    'cursor_asset_id', CASE WHEN p_rich_access OR NOT p_public THEN p_record.cursor_asset_id ELSE NULL END,
    'pointer_cursor_path', CASE WHEN NOT p_public THEN p_record.pointer_cursor_path ELSE NULL END,
    'pointer_cursor_asset_id', CASE WHEN p_rich_access OR NOT p_public THEN p_record.pointer_cursor_asset_id ELSE NULL END,
    'audio_playlist', CASE
      WHEN NOT (p_rich_access OR NOT p_public) THEN '{"tracks":[],"shuffle":false,"loop":true,"autoplay":false,"volume":0.75,"controls":true}'::jsonb
      WHEN NOT p_public THEN public.profile_media_playlist_with_references(p_record.audio_playlist)
      ELSE (
        SELECT jsonb_set(
          projected.playlist,
          '{tracks}',
          COALESCE((
            SELECT jsonb_agg(media_track.track - 'path' ORDER BY media_track.ordinality)
            FROM jsonb_array_elements(COALESCE(projected.playlist->'tracks', '[]'::jsonb))
              WITH ORDINALITY AS media_track(track, ordinality)
          ), '[]'::jsonb)
        )
        FROM (
          SELECT public.profile_media_playlist_with_references(p_record.audio_playlist) AS playlist
        ) AS projected
      )
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

REVOKE ALL ON FUNCTION public.mark_my_profile_media_content_validated(uuid, uuid, text, smallint) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_my_profile_media_content_validated(uuid, uuid, text, smallint) TO service_role;
REVOKE ALL ON FUNCTION public.complete_my_profile_media_upload(uuid, uuid, bigint, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_my_profile_media_upload(uuid, uuid, bigint, text, text) TO service_role;
REVOKE ALL ON FUNCTION public.mark_my_profile_media_public(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_my_profile_media_public(uuid, uuid) TO service_role;
REVOKE ALL ON FUNCTION public.profile_media_expression_projection(public.profile_configurations, boolean, boolean, boolean) FROM PUBLIC, anon, authenticated;

COMMIT;
