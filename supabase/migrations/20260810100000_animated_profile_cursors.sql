-- Milestone 10 follow-up: keep ANI animated cursors bounded while retaining
-- the same owner-scoped staging/finalization path used by WebP cursors.

BEGIN;

ALTER TABLE public.profile_configurations
  DROP CONSTRAINT IF EXISTS profile_configurations_rich_media_path_check;

ALTER TABLE public.profile_configurations
  ADD CONSTRAINT profile_configurations_rich_media_path_check CHECK (
    (background_video_path IS NULL OR background_video_path ~ '^profile_media/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.](mp4|webm)$')
    AND (banner_path IS NULL OR banner_path ~ '^profile_media/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.]webp$')
    AND (cursor_path IS NULL OR cursor_path ~ '^profile_media/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.](webp|ani)$')
    AND (pointer_cursor_path IS NULL OR pointer_cursor_path ~ '^profile_media/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.](webp|ani)$')
  );

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile_media',
  'profile_media',
  true,
  26214400,
  ARRAY['video/mp4', 'video/webm', 'audio/mpeg', 'image/webp', 'application/x-navi-animation']::text[]
)
ON CONFLICT (id) DO UPDATE
SET allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Owners can stage rich profile media" ON storage.objects;
CREATE POLICY "Owners can stage rich profile media"
  ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'profile_media'
    AND name ~ ('^' || auth.uid()::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.](mp4|webm|mp3|webp|ani)$')
    AND EXISTS (
      SELECT 1 FROM public.profile_media_assets a
      WHERE a.user_id = auth.uid()
        AND a.status = 'staged'
        AND a.storage_path = 'profile_media/' || name
        AND COALESCE(storage.objects.metadata->>'mimetype', '') = a.mime_type
    )
  );

DROP POLICY IF EXISTS "Owners can replace rich profile media" ON storage.objects;
CREATE POLICY "Owners can replace rich profile media"
  ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'profile_media'
    AND name ~ ('^' || auth.uid()::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.](mp4|webm|mp3|webp|ani)$')
    AND EXISTS (
      SELECT 1 FROM public.profile_media_assets a
      WHERE a.user_id = auth.uid() AND a.storage_path = 'profile_media/' || name
    )
  )
  WITH CHECK (
    bucket_id = 'profile_media'
    AND COALESCE(storage.objects.metadata->>'mimetype', '') IN ('video/mp4', 'video/webm', 'audio/mpeg', 'image/webp', 'application/x-navi-animation')
  );

DROP POLICY IF EXISTS "Owners can delete rich profile media" ON storage.objects;
CREATE POLICY "Owners can delete rich profile media"
  ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'profile_media'
    AND name ~ ('^' || auth.uid()::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.](mp4|webm|mp3|webp|ani)$')
    AND EXISTS (
      SELECT 1 FROM public.profile_media_assets a
      WHERE a.user_id = auth.uid() AND a.storage_path = 'profile_media/' || name
    )
  );

