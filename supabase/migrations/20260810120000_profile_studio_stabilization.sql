-- Profile Studio follow-up: persist bounded background treatment and make
-- single-slot cursor replacement atomic without weakening the existing upload
-- or owner/RLS boundaries.

BEGIN;

CREATE OR REPLACE FUNCTION public.normalize_profile_appearance(
  p_input jsonb,
  p_fallback_color text DEFAULT '#CDD2FF'
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SET search_path TO public, pg_catalog
AS $function$
DECLARE
  v_input jsonb := CASE WHEN jsonb_typeof(p_input) = 'object' THEN p_input ELSE '{}'::jsonb END;
  v_colors jsonb := CASE WHEN jsonb_typeof(v_input->'colors') = 'object' THEN v_input->'colors' ELSE '{}'::jsonb END;
  v_surface jsonb := CASE WHEN jsonb_typeof(v_input->'surface') = 'object' THEN v_input->'surface' ELSE '{}'::jsonb END;
  v_background jsonb := CASE WHEN jsonb_typeof(v_input->'background') = 'object' THEN v_input->'background' ELSE '{}'::jsonb END;
  v_gradient jsonb := CASE WHEN jsonb_typeof(v_input->'gradient') = 'object' THEN v_input->'gradient' ELSE '{}'::jsonb END;
  v_border jsonb := CASE WHEN jsonb_typeof(v_input->'border') = 'object' THEN v_input->'border' ELSE '{}'::jsonb END;
  v_fallback text := public.profile_safe_hex(p_fallback_color, '#CDD2FF');
BEGIN
  RETURN jsonb_build_object(
    'version', 1,
    'colors', jsonb_build_object(
      'text', public.profile_safe_hex(v_colors->>'text', '#F4F6FB'),
      'secondaryText', public.profile_safe_hex(v_colors->>'secondaryText', '#AEB6C4'),
      'username', public.profile_safe_hex(v_colors->>'username', '#FFFFFF'),
      'description', public.profile_safe_hex(v_colors->>'description', '#CBD1DC'),
      'background', public.profile_safe_hex(v_colors->>'background', '#07080B'),
      'surface', public.profile_safe_hex(v_colors->>'surface', '#11141B'),
      'accent', public.profile_safe_hex(v_colors->>'accent', public.profile_safe_hex(v_input->>'signatureColor', v_fallback)),
      'highlight', public.profile_safe_hex(v_colors->>'highlight', '#FFFFFF')
    ),
    'surface', jsonb_build_object(
      'opacity', LEAST(100, GREATEST(0, CASE WHEN (v_surface->>'opacity') ~ '^-?[0-9]+$' THEN (v_surface->>'opacity')::integer ELSE 64 END)),
      'blur', LEAST(40, GREATEST(0, CASE WHEN (v_surface->>'blur') ~ '^-?[0-9]+$' THEN (v_surface->>'blur')::integer ELSE 20 END))
    ),
    'background', jsonb_build_object(
      'blur', LEAST(40, GREATEST(0, CASE WHEN (v_background->>'blur') ~ '^-?[0-9]+$' THEN (v_background->>'blur')::integer ELSE 0 END)),
      'imageOpacity', LEAST(100, GREATEST(0, CASE WHEN (v_background->>'imageOpacity') ~ '^-?[0-9]+$' THEN (v_background->>'imageOpacity')::integer ELSE 100 END)),
      'overlayColor', public.profile_safe_hex(v_background->>'overlayColor', '#000000'),
      'overlayOpacity', LEAST(100, GREATEST(0, CASE WHEN (v_background->>'overlayOpacity') ~ '^-?[0-9]+$' THEN (v_background->>'overlayOpacity')::integer ELSE 0 END))
    ),
    'gradient', jsonb_build_object(
      'enabled', v_gradient->>'enabled' = 'true',
      'primary', public.profile_safe_hex(v_gradient->>'primary', '#07080B'),
      'secondary', public.profile_safe_hex(v_gradient->>'secondary', '#171A22'),
      'angle', LEAST(360, GREATEST(0, CASE WHEN (v_gradient->>'angle') ~ '^-?[0-9]+$' THEN (v_gradient->>'angle')::integer ELSE 135 END))
    ),
    'border', jsonb_build_object(
      'enabled', COALESCE(v_border->>'enabled', 'true') = 'true',
      'color', public.profile_safe_hex(v_border->>'color', '#FFFFFF'),
      'width', LEAST(4, GREATEST(0, CASE WHEN (v_border->>'width') ~ '^-?[0-9]+$' THEN (v_border->>'width')::integer ELSE 1 END)),
      'radius', LEAST(48, GREATEST(0, CASE WHEN (v_border->>'radius') ~ '^-?[0-9]+$' THEN (v_border->>'radius')::integer ELSE 24 END)),
      'opacity', LEAST(100, GREATEST(0, CASE WHEN (v_border->>'opacity') ~ '^-?[0-9]+$' THEN (v_border->>'opacity')::integer ELSE 11 END))
    )
  );
END;
$function$;

-- Re-normalize stored drafts/published configurations through the additive
-- field so old profiles receive safe defaults without a client round-trip.
UPDATE public.profile_configurations
SET draft_config = public.normalize_profile_configuration(draft_config, draft_config->>'signatureColor'),
    published_config = public.normalize_profile_configuration(published_config, published_config->>'signatureColor');

CREATE OR REPLACE FUNCTION public.stage_my_profile_media_replacement(
  p_kind text,
  p_asset_id uuid,
  p_extension text,
  p_byte_size bigint,
  p_replace_asset_id uuid,
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
  v_total bigint;
  v_path text;
  v_selected_path text;
  v_metadata jsonb := CASE WHEN jsonb_typeof(p_metadata) = 'object' THEN p_metadata ELSE '{}'::jsonb END;
  v_old public.profile_media_assets%ROWTYPE;
  v_asset public.profile_media_assets%ROWTYPE;
  v_stale public.profile_media_assets%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION USING ERRCODE = '28000', MESSAGE = 'Not authenticated'; END IF;
  IF NOT public.profile_rich_media_access(v_user_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Rich profile media requires Chromadie Plus.';
  END IF;
  IF p_asset_id IS NULL OR p_replace_asset_id IS NULL OR v_kind NOT IN ('cursor', 'pointer_cursor') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'That media replacement is not supported.';
  END IF;

  v_mime := CASE
    WHEN v_extension = 'webp' THEN 'image/webp'
    WHEN v_extension = 'ani' THEN 'application/x-navi-animation'
    ELSE NULL
  END;
  IF v_mime IS NULL THEN RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'The cursor file extension is not supported.'; END IF;
  IF p_byte_size IS NULL OR p_byte_size <= 0 OR p_byte_size > 131072 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'That cursor file exceeds its server-side size limit.';
  END IF;
  IF ((CASE WHEN (v_metadata->>'width') ~ '^[0-9]{1,5}$' THEN (v_metadata->>'width')::integer ELSE 0 END) NOT BETWEEN 1 AND 128
      OR (CASE WHEN (v_metadata->>'height') ~ '^[0-9]{1,5}$' THEN (v_metadata->>'height')::integer ELSE 0 END) NOT BETWEEN 1 AND 128) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Cursor media must declare dimensions at most 128 by 128 pixels.';
  END IF;

  -- Abandoned uploads must not permanently occupy a single-slot cursor.
  FOR v_stale IN
    SELECT * FROM public.profile_media_assets
    WHERE user_id = v_user_id AND status = 'staged' AND cleanup_at IS NOT NULL AND cleanup_at < now()
    FOR UPDATE
  LOOP
    DELETE FROM storage.objects
    WHERE bucket_id = split_part(v_stale.storage_path, '/', 1)
      AND name = regexp_replace(v_stale.storage_path, '^[^/]+/', '');
    DELETE FROM public.profile_media_assets WHERE id = v_stale.id;
  END LOOP;

  SELECT * INTO v_old
  FROM public.profile_media_assets
  WHERE id = p_replace_asset_id
    AND user_id = v_user_id
    AND kind = v_kind
    AND status = 'active'
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'The cursor being replaced is no longer available.'; END IF;

  SELECT CASE WHEN v_kind = 'cursor' THEN cursor_path ELSE pointer_cursor_path END
  INTO v_selected_path
  FROM public.profile_configurations
  WHERE user_id = v_user_id
  FOR UPDATE;
  IF v_selected_path IS DISTINCT FROM v_old.storage_path THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Only the active cursor can be replaced.';
  END IF;

  SELECT COALESCE(sum(byte_size), 0) INTO v_total
  FROM public.profile_media_assets
  WHERE user_id = v_user_id
    AND status IN ('staged', 'active')
    AND id <> v_old.id;
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
    width, height, metadata, cleanup_at, updated_at
  ) VALUES (
    p_asset_id, v_user_id, v_kind, v_path, left(btrim(COALESCE(p_label, '')), 80), 'staged', v_mime,
    p_byte_size,
    LEAST((v_metadata->>'width')::integer, 4096),
    LEAST((v_metadata->>'height')::integer, 4096),
    jsonb_build_object(
      'width', LEAST((v_metadata->>'width')::integer, 4096),
      'height', LEAST((v_metadata->>'height')::integer, 4096)
    ),
    now() + interval '24 hours', now()
  ) RETURNING * INTO v_asset;

  RETURN jsonb_build_object('success', true, 'id', v_asset.id, 'kind', v_asset.kind, 'storage_path', v_asset.storage_path, 'mime_type', v_asset.mime_type, 'byte_size', v_asset.byte_size, 'status', v_asset.status, 'replace_asset_id', v_old.id);
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
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION USING ERRCODE = '28000', MESSAGE = 'Not authenticated'; END IF;
  IF NOT public.profile_rich_media_access(v_user_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Rich profile media requires Chromadie Plus.';
  END IF;
  IF v_kind NOT IN ('cursor', 'pointer_cursor') OR p_old_asset_id IS NULL OR p_new_asset_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'That media replacement is not supported.';
  END IF;

  SELECT CASE WHEN v_kind = 'cursor' THEN cursor_path ELSE pointer_cursor_path END
  INTO v_selected_path
  FROM public.profile_configurations
  WHERE user_id = v_user_id
  FOR UPDATE;

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
    UPDATE public.profile_configurations SET cursor_path = v_new.storage_path, updated_at = now() WHERE user_id = v_user_id;
  ELSE
    UPDATE public.profile_configurations SET pointer_cursor_path = v_new.storage_path, updated_at = now() WHERE user_id = v_user_id;
  END IF;
  UPDATE public.profile_media_assets SET cleanup_at = NULL, updated_at = now() WHERE id = v_new.id;

  DELETE FROM storage.objects
  WHERE bucket_id = split_part(v_old.storage_path, '/', 1)
    AND name = regexp_replace(v_old.storage_path, '^[^/]+/', '');
  DELETE FROM public.profile_media_assets WHERE id = v_old.id;

  RETURN jsonb_build_object('success', true, 'kind', v_kind, 'storage_path', v_new.storage_path, 'old_asset_id', v_old.id, 'new_asset_id', v_new.id);
END;
$function$;

REVOKE ALL ON FUNCTION public.stage_my_profile_media_replacement(text, uuid, text, bigint, uuid, text, jsonb) FROM PUBLIC, anon, service_role;
REVOKE ALL ON FUNCTION public.commit_my_profile_media_replacement(text, uuid, uuid) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.stage_my_profile_media_replacement(text, uuid, text, bigint, uuid, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.commit_my_profile_media_replacement(text, uuid, uuid) TO authenticated;

COMMIT;
