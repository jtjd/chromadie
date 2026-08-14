BEGIN;

-- R2 hardening: keep cleanup state durable, count physical staged bytes, and
-- authorize the direct-upload path with the historical per-kind limits.
ALTER TABLE public.profile_media_assets
  ADD COLUMN IF NOT EXISTS cache_purge_status text NOT NULL DEFAULT 'not_required',
  ADD COLUMN IF NOT EXISTS cache_purge_at timestamptz;

ALTER TABLE public.profile_media_assets
  DROP CONSTRAINT IF EXISTS profile_media_assets_cache_purge_status_check;

ALTER TABLE public.profile_media_assets
  ADD CONSTRAINT profile_media_assets_cache_purge_status_check
    CHECK (cache_purge_status IN ('not_required', 'pending', 'processing', 'retry', 'completed'));

ALTER TABLE public.profile_media_account_cleanup_jobs
  ADD COLUMN IF NOT EXISTS lease_expires_at timestamptz;

CREATE INDEX IF NOT EXISTS profile_media_account_cleanup_jobs_lease_idx
  ON public.profile_media_account_cleanup_jobs (lease_expires_at)
  WHERE status = 'processing';

-- This is the only RPC used by the R2 upload-intent endpoint. It deliberately
-- leaves r2_public_key NULL until promotion so the database quota reflects
-- the physical private object that exists at intent time.
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
  v_count_limit integer;
  v_count integer;
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
  IF v_kind IN ('cursor', 'pointer_cursor') AND (
    (v_metadata->>'width') !~ '^[0-9]{1,5}$'
    OR (v_metadata->>'height') !~ '^[0-9]{1,5}$'
    OR (v_metadata->>'width')::integer NOT BETWEEN 1 AND 128
    OR (v_metadata->>'height')::integer NOT BETWEEN 1 AND 128
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Cursor media must declare dimensions at most 128 by 128 pixels.';
  END IF;

  SELECT coalesce(is_staff, false) INTO v_is_staff FROM public.profiles WHERE id = v_user_id;
  IF v_kind = 'audio' AND NOT v_is_staff THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Profile audio is not available for this account.';
  END IF;
  IF v_kind IN ('background_video', 'banner', 'cursor', 'pointer_cursor')
     AND NOT public.profile_rich_media_access(v_user_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Rich profile media requires Chromadie Plus.';
  END IF;

  v_count_limit := CASE v_kind
    WHEN 'background_video' THEN 3
    WHEN 'audio' THEN 5
    WHEN 'banner' THEN 1
    WHEN 'cursor' THEN 1
    WHEN 'pointer_cursor' THEN 1
    ELSE NULL
  END;
  IF p_replace_asset_id IS NOT NULL THEN
    IF v_kind NOT IN ('banner', 'cursor', 'pointer_cursor') THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Replacement is not supported for this media kind.';
    END IF;
    PERFORM 1
    FROM public.profile_media_assets
    WHERE id = p_replace_asset_id
      AND user_id = v_user_id
      AND kind = v_kind
      AND status = 'active'
    FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'The media asset being replaced is no longer available.';
    END IF;
  END IF;

  IF v_count_limit IS NOT NULL THEN
    SELECT count(*) INTO v_count
    FROM public.profile_media_assets
    WHERE user_id = v_user_id
      AND kind = v_kind
      AND (r2_private_key IS NOT NULL OR r2_public_key IS NOT NULL)
      AND (p_replace_asset_id IS NULL OR id <> p_replace_asset_id);
    IF v_count >= v_count_limit THEN
      RAISE EXCEPTION USING ERRCODE = '54000', MESSAGE = 'That media slot is full. Replace or remove an existing asset first.';
    END IF;
  END IF;

  -- Count each physical bucket copy. A pending upload reserves its private
  -- bytes; a promotion overlap counts both copies until private cleanup wins.
  SELECT coalesce(sum(byte_size * (
    CASE WHEN r2_private_key IS NOT NULL THEN 1 ELSE 0 END
    + CASE WHEN r2_public_key IS NOT NULL THEN 1 ELSE 0 END
  )), 0)
  INTO v_r2_total
  FROM public.profile_media_assets
  WHERE storage_provider = 'r2'
    AND (r2_private_key IS NOT NULL OR r2_public_key IS NOT NULL)
    AND status IN ('staged', 'active', 'abandoned', 'deleted');
  IF v_r2_total + p_byte_size > 8589934592 THEN
    RAISE EXCEPTION USING ERRCODE = '54000', MESSAGE = 'Profile media storage is temporarily at its R2 safety cap.';
  END IF;

  SELECT coalesce(sum(byte_size * (
    CASE WHEN r2_private_key IS NOT NULL THEN 1 ELSE 0 END
    + CASE WHEN r2_public_key IS NOT NULL THEN 1 ELSE 0 END
  )), 0)
  INTO v_total
  FROM public.profile_media_assets
  WHERE user_id = v_user_id
    AND storage_provider = 'r2'
    AND (r2_private_key IS NOT NULL OR r2_public_key IS NOT NULL)
    AND status IN ('staged', 'active', 'abandoned', 'deleted');
  IF v_total + p_byte_size > 157286400 THEN
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
    'success', true,
    'asset_id', v_asset_id,
    'storage_provider', 'r2',
    'r2_private_key', v_private_key,
    'r2_public_key', NULL,
    'content_hash_sha256', v_hash,
    'expires_at', now() + interval '15 minutes',
    'mime_type', v_mime,
    'byte_size', p_byte_size,
    'replace_asset_id', p_replace_asset_id
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.fail_my_profile_media_upload(
  p_user_id uuid,
  p_asset_id uuid,
  p_error text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, pg_catalog
AS $function$
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Control-plane access required.';
  END IF;
  UPDATE public.profile_media_assets
  SET status = 'abandoned',
      delivery_status = 'failed',
      upload_expires_at = NULL,
      cleanup_at = now(),
      last_error = left(coalesce(p_error, 'R2 upload verification failed.'), 1000),
      updated_at = now()
  WHERE id = p_asset_id
    AND user_id = p_user_id
    AND storage_provider = 'r2'
    AND status = 'staged';
  RETURN jsonb_build_object('success', true, 'asset_id', p_asset_id, 'marked', FOUND);
END;
$function$;

CREATE OR REPLACE FUNCTION public.claim_profile_media_orphan_cleanup(
  p_limit integer DEFAULT 25
)
RETURNS TABLE (id uuid, user_id uuid, r2_private_key text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, pg_catalog
AS $function$
DECLARE
  v_limit integer := LEAST(100, GREATEST(1, coalesce(p_limit, 25)));
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Control-plane access required.';
  END IF;
  RETURN QUERY
  WITH candidates AS (
    SELECT asset.id
    FROM public.profile_media_assets asset
    WHERE asset.storage_provider = 'r2'
      AND asset.status IN ('staged', 'abandoned')
      AND asset.delivery_status <> 'ready'
      AND NULLIF(asset.r2_private_key, '') IS NOT NULL
      AND (
        (asset.upload_expires_at IS NOT NULL AND asset.upload_expires_at <= now())
        OR (asset.cleanup_at IS NOT NULL AND asset.cleanup_at <= now())
      )
    ORDER BY coalesce(asset.cleanup_at, asset.upload_expires_at), asset.updated_at
    FOR UPDATE SKIP LOCKED
    LIMIT v_limit
  )
  UPDATE public.profile_media_assets asset
  SET status = 'abandoned',
      delivery_status = 'failed',
      upload_expires_at = NULL,
      cleanup_at = now() + interval '15 minutes',
      last_error = coalesce(asset.last_error, 'R2 upload was abandoned before verification.'),
      updated_at = now()
  FROM candidates
  WHERE asset.id = candidates.id
  RETURNING asset.id, asset.user_id, asset.r2_private_key;
END;
$function$;

CREATE OR REPLACE FUNCTION public.complete_profile_media_orphan_cleanup(
  p_asset_id uuid,
  p_success boolean,
  p_error text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, pg_catalog
AS $function$
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Control-plane access required.';
  END IF;
  IF p_success THEN
    DELETE FROM public.profile_media_assets
    WHERE id = p_asset_id
      AND storage_provider = 'r2'
      AND status = 'abandoned'
      AND delivery_status = 'failed';
  ELSE
    UPDATE public.profile_media_assets
    SET cleanup_at = now() + interval '15 minutes',
        last_error = left(coalesce(p_error, 'R2 orphan cleanup failed.'), 1000),
        updated_at = now()
    WHERE id = p_asset_id
      AND storage_provider = 'r2'
      AND status = 'abandoned';
  END IF;
  RETURN jsonb_build_object('success', true, 'asset_id', p_asset_id, 'completed', FOUND);
END;
$function$;

-- A processing account-cleanup job is leased, so a crashed worker can be
-- reclaimed by a later invocation without a second queue implementation.
CREATE OR REPLACE FUNCTION public.claim_profile_media_account_cleanup_jobs(p_limit integer DEFAULT 10)
RETURNS TABLE (id uuid, user_id uuid, object_keys jsonb, attempts integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, pg_catalog
AS $function$
DECLARE
  v_limit integer := LEAST(100, GREATEST(1, coalesce(p_limit, 10)));
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Control-plane access required.';
  END IF;
  RETURN QUERY
  WITH candidates AS (
    SELECT jobs.id
    FROM public.profile_media_account_cleanup_jobs jobs
    WHERE (
      (jobs.status IN ('pending', 'retry') AND jobs.next_attempt_at <= now())
      OR (jobs.status = 'processing' AND (
        jobs.lease_expires_at IS NULL
        OR jobs.lease_expires_at <= now()
      ))
    )
    ORDER BY jobs.next_attempt_at, jobs.created_at
    FOR UPDATE SKIP LOCKED
    LIMIT v_limit
  )
  UPDATE public.profile_media_account_cleanup_jobs jobs
  SET status = 'processing',
      attempts = jobs.attempts + 1,
      last_attempt_at = now(),
      lease_expires_at = now() + interval '15 minutes',
      last_error = NULL
  FROM candidates
  WHERE jobs.id = candidates.id
  RETURNING jobs.id, jobs.user_id, jobs.object_keys, jobs.attempts;
END;
$function$;

CREATE OR REPLACE FUNCTION public.complete_profile_media_account_cleanup_job(
  p_job_id uuid,
  p_success boolean,
  p_error text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, pg_catalog
AS $function$
DECLARE
  v_job public.profile_media_account_cleanup_jobs%ROWTYPE;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Control-plane access required.';
  END IF;
  IF p_success THEN
    UPDATE public.profile_media_account_cleanup_jobs
    SET status = 'completed', object_keys = '[]'::jsonb, completed_at = now(), lease_expires_at = NULL, last_error = NULL
    WHERE id = p_job_id
    RETURNING * INTO v_job;
  ELSE
    UPDATE public.profile_media_account_cleanup_jobs
    SET status = 'retry',
        next_attempt_at = now() + make_interval(secs => LEAST(86400, (60 * power(2::numeric, LEAST(attempts, 10)))::integer)),
        lease_expires_at = NULL,
        last_error = left(coalesce(p_error, 'R2 account media cleanup failed.'), 1000)
    WHERE id = p_job_id
    RETURNING * INTO v_job;
  END IF;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Cleanup job not found.'); END IF;
  RETURN jsonb_build_object('success', true, 'job_id', v_job.id, 'status', v_job.status, 'attempts', v_job.attempts);
END;
$function$;

REVOKE ALL ON FUNCTION public.prepare_my_profile_media_upload_r2(text, text, text, bigint, text, text, jsonb, uuid) FROM PUBLIC, anon, service_role;
REVOKE ALL ON FUNCTION public.fail_my_profile_media_upload(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_profile_media_orphan_cleanup(integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_profile_media_orphan_cleanup(uuid, boolean, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prepare_my_profile_media_upload_r2(text, text, text, bigint, text, text, jsonb, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fail_my_profile_media_upload(uuid, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_profile_media_orphan_cleanup(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_profile_media_orphan_cleanup(uuid, boolean, text) TO service_role;

COMMIT;