CREATE OR REPLACE FUNCTION public.stage_my_profile_media_asset(
  p_kind text,
  p_asset_id uuid,
  p_extension text,
  p_byte_size bigint,
  p_label text DEFAULT '',
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, storage, pg_temp
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_kind text := lower(btrim(COALESCE(p_kind, '')));
  v_extension text := lower(btrim(COALESCE(p_extension, '')));
  v_mime text;
  v_limit bigint;
  v_count_limit integer;
  v_count integer;
  v_total bigint;
  v_path text;
  v_metadata jsonb := CASE WHEN jsonb_typeof(p_metadata) = 'object' THEN p_metadata ELSE '{}'::jsonb END;
  v_asset public.profile_media_assets%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION USING ERRCODE = '28000', MESSAGE = 'Not authenticated'; END IF;
  IF NOT public.profile_rich_media_access(v_user_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Rich profile media requires Chromadie Plus.';
  END IF;
  IF p_asset_id IS NULL OR v_kind NOT IN ('background_video', 'banner', 'audio', 'cursor', 'pointer_cursor') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'That media kind is not supported.';
  END IF;

  v_mime := CASE
    WHEN v_kind = 'background_video' AND v_extension = 'mp4' THEN 'video/mp4'
    WHEN v_kind = 'background_video' AND v_extension = 'webm' THEN 'video/webm'
    WHEN v_kind = 'audio' AND v_extension = 'mp3' THEN 'audio/mpeg'
    WHEN v_kind IN ('banner', 'cursor', 'pointer_cursor') AND v_extension = 'webp' THEN 'image/webp'
    WHEN v_kind IN ('cursor', 'pointer_cursor') AND v_extension = 'ani' THEN 'application/x-navi-animation'
    ELSE NULL
  END;
  IF v_mime IS NULL THEN RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'The file extension does not match this media kind.'; END IF;

  v_limit := CASE v_kind
    WHEN 'background_video' THEN 26214400
    WHEN 'audio' THEN 10485760
    WHEN 'banner' THEN 2097152
    ELSE 131072
  END;
  v_count_limit := CASE v_kind WHEN 'background_video' THEN 3 WHEN 'audio' THEN 5 ELSE 1 END;
  IF p_byte_size IS NULL OR p_byte_size <= 0 OR p_byte_size > v_limit THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'That media file exceeds its server-side size limit.';
  END IF;
  IF v_kind IN ('cursor', 'pointer_cursor')
     AND ((CASE WHEN (v_metadata->>'width') ~ '^[0-9]{1,5}$' THEN (v_metadata->>'width')::integer ELSE 0 END) NOT BETWEEN 1 AND 128
       OR (CASE WHEN (v_metadata->>'height') ~ '^[0-9]{1,5}$' THEN (v_metadata->>'height')::integer ELSE 0 END) NOT BETWEEN 1 AND 128) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Cursor media must declare dimensions at most 128 by 128 pixels.';
  END IF;

  SELECT count(*) INTO v_count
  FROM public.profile_media_assets
  WHERE user_id = v_user_id AND kind = v_kind AND status IN ('staged', 'active');
  IF v_count >= v_count_limit THEN
    RAISE EXCEPTION USING ERRCODE = '54000', MESSAGE = 'That media slot is full. Remove an existing asset first.';
  END IF;

  SELECT COALESCE(sum(byte_size), 0) INTO v_total
  FROM public.profile_media_assets
  WHERE user_id = v_user_id AND status IN ('staged', 'active');
  IF v_total + p_byte_size > 157286400 THEN
    RAISE EXCEPTION USING ERRCODE = '54000', MESSAGE = 'Your rich media library is limited to 150 MB.';
  END IF;

  v_path := 'profile_media/' || v_user_id::text || '/' || p_asset_id::text || '.' || v_extension;
  IF EXISTS (SELECT 1 FROM public.profile_media_assets WHERE storage_path = v_path)
     OR EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = 'profile_media' AND name = split_part(v_path, '/', 2) || '/' || split_part(v_path, '/', 3)) THEN
    RAISE EXCEPTION USING ERRCODE = '23505', MESSAGE = 'That media asset already exists.';
  END IF;

  INSERT INTO public.profile_media_assets (
    id, user_id, kind, storage_path, label, status, mime_type, byte_size,
    duration_ms, width, height, metadata, cleanup_at, updated_at
  ) VALUES (
    p_asset_id, v_user_id, v_kind, v_path, left(btrim(COALESCE(p_label, '')), 80), 'staged', v_mime,
    p_byte_size,
    CASE WHEN (v_metadata->>'duration_ms') ~ '^[0-9]+$' THEN LEAST((v_metadata->>'duration_ms')::integer, 86400000) END,
    CASE WHEN (v_metadata->>'width') ~ '^[0-9]+$' THEN LEAST((v_metadata->>'width')::integer, 4096) END,
    CASE WHEN (v_metadata->>'height') ~ '^[0-9]+$' THEN LEAST((v_metadata->>'height')::integer, 4096) END,
    jsonb_build_object(
      'duration_ms', CASE WHEN (v_metadata->>'duration_ms') ~ '^[0-9]+$' THEN LEAST((v_metadata->>'duration_ms')::integer, 86400000) ELSE 0 END,
      'width', CASE WHEN (v_metadata->>'width') ~ '^[0-9]+$' THEN LEAST((v_metadata->>'width')::integer, 4096) ELSE 0 END,
      'height', CASE WHEN (v_metadata->>'height') ~ '^[0-9]+$' THEN LEAST((v_metadata->>'height')::integer, 4096) ELSE 0 END
    ),
    now() + interval '24 hours', now()
  ) RETURNING * INTO v_asset;

  RETURN jsonb_build_object('success', true, 'id', v_asset.id, 'kind', v_asset.kind, 'storage_path', v_asset.storage_path, 'mime_type', v_asset.mime_type, 'byte_size', v_asset.byte_size, 'status', v_asset.status, 'cleanup_at', v_asset.cleanup_at);
END;
$function$;

REVOKE ALL ON FUNCTION public.stage_my_profile_media_asset(text, uuid, text, bigint, text, jsonb) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.stage_my_profile_media_asset(text, uuid, text, bigint, text, jsonb) TO authenticated;

COMMIT;
