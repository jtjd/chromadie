-- Staff-only test wallet.
-- Test EP is deliberately separate from lifetime_ep so cosmetic testing does
-- not affect progression, ranks, roll scores, or leaderboard integrity.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_staff boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS staff_test_ep bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS staff_test_ep_spent bigint NOT NULL DEFAULT 0;

-- Existing administrators should also receive the public Staff designation.
UPDATE public.profiles
SET is_staff = true
WHERE is_admin = true;

-- is_staff is intentionally public; the test wallet columns remain private.
GRANT SELECT (is_staff) ON public.profiles TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_wallet_balance()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_balance bigint;
BEGIN
  IF v_user_id IS NULL THEN RETURN 0; END IF;

  SELECT COALESCE(lifetime_ep, 0) - COALESCE(ep_spent, 0)
    + CASE WHEN is_staff
        THEN COALESCE(staff_test_ep, 0) - COALESCE(staff_test_ep_spent, 0)
        ELSE 0
      END
  INTO v_balance
  FROM public.profiles
  WHERE id = v_user_id;

  RETURN GREATEST(COALESCE(v_balance, 0), 0);
END;
$$;

-- Staff test EP is granted by an administrator and can only be granted to a
-- profile explicitly marked as staff.
CREATE OR REPLACE FUNCTION public.grant_staff_test_ep(p_user_id uuid, p_amount bigint)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_is_admin boolean;
  v_new_balance bigint;
BEGIN
  SELECT COALESCE(is_admin, false) INTO v_is_admin
  FROM public.profiles WHERE id = auth.uid();

  IF NOT v_is_admin THEN
    RETURN jsonb_build_object('success', false, 'error', 'Administrator access required.');
  END IF;
  IF p_user_id IS NULL OR p_amount IS NULL OR p_amount <= 0 OR p_amount > 1000000000000 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Amount must be between 1 and 1,000,000,000,000.');
  END IF;

  UPDATE public.profiles
  SET staff_test_ep = COALESCE(staff_test_ep, 0) + p_amount
  WHERE id = p_user_id AND is_staff = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Staff profile not found.');
  END IF;

  SELECT COALESCE(staff_test_ep, 0) - COALESCE(staff_test_ep_spent, 0)
  INTO v_new_balance FROM public.profiles WHERE id = p_user_id;

  RETURN jsonb_build_object('success', true, 'user_id', p_user_id, 'test_wallet_balance', v_new_balance);
END;
$$;

CREATE OR REPLACE FUNCTION public.set_staff_status(p_user_id uuid, p_is_staff boolean)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_is_admin boolean;
BEGIN
  SELECT COALESCE(is_admin, false) INTO v_is_admin
  FROM public.profiles WHERE id = auth.uid();
  IF NOT v_is_admin THEN
    RETURN jsonb_build_object('success', false, 'error', 'Administrator access required.');
  END IF;

  UPDATE public.profiles SET is_staff = COALESCE(p_is_staff, false)
  WHERE id = p_user_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Profile not found.');
  END IF;

  RETURN jsonb_build_object('success', true, 'user_id', p_user_id, 'is_staff', p_is_staff);
END;
$$;

