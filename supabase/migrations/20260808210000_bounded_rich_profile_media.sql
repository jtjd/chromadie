-- Milestone 10: bounded premium/staff rich profile media.
-- Uploads are staged first, verified against Storage metadata by a definer
-- RPC, and only then become selectable public profile expression.

BEGIN;

ALTER TABLE public.profile_media_assets
  DROP CONSTRAINT IF EXISTS profile_media_assets_kind_check;

ALTER TABLE public.profile_media_assets
  ADD CONSTRAINT profile_media_assets_kind_check CHECK (
    kind IN ('avatar', 'background', 'background_video', 'banner', 'audio', 'cursor', 'pointer_cursor')
  );

ALTER TABLE public.profile_media_assets
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS mime_type text,
  ADD COLUMN IF NOT EXISTS byte_size bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS duration_ms integer,
  ADD COLUMN IF NOT EXISTS width integer,
  ADD COLUMN IF NOT EXISTS height integer,
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS cleanup_at timestamptz;

ALTER TABLE public.profile_media_assets
  DROP CONSTRAINT IF EXISTS profile_media_assets_status_check,
  DROP CONSTRAINT IF EXISTS profile_media_assets_byte_size_check,
  DROP CONSTRAINT IF EXISTS profile_media_assets_metadata_check;

ALTER TABLE public.profile_media_assets
  ADD CONSTRAINT profile_media_assets_status_check CHECK (status IN ('staged', 'active', 'abandoned', 'deleted')),
  ADD CONSTRAINT profile_media_assets_byte_size_check CHECK (byte_size >= 0 AND byte_size <= 26214400),
  ADD CONSTRAINT profile_media_assets_metadata_check CHECK (jsonb_typeof(metadata) = 'object');

REVOKE ALL ON TABLE public.profile_media_assets FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.profile_media_assets TO authenticated;

CREATE INDEX IF NOT EXISTS profile_media_assets_user_status_kind_idx
  ON public.profile_media_assets (user_id, status, kind, created_at DESC);

ALTER TABLE public.profile_configurations
  ADD COLUMN IF NOT EXISTS background_video_path text,
  ADD COLUMN IF NOT EXISTS banner_path text,
  ADD COLUMN IF NOT EXISTS cursor_path text,
  ADD COLUMN IF NOT EXISTS pointer_cursor_path text,
  ADD COLUMN IF NOT EXISTS audio_playlist jsonb NOT NULL DEFAULT '{"tracks":[],"shuffle":false,"loop":true,"autoplay":false,"volume":0.75,"controls":true}'::jsonb;

ALTER TABLE public.profile_configurations
  DROP CONSTRAINT IF EXISTS profile_configurations_rich_media_path_check,
  DROP CONSTRAINT IF EXISTS profile_configurations_audio_playlist_check;

ALTER TABLE public.profile_configurations
  ADD CONSTRAINT profile_configurations_rich_media_path_check CHECK (
    (background_video_path IS NULL OR background_video_path ~ '^profile_media/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.](mp4|webm)$')
    AND (banner_path IS NULL OR banner_path ~ '^profile_media/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.]webp$')
    AND (cursor_path IS NULL OR cursor_path ~ '^profile_media/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.]webp$')
    AND (pointer_cursor_path IS NULL OR pointer_cursor_path ~ '^profile_media/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.]webp$')
  ),
  ADD CONSTRAINT profile_configurations_audio_playlist_check CHECK (jsonb_typeof(audio_playlist) = 'object');

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile_media',
  'profile_media',
  true,
  26214400,
  ARRAY['video/mp4', 'video/webm', 'audio/mpeg', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    public = true,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Public rich profile media read" ON storage.objects;
CREATE POLICY "Public rich profile media read"
  ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'profile_media');

DROP POLICY IF EXISTS "Owners can stage rich profile media" ON storage.objects;
CREATE POLICY "Owners can stage rich profile media"
  ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'profile_media'
    AND name ~ ('^' || auth.uid()::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.](mp4|webm|mp3|webp)$')
    AND EXISTS (
      SELECT 1 FROM public.profile_media_assets a
      WHERE a.user_id = auth.uid()
        AND a.status = 'staged'
        AND a.storage_path = 'profile_media/' || auth.uid()::text || '/' || name
        AND COALESCE(metadata->>'mimetype', '') = a.mime_type
    )
  );

