\set ON_ERROR_STOP on
BEGIN;

CREATE FUNCTION pg_temp.assert_refund_cleanup(ok boolean, message text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION '%', message; END IF;
END;
$$;

CREATE FUNCTION pg_temp.expect_refund_cleanup_error(statement text, message text)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_failed boolean := false;
BEGIN
  BEGIN
    EXECUTE statement;
  EXCEPTION WHEN OTHERS THEN
    v_failed := true;
  END;
  IF NOT v_failed THEN RAISE EXCEPTION '%', message; END IF;
END;
$$;

INSERT INTO auth.users (id, aud, role, email, raw_app_meta_data, raw_user_meta_data)
VALUES
  ('a1500000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'media-expiry@example.invalid', '{"provider":"email"}', '{"username":"mediaexpirytest"}'),
  ('a1500000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'media-expiry-staff@example.invalid', '{"provider":"email"}', '{"username":"mediaexpirystaff"}'),
  ('a1500000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'media-expiry-active@example.invalid', '{"provider":"email"}', '{"username":"mediaexpiryactive"}');

INSERT INTO public.profile_configurations (user_id, draft_config, published_config)
SELECT id, public.profile_default_configuration('#445566'), public.profile_default_configuration('#445566')
FROM auth.users
WHERE id IN (
  'a1500000-0000-4000-8000-000000000001',
  'a1500000-0000-4000-8000-000000000002',
  'a1500000-0000-4000-8000-000000000003'
)
ON CONFLICT (user_id) DO NOTHING;

UPDATE public.profiles
SET is_staff = true
WHERE id = 'a1500000-0000-4000-8000-000000000002';

INSERT INTO public.billing_premium_access (user_id, active, revoked_reason, recovery_until, updated_at)
VALUES
  ('a1500000-0000-4000-8000-000000000001', false, 'refund', now() - interval '1 minute', now()),
  ('a1500000-0000-4000-8000-000000000002', false, 'refund', now() - interval '1 minute', now()),
  ('a1500000-0000-4000-8000-000000000003', true, 'refund', now() - interval '1 minute', now());

INSERT INTO public.profile_media_assets (
  id, user_id, kind, storage_provider, status, delivery_status,
  r2_private_key, r2_public_key, ever_public, mime_type, byte_size, label
) VALUES
  ('a1500000-0000-4000-8000-000000000010', 'a1500000-0000-4000-8000-000000000001', 'background_video', 'r2', 'active', 'ready', 'profiles/a1500000/video-private.mp4', 'profiles/a1500000/video-public.mp4', true, 'video/mp4', 1, 'Video'),
  ('a1500000-0000-4000-8000-000000000011', 'a1500000-0000-4000-8000-000000000001', 'animated_avatar', 'r2', 'active', 'ready', 'profiles/a1500000/avatar-private.webp', 'profiles/a1500000/avatar-public.webp', true, 'image/webp', 1, 'Animated avatar'),
  ('a1500000-0000-4000-8000-000000000012', 'a1500000-0000-4000-8000-000000000001', 'share_image', 'r2', 'active', 'ready', 'profiles/a1500000/share-private.jpg', 'profiles/a1500000/share-public.jpg', true, 'image/jpeg', 1, 'Share image'),
  ('a1500000-0000-4000-8000-000000000013', 'a1500000-0000-4000-8000-000000000001', 'banner', 'r2', 'active', 'ready', 'profiles/a1500000/banner-private.webp', 'profiles/a1500000/banner-public.webp', true, 'image/webp', 1, 'Legacy banner'),
  ('a1500000-0000-4000-8000-000000000014', 'a1500000-0000-4000-8000-000000000001', 'audio', 'r2', 'active', 'ready', 'profiles/a1500000/audio-private.mp3', 'profiles/a1500000/audio-public.mp3', true, 'audio/mpeg', 1, 'Audio'),
  ('a1500000-0000-4000-8000-000000000015', 'a1500000-0000-4000-8000-000000000001', 'cursor', 'r2', 'active', 'ready', 'profiles/a1500000/cursor-private.webp', 'profiles/a1500000/cursor-public.webp', true, 'image/webp', 1, 'Cursor'),
  ('a1500000-0000-4000-8000-000000000016', 'a1500000-0000-4000-8000-000000000001', 'pointer_cursor', 'r2', 'active', 'ready', 'profiles/a1500000/pointer-private.webp', 'profiles/a1500000/pointer-public.webp', true, 'image/webp', 1, 'Pointer'),
  ('a1500000-0000-4000-8000-000000000017', 'a1500000-0000-4000-8000-000000000001', 'avatar', 'r2', 'active', 'ready', 'profiles/a1500000/free-private.webp', 'profiles/a1500000/free-public.webp', true, 'image/webp', 1, 'Free avatar');

UPDATE public.profile_configurations
SET background_video_asset_id = 'a1500000-0000-4000-8000-000000000010',
    animated_avatar_asset_id = 'a1500000-0000-4000-8000-000000000011',
    share_image_asset_id = 'a1500000-0000-4000-8000-000000000012',
    banner_asset_id = 'a1500000-0000-4000-8000-000000000013',
    audio_asset_id = 'a1500000-0000-4000-8000-000000000014',
    cursor_asset_id = 'a1500000-0000-4000-8000-000000000015',
    pointer_cursor_asset_id = 'a1500000-0000-4000-8000-000000000016',
    avatar_asset_id = 'a1500000-0000-4000-8000-000000000017',
    background_video_path = 'profile_media/a1500000-0000-4000-8000-000000000001/a1500000-0000-4000-8000-000000000010.mp4',
    banner_path = 'profile_media/a1500000-0000-4000-8000-000000000001/a1500000-0000-4000-8000-000000000013.webp',
    cursor_path = 'profile_media/a1500000-0000-4000-8000-000000000001/a1500000-0000-4000-8000-000000000015.webp',
    pointer_cursor_path = 'profile_media/a1500000-0000-4000-8000-000000000001/a1500000-0000-4000-8000-000000000016.webp',
    audio_path = 'profile_audio/a1500000-0000-4000-8000-000000000001/profile.mp3',
    audio_playlist = '{"tracks":[{"asset_id":"a1500000-0000-4000-8000-000000000014","path":null,"order":0}],"shuffle":true,"loop":false,"volume":0.5}'::jsonb
WHERE user_id = 'a1500000-0000-4000-8000-000000000001';

SELECT pg_temp.assert_refund_cleanup(
  has_function_privilege('service_role', 'public.claim_profile_media_plus_expiry_cleanup(integer)', 'EXECUTE')
    AND NOT has_function_privilege('anon', 'public.claim_profile_media_plus_expiry_cleanup(integer)', 'EXECUTE')
    AND NOT has_function_privilege('authenticated', 'public.claim_profile_media_plus_expiry_cleanup(integer)', 'EXECUTE')
    AND has_table_privilege('service_role', 'public.profile_media_plus_expiry_cleanup_jobs', 'SELECT')
    AND NOT has_table_privilege('anon', 'public.profile_media_plus_expiry_cleanup_jobs', 'SELECT')
    AND NOT has_table_privilege('authenticated', 'public.profile_media_plus_expiry_cleanup_jobs', 'SELECT'),
  'Plus media expiry queue must remain service-only'
);

SELECT pg_temp.expect_refund_cleanup_error(
  'SELECT * FROM public.claim_profile_media_plus_expiry_cleanup(10)',
  'non-service caller claimed expired Plus media cleanup'
);

-- Model two queue entries made before the entitlement was restored or a staff
-- exemption was applied. The claim must re-check both under row locks.
INSERT INTO public.profile_media_plus_expiry_cleanup_jobs (user_id, recovery_until)
SELECT user_id, recovery_until FROM public.billing_premium_access
WHERE user_id IN (
  'a1500000-0000-4000-8000-000000000002',
  'a1500000-0000-4000-8000-000000000003'
);

SELECT set_config('request.jwt.claims', '{"role":"service_role"}', true);
CREATE TEMP TABLE refund_cleanup_jobs AS
SELECT * FROM public.claim_profile_media_plus_expiry_cleanup(10);

SELECT pg_temp.assert_refund_cleanup(
  (SELECT count(*) = 3 FROM refund_cleanup_jobs)
    AND EXISTS (
      SELECT 1 FROM refund_cleanup_jobs
      WHERE outcome = 'tombstoned' AND tombstoned_asset_count = 7
    )
    AND EXISTS (
      SELECT 1 FROM refund_cleanup_jobs
      WHERE outcome = 'skipped' AND processed_job_id IN (
        SELECT id FROM public.profile_media_plus_expiry_cleanup_jobs
        WHERE user_id = 'a1500000-0000-4000-8000-000000000002' AND skip_reason = 'staff_exempt'
      )
    )
    AND EXISTS (
      SELECT 1 FROM refund_cleanup_jobs
      WHERE outcome = 'skipped' AND processed_job_id IN (
        SELECT id FROM public.profile_media_plus_expiry_cleanup_jobs
        WHERE user_id = 'a1500000-0000-4000-8000-000000000003' AND skip_reason = 'plus_reactivated'
      )
    ),
  'expired refund was not queued once or the worker failed to re-check staff/reactivated access'
);

SELECT pg_temp.assert_refund_cleanup(
  (SELECT background_video_asset_id IS NULL
      AND animated_avatar_asset_id IS NULL
      AND share_image_asset_id IS NULL
      AND banner_asset_id IS NULL
      AND audio_asset_id IS NULL
      AND cursor_asset_id IS NULL
      AND pointer_cursor_asset_id IS NULL
      AND background_video_path IS NULL
      AND banner_path IS NULL
      AND cursor_path IS NULL
      AND pointer_cursor_path IS NULL
      AND audio_path IS NULL
      AND audio_playlist->'tracks' = '[]'::jsonb
      AND audio_playlist->>'shuffle' = 'true'
      AND audio_playlist->>'volume' = '0.5'
      AND avatar_asset_id = 'a1500000-0000-4000-8000-000000000017'
     FROM public.profile_configurations
     WHERE user_id = 'a1500000-0000-4000-8000-000000000001')
    AND (SELECT count(*) = 7
         FROM public.profile_media_assets
         WHERE user_id = 'a1500000-0000-4000-8000-000000000001'
           AND kind IN ('background_video', 'animated_avatar', 'share_image', 'banner', 'audio', 'cursor', 'pointer_cursor')
           AND status = 'deleted'
           AND cleanup_at <= now()
           AND cache_purge_status = 'pending')
    AND (SELECT count(*) = 1
         FROM public.profile_media_assets
         WHERE id = 'a1500000-0000-4000-8000-000000000017' AND status = 'active'),
  'expiry did not clear paid selections, preserve free media/preferences, and tombstone every owned Plus R2 asset'
);

SELECT pg_temp.assert_refund_cleanup(
  public.profile_media_public_reference('a1500000-0000-4000-8000-000000000010', NULL) IS NULL
    AND (SELECT count(*) = 1
         FROM public.profile_media_plus_expiry_cleanup_jobs
         WHERE user_id = 'a1500000-0000-4000-8000-000000000001' AND status = 'tombstoned' AND assets_tombstoned = 7),
  'tombstoned media remained publicly projectable or expiry queue was not finalized'
);

CREATE TEMP TABLE refund_deleted_assets AS
SELECT * FROM public.claim_profile_media_deleted_cleanup_v2(25);
SELECT pg_temp.assert_refund_cleanup(
  (SELECT count(*) = 7 FROM refund_deleted_assets)
    AND (SELECT count(*) = 7 FROM refund_deleted_assets WHERE cache_purge_required AND cache_purge_status = 'processing')
    AND (SELECT count(*) = 0 FROM public.claim_profile_media_plus_expiry_cleanup(10)),
  'expired Plus tombstones did not enter the existing bounded R2 delete/CDN purge queue exactly once'
);

SELECT public.complete_profile_media_deleted_cleanup_v2(
  'a1500000-0000-4000-8000-000000000010', false, false, 'simulated R2 delete and CDN purge failure'
);
DO $$
DECLARE
  v_asset_id uuid;
BEGIN
  FOR v_asset_id IN
    SELECT id FROM refund_deleted_assets WHERE id <> 'a1500000-0000-4000-8000-000000000010'
  LOOP
    PERFORM public.complete_profile_media_deleted_cleanup_v2(v_asset_id, true, true, NULL);
  END LOOP;
END;
$$;

SELECT pg_temp.assert_refund_cleanup(
  (SELECT count(*) = 1
   FROM public.profile_media_assets
   WHERE id = 'a1500000-0000-4000-8000-000000000010'
     AND status = 'deleted'
     AND r2_private_key = 'profiles/a1500000/video-private.mp4'
     AND r2_public_key = 'profiles/a1500000/video-public.mp4'
     AND cache_purge_status = 'retry'
     AND cleanup_at > now())
    AND (SELECT count(*) = 0
         FROM public.profile_media_assets
         WHERE user_id = 'a1500000-0000-4000-8000-000000000001'
           AND kind IN ('animated_avatar', 'share_image', 'banner', 'audio', 'cursor', 'pointer_cursor')),
  'failed external delete/purge lost its retryable R2 tombstone or successful rows were not finalized'
);

UPDATE public.profile_media_assets SET cleanup_at = now() - interval '1 second'
WHERE id = 'a1500000-0000-4000-8000-000000000010';
SELECT pg_temp.assert_refund_cleanup(
  (SELECT count(*) = 1
   FROM public.claim_profile_media_deleted_cleanup_v2(25)
   WHERE id = 'a1500000-0000-4000-8000-000000000010'),
  'failed R2 tombstone did not become claimable after its retry delay'
);
SELECT public.complete_profile_media_deleted_cleanup_v2(
  'a1500000-0000-4000-8000-000000000010', true, true, NULL
);
SELECT pg_temp.assert_refund_cleanup(
  NOT EXISTS (
    SELECT 1 FROM public.profile_media_assets
    WHERE id = 'a1500000-0000-4000-8000-000000000010'
  ),
  'successful retry did not finalize the expired Plus media tombstone'
);

ROLLBACK;