REVOKE ALL ON FUNCTION public.grant_staff_test_ep(uuid, bigint) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_staff_status(uuid, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.grant_staff_test_ep(uuid, bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_staff_status(uuid, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_user_id uuid := auth.uid(); v_profile json;
BEGIN
  IF v_user_id IS NULL THEN RETURN json_build_object('success', false, 'error', 'Not authenticated'); END IF;
  SELECT json_build_object(
    'id', p.id, 'username', p.username, 'current_streak', p.current_streak,
    'longest_streak', p.longest_streak, 'ep_spent', p.ep_spent,
    'lifetime_ep', p.lifetime_ep, 'is_staff', p.is_staff,
    'equipped_cosmetics', p.equipped_cosmetics, 'reroll_shards', p.reroll_shards,
    'equipped_badges', p.equipped_badges, 'mood_color', p.mood_color,
    'best_roll_score', p.best_roll_score, 'best_roll_hex', p.best_roll_hex,
    'best_roll_rarity', p.best_roll_rarity
  ) INTO v_profile FROM public.profiles p WHERE p.id = v_user_id;
  IF v_profile IS NULL THEN RETURN json_build_object('success', false, 'error', 'Profile not found'); END IF;
  RETURN v_profile;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;

-- Purchases consume staff test EP first, then normal wallet EP. This keeps
-- every cosmetic purchase working through the same atomic purchase path.
CREATE OR REPLACE FUNCTION public.purchase_item_impl(p_item_key text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid(); v_item_slot text; v_stackable boolean;
  item_cost bigint; user_ep_spent bigint; user_lifetime_ep bigint;
  user_staff_ep bigint; user_staff_spent bigint; user_balance bigint;
  staff_charge bigint; normal_charge bigint; v_is_staff boolean;
BEGIN
  IF v_user_id IS NULL THEN RETURN json_build_object('success', false, 'error', 'Not authenticated'); END IF;
  SELECT cost, slot, COALESCE(stackable, false) INTO item_cost, v_item_slot, v_stackable
  FROM public.shop_items WHERE item_key = p_item_key
    AND (available_from IS NULL OR available_from <= CURRENT_DATE)
    AND (available_until IS NULL OR available_until >= CURRENT_DATE);
  IF item_cost IS NULL THEN RETURN json_build_object('success', false, 'error', 'Invalid item'); END IF;
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
    + CASE WHEN v_is_staff
        THEN user_staff_ep - user_staff_spent ELSE 0 END;
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
    THEN LEAST(item_cost, GREATEST(user_staff_ep - user_staff_spent, 0))
    ELSE 0 END;
  normal_charge := item_cost - staff_charge;
  UPDATE public.profiles
  SET staff_test_ep_spent = COALESCE(staff_test_ep_spent, 0) + staff_charge,
      ep_spent = COALESCE(ep_spent, 0) + normal_charge
  WHERE id = v_user_id;
  RETURN json_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.purchase_item_impl(text) FROM PUBLIC, anon, authenticated, service_role;

DROP VIEW IF EXISTS public.leaderboard_view;
DROP VIEW IF EXISTS public.weekly_best_leaderboard_view;
DROP VIEW IF EXISTS public.monthly_best_leaderboard_view;
DROP VIEW IF EXISTS public.all_time_leaderboard_view;

CREATE VIEW public.leaderboard_view
WITH (security_invoker = true) AS
SELECT s.user_id, s.hex_code, s.score, s.rarity, s.roll_date, p.username,
  p.current_streak, p.equipped_cosmetics, p.equipped_badges, p.is_staff
FROM public.scores s JOIN public.profiles p ON p.id = s.user_id;

CREATE VIEW public.weekly_best_leaderboard_view
WITH (security_invoker = true) AS
SELECT DISTINCT ON (s.user_id) s.user_id, s.hex_code, s.score, s.rarity, s.roll_date,
  p.username, p.current_streak, p.equipped_cosmetics, p.equipped_badges, p.is_staff
FROM public.scores s JOIN public.profiles p ON p.id = s.user_id
WHERE s.roll_date >= date_trunc('week', CURRENT_DATE::timestamp)::date
ORDER BY s.user_id, s.score DESC, s.roll_date DESC, s.created_at DESC;

CREATE VIEW public.monthly_best_leaderboard_view
WITH (security_invoker = true) AS
SELECT DISTINCT ON (s.user_id) s.user_id, s.hex_code, s.score, s.rarity, s.roll_date,
  p.username, p.current_streak, p.equipped_cosmetics, p.equipped_badges, p.is_staff
FROM public.scores s JOIN public.profiles p ON p.id = s.user_id
WHERE s.roll_date >= date_trunc('month', CURRENT_DATE::timestamp)::date
ORDER BY s.user_id, s.score DESC, s.roll_date DESC, s.created_at DESC;

CREATE VIEW public.all_time_leaderboard_view
WITH (security_invoker = true) AS
SELECT DISTINCT ON (s.user_id) s.user_id, p.username, p.current_streak,
  p.equipped_cosmetics, p.equipped_badges, s.score, s.hex_code, s.rarity,
  s.roll_date, p.is_staff
FROM public.scores s JOIN public.profiles p ON p.id = s.user_id
ORDER BY s.user_id, s.score DESC, s.roll_date DESC, s.created_at DESC;

ALTER VIEW public.leaderboard_view OWNER TO postgres;
ALTER VIEW public.weekly_best_leaderboard_view OWNER TO postgres;
ALTER VIEW public.monthly_best_leaderboard_view OWNER TO postgres;
ALTER VIEW public.all_time_leaderboard_view OWNER TO postgres;
GRANT SELECT ON public.leaderboard_view, public.weekly_best_leaderboard_view,
  public.monthly_best_leaderboard_view, public.all_time_leaderboard_view
TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_rivals_scores()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN RETURN '[]'::json; END IF;
  RETURN COALESCE((
    SELECT json_agg(ranked.row_data ORDER BY ranked.score DESC)
    FROM (
      SELECT s.score, json_build_object(
        'user_id', s.user_id, 'hex_code', s.hex_code, 'score', s.score,
        'rarity', s.rarity, 'username', p.username, 'current_streak', p.current_streak,
        'equipped_cosmetics', p.equipped_cosmetics, 'is_staff', p.is_staff
      ) AS row_data
      FROM public.scores s JOIN public.profiles p ON s.user_id = p.id
      WHERE s.roll_date = CURRENT_DATE
        AND s.user_id IN (SELECT followee_id FROM public.user_follows WHERE follower_id = v_user_id)
    ) ranked
  ), '[]'::json);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_rivals_scores() TO authenticated;
