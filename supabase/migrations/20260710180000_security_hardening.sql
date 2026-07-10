-- Final pre-launch hardening for gameplay RPCs and public function execution.

-- The legacy no-argument overload predates the transactional wrapper and is
-- not used by the client. Remove it so it cannot bypass the guarded RPC.
DROP FUNCTION IF EXISTS public.roll_die();

CREATE OR REPLACE FUNCTION public.roll_die(p_is_reroll boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(hashtext(v_user_id::text), 9341);

    PERFORM 1
    FROM public.profiles
    WHERE id = v_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('success', false, 'error', 'Profile not found.');
    END IF;

    IF p_is_reroll AND NOT EXISTS (
      SELECT 1
      FROM public.scores
      WHERE user_id = v_user_id
        AND roll_date = CURRENT_DATE
    ) THEN
      RETURN jsonb_build_object('success', false, 'error', 'No daily roll is available to reroll.');
    END IF;
  END IF;

  RETURN public.roll_die_impl(p_is_reroll);
END;
$function$;

CREATE OR REPLACE FUNCTION public.toggle_follow(p_target_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_is_following boolean;
  v_follow_count integer;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  IF p_target_id IS NULL OR v_user_id = p_target_id THEN
    RETURN json_build_object('success', false, 'error', 'Cannot follow yourself');
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(v_user_id::text), 9342);

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_target_id) THEN
    RETURN json_build_object('success', false, 'error', 'Player not found');
  END IF;

  SELECT EXISTS(
    SELECT 1
    FROM public.user_follows
    WHERE follower_id = v_user_id
      AND followee_id = p_target_id
  ) INTO v_is_following;

  IF v_is_following THEN
    DELETE FROM public.user_follows
    WHERE follower_id = v_user_id
      AND followee_id = p_target_id;
    RETURN json_build_object('success', true, 'action', 'unfollowed');
  END IF;

  SELECT count(*) INTO v_follow_count
  FROM public.user_follows
  WHERE follower_id = v_user_id;

  IF v_follow_count >= 5 THEN
    RETURN json_build_object('success', false, 'error', 'Maximum of 5 rivals reached.');
  END IF;

  INSERT INTO public.user_follows (follower_id, followee_id)
  VALUES (v_user_id, p_target_id);

  RETURN json_build_object('success', true, 'action', 'followed');
END;
$function$;

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
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  PERFORM 1 FROM public.profiles WHERE id = v_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Profile not found');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.inventory
    WHERE user_id = v_user_id AND item_key = p_item_key
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Item not owned');
  END IF;

  SELECT slot INTO v_slot FROM public.shop_items WHERE item_key = p_item_key;
  IF v_slot IS NULL
     OR v_slot = 'consumable'
     OR v_slot NOT IN ('name_effect', 'frame', 'profile_bg', 'roll_effect', 'lb_theme', 'title', 'orb_shape', 'profile_border') THEN
    RETURN json_build_object('success', false, 'error', 'Invalid item');
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

CREATE OR REPLACE FUNCTION public.unequip_item(p_slot text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_current_cosmetics jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  IF p_slot IS NULL OR p_slot NOT IN ('name_effect', 'frame', 'profile_bg', 'roll_effect', 'lb_theme', 'title', 'orb_shape', 'profile_border') THEN
    RETURN json_build_object('success', false, 'error', 'Invalid slot');
  END IF;

  PERFORM 1 FROM public.profiles WHERE id = v_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Profile not found');
  END IF;

  SELECT COALESCE(equipped_cosmetics, '{}'::jsonb)
  INTO v_current_cosmetics
  FROM public.profiles
  WHERE id = v_user_id;

  v_current_cosmetics := v_current_cosmetics - p_slot;
  UPDATE public.profiles
  SET equipped_cosmetics = v_current_cosmetics
  WHERE id = v_user_id;

  RETURN json_build_object('success', true, 'cosmetics', v_current_cosmetics);
END;
$function$;

CREATE OR REPLACE FUNCTION public.equip_badges(p_badge_ids jsonb)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_badge text;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  IF p_badge_ids IS NULL OR jsonb_typeof(p_badge_ids) <> 'array' THEN
    RETURN json_build_object('success', false, 'error', 'Select up to 3 unique achievements.');
  END IF;

  IF jsonb_array_length(p_badge_ids) > 3 THEN
    RETURN json_build_object('success', false, 'error', 'Select up to 3 unique achievements.');
  END IF;

  IF (SELECT count(*) FROM jsonb_array_elements_text(p_badge_ids))
     <> (SELECT count(DISTINCT value) FROM jsonb_array_elements_text(p_badge_ids)) THEN
    RETURN json_build_object('success', false, 'error', 'Select up to 3 unique achievements.');
  END IF;

  PERFORM 1 FROM public.profiles WHERE id = v_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Profile not found');
  END IF;

  FOR v_badge IN SELECT value FROM jsonb_array_elements_text(p_badge_ids)
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM public.user_achievements
      WHERE user_id = v_user_id AND achievement_id = v_badge
    ) THEN
      RETURN json_build_object('success', false, 'error', 'You do not own all selected badges.');
    END IF;
  END LOOP;

  UPDATE public.profiles
  SET equipped_badges = p_badge_ids
  WHERE id = v_user_id;

  RETURN json_build_object('success', true, 'badges', p_badge_ids);