DROP POLICY IF EXISTS "Owners can replace rich profile media" ON storage.objects;
CREATE POLICY "Owners can replace rich profile media"
  ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'profile_media'
    AND name ~ ('^' || auth.uid()::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.](mp4|webm|mp3|webp)$')
    AND EXISTS (
      SELECT 1 FROM public.profile_media_assets a
      WHERE a.user_id = auth.uid() AND a.storage_path = 'profile_media/' || auth.uid()::text || '/' || name
    )
  )
  WITH CHECK (
    bucket_id = 'profile_media'
    AND COALESCE(metadata->>'mimetype', '') IN ('video/mp4', 'video/webm', 'audio/mpeg', 'image/webp')
  );

DROP POLICY IF EXISTS "Owners can delete rich profile media" ON storage.objects;
CREATE POLICY "Owners can delete rich profile media"
  ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'profile_media'
    AND name ~ ('^' || auth.uid()::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.](mp4|webm|mp3|webp)$')
    AND EXISTS (
      SELECT 1 FROM public.profile_media_assets a
      WHERE a.user_id = auth.uid() AND a.storage_path = 'profile_media/' || auth.uid()::text || '/' || name
    )
  );

CREATE OR REPLACE FUNCTION public.profile_rich_media_access(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public, pg_temp
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = p_user_id AND p.is_staff = true
  ) OR EXISTS (
    SELECT 1
    FROM public.profile_entitlements e
    JOIN public.billing_premium_access b ON b.user_id = e.user_id AND b.active = true
    WHERE e.user_id = p_user_id
      AND e.entitlement_key IN ('chromadie_plus', 'atelier_plus')
  );
$function$;

REVOKE ALL ON FUNCTION public.profile_rich_media_access(uuid) FROM PUBLIC, anon, authenticated;

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

