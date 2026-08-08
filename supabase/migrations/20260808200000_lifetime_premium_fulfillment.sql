-- Milestone 9: lifetime Chromadie Plus fulfillment.
-- Stripe and entitlement state is service-owned. Browser roles can only read
-- the existing bounded entitlement projection through its authenticated RPC.

-- Reserve the new direct-refresh route before the client surface ships.
INSERT INTO public.reserved_usernames (username_key, category, reason, release_policy)
VALUES ('pricing', 'route', 'Hard-reserved identity.', 'never')
ON CONFLICT (username_key) DO UPDATE
SET category = EXCLUDED.category, reason = EXCLUDED.reason,
    release_policy = EXCLUDED.release_policy, enabled = true;

CREATE TABLE IF NOT EXISTS public.billing_customers (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  stripe_customer_id text NOT NULL UNIQUE CHECK (stripe_customer_id ~ '^cus_[A-Za-z0-9]+$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.billing_checkout_sessions (
  stripe_checkout_session_id text PRIMARY KEY CHECK (stripe_checkout_session_id ~ '^cs_(test_|live_)?[A-Za-z0-9]+$'),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  stripe_customer_id text,
  stripe_payment_intent_id text UNIQUE,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'complete', 'expired', 'refunded', 'disputed')),
  payment_status text NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid', 'no_payment_required')),
  amount_total integer NOT NULL DEFAULT 799 CHECK (amount_total = 799),
  currency text NOT NULL DEFAULT 'usd' CHECK (currency = 'usd'),
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS billing_checkout_sessions_user_idx
  ON public.billing_checkout_sessions (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.billing_webhook_events (
  stripe_event_id text PRIMARY KEY CHECK (stripe_event_id ~ '^evt_[A-Za-z0-9]+$'),
  event_type text NOT NULL CHECK (length(event_type) BETWEEN 1 AND 120),
  stripe_payment_intent_id text,
  event_created_at timestamptz,
  outcome text NOT NULL CHECK (outcome IN ('granted', 'revoked', 'pending', 'ignored')),
  processed_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.billing_premium_access (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  active boolean NOT NULL DEFAULT false,
  source_checkout_session_id text REFERENCES public.billing_checkout_sessions(stripe_checkout_session_id) ON DELETE SET NULL,
  revoked_reason text CHECK (revoked_reason IS NULL OR revoked_reason IN ('refund', 'chargeback')),
  recovery_until timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (active OR recovery_until IS NULL OR recovery_until <= updated_at + interval '30 days 1 minute')
);

ALTER TABLE public.billing_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_checkout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_premium_access ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS billing_customers_no_browser_rows ON public.billing_customers;
CREATE POLICY billing_customers_no_browser_rows ON public.billing_customers FOR ALL USING (false) WITH CHECK (false);
DROP POLICY IF EXISTS billing_checkout_sessions_no_browser_rows ON public.billing_checkout_sessions;
CREATE POLICY billing_checkout_sessions_no_browser_rows ON public.billing_checkout_sessions FOR ALL USING (false) WITH CHECK (false);
DROP POLICY IF EXISTS billing_webhook_events_no_browser_rows ON public.billing_webhook_events;
CREATE POLICY billing_webhook_events_no_browser_rows ON public.billing_webhook_events FOR ALL USING (false) WITH CHECK (false);
DROP POLICY IF EXISTS billing_premium_access_no_browser_rows ON public.billing_premium_access;
CREATE POLICY billing_premium_access_no_browser_rows ON public.billing_premium_access FOR ALL USING (false) WITH CHECK (false);

REVOKE ALL ON TABLE public.billing_customers FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.billing_checkout_sessions FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.billing_webhook_events FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.billing_premium_access FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.billing_customers TO service_role;
GRANT ALL ON TABLE public.billing_checkout_sessions TO service_role;
GRANT ALL ON TABLE public.billing_webhook_events TO service_role;
GRANT ALL ON TABLE public.billing_premium_access TO service_role;

-- Canonicalize existing premium access without removing the legacy key. Old
-- clients and the Milestone 7 composition RPC remain compatible during rollout.
INSERT INTO public.profile_entitlements (user_id, entitlement_key, source, granted_at)
SELECT user_id, 'chromadie_plus', 'atelier_plus_backfill', granted_at
FROM public.profile_entitlements
WHERE entitlement_key = 'atelier_plus'
ON CONFLICT (user_id, entitlement_key) DO NOTHING;

INSERT INTO public.billing_premium_access (user_id, active, updated_at)
SELECT user_id, true, now()
FROM public.profile_entitlements
WHERE entitlement_key IN ('chromadie_plus', 'atelier_plus')
ON CONFLICT (user_id) DO UPDATE SET active = true, revoked_reason = NULL, recovery_until = NULL, updated_at = now();

-- Staff expression follows the authoritative server flag, never a client bypass.
CREATE OR REPLACE FUNCTION public.sync_staff_expression_entitlements()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
  IF NEW.is_staff THEN
    INSERT INTO public.profile_entitlements (user_id, entitlement_key, source)
    VALUES (NEW.id, 'chromadie_plus', 'staff'), (NEW.id, 'atelier_plus', 'staff')
    ON CONFLICT (user_id, entitlement_key) DO NOTHING;
  ELSIF TG_OP = 'UPDATE' AND OLD.is_staff AND NOT NEW.is_staff THEN
    DELETE FROM public.profile_entitlements
    WHERE user_id = NEW.id
      AND entitlement_key IN ('chromadie_plus', 'atelier_plus')
      AND source = 'staff';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS profiles_sync_staff_expression_entitlements ON public.profiles;
CREATE TRIGGER profiles_sync_staff_expression_entitlements
AFTER INSERT OR UPDATE OF is_staff ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.sync_staff_expression_entitlements();

INSERT INTO public.profile_entitlements (user_id, entitlement_key, source)
SELECT id, key, 'staff'
FROM public.profiles
CROSS JOIN (VALUES ('chromadie_plus'), ('atelier_plus')) AS entitlements(key)
WHERE is_staff = true
ON CONFLICT (user_id, entitlement_key) DO NOTHING;

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
    v_event_id,
    v_event_type,
    NULLIF(v_object->>'payment_intent', ''),
    CASE WHEN COALESCE(p_event->>'created', '') ~ '^[0-9]{1,12}$' THEN to_timestamp((p_event->>'created')::bigint) END,
    'ignored'
  )
  ON CONFLICT (stripe_event_id) DO NOTHING;
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

    SELECT user_id INTO v_user_id
    FROM public.billing_checkout_sessions
    WHERE stripe_checkout_session_id = v_session_id
      AND user_id::text = COALESCE(v_object#>>'{metadata,user_id}', '')
    FOR UPDATE;
    IF v_user_id IS NULL THEN RAISE EXCEPTION 'Unknown or mismatched checkout session'; END IF;

    v_payment_intent_id := NULLIF(v_object->>'payment_intent', '');
    v_customer_id := NULLIF(v_object->>'customer', '');
    UPDATE public.billing_checkout_sessions
    SET status = 'complete', payment_status = v_object->>'payment_status',
        stripe_payment_intent_id = v_payment_intent_id, stripe_customer_id = v_customer_id,
        completed_at = COALESCE(completed_at, now()), updated_at = now()
    WHERE stripe_checkout_session_id = v_session_id;

    IF v_customer_id ~ '^cus_[A-Za-z0-9]+$' THEN
      INSERT INTO public.billing_customers (user_id, stripe_customer_id)
      VALUES (v_user_id, v_customer_id)
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

    -- Stripe does not guarantee delivery order. A refund/dispute received
    -- before completion remains pending by payment intent and wins here.
    SELECT CASE
      WHEN count(*) = 0 THEN NULL
      WHEN bool_or(event_type = 'charge.dispute.created') THEN 'chargeback'
      ELSE 'refund'
    END
    INTO v_revoke_reason
    FROM public.billing_webhook_events
    WHERE stripe_payment_intent_id = v_payment_intent_id
      AND event_type IN ('charge.refunded', 'charge.dispute.created', 'refund.created')
      AND outcome = 'pending';
    IF v_revoke_reason IS NOT NULL THEN
      UPDATE public.billing_checkout_sessions
      SET status = CASE WHEN v_revoke_reason = 'chargeback' THEN 'disputed' ELSE 'refunded' END, updated_at = now()
      WHERE stripe_checkout_session_id = v_session_id;
      UPDATE public.billing_premium_access
      SET active = false, revoked_reason = v_revoke_reason,
          recovery_until = now() + interval '30 days', updated_at = now()
      WHERE user_id = v_user_id;
      DELETE FROM public.profile_entitlements
      WHERE user_id = v_user_id AND entitlement_key IN ('chromadie_plus', 'atelier_plus')
        AND source IN ('stripe_lifetime', 'stripe_compatibility');
      INSERT INTO public.profile_entitlements (user_id, entitlement_key, source)
      SELECT v_user_id, entitlement_key, 'staff'
      FROM (VALUES ('chromadie_plus'), ('atelier_plus')) AS staff_keys(entitlement_key)
      WHERE EXISTS (SELECT 1 FROM public.profiles WHERE id = v_user_id AND is_staff = true)
      ON CONFLICT (user_id, entitlement_key) DO NOTHING;
      UPDATE public.billing_webhook_events
      SET outcome = 'revoked'
      WHERE stripe_payment_intent_id = v_payment_intent_id AND outcome = 'pending';
      v_outcome := 'revoked';
    END IF;
  ELSIF v_event_type IN ('charge.refunded', 'charge.dispute.created', 'refund.created') THEN
    v_payment_intent_id := NULLIF(v_object->>'payment_intent', '');
    SELECT user_id, stripe_checkout_session_id INTO v_user_id, v_session_id
    FROM public.billing_checkout_sessions
    WHERE stripe_payment_intent_id = v_payment_intent_id
    FOR UPDATE;

    IF v_user_id IS NOT NULL THEN
      UPDATE public.billing_checkout_sessions
      SET status = CASE WHEN v_event_type = 'charge.dispute.created' THEN 'disputed' ELSE 'refunded' END, updated_at = now()
      WHERE stripe_checkout_session_id = v_session_id;
      UPDATE public.billing_premium_access
      SET active = false,
          revoked_reason = CASE WHEN v_event_type = 'charge.dispute.created' THEN 'chargeback' ELSE 'refund' END,
          recovery_until = now() + interval '30 days', updated_at = now()
      WHERE user_id = v_user_id;
      DELETE FROM public.profile_entitlements
      WHERE user_id = v_user_id AND entitlement_key IN ('chromadie_plus', 'atelier_plus')
        AND source IN ('stripe_lifetime', 'stripe_compatibility');
      -- A refund cannot remove expression authority supplied independently by
      -- the authoritative staff flag.
      INSERT INTO public.profile_entitlements (user_id, entitlement_key, source)
      SELECT v_user_id, entitlement_key, 'staff'
      FROM (VALUES ('chromadie_plus'), ('atelier_plus')) AS staff_keys(entitlement_key)
      WHERE EXISTS (SELECT 1 FROM public.profiles WHERE id = v_user_id AND is_staff = true)
      ON CONFLICT (user_id, entitlement_key) DO NOTHING;
      v_outcome := 'revoked';
    ELSE
      v_outcome := 'pending';
    END IF;
  END IF;

  UPDATE public.billing_webhook_events SET outcome = v_outcome WHERE stripe_event_id = v_event_id;
  RETURN jsonb_build_object('success', true, 'duplicate', false, 'outcome', v_outcome, 'event_id', v_event_id);
END;
$function$;

REVOKE ALL ON FUNCTION public.sync_staff_expression_entitlements() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.process_stripe_billing_event(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_stripe_billing_event(jsonb) TO service_role;

-- Keep a refunded Atelier draft owner-private while the public projection
-- falls back to the complete free Signal composition. Content, appearance,
-- links, media paths, widgets, history, and gameplay fields remain untouched.
CREATE OR REPLACE FUNCTION public.get_public_profile_configuration(p_user_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $function$
  SELECT (
    CASE
      WHEN COALESCE(c.published_config->>'templateKey', '') = 'atelier'
        AND NOT p.is_staff
        AND NOT EXISTS (
          SELECT 1 FROM public.profile_entitlements e
          WHERE e.user_id = p.id AND e.entitlement_key IN ('chromadie_plus', 'atelier_plus')
        )
      THEN COALESCE(c.published_config, public.profile_default_configuration(p.mood_color))
        || jsonb_build_object(
          'templateKey', 'signal',
          'layoutVariant', public.profile_default_configuration(p.mood_color)->'layoutVariant',
          'modules', public.profile_default_configuration(p.mood_color)->'modules'
        )
      ELSE COALESCE(c.published_config, public.profile_default_configuration(p.mood_color))
    END
  ) || jsonb_build_object(
    'avatar_path', c.avatar_path,
    'background_path', c.background_path,
    'spotify_type', c.spotify_type,
    'spotify_id', c.spotify_id,
    'audio_path', CASE WHEN p.is_staff THEN c.audio_path ELSE NULL END
  )
  FROM public.profiles p
  LEFT JOIN public.profile_configurations c ON c.user_id = p.id
  WHERE p.id = p_user_id;
$function$;

REVOKE ALL ON FUNCTION public.get_public_profile_configuration(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_profile_configuration(uuid) TO anon, authenticated;
