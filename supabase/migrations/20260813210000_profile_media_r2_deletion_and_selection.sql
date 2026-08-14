BEGIN;

-- Public immutable objects are cacheable until explicit deletion. Keep the
-- exact purge obligation on the tombstone so an R2 delete and a CDN purge can
-- succeed or retry independently.
CREATE OR REPLACE FUNCTION public.claim_profile_media_deleted_cleanup_v2(
  p_limit integer DEFAULT 25
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
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
      AND asset.status = 'deleted'
      AND asset.cleanup_at IS NOT NULL
      AND asset.cleanup_at <= now()
    ORDER BY asset.cleanup_at, asset.updated_at
    FOR UPDATE SKIP LOCKED
    LIMIT v_limit
  )
  UPDATE public.profile_media_assets asset
  SET cleanup_at = now() + interval '15 minutes',
      cache_purge_status = CASE
        WHEN NULLIF(asset.r2_public_key, '') IS NOT NULL
             AND asset.cache_purge_status <> 'completed' THEN 'processing'
        ELSE asset.cache_purge_status
      END,
      cache_purge_at = CASE
        WHEN NULLIF(asset.r2_public_key, '') IS NOT NULL
             AND asset.cache_purge_status <> 'completed' THEN now()
        ELSE asset.cache_purge_at
      END,
      updated_at = now()
  FROM candidates
  WHERE asset.id = candidates.id
  RETURNING asset.id,
    asset.user_id,
    asset.r2_private_key,
    asset.r2_public_key,
    NULLIF(asset.r2_public_key, '') IS NOT NULL,
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
  WHERE id = p_asset_id AND storage_provider = 'r2' AND status = 'deleted'
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', true, 'asset_id', p_asset_id, 'completed', true, 'already_removed', true);
  END IF;

  v_complete := p_delete_success
    AND (NULLIF(v_asset.r2_public_key, '') IS NULL OR p_purge_success);
  IF v_complete THEN
    DELETE FROM public.profile_media_assets WHERE id = v_asset.id;
  ELSE
    UPDATE public.profile_media_assets
    SET cleanup_at = now() + interval '15 minutes',
        cache_purge_status = CASE
          WHEN NULLIF(v_asset.r2_public_key, '') IS NULL THEN 'not_required'
          WHEN p_purge_success THEN 'completed'
          ELSE 'retry'
        END,
        cache_purge_at = CASE WHEN p_purge_success THEN now() ELSE coalesce(cache_purge_at, now()) END,
        last_error = left(coalesce(p_error, 'R2 deletion or Cloudflare cache purge failed.'), 1000),
        updated_at = now()
    WHERE id = v_asset.id;
  END IF;
  RETURN jsonb_build_object('success', true, 'asset_id', p_asset_id, 'completed', v_complete);
END;
$function$;

