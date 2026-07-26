-- Phase 8: structured decoration access.
-- Existing cosmetics remain earned through the current EP/inventory path.
-- Premium expression is an additive entitlement boundary and never changes
-- roll, score, rank, reward, or prestige authority.

ALTER TABLE public.shop_items
  ADD COLUMN IF NOT EXISTS access_tier text NOT NULL DEFAULT 'earned',
  ADD COLUMN IF NOT EXISTS entitlement_key text;

UPDATE public.shop_items
SET access_tier = 'earned'
WHERE access_tier IS NULL;

ALTER TABLE public.shop_items DROP CONSTRAINT IF EXISTS shop_items_access_tier_check;
ALTER TABLE public.shop_items ADD CONSTRAINT shop_items_access_tier_check CHECK (
  access_tier IN ('free', 'earned', 'premium')
  AND (
    access_tier <> 'premium'
    OR entitlement_key ~ '^[a-z0-9_]{1,80}$'
  )
  AND (
    entitlement_key IS NULL
    OR entitlement_key ~ '^[a-z0-9_]{1,80}$'
  )
);

CREATE TABLE IF NOT EXISTS public.profile_entitlements (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entitlement_key text NOT NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL DEFAULT 'service',
  PRIMARY KEY (user_id, entitlement_key),
  CONSTRAINT profile_entitlements_key_check CHECK (entitlement_key ~ '^[a-z0-9_]{1,80}$'),
  CONSTRAINT profile_entitlements_source_check CHECK (length(source) BETWEEN 1 AND 80)
);

ALTER TABLE public.profile_entitlements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS profile_entitlements_no_browser_rows ON public.profile_entitlements;
CREATE POLICY profile_entitlements_no_browser_rows
  ON public.profile_entitlements
  FOR ALL
  USING (false)
  WITH CHECK (false);

REVOKE ALL ON TABLE public.profile_entitlements FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.profile_entitlements TO service_role;

CREATE INDEX IF NOT EXISTS profile_entitlements_key_idx
  ON public.profile_entitlements (entitlement_key, user_id);

-- Premium expression catalog entries are visible for safe try-on previews.
-- They are granted as a bundle by the service entitlement path below.
INSERT INTO public.shop_items (
  item_key, name, slot, cost, css_type, css_value, available_from, available_until,
  rarity, description, collection, stackable, access_tier, entitlement_key
) VALUES
(
  'bg_prism_atmosphere',
  'Prism Atmosphere',
  'profile_bg',
  0,
  'style',
  'background-color: #0b0b16; background-image: radial-gradient(circle at 18% 22%, rgba(110,231,249,0.42), transparent 38%), radial-gradient(circle at 82% 72%, rgba(249,168,212,0.35), transparent 42%), linear-gradient(135deg, #10102a, #17112b 54%, #0a1d2a); background-size: 140% 140%, 140% 140%, 100% 100%; background-position: 0% 0%, 100% 100%, 0% 0%;',
  NULL,
  NULL,
  'Mythic',
  'A calm prismatic atmosphere reserved for the Atelier expression pass.',
  'Atelier Expression',
  false,
  'premium',
  'atelier_plus'
),
(
  'name_prism_atelier',
  'Prism Atelier Name',
  'name_effect',
  0,
  'style',
  'color: transparent; background: linear-gradient(90deg, #6ee7f9, #c4b5fd, #f9a8d4); -webkit-background-clip: text; background-clip: text; text-shadow: 0 0 18px rgba(196,181,253,0.65);',
  NULL,
  NULL,
  'Mythic',
  'A restrained spectrum signature for players who want the name to carry the atmosphere.',
  'Atelier Expression',
  false,
  'premium',
  'atelier_plus'
)
ON CONFLICT (item_key) DO UPDATE SET
  name = EXCLUDED.name,
  slot = EXCLUDED.slot,
  cost = EXCLUDED.cost,
  css_type = EXCLUDED.css_type,
  css_value = EXCLUDED.css_value,
  available_from = EXCLUDED.available_from,
  available_until = EXCLUDED.available_until,
  rarity = EXCLUDED.rarity,
  description = EXCLUDED.description,
  collection = EXCLUDED.collection,
  stackable = EXCLUDED.stackable,
  access_tier = EXCLUDED.access_tier,
  entitlement_key = EXCLUDED.entitlement_key;

