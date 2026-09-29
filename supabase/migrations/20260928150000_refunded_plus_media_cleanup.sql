BEGIN;

-- Refund recovery retains Plus media for 30 days. Once that window ends,
-- record a service-owned queue item, clear all Plus media selections, and
-- create the existing R2 deletion tombstones. The scheduled control plane
-- claims those tombstones and owns object deletion and CDN cache purging.
CREATE TABLE public.profile_media_plus_expiry_cleanup_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recovery_until timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'tombstoned', 'skipped')),
  assets_tombstoned integer NOT NULL DEFAULT 0 CHECK (assets_tombstoned >= 0),
  skip_reason text CHECK (skip_reason IS NULL OR skip_reason IN (
    'access_missing', 'plus_reactivated', 'recovery_extended', 'staff_exempt'
  )),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  UNIQUE (user_id, recovery_until)
);

ALTER TABLE public.profile_media_plus_expiry_cleanup_jobs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.profile_media_plus_expiry_cleanup_jobs FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.profile_media_plus_expiry_cleanup_jobs TO service_role;

CREATE INDEX profile_media_plus_expiry_cleanup_pending_idx
  ON public.profile_media_plus_expiry_cleanup_jobs (created_at, id)
  WHERE status = 'pending';

CREATE INDEX billing_premium_access_expired_recovery_idx
  ON public.billing_premium_access (recovery_until, user_id)
  WHERE active = false AND revoked_reason IN ('refund', 'chargeback') AND recovery_until IS NOT NULL;

COMMENT ON TABLE public.profile_media_plus_expiry_cleanup_jobs IS
  'Service-only queue recording refund/chargeback recovery expiry. Successful jobs clear Plus selections and tombstone R2 media; the R2 control plane performs object deletion and cache purge.';

