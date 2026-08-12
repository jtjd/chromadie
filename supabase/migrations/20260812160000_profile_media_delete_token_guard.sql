BEGIN;

-- Deleting an unused library asset is not a profile configuration mutation.
-- Keep the optimistic-concurrency token stable unless the asset is currently
-- selected by the profile (including an audio playlist track).
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
  v_avatar_path text;
  v_background_path text;
  v_background_video_path text;
  v_banner_path text;
  v_cursor_path text;
  v_pointer_cursor_path text;
  v_audio_path text;
  v_audio_playlist jsonb;
  v_tracks jsonb;
  v_selected boolean := false;
  v_updated_at timestamptz;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '28000', MESSAGE = 'Not authenticated';
  END IF;

  SELECT *
  INTO v_asset
  FROM public.profile_media_assets
  WHERE id = p_asset_id AND user_id = v_user_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Media asset not found.');
  END IF;

  SELECT avatar_path,
         background_path,
         background_video_path,
         banner_path,
         cursor_path,
         pointer_cursor_path,
         audio_path,
         COALESCE(audio_playlist, '{}'::jsonb)
  INTO v_avatar_path,
       v_background_path,
       v_background_video_path,
       v_banner_path,
       v_cursor_path,
       v_pointer_cursor_path,
       v_audio_path,
       v_audio_playlist
  FROM public.profile_configurations
  WHERE user_id = v_user_id
  FOR UPDATE;

  IF FOUND THEN
    v_selected := (v_asset.kind = 'avatar' AND v_avatar_path IS NOT DISTINCT FROM v_asset.storage_path)
      OR (v_asset.kind = 'background' AND v_background_path IS NOT DISTINCT FROM v_asset.storage_path)
      OR (v_asset.kind = 'background_video' AND v_background_video_path IS NOT DISTINCT FROM v_asset.storage_path)
      OR (v_asset.kind = 'banner' AND v_banner_path IS NOT DISTINCT FROM v_asset.storage_path)
      OR (v_asset.kind = 'cursor' AND v_cursor_path IS NOT DISTINCT FROM v_asset.storage_path)
      OR (v_asset.kind = 'pointer_cursor' AND v_pointer_cursor_path IS NOT DISTINCT FROM v_asset.storage_path)
      OR (v_asset.kind = 'audio' AND v_audio_path IS NOT DISTINCT FROM v_asset.storage_path);

    IF v_asset.kind = 'audio' THEN
      v_tracks := COALESCE(
        (
          SELECT jsonb_agg(track ORDER BY COALESCE((track->>'order')::integer, 0))
          FROM jsonb_array_elements(COALESCE(v_audio_playlist->'tracks', '[]'::jsonb)) track
          WHERE track->>'path' <> v_asset.storage_path
        ),
        '[]'::jsonb
      );
      v_selected := EXISTS (
        SELECT 1
        FROM jsonb_array_elements(COALESCE(v_audio_playlist->'tracks', '[]'::jsonb)) track
        WHERE track->>'path' = v_asset.storage_path
      );
    END IF;
  END IF;

  IF v_selected THEN
    UPDATE public.profile_configurations
    SET avatar_path = CASE WHEN v_asset.kind = 'avatar' THEN NULL ELSE avatar_path END,
        background_path = CASE WHEN v_asset.kind = 'background' THEN NULL ELSE background_path END,
        background_video_path = CASE WHEN v_asset.kind = 'background_video' THEN NULL ELSE background_video_path END,
        banner_path = CASE WHEN v_asset.kind = 'banner' THEN NULL ELSE banner_path END,
        cursor_path = CASE WHEN v_asset.kind = 'cursor' THEN NULL ELSE cursor_path END,
        pointer_cursor_path = CASE WHEN v_asset.kind = 'pointer_cursor' THEN NULL ELSE pointer_cursor_path END,
        audio_path = CASE WHEN v_asset.kind = 'audio' AND v_audio_path IS NOT DISTINCT FROM v_asset.storage_path THEN NULL ELSE audio_path END,
        audio_playlist = CASE WHEN v_asset.kind = 'audio' THEN jsonb_set(COALESCE(v_audio_playlist, '{}'::jsonb), '{tracks}', v_tracks, true) ELSE audio_playlist END,
        updated_at = now()
    WHERE user_id = v_user_id
    RETURNING updated_at INTO v_updated_at;
  END IF;

  v_bucket := split_part(v_asset.storage_path, '/', 1);
  v_object_path := regexp_replace(v_asset.storage_path, '^[^/]+/', '');
  PERFORM set_config('storage.allow_delete_query', 'true', true);
  DELETE FROM storage.objects WHERE bucket_id = v_bucket AND name = v_object_path;
  DELETE FROM public.profile_media_assets WHERE id = v_asset.id;

  RETURN jsonb_build_object(
    'success', true,
    'storage_path', v_asset.storage_path,
    'cleared_reference', CASE WHEN v_selected THEN v_asset.kind ELSE NULL END,
    'configuration_changed', v_selected,
    'updated_at', v_updated_at
  );
END;
$function$;

COMMIT;
