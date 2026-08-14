BEGIN;

-- R2 is additive during the migration window. Existing Supabase Storage
-- paths remain readable until every selected public asset has been migrated.
ALTER TABLE public.profile_media_assets
  ADD COLUMN IF NOT EXISTS storage_provider text NOT NULL DEFAULT 'supabase',
  ADD COLUMN IF NOT EXISTS r2_private_key text,
  ADD COLUMN IF NOT EXISTS r2_public_key text,
  ADD COLUMN IF NOT EXISTS content_hash_sha256 text,
  ADD COLUMN IF NOT EXISTS delivery_status text NOT NULL DEFAULT 'ready',
  ADD COLUMN IF NOT EXISTS upload_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS public_ready_at timestamptz,
  ADD COLUMN IF NOT EXISTS ever_public boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_error text,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- R2 assets do not have a Supabase Storage path. Keep the legacy column for
-- compatibility while allowing new provider-owned rows to omit it.
ALTER TABLE public.profile_media_assets
  ALTER COLUMN storage_path DROP NOT NULL;

UPDATE public.profile_media_assets
SET delivery_status = CASE
      WHEN status = 'active' THEN 'ready'
      WHEN status = 'staged' THEN 'pending'
      ELSE delivery_status
    END
WHERE delivery_status IS NULL
   OR (storage_provider = 'supabase' AND status = 'active' AND delivery_status <> 'ready');

ALTER TABLE public.profile_media_assets
  DROP CONSTRAINT IF EXISTS profile_media_assets_storage_provider_check,
  DROP CONSTRAINT IF EXISTS profile_media_assets_delivery_status_check,
  DROP CONSTRAINT IF EXISTS profile_media_assets_hash_check;

ALTER TABLE public.profile_media_assets
  ADD CONSTRAINT profile_media_assets_storage_provider_check
    CHECK (storage_provider IN ('supabase', 'r2')),
  ADD CONSTRAINT profile_media_assets_delivery_status_check
    CHECK (delivery_status IN ('pending', 'uploading', 'verifying', 'ready', 'failed')),
  ADD CONSTRAINT profile_media_assets_hash_check
    CHECK (content_hash_sha256 IS NULL OR content_hash_sha256 ~ '^[0-9a-fA-F]{64}$');

CREATE UNIQUE INDEX IF NOT EXISTS profile_media_assets_r2_private_key_idx
  ON public.profile_media_assets (r2_private_key)
  WHERE r2_private_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS profile_media_assets_r2_public_key_idx
  ON public.profile_media_assets (r2_public_key)
  WHERE r2_public_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS profile_media_assets_delivery_cleanup_idx
  ON public.profile_media_assets (delivery_status, upload_expires_at)
  WHERE delivery_status IN ('pending', 'uploading', 'verifying');

