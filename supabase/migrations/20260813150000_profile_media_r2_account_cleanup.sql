BEGIN;

-- Account deletion must not depend on a synchronous Cloudflare request. This
-- durable queue captures R2 keys before the profile/media rows cascade away;
-- the control plane retries the byte deletion independently.
CREATE TABLE IF NOT EXISTS public.profile_media_account_cleanup_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  object_keys jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  last_attempt_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  CONSTRAINT profile_media_account_cleanup_jobs_keys_check CHECK (jsonb_typeof(object_keys) = 'array'),
  CONSTRAINT profile_media_account_cleanup_jobs_status_check CHECK (status IN ('pending', 'processing', 'retry', 'completed')),
  CONSTRAINT profile_media_account_cleanup_jobs_attempts_check CHECK (attempts >= 0)
);

CREATE INDEX IF NOT EXISTS profile_media_account_cleanup_jobs_ready_idx
  ON public.profile_media_account_cleanup_jobs (next_attempt_at, created_at)
  WHERE status IN ('pending', 'retry');

CREATE UNIQUE INDEX IF NOT EXISTS profile_media_account_cleanup_jobs_user_active_idx
  ON public.profile_media_account_cleanup_jobs (user_id)
  WHERE status IN ('pending', 'processing', 'retry');

REVOKE ALL ON TABLE public.profile_media_account_cleanup_jobs FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.profile_media_account_cleanup_enqueue_internal(p_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, pg_catalog
AS $function$
DECLARE
  v_job_id uuid;
  v_object_keys jsonb;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT id INTO v_job_id
  FROM public.profile_media_account_cleanup_jobs
  WHERE user_id = p_user_id
    AND status IN ('pending', 'processing', 'retry')
  ORDER BY created_at DESC
  LIMIT 1;
  IF v_job_id IS NOT NULL THEN
    RETURN v_job_id;
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('bucket', bucket, 'key', object_key) ORDER BY bucket, object_key), '[]'::jsonb)
  INTO v_object_keys
  FROM (
    SELECT DISTINCT 'private'::text AS bucket, r2_private_key AS object_key
    FROM public.profile_media_assets
    WHERE user_id = p_user_id AND NULLIF(r2_private_key, '') IS NOT NULL
    UNION
    SELECT DISTINCT 'public'::text AS bucket, r2_public_key AS object_key
    FROM public.profile_media_assets
    WHERE user_id = p_user_id AND NULLIF(r2_public_key, '') IS NOT NULL
  ) objects;

  IF jsonb_array_length(v_object_keys) = 0 THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.profile_media_account_cleanup_jobs (user_id, object_keys)
  VALUES (p_user_id, v_object_keys)
  RETURNING id INTO v_job_id;
  RETURN v_job_id;
END;
$function$;