-- Migration updates target only the selected typed reference or one playlist
-- track. It never PATCHes a whole configuration document, so a concurrent
-- appearance/layout edit cannot be overwritten by the backfill.
CREATE OR REPLACE FUNCTION public.migrate_profile_media_selection(
  p_user_id uuid,
  p_asset_id uuid,
  p_kind text,
  p_legacy_path text DEFAULT NULL,
  p_target text DEFAULT 'standalone'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, pg_catalog
AS $function$
DECLARE
  v_config public.profile_configurations%ROWTYPE;
  v_playlist jsonb;
  v_tracks jsonb;
  v_changed boolean := false;
  v_kind text := lower(btrim(coalesce(p_kind, '')));
  v_target text := lower(btrim(coalesce(p_target, 'standalone')));
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Control-plane access required.';
  END IF;
  IF p_user_id IS NULL OR p_asset_id IS NULL OR v_kind NOT IN (
    'avatar', 'background', 'audio', 'background_video', 'banner', 'cursor', 'pointer_cursor'
  ) OR v_target NOT IN ('standalone', 'playlist_track') THEN
    RETURN jsonb_build_object('success', false, 'error', 'The migration selection is invalid.');
  END IF;
  PERFORM 1
  FROM public.profile_media_assets
  WHERE id = p_asset_id
    AND user_id = p_user_id
    AND storage_provider = 'r2'
    AND status = 'active'
    AND delivery_status = 'ready'
    AND ever_public IS TRUE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'The migrated asset is not ready for selection.');
  END IF;

  SELECT * INTO v_config
  FROM public.profile_configurations
  WHERE user_id = p_user_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Profile configuration not found.');
  END IF;

  IF v_kind = 'audio' AND v_target = 'playlist_track' THEN
    v_playlist := coalesce(v_config.audio_playlist, '{}'::jsonb);
    v_tracks := coalesce((
      SELECT jsonb_agg(
        CASE
          WHEN (
            (track->>'asset_id') ~* '^[0-9a-f-]{36}$'
            AND (track->>'asset_id')::uuid = p_asset_id
          ) OR (
            p_legacy_path IS NOT NULL
            AND track->>'path' = p_legacy_path
          )
          THEN track || jsonb_build_object('asset_id', p_asset_id)
          ELSE track
        END
        ORDER BY ordinality
      )
      FROM jsonb_array_elements(coalesce(v_playlist->'tracks', '[]'::jsonb)) WITH ORDINALITY AS entries(track, ordinality)
    ), '[]'::jsonb);
    v_changed := v_tracks IS DISTINCT FROM coalesce(v_playlist->'tracks', '[]'::jsonb);
    IF v_changed THEN
      UPDATE public.profile_configurations
      SET audio_playlist = jsonb_set(v_playlist, '{tracks}', v_tracks, true), updated_at = now()
      WHERE user_id = p_user_id;
    END IF;
  ELSE
    UPDATE public.profile_configurations
    SET avatar_asset_id = CASE WHEN v_kind = 'avatar' THEN p_asset_id ELSE avatar_asset_id END,
        background_asset_id = CASE WHEN v_kind = 'background' THEN p_asset_id ELSE background_asset_id END,
        audio_asset_id = CASE WHEN v_kind = 'audio' THEN p_asset_id ELSE audio_asset_id END,
        background_video_asset_id = CASE WHEN v_kind = 'background_video' THEN p_asset_id ELSE background_video_asset_id END,
        banner_asset_id = CASE WHEN v_kind = 'banner' THEN p_asset_id ELSE banner_asset_id END,
        cursor_asset_id = CASE WHEN v_kind = 'cursor' THEN p_asset_id ELSE cursor_asset_id END,
        pointer_cursor_asset_id = CASE WHEN v_kind = 'pointer_cursor' THEN p_asset_id ELSE pointer_cursor_asset_id END,
        avatar_path = CASE WHEN v_kind = 'avatar' THEN NULL ELSE avatar_path END,
        background_path = CASE WHEN v_kind = 'background' THEN NULL ELSE background_path END,
        audio_path = CASE WHEN v_kind = 'audio' THEN NULL ELSE audio_path END,
        background_video_path = CASE WHEN v_kind = 'background_video' THEN NULL ELSE background_video_path END,
        banner_path = CASE WHEN v_kind = 'banner' THEN NULL ELSE banner_path END,
        cursor_path = CASE WHEN v_kind = 'cursor' THEN NULL ELSE cursor_path END,
        pointer_cursor_path = CASE WHEN v_kind = 'pointer_cursor' THEN NULL ELSE pointer_cursor_path END,
        updated_at = now()
    WHERE user_id = p_user_id
      AND (
        (v_kind = 'avatar' AND (avatar_asset_id = p_asset_id OR (p_legacy_path IS NOT NULL AND avatar_path = p_legacy_path)))
        OR (v_kind = 'background' AND (background_asset_id = p_asset_id OR (p_legacy_path IS NOT NULL AND background_path = p_legacy_path)))
        OR (v_kind = 'audio' AND (audio_asset_id = p_asset_id OR (p_legacy_path IS NOT NULL AND audio_path = p_legacy_path)))
        OR (v_kind = 'background_video' AND (background_video_asset_id = p_asset_id OR (p_legacy_path IS NOT NULL AND background_video_path = p_legacy_path)))
        OR (v_kind = 'banner' AND (banner_asset_id = p_asset_id OR (p_legacy_path IS NOT NULL AND banner_path = p_legacy_path)))
        OR (v_kind = 'cursor' AND (cursor_asset_id = p_asset_id OR (p_legacy_path IS NOT NULL AND cursor_path = p_legacy_path)))
        OR (v_kind = 'pointer_cursor' AND (pointer_cursor_asset_id = p_asset_id OR (p_legacy_path IS NOT NULL AND pointer_cursor_path = p_legacy_path)))
      );
    v_changed := FOUND;
  END IF;

  SELECT * INTO v_config FROM public.profile_configurations WHERE user_id = p_user_id;
  RETURN jsonb_build_object('success', true, 'changed', v_changed, 'updated_at', v_config.updated_at);
END;
$function$;

REVOKE ALL ON FUNCTION public.claim_profile_media_deleted_cleanup_v2(integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_profile_media_deleted_cleanup_v2(uuid, boolean, boolean, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.migrate_profile_media_selection(uuid, uuid, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_profile_media_deleted_cleanup_v2(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_profile_media_deleted_cleanup_v2(uuid, boolean, boolean, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.migrate_profile_media_selection(uuid, uuid, text, text, text) TO service_role;

COMMIT;