ALTER TABLE public.profile_configurations
  ADD COLUMN IF NOT EXISTS avatar_asset_id uuid REFERENCES public.profile_media_assets(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS background_asset_id uuid REFERENCES public.profile_media_assets(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS audio_asset_id uuid REFERENCES public.profile_media_assets(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS background_video_asset_id uuid REFERENCES public.profile_media_assets(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS banner_asset_id uuid REFERENCES public.profile_media_assets(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cursor_asset_id uuid REFERENCES public.profile_media_assets(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pointer_cursor_asset_id uuid REFERENCES public.profile_media_assets(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.profile_media_assets.storage_path IS
  'Legacy Supabase Storage path retained only for compatibility during provider migration.';
COMMENT ON COLUMN public.profile_media_assets.storage_provider IS
  'Byte owner: supabase during migration or r2 after direct-upload cutover.';
COMMENT ON COLUMN public.profile_media_assets.delivery_status IS
  'Byte lifecycle. Only ready assets may be selected or rendered publicly.';
COMMENT ON COLUMN public.profile_media_assets.ever_public IS
  'Once true, unequip removes profile selection only; it does not privatize or delete the public object.';
COMMENT ON COLUMN public.profile_media_assets.r2_public_key IS
  'Immutable public delivery key. It remains stable after unequip until explicit asset deletion.';

CREATE OR REPLACE FUNCTION public.prepare_my_profile_media_upload(
  p_kind text,
  p_extension text,
  p_mime_type text,
  p_byte_size bigint,
  p_content_hash_sha256 text,
  p_label text DEFAULT '',
  p_metadata jsonb DEFAULT '{}'::jsonb
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
  v_asset_id uuid := gen_random_uuid();
  v_private_key text;
  v_metadata jsonb := CASE WHEN jsonb_typeof(p_metadata) = 'object' THEN p_metadata ELSE '{}'::jsonb END;
  v_is_staff boolean := false;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '28000', MESSAGE = 'Not authenticated';
  END IF;

  -- Serialize authorization around the application safety cap. This is a
  -- conservative operational guard in addition to the per-user quota.
  PERFORM pg_advisory_xact_lock(hashtext('chromadie:r2-profile-media-cap'));

  IF v_kind NOT IN ('avatar', 'background', 'background_video', 'banner', 'audio', 'cursor', 'pointer_cursor') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'That media kind is not supported.';
  END IF;

  IF p_byte_size IS NULL OR p_byte_size <= 0 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'The uploaded file is empty.';
  END IF;

  v_limit := CASE v_kind
    WHEN 'avatar' THEN 262144
    WHEN 'background' THEN 4194304
    WHEN 'background_video' THEN 26214400
    WHEN 'banner' THEN 2097152
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

  SELECT coalesce(sum(byte_size), 0)
  INTO v_r2_total
  FROM public.profile_media_assets
  WHERE storage_provider = 'r2'
    AND status IN ('staged', 'active')
    AND delivery_status <> 'failed';
  IF v_r2_total + p_byte_size > 8589934592 THEN
    RAISE EXCEPTION USING ERRCODE = '54000', MESSAGE = 'Profile media storage is temporarily at its R2 safety cap.';
  END IF;

  IF v_hash !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'A valid SHA-256 content hash is required.';
  END IF;

  IF v_kind IN ('avatar', 'background', 'banner') AND (v_extension <> 'webp' OR v_mime <> 'image/webp') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'This image must be a WebP file.';
  END IF;
  IF v_kind = 'background_video' AND (v_extension NOT IN ('mp4', 'webm') OR v_mime NOT IN ('video/mp4', 'video/webm')) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Use an MP4 or WebM video.';
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

  SELECT coalesce(is_staff, false) INTO v_is_staff FROM public.profiles WHERE id = v_user_id;
  IF v_kind = 'audio' AND NOT v_is_staff THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Profile audio is not available for this account.';
  END IF;
  IF v_kind IN ('background_video', 'banner', 'cursor', 'pointer_cursor')
     AND NOT public.profile_rich_media_access(v_user_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Rich profile media requires Chromadie Plus.';
  END IF;

  SELECT coalesce(sum(byte_size), 0)
  INTO v_total
  FROM public.profile_media_assets
  WHERE user_id = v_user_id
    AND status IN ('staged', 'active')
    AND delivery_status <> 'failed';
  IF v_total + p_byte_size > 157286400 THEN
    RAISE EXCEPTION USING ERRCODE = '54000', MESSAGE = 'Your profile media quota has been reached.';
  END IF;

  v_private_key := format('profiles/%s/%s/%s.%s', v_user_id, v_asset_id, v_hash, v_extension);

  INSERT INTO public.profile_media_assets (
    id,
    user_id,
    kind,
    storage_path,
    storage_provider,
    r2_private_key,
    r2_public_key,
    content_hash_sha256,
    delivery_status,
    status,
    label,
    mime_type,
    byte_size,
    metadata,
    cleanup_at,
    upload_expires_at
  ) VALUES (
    v_asset_id,
    v_user_id,
    v_kind,
    NULL,
    'r2',
    v_private_key,
    v_private_key,
    v_hash,
    'pending',
    'staged',
    left(coalesce(p_label, ''), 80),
    v_mime,
    p_byte_size,
    v_metadata,
    now() + interval '24 hours',
    now() + interval '15 minutes'
  );

  RETURN jsonb_build_object(
    'success', true,
    'asset_id', v_asset_id,
    'storage_provider', 'r2',
    'r2_private_key', v_private_key,
    'r2_public_key', v_private_key,
    'content_hash_sha256', v_hash,
    'expires_at', now() + interval '15 minutes',
    'mime_type', v_mime,
    'byte_size', p_byte_size
  );
END;
$function$;

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
    RETURN jsonb_build_object('success', true, 'already_ready', true, 'asset_id', v_asset.id, 'updated_at', v_asset.updated_at);
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
    'mime_type', v_asset.mime_type,
    'byte_size', v_asset.byte_size,
    'status', v_asset.status,
    'delivery_status', v_asset.delivery_status
  );
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
  SET ever_public = true,
      public_ready_at = coalesce(public_ready_at, now()),
      updated_at = now()
  WHERE id = p_asset_id
    AND user_id = p_user_id
    AND storage_provider = 'r2'
    AND status = 'active'
    AND delivery_status = 'ready'
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

REVOKE ALL ON FUNCTION public.prepare_my_profile_media_upload(text, text, text, bigint, text, text, jsonb) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.prepare_my_profile_media_upload(text, text, text, bigint, text, text, jsonb) TO authenticated;
REVOKE ALL ON FUNCTION public.complete_my_profile_media_upload(uuid, uuid, bigint, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_my_profile_media_upload(uuid, uuid, bigint, text, text) TO service_role;
REVOKE ALL ON FUNCTION public.mark_my_profile_media_public(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_my_profile_media_public(uuid, uuid) TO service_role;

COMMIT;