END;
$function$;

CREATE OR REPLACE FUNCTION public.purchase_item_impl(p_item_key text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_item_slot text;
  v_stackable boolean;
  item_cost bigint;
  user_ep_spent bigint;
  user_lifetime_ep bigint;
  user_balance bigint;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT cost, slot, COALESCE(stackable, false)
  INTO item_cost, v_item_slot, v_stackable
  FROM public.shop_items
  WHERE item_key = p_item_key
    AND (available_from IS NULL OR available_from <= CURRENT_DATE)
    AND (available_until IS NULL OR available_until >= CURRENT_DATE);

  IF item_cost IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invalid item');
  END IF;

  IF item_cost <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'This item cannot be purchased.');
  END IF;

  -- Only known consumables may be purchased as stackable utility items.
  IF v_item_slot = 'consumable'
     AND p_item_key <> 'reroll_shard'
     AND NOT v_stackable THEN
    RETURN json_build_object('success', false, 'error', 'Invalid item');
  END IF;

  SELECT COALESCE(ep_spent, 0), COALESCE(lifetime_ep, 0)
  INTO user_ep_spent, user_lifetime_ep
  FROM public.profiles
  WHERE id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Profile not found');
  END IF;

  user_balance := user_lifetime_ep - user_ep_spent;
  IF user_balance < item_cost THEN
    RETURN json_build_object('success', false, 'error', 'Not enough EP');
  END IF;

  IF v_item_slot = 'consumable' THEN
    IF p_item_key = 'reroll_shard' THEN
      UPDATE public.profiles
      SET reroll_shards = COALESCE(reroll_shards, 0) + 1
      WHERE id = v_user_id;
    ELSE
      INSERT INTO public.inventory (user_id, item_key, quantity)
      VALUES (v_user_id, p_item_key, 1)
      ON CONFLICT (user_id, item_key)
      DO UPDATE SET quantity = public.inventory.quantity + 1;
    END IF;
  ELSE
    IF EXISTS (
      SELECT 1
      FROM public.inventory
      WHERE user_id = v_user_id
        AND item_key = p_item_key
    ) THEN
      RETURN json_build_object('success', false, 'error', 'Already owned');
    END IF;

    INSERT INTO public.inventory (user_id, item_key, quantity)
    VALUES (v_user_id, p_item_key, 1);
  END IF;

  UPDATE public.profiles
  SET ep_spent = ep_spent + item_cost
  WHERE id = v_user_id;

  RETURN json_build_object('success', true);