-- The service-facing wrapper is protected, while account deletion invokes the
-- private helper from its own SECURITY DEFINER transaction. This keeps Auth
-- deletion independent of the caller's JWT role without exposing an enqueue
-- primitive to browser roles.
CREATE OR REPLACE FUNCTION public.enqueue_profile_media_account_cleanup(p_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, pg_catalog
AS $function$
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Control-plane access required.';
  END IF;
  RETURN public.profile_media_account_cleanup_enqueue_internal(p_user_id);
END;
$function$;

-- Claiming is done with row locks so more than one scheduled control-plane
-- invocation cannot delete the same account objects concurrently.
CREATE OR REPLACE FUNCTION public.claim_profile_media_account_cleanup_jobs(p_limit integer DEFAULT 10)
RETURNS TABLE (id uuid, user_id uuid, object_keys jsonb, attempts integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, pg_catalog
AS $function$
DECLARE
  v_limit integer := LEAST(100, GREATEST(1, COALESCE(p_limit, 10)));
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Control-plane access required.';
  END IF;

  RETURN QUERY
  WITH candidates AS (
    SELECT jobs.id
    FROM public.profile_media_account_cleanup_jobs jobs
    WHERE jobs.status IN ('pending', 'retry')
      AND jobs.next_attempt_at <= now()
    ORDER BY jobs.next_attempt_at, jobs.created_at
    FOR UPDATE SKIP LOCKED
    LIMIT v_limit
  )
  UPDATE public.profile_media_account_cleanup_jobs jobs
  SET status = 'processing',
      attempts = jobs.attempts + 1,
      last_attempt_at = now(),
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
    SET status = 'completed', object_keys = '[]'::jsonb, completed_at = now(), last_error = NULL
    WHERE id = p_job_id
    RETURNING * INTO v_job;
  ELSE
    UPDATE public.profile_media_account_cleanup_jobs
    SET status = 'retry',
        next_attempt_at = now() + make_interval(secs => LEAST(86400, (60 * power(2::numeric, LEAST(attempts, 10)))::integer)),
        last_error = left(COALESCE(p_error, 'R2 account media cleanup failed.'), 1000)
    WHERE id = p_job_id
    RETURNING * INTO v_job;
  END IF;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cleanup job not found.');
  END IF;
  RETURN jsonb_build_object('success', true, 'job_id', v_job.id, 'status', v_job.status, 'attempts', v_job.attempts);
END;
$function$;

-- Preserve the existing account-data deletion semantics, but enqueue R2 byte
-- cleanup before the profile row cascades to profile_media_assets. The Auth
-- deletion request can then complete even when Cloudflare is temporarily
-- unavailable.
CREATE OR REPLACE FUNCTION public.delete_account_data(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, pg_catalog
AS $function$
DECLARE
  v_profile_deleted integer := 0;
  v_scores_deleted integer := 0;
  v_inventory_deleted integer := 0;
  v_entitlements_deleted integer := 0;
  v_following_deleted integer := 0;
  v_followers_deleted integer := 0;
  v_achievements_deleted integer := 0;
  v_challenges_deleted integer := 0;
  v_profile_existed boolean := false;
  v_media_cleanup_job_id uuid;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Missing user id');
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text), 9341);
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = p_user_id)
  INTO v_profile_existed;

  IF v_profile_existed THEN
    PERFORM 1 FROM public.profiles WHERE id = p_user_id FOR UPDATE;
  END IF;

  v_media_cleanup_job_id := public.profile_media_account_cleanup_enqueue_internal(p_user_id);

  DELETE FROM public.challenges WHERE sender_user_id = p_user_id;
  GET DIAGNOSTICS v_challenges_deleted = ROW_COUNT;
  DELETE FROM public.user_follows WHERE follower_id = p_user_id;
  GET DIAGNOSTICS v_following_deleted = ROW_COUNT;
  DELETE FROM public.user_follows WHERE followee_id = p_user_id;
  GET DIAGNOSTICS v_followers_deleted = ROW_COUNT;
  DELETE FROM public.user_achievements WHERE user_id = p_user_id;
  GET DIAGNOSTICS v_achievements_deleted = ROW_COUNT;
  DELETE FROM public.profile_entitlements WHERE user_id = p_user_id;
  GET DIAGNOSTICS v_entitlements_deleted = ROW_COUNT;
  DELETE FROM public.inventory WHERE user_id = p_user_id;
  GET DIAGNOSTICS v_inventory_deleted = ROW_COUNT;
  DELETE FROM public.scores WHERE user_id = p_user_id;
  GET DIAGNOSTICS v_scores_deleted = ROW_COUNT;
  DELETE FROM public.profiles WHERE id = p_user_id;
  GET DIAGNOSTICS v_profile_deleted = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'profile_deleted', v_profile_deleted > 0,
    'scores_deleted', v_scores_deleted,
    'inventory_deleted', v_inventory_deleted,
    'entitlements_deleted', v_entitlements_deleted,
    'following_deleted', v_following_deleted,
    'followers_deleted', v_followers_deleted,
    'achievements_deleted', v_achievements_deleted,
    'challenges_deleted', v_challenges_deleted,
    'missing_profile', NOT v_profile_existed,
    'media_cleanup_job_id', v_media_cleanup_job_id
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.enqueue_profile_media_account_cleanup(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.profile_media_account_cleanup_enqueue_internal(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_profile_media_account_cleanup_jobs(integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_profile_media_account_cleanup_job(uuid, boolean, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.delete_account_data(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_profile_media_account_cleanup(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_profile_media_account_cleanup_jobs(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_profile_media_account_cleanup_job(uuid, boolean, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_account_data(uuid) TO service_role;

COMMIT;