CREATE OR REPLACE FUNCTION public.finalize_my_profile_media_asset(p_asset_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, storage, pg_temp
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_asset public.profile_media_assets%ROWTYPE;
  v_object storage.objects%ROWTYPE;
  v_actual_size bigint;
  v_allowed boolean := false;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION USING ERRCODE = '28000', MESSAGE = 'Not authenticated'; END IF;
  SELECT * INTO v_asset FROM public.profile_media_assets WHERE id = p_asset_id AND user_id = v_user_id FOR UPDATE;
  IF NOT FOUND OR v_asset.status <> 'staged' THEN RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'That staged media asset is not available.'; END IF;

  SELECT * INTO v_object
  FROM storage.objects
  WHERE bucket_id = 'profile_media'
    AND name = split_part(v_asset.storage_path, '/', 2) || '/' || split_part(v_asset.storage_path, '/', 3);
  IF NOT FOUND OR COALESCE(v_object.metadata->>'mimetype', '') <> v_asset.mime_type THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'The uploaded media MIME type is not valid.';
  END IF;
  v_actual_size := CASE WHEN COALESCE(v_object.metadata->>'size', '') ~ '^[0-9]+$' THEN (v_object.metadata->>'size')::bigint ELSE v_asset.byte_size END;
  IF v_actual_size <= 0 OR v_actual_size > v_asset.byte_size THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'The uploaded media size could not be verified.';
  END IF;
  IF v_asset.kind IN ('cursor', 'pointer_cursor') THEN
    v_allowed := (CASE WHEN (v_asset.metadata->>'width') ~ '^[0-9]{1,5}$' THEN (v_asset.metadata->>'width')::integer ELSE 0 END) BETWEEN 1 AND 128
      AND (CASE WHEN (v_asset.metadata->>'height') ~ '^[0-9]{1,5}$' THEN (v_asset.metadata->>'height')::integer ELSE 0 END) BETWEEN 1 AND 128
      AND v_actual_size <= 131072;
  ELSE
    v_allowed := true;
  END IF;
  IF NOT v_allowed THEN RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Cursor media must be at most 128 by 128 pixels and 128 KB.'; END IF;

  UPDATE public.profile_media_assets
  SET status = 'active', byte_size = v_actual_size, cleanup_at = NULL, updated_at = now()
  WHERE id = v_asset.id;
  RETURN jsonb_build_object('success', true, 'id', v_asset.id, 'status', 'active', 'storage_path', v_asset.storage_path, 'byte_size', v_actual_size);
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
  WHERE user_id = v_user_id;

  RETURN jsonb_build_object('success', true, 'background_video_path', v_background_video_path, 'banner_path', v_banner_path, 'cursor_path', v_cursor_path, 'pointer_cursor_path', v_pointer_cursor_path, 'audio_playlist', v_playlist);
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
  WHERE user_id = v_user_id;

  v_bucket := split_part(v_asset.storage_path, '/', 1);
  v_object_path := regexp_replace(v_asset.storage_path, '^[^/]+/', '');
  DELETE FROM storage.objects WHERE bucket_id = v_bucket AND name = v_object_path;
  DELETE FROM public.profile_media_assets WHERE id = v_asset.id;
  RETURN jsonb_build_object('success', true, 'storage_path', v_asset.storage_path, 'cleared_reference', v_asset.kind);
END;
$function$;

CREATE OR REPLACE FUNCTION public.cleanup_staged_profile_media()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, storage, pg_temp
AS $function$
DECLARE
  v_asset public.profile_media_assets%ROWTYPE;
  v_user_id uuid;
  v_count integer := 0;
BEGIN
  PERFORM set_config('storage.allow_delete_query', 'true', true);
  FOR v_asset IN SELECT * FROM public.profile_media_assets WHERE status = 'staged' AND cleanup_at IS NOT NULL AND cleanup_at < now() FOR UPDATE LOOP
    DELETE FROM storage.objects WHERE bucket_id = split_part(v_asset.storage_path, '/', 1) AND name = regexp_replace(v_asset.storage_path, '^[^/]+/', '');
    DELETE FROM public.profile_media_assets WHERE id = v_asset.id;
    v_count := v_count + 1;
  END LOOP;

  -- A refund hides rich presentation immediately but leaves the owner's
  -- expression recoverable for thirty days. Only the service cleanup path may
  -- remove those expired premium assets.
  FOR v_user_id IN
    SELECT user_id
    FROM public.billing_premium_access
    WHERE active = false AND recovery_until IS NOT NULL AND recovery_until < now()
  LOOP
    UPDATE public.profile_configurations
    SET background_video_path = NULL,
        banner_path = NULL,
        cursor_path = NULL,
        pointer_cursor_path = NULL,
        audio_playlist = '{"tracks":[],"shuffle":false,"loop":true,"autoplay":false,"volume":0.75,"controls":true}'::jsonb,
        updated_at = now()
    WHERE user_id = v_user_id;
    FOR v_asset IN
      SELECT * FROM public.profile_media_assets
      WHERE user_id = v_user_id
        AND kind IN ('background_video', 'banner', 'audio', 'cursor', 'pointer_cursor')
      FOR UPDATE
    LOOP
      DELETE FROM storage.objects
      WHERE bucket_id = split_part(v_asset.storage_path, '/', 1)
        AND name = regexp_replace(v_asset.storage_path, '^[^/]+/', '');
      DELETE FROM public.profile_media_assets WHERE id = v_asset.id;
      v_count := v_count + 1;
    END LOOP;
  END LOOP;
  RETURN jsonb_build_object('success', true, 'cleaned', v_count);
END;
$function$;

-- The owner projection includes private library selections. The public
-- projection only exposes rich fields while the authoritative staff flag or
-- active lifetime entitlement is present; a refund therefore falls back to
-- the free image composition without deleting the owner's recovery data.
CREATE OR REPLACE FUNCTION public.get_my_profile_configuration()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_signature_color text;
  v_default jsonb;
  v_record public.profile_configurations%ROWTYPE;
  v_expression jsonb;
BEGIN
  IF v_user_id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Not authenticated'); END IF;
  SELECT mood_color INTO v_signature_color FROM public.profiles WHERE id = v_user_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Profile not found'); END IF;
  v_default := public.profile_default_configuration(v_signature_color);
  INSERT INTO public.profile_configurations (user_id, draft_config, published_config) VALUES (v_user_id, v_default, v_default) ON CONFLICT (user_id) DO NOTHING;
  SELECT * INTO v_record FROM public.profile_configurations WHERE user_id = v_user_id;
  v_expression := jsonb_build_object(
    'avatar_path', v_record.avatar_path,
    'background_path', v_record.background_path,
    'spotify_type', v_record.spotify_type,
    'spotify_id', v_record.spotify_id,
    'audio_path', CASE WHEN EXISTS (SELECT 1 FROM public.profiles WHERE id = v_user_id AND is_staff) THEN v_record.audio_path ELSE NULL END,
    'background_video_path', v_record.background_video_path,
    'banner_path', v_record.banner_path,
    'cursor_path', v_record.cursor_path,
    'pointer_cursor_path', v_record.pointer_cursor_path,
    'audio_playlist', COALESCE(v_record.audio_playlist, '{"tracks":[]}'::jsonb)
  );
  RETURN jsonb_build_object('success', true, 'version', v_record.config_version, 'draft', v_record.draft_config || v_expression, 'published', v_record.published_config || v_expression, 'updated_at', v_record.updated_at, 'published_at', v_record.published_at);
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_public_profile_configuration(p_user_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $function$
  WITH profile_row AS (
    SELECT p.*, c.published_config, c.avatar_path, c.background_path, c.spotify_type, c.spotify_id, c.audio_path,
      c.background_video_path, c.banner_path, c.cursor_path, c.pointer_cursor_path, c.audio_playlist,
      public.profile_rich_media_access(p.id) AS rich_access
    FROM public.profiles p
    LEFT JOIN public.profile_configurations c ON c.user_id = p.id
    WHERE p.id = p_user_id
  ),
  base AS (
    SELECT CASE
      WHEN COALESCE(published_config->>'templateKey', '') = 'atelier' AND NOT rich_access
      THEN COALESCE(published_config, public.profile_default_configuration(mood_color))
        || jsonb_build_object('templateKey', 'signal', 'layoutVariant', public.profile_default_configuration(mood_color)->'layoutVariant', 'modules', public.profile_default_configuration(mood_color)->'modules')
      ELSE COALESCE(published_config, public.profile_default_configuration(mood_color))
    END AS config, profile_row.*
    FROM profile_row
  )
  SELECT config || jsonb_build_object(
    'avatar_path', avatar_path,
    'background_path', background_path,
    'spotify_type', spotify_type,
    'spotify_id', spotify_id,
    'audio_path', CASE WHEN is_staff THEN audio_path ELSE NULL END,
    'background_video_path', CASE WHEN rich_access THEN background_video_path ELSE NULL END,
    'banner_path', CASE WHEN rich_access THEN banner_path ELSE NULL END,
    'cursor_path', CASE WHEN rich_access THEN cursor_path ELSE NULL END,
    'pointer_cursor_path', CASE WHEN rich_access THEN pointer_cursor_path ELSE NULL END,
    'audio_playlist', CASE WHEN rich_access THEN COALESCE(audio_playlist, '{"tracks":[]}'::jsonb) ELSE '{"tracks":[],"shuffle":false,"loop":true,"autoplay":false,"volume":0.75,"controls":true}'::jsonb END
  )
  FROM base;
$function$;

-- Account deletion already invokes this function through the existing profile
-- trigger. Extend it to clean rich objects while retaining legacy buckets.
CREATE OR REPLACE FUNCTION public.delete_profile_expression_media()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, storage, pg_temp
AS $function$
BEGIN
  PERFORM set_config('storage.allow_delete_query', 'true', true);
  DELETE FROM storage.objects
  WHERE (bucket_id = 'avatars' AND name = OLD.id::text || '/avatar.webp')
     OR (bucket_id = 'backgrounds' AND name = OLD.id::text || '/background.webp')
     OR (bucket_id = 'profile_audio' AND name = OLD.id::text || '/profile.mp3')
     OR (bucket_id = 'profile_media' AND name LIKE OLD.id::text || '/%');
  RETURN OLD;
END;
$function$;

REVOKE ALL ON FUNCTION public.stage_my_profile_media_asset(text, uuid, text, bigint, text, jsonb) FROM PUBLIC, anon, service_role;
REVOKE ALL ON FUNCTION public.finalize_my_profile_media_asset(uuid) FROM PUBLIC, anon, service_role;
REVOKE ALL ON FUNCTION public.select_my_profile_rich_media(uuid, uuid, uuid, uuid, jsonb) FROM PUBLIC, anon, service_role;
REVOKE ALL ON FUNCTION public.delete_my_profile_media_asset(uuid) FROM PUBLIC, anon, service_role;
REVOKE ALL ON FUNCTION public.cleanup_staged_profile_media() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.stage_my_profile_media_asset(text, uuid, text, bigint, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_my_profile_media_asset(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.select_my_profile_rich_media(uuid, uuid, uuid, uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_my_profile_media_asset(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_staged_profile_media() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_my_profile_configuration() TO authenticated;
REVOKE ALL ON FUNCTION public.get_public_profile_configuration(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_profile_configuration(uuid) TO anon, authenticated;

COMMENT ON TABLE public.profile_media_assets IS
  'Owner-scoped reusable profile media. Rich assets are staged, verified, quota-accounted, and only selected paths are projected publicly.';

COMMIT;