INSERT INTO public.meta (key, value)
VALUES ('shop_version', '2026-07-25T14:00:00Z')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

CREATE OR REPLACE FUNCTION public.get_my_profile_entitlements()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'entitlements', COALESCE(
      (
        SELECT jsonb_agg(entitlement_key ORDER BY entitlement_key)
        FROM public.profile_entitlements
        WHERE user_id = v_user_id
      ),
      '[]'::jsonb
    )
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.grant_profile_entitlement(
  p_user_id uuid,
  p_entitlement_key text,
  p_source text DEFAULT 'service'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_source text := NULLIF(trim(p_source), '');
BEGIN
  IF auth.role() <> 'service_role' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Service role required');
  END IF;

  IF p_user_id IS NULL OR p_entitlement_key IS NULL
     OR p_entitlement_key !~ '^[a-z0-9_]{1,80}$'
     OR v_source IS NULL OR length(v_source) > 80 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid entitlement grant');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.shop_items
    WHERE access_tier = 'premium'
      AND entitlement_key = p_entitlement_key
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unknown entitlement');
  END IF;

  INSERT INTO public.profile_entitlements (user_id, entitlement_key, source)
  VALUES (p_user_id, p_entitlement_key, v_source)
  ON CONFLICT (user_id, entitlement_key)
  DO UPDATE SET source = EXCLUDED.source, granted_at = now();

  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'entitlement_key', p_entitlement_key
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.get_my_profile_entitlements() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_profile_entitlements() TO authenticated;
REVOKE ALL ON FUNCTION public.grant_profile_entitlement(uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.grant_profile_entitlement(uuid, text, text) TO service_role;

-- Keep the existing atomic EP purchase semantics while making premium rows
-- explicit non-purchasable expression unlocks.
CREATE OR REPLACE FUNCTION public.purchase_item_impl(p_item_key text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid(); v_item_slot text; v_stackable boolean;
  v_access_tier text;
  item_cost bigint; user_ep_spent bigint; user_lifetime_ep bigint;
  user_staff_ep bigint; user_staff_spent bigint; user_balance bigint;
  staff_charge bigint; normal_charge bigint; v_is_staff boolean;
BEGIN
  IF v_user_id IS NULL THEN RETURN json_build_object('success', false, 'error', 'Not authenticated'); END IF;
  SELECT cost, slot, COALESCE(stackable, false), COALESCE(access_tier, 'earned')
  INTO item_cost, v_item_slot, v_stackable, v_access_tier
  FROM public.shop_items WHERE item_key = p_item_key
    AND (available_from IS NULL OR available_from <= public.game_utc_date())
    AND (available_until IS NULL OR available_until >= public.game_utc_date());
  IF item_cost IS NULL THEN RETURN json_build_object('success', false, 'error', 'Invalid item'); END IF;
  IF v_access_tier = 'premium' THEN
    RETURN json_build_object('success', false, 'error', 'Premium expression is unlocked through an entitlement.');
  END IF;
  IF item_cost <= 0 THEN RETURN json_build_object('success', false, 'error', 'This item cannot be purchased.'); END IF;
  IF v_item_slot = 'consumable' AND p_item_key <> 'reroll_shard' AND NOT v_stackable THEN
    RETURN json_build_object('success', false, 'error', 'Invalid item');
  END IF;

  SELECT COALESCE(ep_spent, 0), COALESCE(lifetime_ep, 0), COALESCE(staff_test_ep, 0),
    COALESCE(staff_test_ep_spent, 0), COALESCE(is_staff, false)
  INTO user_ep_spent, user_lifetime_ep, user_staff_ep, user_staff_spent, v_is_staff
  FROM public.profiles WHERE id = v_user_id FOR UPDATE;
  IF NOT FOUND THEN RETURN json_build_object('success', false, 'error', 'Profile not found'); END IF;

  user_balance := user_lifetime_ep - user_ep_spent
    + CASE WHEN v_is_staff THEN user_staff_ep - user_staff_spent ELSE 0 END;
  IF user_balance < item_cost THEN RETURN json_build_object('success', false, 'error', 'Not enough EP'); END IF;

  IF v_item_slot = 'consumable' THEN
    IF p_item_key = 'reroll_shard' THEN
      UPDATE public.profiles SET reroll_shards = COALESCE(reroll_shards, 0) + 1 WHERE id = v_user_id;
    ELSE
      INSERT INTO public.inventory (user_id, item_key, quantity) VALUES (v_user_id, p_item_key, 1)
      ON CONFLICT (user_id, item_key) DO UPDATE SET quantity = public.inventory.quantity + 1;
    END IF;
  ELSE
    IF EXISTS (SELECT 1 FROM public.inventory WHERE user_id = v_user_id AND item_key = p_item_key) THEN
      RETURN json_build_object('success', false, 'error', 'Already owned');
    END IF;
    INSERT INTO public.inventory (user_id, item_key, quantity) VALUES (v_user_id, p_item_key, 1);
  END IF;

  staff_charge := CASE WHEN v_is_staff
    THEN LEAST(item_cost, GREATEST(user_staff_ep - user_staff_spent, 0)) ELSE 0 END;
  normal_charge := item_cost - staff_charge;
  UPDATE public.profiles
  SET staff_test_ep_spent = COALESCE(staff_test_ep_spent, 0) + staff_charge,
      ep_spent = COALESCE(ep_spent, 0) + normal_charge
  WHERE id = v_user_id;
  RETURN json_build_object('success', true);
END;
$function$;

-- Existing earned cosmetics still require inventory ownership. Premium
-- expression items require the matching server-side entitlement instead.
CREATE OR REPLACE FUNCTION public.equip_item(p_item_key text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_current_cosmetics jsonb;
  v_slot text;
  v_access_tier text;
  v_entitlement_key text;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  PERFORM 1 FROM public.profiles WHERE id = v_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Profile not found');
  END IF;

  SELECT slot, COALESCE(access_tier, 'earned'), entitlement_key
  INTO v_slot, v_access_tier, v_entitlement_key
  FROM public.shop_items
  WHERE item_key = p_item_key;
  IF v_slot IS NULL
     OR v_slot = 'consumable'
     OR v_slot NOT IN ('name_effect', 'frame', 'profile_bg', 'roll_effect', 'lb_theme', 'title', 'orb_shape', 'profile_border') THEN
    RETURN json_build_object('success', false, 'error', 'Invalid item');
  END IF;

  IF v_access_tier = 'premium' THEN
    IF v_entitlement_key IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.profile_entitlements
      WHERE user_id = v_user_id AND entitlement_key = v_entitlement_key
    ) THEN
      RETURN json_build_object('success', false, 'error', 'Premium expression requires an entitlement');
    END IF;
  ELSIF v_access_tier <> 'free' AND NOT EXISTS (
    SELECT 1 FROM public.inventory
    WHERE user_id = v_user_id AND item_key = p_item_key
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Item not owned');
  END IF;

  SELECT COALESCE(equipped_cosmetics, '{}'::jsonb)
  INTO v_current_cosmetics
  FROM public.profiles
  WHERE id = v_user_id;

  v_current_cosmetics := v_current_cosmetics || jsonb_build_object(v_slot, p_item_key);
  UPDATE public.profiles
  SET equipped_cosmetics = v_current_cosmetics
  WHERE id = v_user_id;

  RETURN json_build_object('success', true, 'cosmetics', v_current_cosmetics);
END;
$function$;

REVOKE ALL ON FUNCTION public.get_my_profile_entitlements() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_profile_entitlements() TO authenticated;
REVOKE ALL ON FUNCTION public.purchase_item_impl(text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.purchase_item(text) TO anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.equip_item(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.equip_item(text) TO authenticated;

-- Account cleanup remains idempotent and now removes expression entitlements.
CREATE OR REPLACE FUNCTION public.delete_account_data(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
    'missing_profile', NOT v_profile_existed
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.delete_account_data(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_account_data(uuid) TO service_role;
