BEGIN;

-- Final R2 deletion correctness: a legacy path is evidence of selection only
-- when the asset actually has one. NULL is not a legacy path and must never
-- match another NULL path for a provider-native R2 asset.
CREATE OR REPLACE FUNCTION public.delete_my_profile_media_asset(p_asset_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, storage, pg_temp
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_asset public.profile_media_assets%ROWTYPE;
  v_config public.profile_configurations%ROWTYPE;
  v_playlist jsonb;
  v_tracks jsonb;
  v_selected boolean := false;
  v_updated_at timestamptz;
  v_bucket text;
  v_object_path text;
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

  SELECT * INTO v_config
  FROM public.profile_configurations
  WHERE user_id = v_user_id
  FOR UPDATE;
  IF FOUND THEN
    v_playlist := COALESCE(v_config.audio_playlist, '{}'::jsonb);
    v_selected := COALESCE((
      (v_asset.kind = 'avatar' AND (
        v_config.avatar_asset_id = v_asset.id
        OR (v_asset.storage_path IS NOT NULL AND v_config.avatar_path = v_asset.storage_path)
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
      OR (v_asset.kind = 'cursor' AND (
        v_config.cursor_asset_id = v_asset.id
        OR (v_asset.storage_path IS NOT NULL AND v_config.cursor_path = v_asset.storage_path)
      ))
      OR (v_asset.kind = 'pointer_cursor' AND (
        v_config.pointer_cursor_asset_id = v_asset.id
        OR (v_asset.storage_path IS NOT NULL AND v_config.pointer_cursor_path = v_asset.storage_path)
      ))
    ), false);

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

  IF v_asset.storage_provider = 'r2' THEN
    IF v_selected THEN
      UPDATE public.profile_configurations
      SET avatar_asset_id = CASE WHEN v_asset.kind = 'avatar' THEN NULL ELSE avatar_asset_id END,
          background_asset_id = CASE WHEN v_asset.kind = 'background' THEN NULL ELSE background_asset_id END,
          audio_asset_id = CASE WHEN v_asset.kind = 'audio' AND v_config.audio_asset_id = v_asset.id THEN NULL ELSE audio_asset_id END,
          background_video_asset_id = CASE WHEN v_asset.kind = 'background_video' THEN NULL ELSE background_video_asset_id END,
          banner_asset_id = CASE WHEN v_asset.kind = 'banner' THEN NULL ELSE banner_asset_id END,
          cursor_asset_id = CASE WHEN v_asset.kind = 'cursor' THEN NULL ELSE cursor_asset_id END,
          pointer_cursor_asset_id = CASE WHEN v_asset.kind = 'pointer_cursor' THEN NULL ELSE pointer_cursor_asset_id END,
          avatar_path = CASE WHEN v_asset.kind = 'avatar' THEN NULL ELSE avatar_path END,
          background_path = CASE WHEN v_asset.kind = 'background' THEN NULL ELSE background_path END,
          audio_path = CASE
            WHEN v_asset.kind = 'audio' AND (
              v_config.audio_asset_id = v_asset.id
              OR (v_asset.storage_path IS NOT NULL AND v_config.audio_path = v_asset.storage_path)
            ) THEN NULL
            ELSE audio_path
          END,
          background_video_path = CASE WHEN v_asset.kind = 'background_video' THEN NULL ELSE background_video_path END,
          banner_path = CASE WHEN v_asset.kind = 'banner' THEN NULL ELSE banner_path END,
          cursor_path = CASE WHEN v_asset.kind = 'cursor' THEN NULL ELSE cursor_path END,
          pointer_cursor_path = CASE WHEN v_asset.kind = 'pointer_cursor' THEN NULL ELSE pointer_cursor_path END,
          audio_playlist = CASE WHEN v_asset.kind = 'audio' THEN jsonb_set(v_playlist, '{tracks}', v_tracks, true) ELSE audio_playlist END,
          updated_at = now()
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
    SET avatar_path = CASE WHEN v_asset.kind = 'avatar' THEN NULL ELSE avatar_path END,
        background_path = CASE WHEN v_asset.kind = 'background' THEN NULL ELSE background_path END,
        background_video_path = CASE WHEN v_asset.kind = 'background_video' THEN NULL ELSE background_video_path END,
        banner_path = CASE WHEN v_asset.kind = 'banner' THEN NULL ELSE banner_path END,
        cursor_path = CASE WHEN v_asset.kind = 'cursor' THEN NULL ELSE cursor_path END,
        pointer_cursor_path = CASE WHEN v_asset.kind = 'pointer_cursor' THEN NULL ELSE pointer_cursor_path END,
        audio_path = CASE
          WHEN v_asset.kind = 'audio' AND (
            (v_asset.storage_path IS NOT NULL AND v_config.audio_path = v_asset.storage_path)
            OR v_config.audio_asset_id = v_asset.id
          ) THEN NULL
          ELSE audio_path
        END,
        audio_playlist = CASE WHEN v_asset.kind = 'audio' THEN jsonb_set(v_playlist, '{tracks}', v_tracks, true) ELSE audio_playlist END,
        updated_at = now()
    WHERE user_id = v_user_id
    RETURNING updated_at INTO v_updated_at;
  END IF;

  v_bucket := split_part(v_asset.storage_path, '/', 1);
  v_object_path := regexp_replace(v_asset.storage_path, '^[^/]+/', '');
  IF v_asset.storage_path IS NOT NULL THEN
    PERFORM set_config('storage.allow_delete_query', 'true', true);
    DELETE FROM storage.objects WHERE bucket_id = v_bucket AND name = v_object_path;
  END IF;
  DELETE FROM public.profile_media_assets WHERE id = v_asset.id;
  RETURN jsonb_build_object(
    'success', true,
    'storage_provider', 'supabase',
    'storage_path', v_asset.storage_path,
    'cleared_reference', CASE WHEN v_selected THEN v_asset.kind ELSE NULL END,
    'configuration_changed', v_selected,
    'updated_at', v_updated_at
  );
END;
$function$;

-- A repeated publication is valid after the temporary private copy has been
-- deleted. The public key is now the only required physical reference.
CREATE OR REPLACE FUNCTION public.mark_my_profile_media_public(
  p_user_id uuid,
  p_asset_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, pg_catalog
AS $function$
DECLARE
  v_asset public.profile_media_assets%ROWTYPE;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Control-plane access required.';
  END IF;

  SELECT * INTO v_asset
  FROM public.profile_media_assets
  WHERE id = p_asset_id
    AND user_id = p_user_id
    AND storage_provider = 'r2'
    AND status = 'active'
    AND delivery_status = 'ready'
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Media asset is not ready for publication.');
  END IF;

  IF v_asset.ever_public IS TRUE AND NULLIF(v_asset.r2_public_key, '') IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_public', true,
      'asset_id', v_asset.id,
      'r2_public_key', v_asset.r2_public_key,
      'ever_public', true,
      'public_ready_at', v_asset.public_ready_at
    );
  END IF;

  IF NULLIF(v_asset.r2_private_key, '') IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'The R2 asset has no verified publication source.');
  END IF;

  UPDATE public.profile_media_assets
  SET r2_public_key = coalesce(r2_public_key, r2_private_key),
      ever_public = true,
      public_ready_at = coalesce(public_ready_at, now()),
      updated_at = now()
  WHERE id = v_asset.id;

  SELECT * INTO v_asset FROM public.profile_media_assets WHERE id = p_asset_id;
  RETURN jsonb_build_object(
    'success', true,
    'asset_id', v_asset.id,
    'r2_public_key', v_asset.r2_public_key,
    'ever_public', v_asset.ever_public,
    'public_ready_at', v_asset.public_ready_at
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.delete_my_profile_media_asset(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_my_profile_media_asset(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.mark_my_profile_media_public(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_my_profile_media_public(uuid, uuid) TO service_role;

COMMIT;