END;
$function$;

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
  v_following_deleted integer := 0;
  v_followers_deleted integer := 0;
  v_achievements_deleted integer := 0;
  v_challenges_deleted integer := 0;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Missing user id');
  END IF;

  DELETE FROM public.challenges
  WHERE sender_user_id = p_user_id;
  GET DIAGNOSTICS v_challenges_deleted = ROW_COUNT;

  DELETE FROM public.user_follows
  WHERE follower_id = p_user_id;
  GET DIAGNOSTICS v_following_deleted = ROW_COUNT;

  DELETE FROM public.user_follows
  WHERE followee_id = p_user_id;
  GET DIAGNOSTICS v_followers_deleted = ROW_COUNT;

  DELETE FROM public.user_achievements
  WHERE user_id = p_user_id;
  GET DIAGNOSTICS v_achievements_deleted = ROW_COUNT;

  -- The inventory consume trigger decrements stackable rows on DELETE. Set
  -- quantities to one first so account deletion removes the rows entirely.
  UPDATE public.inventory
  SET quantity = 1
  WHERE user_id = p_user_id
    AND quantity > 1;

  DELETE FROM public.inventory
  WHERE user_id = p_user_id;
  GET DIAGNOSTICS v_inventory_deleted = ROW_COUNT;

  DELETE FROM public.scores
  WHERE user_id = p_user_id;
  GET DIAGNOSTICS v_scores_deleted = ROW_COUNT;

  DELETE FROM public.profiles
  WHERE id = p_user_id;
  GET DIAGNOSTICS v_profile_deleted = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'profile_deleted', v_profile_deleted > 0,
    'scores_deleted', v_scores_deleted,
    'inventory_deleted', v_inventory_deleted,
    'following_deleted', v_following_deleted,
    'followers_deleted', v_followers_deleted,
    'achievements_deleted', v_achievements_deleted,
    'challenges_deleted', v_challenges_deleted,
    'missing_profile', v_profile_deleted = 0
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_challenge(
  p_sender_user_id uuid,
  p_target_score bigint,
  p_target_hex text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_sender_username text;
  v_challenge public.challenges;
  v_recent_count integer;
BEGIN
  IF p_sender_user_id IS NULL
     OR p_target_score IS NULL
     OR p_target_score < 0
     OR p_target_hex IS NULL
     OR p_target_hex !~ '^#[0-9A-F]{6}$' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid challenge data');
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(p_sender_user_id::text), 9343);

  SELECT username
  INTO v_sender_username
  FROM public.profiles
  WHERE id = p_sender_user_id;

  IF NOT FOUND OR v_sender_username IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Profile unavailable');
  END IF;

  SELECT count(*)
  INTO v_recent_count
  FROM public.challenges
  WHERE sender_user_id = p_sender_user_id
    AND created_at >= now() - interval '1 hour';

  IF v_recent_count >= 30 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Challenge creation limit reached. Try again later.');
  END IF;

  INSERT INTO public.challenges (sender_user_id, sender_username, target_score, target_hex)
  VALUES (p_sender_user_id, v_sender_username, p_target_score, p_target_hex)
  RETURNING * INTO v_challenge;

  RETURN jsonb_build_object(
    'success', true,
    'challenge', jsonb_build_object(
      'id', v_challenge.id,
      'sender_username', v_challenge.sender_username,
      'target_score', v_challenge.target_score,
      'target_hex', v_challenge.target_hex,
      'created_at', v_challenge.created_at,
      'expires_at', v_challenge.expires_at
    )
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_profile json;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT json_build_object(
    'id', p.id,
    'username', p.username,
    'current_streak', p.current_streak,
    'longest_streak', p.longest_streak,
    'ep_spent', p.ep_spent,
    'lifetime_ep', p.lifetime_ep,
    'equipped_cosmetics', p.equipped_cosmetics,
    'reroll_shards', p.reroll_shards,
    'equipped_badges', p.equipped_badges,
    'mood_color', p.mood_color,
    'best_roll_score', p.best_roll_score,
    'best_roll_hex', p.best_roll_hex,
    'best_roll_rarity', p.best_roll_rarity
  )
  INTO v_profile
  FROM public.profiles p
  WHERE p.id = v_user_id;

  IF v_profile IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Profile not found');
  END IF;

  RETURN v_profile;
END;
$function$;

-- SECURITY DEFINER functions should never inherit PostgreSQL's default PUBLIC
-- EXECUTE privilege. Re-grant only the intended client RPC surface.
REVOKE ALL ON FUNCTION public.purchase_item(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.purchase_item_impl(text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.roll_die(boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.roll_die_impl(boolean) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.toggle_follow(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.equip_item(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.unequip_item(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.equip_badges(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_profile_meta(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_my_profile() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_wallet_balance() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_my_percentile() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_rivals_scores() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_score_percentile(bigint) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_challenge(uuid, bigint, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cleanup_expired_challenges() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.consume_inventory_quantity() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cleanup_old_scores() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_cotw() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_lifetime_ep() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_streak() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_prime(integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_bump_shop_version() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_randomize_cotw() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_trigger_cotw_test() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.roll_die(boolean) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_score_percentile(bigint) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purchase_item(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_follow(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.equip_item(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unequip_item(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.equip_badges(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_profile_meta(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_wallet_balance() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_percentile() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_rivals_scores() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_challenge(uuid, bigint, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_account_data(uuid) TO service_role;

ALTER FUNCTION public.get_score_percentile(bigint) SET search_path = public;
ALTER FUNCTION public.get_wallet_balance() SET search_path = public;
