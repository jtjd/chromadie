BEGIN;

-- Legacy Supabase bytes must be removed through the Storage API. PostgreSQL
-- metadata rows are not a physical Storage deletion and must never be used as
-- a substitute for that API. Keep this RPC as a safe compatibility stub for
-- older callers while the Pages control plane owns the actual delete.
CREATE OR REPLACE FUNCTION public.delete_profile_media_legacy_storage_object(
  p_storage_path text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, pg_catalog
AS $function$
DECLARE
  v_storage_path text := NULLIF(btrim(p_storage_path), '');
  v_bucket text;
  v_object_path text;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Control-plane access required.';
  END IF;

  IF v_storage_path IS NULL THEN
    RETURN jsonb_build_object('success', true, 'deleted', false, 'storage_path', NULL);
  END IF;

  v_bucket := split_part(v_storage_path, '/', 1);
  v_object_path := regexp_replace(v_storage_path, '^[^/]+/', '');
  IF v_bucket NOT IN ('avatars', 'backgrounds', 'profile_audio', 'profile_media')
     OR v_object_path IS NULL
     OR v_object_path = ''
     OR v_object_path ~ '(^|/)\.\.?(/|$)' THEN
    RETURN jsonb_build_object('success', false, 'error', 'The legacy profile media path is invalid.');
  END IF;

  RETURN jsonb_build_object(
    'success', false,
    'deleted', false,
    'deferred', true,
    'storage_path', v_storage_path,
    'error', 'Legacy Storage deletion must use the Storage API control plane.'
  );
END;
$function$;

-- Explicit deletion now creates a provider-neutral tombstone. The exact
-- storage identifiers remain available until the control plane has deleted
-- the external objects and finalized the row.
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
  v_playlist jsonb := '{}'::jsonb;
  v_tracks jsonb := '[]'::jsonb;
  v_selected boolean := false;
  v_standalone_selected boolean := false;
  v_playlist_selected boolean := false;
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
    v_standalone_selected := COALESCE(
      (v_asset.kind = 'avatar' AND (
        v_config.avatar_asset_id = v_asset.id
        OR (v_asset.storage_path IS NOT NULL AND v_config.avatar_path = v_asset.storage_path)
      )), false
    ) OR COALESCE(
      (v_asset.kind = 'background' AND (
        v_config.background_asset_id = v_asset.id
        OR (v_asset.storage_path IS NOT NULL AND v_config.background_path = v_asset.storage_path)
      )), false
    ) OR COALESCE(
      (v_asset.kind = 'audio' AND (
        v_config.audio_asset_id = v_asset.id
        OR (v_asset.storage_path IS NOT NULL AND v_config.audio_path = v_asset.storage_path)
      )), false
    ) OR COALESCE(
      (v_asset.kind = 'background_video' AND (
        v_config.background_video_asset_id = v_asset.id
        OR (v_asset.storage_path IS NOT NULL AND v_config.background_video_path = v_asset.storage_path)
      )), false
    ) OR COALESCE(
      (v_asset.kind = 'banner' AND (
        v_config.banner_asset_id = v_asset.id
        OR (v_asset.storage_path IS NOT NULL AND v_config.banner_path = v_asset.storage_path)
      )), false
    ) OR COALESCE(
      (v_asset.kind = 'cursor' AND (
        v_config.cursor_asset_id = v_asset.id
        OR (v_asset.storage_path IS NOT NULL AND v_config.cursor_path = v_asset.storage_path)
      )), false
    ) OR COALESCE(
      (v_asset.kind = 'pointer_cursor' AND (
        v_config.pointer_cursor_asset_id = v_asset.id
        OR (v_asset.storage_path IS NOT NULL AND v_config.pointer_cursor_path = v_asset.storage_path)
      )), false);

    IF v_asset.kind = 'audio' THEN
      v_tracks := COALESCE((
        SELECT jsonb_agg(track ORDER BY COALESCE((track->>'order')::integer, 0))
        FROM jsonb_array_elements(COALESCE(v_playlist->'tracks', '[]'::jsonb)) track
        WHERE NOT (
          ((track->>'asset_id') ~* '^[0-9a-f-]{36}$' AND (track->>'asset_id')::uuid = v_asset.id)
          OR (v_asset.storage_path IS NOT NULL AND track->>'path' = v_asset.storage_path)
        )
      ), '[]'::jsonb);
      v_playlist_selected := EXISTS (
        SELECT 1
        FROM jsonb_array_elements(COALESCE(v_playlist->'tracks', '[]'::jsonb)) track
        WHERE ((track->>'asset_id') ~* '^[0-9a-f-]{36}$' AND (track->>'asset_id')::uuid = v_asset.id)
           OR (v_asset.storage_path IS NOT NULL AND track->>'path' = v_asset.storage_path)
      );
    END IF;
    v_selected := v_standalone_selected OR v_playlist_selected;
  END IF;

  IF v_selected THEN
    UPDATE public.profile_configurations
    SET avatar_asset_id = CASE WHEN v_asset.kind = 'avatar' AND v_standalone_selected THEN NULL ELSE avatar_asset_id END,
        background_asset_id = CASE WHEN v_asset.kind = 'background' AND v_standalone_selected THEN NULL ELSE background_asset_id END,
        audio_asset_id = CASE WHEN v_asset.kind = 'audio' AND v_standalone_selected THEN NULL ELSE audio_asset_id END,
        background_video_asset_id = CASE WHEN v_asset.kind = 'background_video' AND v_standalone_selected THEN NULL ELSE background_video_asset_id END,
        banner_asset_id = CASE WHEN v_asset.kind = 'banner' AND v_standalone_selected THEN NULL ELSE banner_asset_id END,
        cursor_asset_id = CASE WHEN v_asset.kind = 'cursor' AND v_standalone_selected THEN NULL ELSE cursor_asset_id END,
        pointer_cursor_asset_id = CASE WHEN v_asset.kind = 'pointer_cursor' AND v_standalone_selected THEN NULL ELSE pointer_cursor_asset_id END,
        avatar_path = CASE WHEN v_asset.kind = 'avatar' AND v_standalone_selected THEN NULL ELSE avatar_path END,
        background_path = CASE WHEN v_asset.kind = 'background' AND v_standalone_selected THEN NULL ELSE background_path END,
        audio_path = CASE WHEN v_asset.kind = 'audio' AND v_standalone_selected THEN NULL ELSE audio_path END,
        background_video_path = CASE WHEN v_asset.kind = 'background_video' AND v_standalone_selected THEN NULL ELSE background_video_path END,
        banner_path = CASE WHEN v_asset.kind = 'banner' AND v_standalone_selected THEN NULL ELSE banner_path END,
        cursor_path = CASE WHEN v_asset.kind = 'cursor' AND v_standalone_selected THEN NULL ELSE cursor_path END,
        pointer_cursor_path = CASE WHEN v_asset.kind = 'pointer_cursor' AND v_standalone_selected THEN NULL ELSE pointer_cursor_path END,
        audio_playlist = CASE WHEN v_asset.kind = 'audio' AND v_playlist_selected THEN jsonb_set(v_playlist, '{tracks}', v_tracks, true) ELSE audio_playlist END,
        updated_at = now()
    WHERE user_id = v_user_id
    RETURNING updated_at INTO v_updated_at;
  END IF;

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

-- Claim both explicit-deletion tombstones and expired legacy staged rows. A
-- staged legacy row is tombstoned at claim time so the external delete and
-- final row removal have the same durable retry contract as normal deletion.
DROP FUNCTION IF EXISTS public.claim_profile_media_deleted_cleanup_v2(integer);
CREATE OR REPLACE FUNCTION public.claim_profile_media_deleted_cleanup_v2(
  p_limit integer DEFAULT 25
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  storage_provider text,
  storage_path text,
  r2_private_key text,
  r2_public_key text,
  cache_purge_required boolean,
  cache_purge_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, pg_catalog
AS $function$
DECLARE
  v_limit integer := LEAST(100, GREATEST(1, COALESCE(p_limit, 25)));
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Control-plane access required.';
  END IF;

  RETURN QUERY
  WITH candidates AS (
    SELECT asset.id
    FROM public.profile_media_assets asset
    WHERE (
      asset.status = 'deleted'
      OR (asset.storage_provider = 'supabase' AND asset.status = 'staged')
    )
      AND asset.cleanup_at IS NOT NULL
      AND asset.cleanup_at <= now()
    ORDER BY asset.cleanup_at, asset.updated_at
    FOR UPDATE SKIP LOCKED
    LIMIT v_limit
  )
  UPDATE public.profile_media_assets asset
  SET status = CASE WHEN asset.status = 'staged' THEN 'deleted' ELSE asset.status END,
      deleted_at = CASE WHEN asset.status = 'staged' THEN COALESCE(asset.deleted_at, now()) ELSE asset.deleted_at END,
      cleanup_at = now() + interval '15 minutes',
      cache_purge_status = CASE
        WHEN asset.storage_provider = 'r2'
          AND NULLIF(asset.r2_public_key, '') IS NOT NULL
          AND asset.cache_purge_status <> 'completed' THEN 'processing'
        ELSE asset.cache_purge_status
      END,
      cache_purge_at = CASE
        WHEN asset.storage_provider = 'r2'
          AND NULLIF(asset.r2_public_key, '') IS NOT NULL
          AND asset.cache_purge_status <> 'completed' THEN now()
        ELSE asset.cache_purge_at
      END,
      updated_at = now()
  FROM candidates
  WHERE asset.id = candidates.id
  RETURNING asset.id,
    asset.user_id,
    COALESCE(asset.storage_provider, 'supabase'),
    asset.storage_path,
    asset.r2_private_key,
    asset.r2_public_key,
    COALESCE(asset.storage_provider, 'supabase') = 'r2' AND NULLIF(asset.r2_public_key, '') IS NOT NULL,
    asset.cache_purge_status;
END;
$function$;

CREATE OR REPLACE FUNCTION public.complete_profile_media_deleted_cleanup_v2(
  p_asset_id uuid,
  p_delete_success boolean,
  p_purge_success boolean,
  p_error text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, pg_catalog
AS $function$
DECLARE
  v_asset public.profile_media_assets%ROWTYPE;
  v_complete boolean := false;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Control-plane access required.';
  END IF;

  SELECT * INTO v_asset
  FROM public.profile_media_assets
  WHERE id = p_asset_id AND status = 'deleted'
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', true, 'asset_id', p_asset_id, 'completed', true, 'already_removed', true);
  END IF;

  v_complete := p_delete_success
    AND (COALESCE(v_asset.storage_provider, 'supabase') <> 'r2'
      OR NULLIF(v_asset.r2_public_key, '') IS NULL
      OR p_purge_success);
  IF v_complete THEN
    DELETE FROM public.profile_media_assets WHERE id = v_asset.id;
  ELSE
    UPDATE public.profile_media_assets
    SET cleanup_at = now() + interval '15 minutes',
        cache_purge_status = CASE
          WHEN COALESCE(v_asset.storage_provider, 'supabase') <> 'r2' OR NULLIF(v_asset.r2_public_key, '') IS NULL THEN 'not_required'
          WHEN p_purge_success THEN 'completed'
          ELSE 'retry'
        END,
        cache_purge_at = CASE WHEN p_purge_success THEN now() ELSE COALESCE(cache_purge_at, now()) END,
        last_error = left(COALESCE(p_error, 'Profile media deletion failed.'), 1000),
        updated_at = now()
    WHERE id = v_asset.id;
  END IF;
  RETURN jsonb_build_object('success', true, 'asset_id', p_asset_id, 'completed', v_complete);
END;
$function$;

-- Expired legacy staging is now queued for the service control plane instead
-- of deleting storage.objects from a database function. R2 staging retains its
-- existing abandoned-upload path.
CREATE OR REPLACE FUNCTION public.cleanup_my_profile_staged_media()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, pg_catalog
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_asset public.profile_media_assets%ROWTYPE;
  v_cleaned integer := 0;
  v_queued integer := 0;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION USING ERRCODE = '28000', MESSAGE = 'Not authenticated'; END IF;
  IF NOT public.profile_rich_media_access(v_user_id) THEN RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Rich profile media requires Chromadie Plus.'; END IF;
  FOR v_asset IN
    SELECT * FROM public.profile_media_assets
    WHERE user_id = v_user_id AND status = 'staged' AND cleanup_at IS NOT NULL AND cleanup_at < now()
    FOR UPDATE
  LOOP
    IF COALESCE(v_asset.storage_provider, 'supabase') = 'r2' THEN
      UPDATE public.profile_media_assets
      SET status = 'abandoned', delivery_status = 'failed', last_error = 'Upload expired before verification.', updated_at = now()
      WHERE id = v_asset.id;
    ELSE
      UPDATE public.profile_media_assets
      SET status = 'deleted', deleted_at = COALESCE(deleted_at, now()), cleanup_at = now(), updated_at = now()
      WHERE id = v_asset.id;
      v_queued := v_queued + 1;
    END IF;
    v_cleaned := v_cleaned + 1;
  END LOOP;
  RETURN jsonb_build_object('success', true, 'cleaned', v_cleaned, 'legacy_queued', v_queued);
END;
$function$;

REVOKE ALL ON FUNCTION public.delete_profile_media_legacy_storage_object(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_profile_media_legacy_storage_object(text) TO service_role;
REVOKE ALL ON FUNCTION public.claim_profile_media_deleted_cleanup_v2(integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_profile_media_deleted_cleanup_v2(uuid, boolean, boolean, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_profile_media_deleted_cleanup_v2(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_profile_media_deleted_cleanup_v2(uuid, boolean, boolean, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_my_profile_media_asset(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_my_profile_staged_media() TO authenticated;

COMMIT;
