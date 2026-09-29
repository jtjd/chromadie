-- Keep Plus checkout creation and account deletion in one serialized lifecycle.
-- The edge handler expires open Stripe sessions before invoking this RPC.
BEGIN;

CREATE OR REPLACE FUNCTION public.reserve_premium_checkout_claim(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $function$
DECLARE
  v_claim public.billing_checkout_claims%ROWTYPE;
  v_claim_id uuid;
  v_lease interval := interval '90 seconds';
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'A checkout owner is required';
  END IF;

  -- Match delete_account_data so an account cannot be removed while a new
  -- Stripe session is being created or attached to its durable claim.
  PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text), 9341);
  PERFORM 1 FROM public.profiles WHERE id = p_user_id FOR KEY SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Checkout account is no longer available.';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text), 9471);

  IF EXISTS (
    SELECT 1
    FROM public.billing_premium_access access
    WHERE access.user_id = p_user_id AND access.active
  ) OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = p_user_id AND is_staff
  ) THEN
    RAISE EXCEPTION 'Chromadie Plus is already active' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_claim
  FROM public.billing_checkout_claims
  WHERE user_id = p_user_id
    AND product_key = 'chromadie_plus_lifetime'
    AND state IN ('creating', 'open')
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF FOUND THEN
    IF v_claim.state = 'creating' THEN
      IF v_claim.lease_expires_at > now() THEN
        RETURN jsonb_build_object(
          'action', 'creating',
          'claim_id', v_claim.claim_id,
          'stripe_idempotency_key', v_claim.stripe_idempotency_key,
          'retry_after_seconds', GREATEST(1, ceil(extract(epoch FROM (v_claim.lease_expires_at - now())))::integer)
        );
      END IF;

      UPDATE public.billing_checkout_claims
      SET lease_expires_at = now() + v_lease, last_error = NULL, updated_at = now()
      WHERE claim_id = v_claim.claim_id;
      RETURN jsonb_build_object(
        'action', 'create',
        'claim_id', v_claim.claim_id,
        'stripe_idempotency_key', v_claim.stripe_idempotency_key
      );
    END IF;

    RETURN jsonb_build_object(
      'action', 'reconcile',
      'claim_id', v_claim.claim_id,
      'stripe_checkout_session_id', v_claim.stripe_checkout_session_id
    );
  END IF;

  v_claim_id := gen_random_uuid();
  INSERT INTO public.billing_checkout_claims (
    claim_id, user_id, product_key, state, stripe_idempotency_key, lease_expires_at
  ) VALUES (
    v_claim_id, p_user_id, 'chromadie_plus_lifetime', 'creating',
    'chromadie_plus_checkout:' || v_claim_id::text, now() + v_lease
  );
  RETURN jsonb_build_object(
    'action', 'create',
    'claim_id', v_claim_id,
    'stripe_idempotency_key', 'chromadie_plus_checkout:' || v_claim_id::text
  );
END;
$function$;

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

  -- This is shared with reserve_premium_checkout_claim. Whichever operation
  -- wins serializes the lifecycle; either checkout creation sees no profile,
  -- or deletion sees and preserves any active claim.
  PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text), 9341);
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = p_user_id)
  INTO v_profile_existed;

  IF v_profile_existed THEN
    PERFORM 1 FROM public.profiles WHERE id = p_user_id FOR UPDATE;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.billing_checkout_claims
    WHERE user_id = p_user_id AND state IN ('creating', 'open')
  ) OR EXISTS (
    SELECT 1
    FROM public.billing_checkout_sessions session
    JOIN public.billing_checkout_claims claim
      ON claim.stripe_checkout_session_id = session.stripe_checkout_session_id
    WHERE session.user_id = p_user_id
      AND session.status = 'complete'
      AND session.completed_at IS NULL
      AND claim.state = 'complete'
    FOR UPDATE OF session, claim
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'An active or unconfirmed Plus checkout must settle before account deletion.';
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

REVOKE ALL ON FUNCTION public.reserve_premium_checkout_claim(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_premium_checkout_claim(uuid) TO service_role;
REVOKE ALL ON FUNCTION public.delete_account_data(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_account_data(uuid) TO service_role;

COMMIT;