CREATE OR REPLACE FUNCTION public.claim_profile_media_plus_expiry_cleanup(
  p_limit integer DEFAULT 10
)
RETURNS TABLE (
  processed_job_id uuid,
  outcome text,
  tombstoned_asset_count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, pg_catalog
AS $function$
DECLARE
  v_limit integer := LEAST(50, GREATEST(1, COALESCE(p_limit, 10)));
  v_job record;
  v_access_active boolean;
  v_current_recovery_until timestamptz;
  v_is_staff boolean;
  v_access_found boolean;
  v_tombstoned integer;
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Control-plane access required.';
  END IF;

  -- Discover newly expired access records once. The unique recovery timestamp
  -- keeps retries and overlapping scheduler invocations idempotent.
  INSERT INTO public.profile_media_plus_expiry_cleanup_jobs AS existing_job (user_id, recovery_until)
  SELECT access.user_id, access.recovery_until
  FROM public.billing_premium_access access
  JOIN public.profiles profile ON profile.id = access.user_id
  WHERE access.active IS FALSE
    AND access.revoked_reason IN ('refund', 'chargeback')
    AND access.recovery_until <= now()
    AND COALESCE(profile.is_staff, false) IS FALSE
  ON CONFLICT (user_id, recovery_until) DO UPDATE
  SET status = 'pending',
      skip_reason = NULL,
      updated_at = now(),
      completed_at = NULL
  WHERE existing_job.status = 'skipped'
    AND existing_job.skip_reason = 'staff_exempt';

  FOR v_job IN
    SELECT job.id, job.user_id, job.recovery_until
    FROM public.profile_media_plus_expiry_cleanup_jobs job
    WHERE job.status = 'pending'
    ORDER BY job.created_at, job.id
    FOR UPDATE SKIP LOCKED
    LIMIT v_limit
  LOOP
    v_access_found := false;
    SELECT access.active, access.recovery_until, COALESCE(profile.is_staff, false)
    INTO v_access_active, v_current_recovery_until, v_is_staff
    FROM public.billing_premium_access access
    JOIN public.profiles profile ON profile.id = access.user_id
    WHERE access.user_id = v_job.user_id
    FOR UPDATE OF access, profile;
    v_access_found := FOUND;

    IF NOT v_access_found THEN
      UPDATE public.profile_media_plus_expiry_cleanup_jobs
      SET status = 'skipped', skip_reason = 'access_missing', updated_at = now(), completed_at = now()
      WHERE id = v_job.id;
      processed_job_id := v_job.id;
      outcome := 'skipped';
      tombstoned_asset_count := 0;
      RETURN NEXT;
      CONTINUE;
    ELSIF v_is_staff THEN
      UPDATE public.profile_media_plus_expiry_cleanup_jobs
      SET status = 'skipped', skip_reason = 'staff_exempt', updated_at = now(), completed_at = now()
      WHERE id = v_job.id;
      processed_job_id := v_job.id;
      outcome := 'skipped';
      tombstoned_asset_count := 0;
      RETURN NEXT;
      CONTINUE;
    ELSIF v_access_active IS TRUE THEN
      UPDATE public.profile_media_plus_expiry_cleanup_jobs
      SET status = 'skipped', skip_reason = 'plus_reactivated', updated_at = now(), completed_at = now()
      WHERE id = v_job.id;
      processed_job_id := v_job.id;
      outcome := 'skipped';
      tombstoned_asset_count := 0;
      RETURN NEXT;
      CONTINUE;
    ELSIF v_current_recovery_until IS DISTINCT FROM v_job.recovery_until
       OR v_current_recovery_until > now() THEN
      UPDATE public.profile_media_plus_expiry_cleanup_jobs
      SET status = 'skipped', skip_reason = 'recovery_extended', updated_at = now(), completed_at = now()
      WHERE id = v_job.id;
      processed_job_id := v_job.id;
      outcome := 'skipped';
      tombstoned_asset_count := 0;
      RETURN NEXT;
      CONTINUE;
    END IF;

    -- Clear the selected Plus media and only the audio playlist's asset
    -- references. Preserve its harmless playback preferences and all free
    -- avatar/background selections.
    UPDATE public.profile_configurations
    SET background_video_asset_id = NULL,
        animated_avatar_asset_id = NULL,
        share_image_asset_id = NULL,
        banner_asset_id = NULL,
        cursor_asset_id = NULL,
        pointer_cursor_asset_id = NULL,
        audio_asset_id = NULL,
        background_video_path = NULL,
        banner_path = NULL,
        cursor_path = NULL,
        pointer_cursor_path = NULL,
        audio_path = NULL,
        audio_playlist = jsonb_set(COALESCE(audio_playlist, '{}'::jsonb), '{tracks}', '[]'::jsonb, true),
        updated_at = now()
    WHERE user_id = v_job.user_id;

    WITH tombstoned AS (
      UPDATE public.profile_media_assets asset
      SET status = 'deleted',
          deleted_at = COALESCE(asset.deleted_at, now()),
          cleanup_at = now(),
          cache_purge_status = CASE
            WHEN NULLIF(asset.r2_public_key, '') IS NULL THEN 'not_required'
            ELSE 'pending'
          END,
          cache_purge_at = NULL,
          last_error = NULL,
          updated_at = now()
      WHERE asset.user_id = v_job.user_id
        AND asset.storage_provider = 'r2'
        AND asset.kind IN ('background_video', 'animated_avatar', 'share_image', 'banner', 'audio', 'cursor', 'pointer_cursor')
        AND asset.status IN ('staged', 'active', 'abandoned')
      RETURNING asset.id
    )
    SELECT count(*)::integer INTO v_tombstoned FROM tombstoned;

    UPDATE public.profile_media_plus_expiry_cleanup_jobs
    SET status = 'tombstoned',
        assets_tombstoned = v_tombstoned,
        skip_reason = NULL,
        updated_at = now(),
        completed_at = now()
    WHERE id = v_job.id;

    processed_job_id := v_job.id;
    outcome := 'tombstoned';
    tombstoned_asset_count := v_tombstoned;
    RETURN NEXT;
  END LOOP;
END;
$function$;

REVOKE ALL ON FUNCTION public.claim_profile_media_plus_expiry_cleanup(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_profile_media_plus_expiry_cleanup(integer) TO service_role;

COMMIT;
