-- Phase B1: keep one durable, service-owned checkout claim per buyer and
-- product. A Stripe call is deliberately outside these transactions; its
-- idempotency key belongs to the claim so a lease retry cannot create a second
-- Stripe Checkout session.

CREATE TABLE IF NOT EXISTS public.billing_checkout_claims (
  claim_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_key text NOT NULL CHECK (product_key = 'chromadie_plus_lifetime'),
  state text NOT NULL DEFAULT 'creating'
    CHECK (state IN ('creating', 'open', 'complete', 'expired', 'failed')),
  stripe_idempotency_key text NOT NULL UNIQUE
    CHECK (length(stripe_idempotency_key) BETWEEN 16 AND 255),
  stripe_checkout_session_id text UNIQUE
    REFERENCES public.billing_checkout_sessions(stripe_checkout_session_id) ON DELETE SET NULL,
  lease_expires_at timestamptz,
  stripe_expires_at timestamptz,
  last_error text CHECK (last_error IS NULL OR length(last_error) <= 400),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Only one live checkout may exist for a user/product pair. Terminal claims
-- remain available for reconciliation and webhook audit history.
CREATE UNIQUE INDEX IF NOT EXISTS billing_checkout_claims_one_active_idx
  ON public.billing_checkout_claims (user_id, product_key)
  WHERE state IN ('creating', 'open');
CREATE INDEX IF NOT EXISTS billing_checkout_claims_session_idx
  ON public.billing_checkout_claims (stripe_checkout_session_id)
  WHERE stripe_checkout_session_id IS NOT NULL;

ALTER TABLE public.billing_checkout_claims ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS billing_checkout_claims_no_browser_rows ON public.billing_checkout_claims;
CREATE POLICY billing_checkout_claims_no_browser_rows ON public.billing_checkout_claims
  FOR ALL USING (false) WITH CHECK (false);
REVOKE ALL ON TABLE public.billing_checkout_claims FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.billing_checkout_claims TO service_role;

-- Bring existing sessions under the claim contract without changing their
-- billing meaning. Only the most recent legacy open session stays reusable;
-- the next Stripe GET is still authoritative before it can be reused.
WITH ranked_open_sessions AS (
  SELECT stripe_checkout_session_id,
    row_number() OVER (PARTITION BY user_id ORDER BY created_at DESC, stripe_checkout_session_id DESC) AS row_number
  FROM public.billing_checkout_sessions
  WHERE status = 'open'
)
UPDATE public.billing_checkout_sessions sessions
SET status = 'expired', updated_at = now()
FROM ranked_open_sessions ranked
WHERE sessions.stripe_checkout_session_id = ranked.stripe_checkout_session_id
  AND ranked.row_number > 1;

INSERT INTO public.billing_checkout_claims (
  user_id, product_key, state, stripe_idempotency_key,
  stripe_checkout_session_id, stripe_expires_at, created_at, updated_at
)
SELECT
  sessions.user_id,
  'chromadie_plus_lifetime',
  CASE sessions.status
    WHEN 'open' THEN 'open'
    WHEN 'complete' THEN 'complete'
    ELSE 'expired'
  END,
  'legacy_checkout_claim:' || sessions.stripe_checkout_session_id,
  sessions.stripe_checkout_session_id,
  CASE WHEN sessions.status = 'open' THEN sessions.created_at + interval '24 hours' END,
  sessions.created_at,
  sessions.updated_at
FROM public.billing_checkout_sessions sessions
ON CONFLICT (stripe_checkout_session_id) DO NOTHING;

-- Claim a short lease before calling Stripe. This is intentionally a separate
-- transaction from the network request; an expired lease retries the same
-- claim and idempotency key, while a concurrent valid lease is retriable.
CREATE OR REPLACE FUNCTION public.reserve_premium_checkout_claim(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_claim public.billing_checkout_claims%ROWTYPE;
  v_claim_id uuid;
  v_lease interval := interval '90 seconds';
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'A checkout owner is required';
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

-- Attach the Stripe-created session to its already-reserved claim. Repeated
-- finalization of the same idempotent Stripe response is harmless.
CREATE OR REPLACE FUNCTION public.finalize_premium_checkout_claim(
  p_claim_id uuid,
  p_stripe_checkout_session_id text,
  p_stripe_customer_id text,
  p_stripe_status text,
  p_payment_status text,
  p_stripe_expires_at timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_claim public.billing_checkout_claims%ROWTYPE;
  v_state text;
BEGIN
  IF p_claim_id IS NULL
    OR COALESCE(p_stripe_checkout_session_id, '') !~ '^cs_(test_|live_)?[A-Za-z0-9]+$'
    OR COALESCE(p_stripe_status, '') NOT IN ('open', 'complete', 'expired')
    OR COALESCE(p_payment_status, '') NOT IN ('unpaid', 'paid', 'no_payment_required') THEN
    RAISE EXCEPTION 'Invalid checkout finalization';
  END IF;

  SELECT * INTO v_claim FROM public.billing_checkout_claims
  WHERE claim_id = p_claim_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Unknown checkout claim'; END IF;

  IF v_claim.state IN ('open', 'complete') THEN
    IF v_claim.stripe_checkout_session_id <> p_stripe_checkout_session_id THEN
      RAISE EXCEPTION 'Checkout claim is already bound to a different session';
    END IF;
    RETURN jsonb_build_object('state', v_claim.state, 'claim_id', v_claim.claim_id,
      'stripe_checkout_session_id', v_claim.stripe_checkout_session_id);
  END IF;
  IF v_claim.state <> 'creating' THEN
    RAISE EXCEPTION 'Checkout claim is no longer creatable';
  END IF;

  v_state := CASE
    WHEN p_stripe_status = 'open' AND p_stripe_expires_at > now() THEN 'open'
    WHEN p_stripe_status = 'complete' OR p_payment_status IN ('paid', 'no_payment_required') THEN 'complete'
    ELSE 'expired'
  END;

  INSERT INTO public.billing_checkout_sessions (
    stripe_checkout_session_id, user_id, stripe_customer_id, status,
    payment_status, amount_total, currency, updated_at
  ) VALUES (
    p_stripe_checkout_session_id, v_claim.user_id,
    NULLIF(p_stripe_customer_id, ''),
    CASE v_state WHEN 'open' THEN 'open' WHEN 'complete' THEN 'complete' ELSE 'expired' END,
    p_payment_status, 799, 'usd', now()
  )
  ON CONFLICT (stripe_checkout_session_id) DO UPDATE
  SET stripe_customer_id = COALESCE(EXCLUDED.stripe_customer_id, public.billing_checkout_sessions.stripe_customer_id),
      status = EXCLUDED.status, payment_status = EXCLUDED.payment_status, updated_at = now()
  WHERE public.billing_checkout_sessions.user_id = v_claim.user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Checkout session belongs to a different owner'; END IF;

  UPDATE public.billing_checkout_claims
  SET state = v_state,
      stripe_checkout_session_id = p_stripe_checkout_session_id,
      stripe_expires_at = p_stripe_expires_at,
      lease_expires_at = NULL,
      last_error = NULL,
      updated_at = now()
  WHERE claim_id = p_claim_id;

  RETURN jsonb_build_object('state', v_state, 'claim_id', p_claim_id,
    'stripe_checkout_session_id', p_stripe_checkout_session_id);
END;
$function$;

-- Stripe GET is the authority for reuse. This function records that observed
-- state and never grants entitlements; only the signed webhook can do that.
CREATE OR REPLACE FUNCTION public.reconcile_premium_checkout_claim(
  p_claim_id uuid,
  p_user_id uuid,
  p_stripe_status text,
  p_payment_status text,
  p_stripe_expires_at timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_claim public.billing_checkout_claims%ROWTYPE;
  v_state text;
BEGIN
  IF p_claim_id IS NULL OR p_user_id IS NULL
    OR COALESCE(p_stripe_status, '') NOT IN ('open', 'complete', 'expired')
    OR COALESCE(p_payment_status, '') NOT IN ('unpaid', 'paid', 'no_payment_required') THEN
    RAISE EXCEPTION 'Invalid checkout reconciliation';
  END IF;

  SELECT * INTO v_claim FROM public.billing_checkout_claims
  WHERE claim_id = p_claim_id AND user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Unknown checkout claim'; END IF;
  IF v_claim.stripe_checkout_session_id IS NULL THEN
    RAISE EXCEPTION 'Checkout claim has no Stripe session';
  END IF;

  v_state := CASE
    WHEN p_stripe_status = 'open' AND p_payment_status = 'unpaid' AND p_stripe_expires_at > now() THEN 'open'
    WHEN p_stripe_status = 'complete' OR p_payment_status IN ('paid', 'no_payment_required') THEN 'complete'
    ELSE 'expired'
  END;

  UPDATE public.billing_checkout_sessions
  SET status = CASE v_state WHEN 'open' THEN 'open' WHEN 'complete' THEN 'complete' ELSE 'expired' END,
      payment_status = p_payment_status, updated_at = now()
  WHERE stripe_checkout_session_id = v_claim.stripe_checkout_session_id
    AND user_id = p_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Checkout session is unavailable'; END IF;

  UPDATE public.billing_checkout_claims
  SET state = v_state, stripe_expires_at = p_stripe_expires_at,
      lease_expires_at = NULL, updated_at = now()
  WHERE claim_id = p_claim_id;

  RETURN jsonb_build_object(
    'state', v_state,
    'claim_id', p_claim_id,
    'stripe_checkout_session_id', v_claim.stripe_checkout_session_id
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.reserve_premium_checkout_claim(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finalize_premium_checkout_claim(uuid, text, text, text, text, timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reconcile_premium_checkout_claim(uuid, uuid, text, text, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_premium_checkout_claim(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.finalize_premium_checkout_claim(uuid, text, text, text, text, timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.reconcile_premium_checkout_claim(uuid, uuid, text, text, timestamptz) TO service_role;

-- `expired` is a durable terminal webhook result, separate from ignored event
-- types. This keeps duplicate delivery response deterministic for expiry too.
ALTER TABLE public.billing_webhook_events
  DROP CONSTRAINT IF EXISTS billing_webhook_events_outcome_check;
ALTER TABLE public.billing_webhook_events
  ADD CONSTRAINT billing_webhook_events_outcome_check
  CHECK (outcome IN ('granted', 'revoked', 'pending', 'ignored', 'expired'));

CREATE OR REPLACE FUNCTION public.process_stripe_billing_event(p_event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_event_id text := COALESCE(p_event->>'id', '');
  v_event_type text := COALESCE(p_event->>'type', '');
  v_object jsonb := COALESCE(p_event#>'{data,object}', '{}'::jsonb);
  v_user_id uuid;
  v_session_id text;
  v_payment_intent_id text;
  v_customer_id text;
  v_inserted integer := 0;
  v_outcome text := 'ignored';
  v_revoke_reason text;
BEGIN
  IF v_event_id !~ '^evt_[A-Za-z0-9]+$' OR length(v_event_type) NOT BETWEEN 1 AND 120 THEN
    RAISE EXCEPTION 'Invalid Stripe event envelope';
  END IF;

  INSERT INTO public.billing_webhook_events (stripe_event_id, event_type, stripe_payment_intent_id, event_created_at, outcome)
  VALUES (
    v_event_id, v_event_type, NULLIF(v_object->>'payment_intent', ''),
    CASE WHEN COALESCE(p_event->>'created', '') ~ '^[0-9]{1,12}$' THEN to_timestamp((p_event->>'created')::bigint) END,
    'ignored'
  ) ON CONFLICT (stripe_event_id) DO NOTHING;
  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  IF v_inserted = 0 THEN
    RETURN jsonb_build_object('success', true, 'duplicate', true, 'event_id', v_event_id);
  END IF;

  IF v_event_type = 'checkout.session.completed' THEN
    v_session_id := COALESCE(v_object->>'id', '');
    IF v_session_id !~ '^cs_(test_|live_)?[A-Za-z0-9]+$'
      OR v_object->>'mode' <> 'payment'
      OR COALESCE(v_object->>'payment_status', '') NOT IN ('paid', 'no_payment_required')
      OR COALESCE((v_object->>'amount_total')::integer, 0) <> 799
      OR lower(COALESCE(v_object->>'currency', '')) <> 'usd'
      OR COALESCE(v_object#>>'{metadata,entitlement}', '') <> 'chromadie_plus' THEN
      RAISE EXCEPTION 'Invalid completed checkout';
    END IF;

    SELECT user_id INTO v_user_id FROM public.billing_checkout_sessions
    WHERE stripe_checkout_session_id = v_session_id
      AND user_id::text = COALESCE(v_object#>>'{metadata,user_id}', '') FOR UPDATE;
    IF v_user_id IS NULL THEN RAISE EXCEPTION 'Unknown or mismatched checkout session'; END IF;

    v_payment_intent_id := NULLIF(v_object->>'payment_intent', '');
    v_customer_id := NULLIF(v_object->>'customer', '');
    UPDATE public.billing_checkout_sessions SET status = 'complete', payment_status = v_object->>'payment_status',
      stripe_payment_intent_id = v_payment_intent_id, stripe_customer_id = v_customer_id,
      completed_at = COALESCE(completed_at, now()), updated_at = now()
    WHERE stripe_checkout_session_id = v_session_id;
    UPDATE public.billing_checkout_claims SET state = 'complete', lease_expires_at = NULL, updated_at = now()
    WHERE stripe_checkout_session_id = v_session_id;

    IF v_customer_id ~ '^cus_[A-Za-z0-9]+$' THEN
      INSERT INTO public.billing_customers (user_id, stripe_customer_id) VALUES (v_user_id, v_customer_id)
      ON CONFLICT (user_id) DO UPDATE SET stripe_customer_id = EXCLUDED.stripe_customer_id, updated_at = now();
    END IF;
    INSERT INTO public.billing_premium_access (user_id, active, source_checkout_session_id, updated_at)
    VALUES (v_user_id, true, v_session_id, now())
    ON CONFLICT (user_id) DO UPDATE SET active = true, source_checkout_session_id = EXCLUDED.source_checkout_session_id,
      revoked_reason = NULL, recovery_until = NULL, updated_at = now();
    INSERT INTO public.profile_entitlements (user_id, entitlement_key, source)
    VALUES (v_user_id, 'chromadie_plus', 'stripe_lifetime'), (v_user_id, 'atelier_plus', 'stripe_compatibility')
    ON CONFLICT (user_id, entitlement_key) DO UPDATE SET source = EXCLUDED.source, granted_at = now();
    v_outcome := 'granted';

    SELECT CASE WHEN count(*) = 0 THEN NULL WHEN bool_or(event_type = 'charge.dispute.created') THEN 'chargeback' ELSE 'refund' END
    INTO v_revoke_reason FROM public.billing_webhook_events
    WHERE stripe_payment_intent_id = v_payment_intent_id
      AND event_type IN ('charge.refunded', 'charge.dispute.created', 'refund.created') AND outcome = 'pending';
    IF v_revoke_reason IS NOT NULL THEN
      UPDATE public.billing_checkout_sessions SET status = CASE WHEN v_revoke_reason = 'chargeback' THEN 'disputed' ELSE 'refunded' END, updated_at = now()
      WHERE stripe_checkout_session_id = v_session_id;
      UPDATE public.billing_premium_access SET active = false, revoked_reason = v_revoke_reason,
        recovery_until = now() + interval '30 days', updated_at = now() WHERE user_id = v_user_id;
      DELETE FROM public.profile_entitlements WHERE user_id = v_user_id AND entitlement_key IN ('chromadie_plus', 'atelier_plus')
        AND source IN ('stripe_lifetime', 'stripe_compatibility');
      INSERT INTO public.profile_entitlements (user_id, entitlement_key, source)
      SELECT v_user_id, entitlement_key, 'staff' FROM (VALUES ('chromadie_plus'), ('atelier_plus')) AS staff_keys(entitlement_key)
      WHERE EXISTS (SELECT 1 FROM public.profiles WHERE id = v_user_id AND is_staff = true)
      ON CONFLICT (user_id, entitlement_key) DO NOTHING;
      UPDATE public.billing_webhook_events SET outcome = 'revoked'
      WHERE stripe_payment_intent_id = v_payment_intent_id AND outcome = 'pending';
      v_outcome := 'revoked';
    END IF;
  ELSIF v_event_type = 'checkout.session.expired' THEN
    v_session_id := COALESCE(v_object->>'id', '');
    IF v_session_id !~ '^cs_(test_|live_)?[A-Za-z0-9]+$' THEN RAISE EXCEPTION 'Invalid expired checkout'; END IF;
    UPDATE public.billing_checkout_sessions SET status = 'expired', updated_at = now()
    WHERE stripe_checkout_session_id = v_session_id AND status = 'open'
    RETURNING user_id INTO v_user_id;
    UPDATE public.billing_checkout_claims SET state = 'expired', lease_expires_at = NULL, updated_at = now()
    WHERE stripe_checkout_session_id = v_session_id AND state IN ('creating', 'open');
    v_outcome := CASE WHEN v_user_id IS NULL THEN 'ignored' ELSE 'expired' END;
  ELSIF v_event_type IN ('charge.refunded', 'charge.dispute.created', 'refund.created') THEN
    v_payment_intent_id := NULLIF(v_object->>'payment_intent', '');
    SELECT user_id, stripe_checkout_session_id INTO v_user_id, v_session_id FROM public.billing_checkout_sessions
    WHERE stripe_payment_intent_id = v_payment_intent_id FOR UPDATE;
    IF v_user_id IS NOT NULL THEN
      UPDATE public.billing_checkout_sessions SET status = CASE WHEN v_event_type = 'charge.dispute.created' THEN 'disputed' ELSE 'refunded' END, updated_at = now()
      WHERE stripe_checkout_session_id = v_session_id;
      UPDATE public.billing_premium_access SET active = false,
        revoked_reason = CASE WHEN v_event_type = 'charge.dispute.created' THEN 'chargeback' ELSE 'refund' END,
        recovery_until = now() + interval '30 days', updated_at = now() WHERE user_id = v_user_id;
      DELETE FROM public.profile_entitlements WHERE user_id = v_user_id AND entitlement_key IN ('chromadie_plus', 'atelier_plus')
        AND source IN ('stripe_lifetime', 'stripe_compatibility');
      INSERT INTO public.profile_entitlements (user_id, entitlement_key, source)
      SELECT v_user_id, entitlement_key, 'staff' FROM (VALUES ('chromadie_plus'), ('atelier_plus')) AS staff_keys(entitlement_key)
      WHERE EXISTS (SELECT 1 FROM public.profiles WHERE id = v_user_id AND is_staff = true)
      ON CONFLICT (user_id, entitlement_key) DO NOTHING;
      v_outcome := 'revoked';
    ELSE v_outcome := 'pending'; END IF;
  END IF;
  UPDATE public.billing_webhook_events SET outcome = v_outcome WHERE stripe_event_id = v_event_id;
  RETURN jsonb_build_object('success', true, 'duplicate', false, 'outcome', v_outcome, 'event_id', v_event_id);
END;
$function$;

REVOKE ALL ON FUNCTION public.process_stripe_billing_event(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_stripe_billing_event(jsonb) TO service_role;
