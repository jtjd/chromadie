-- Keep the authenticated profile bootstrap aligned with the public identity
-- contract. Profile Studio hydrates its initial identity from get_my_profile;
-- omitting bio here made an existing bio look empty and allowed a later
-- publish to replace it with NULL.

BEGIN;

CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_requested_username text;
  v_candidate text;
  v_profile json;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT json_build_object(
      'id', p.id,
      'username', p.username,
      'display_name', p.display_name,
      'bio', p.bio,
      'current_streak', p.current_streak,
      'longest_streak', p.longest_streak,
      'ep_spent', p.ep_spent,
      'lifetime_ep', p.lifetime_ep,
      'total_rolls', p.total_rolls,
      'is_staff', p.is_staff,
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

  IF v_profile IS NOT NULL THEN
    RETURN v_profile;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(v_user_id::text), 9341);

  SELECT json_build_object(
      'id', p.id,
      'username', p.username,
      'display_name', p.display_name,
      'bio', p.bio,
      'current_streak', p.current_streak,
      'longest_streak', p.longest_streak,
      'ep_spent', p.ep_spent,
      'lifetime_ep', p.lifetime_ep,
      'total_rolls', p.total_rolls,
      'is_staff', p.is_staff,
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

  IF v_profile IS NOT NULL THEN
    RETURN v_profile;
  END IF;

  SELECT nullif(btrim(u.raw_user_meta_data->>'username'), '')
  INTO v_requested_username
  FROM auth.users u
  WHERE u.id = v_user_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Account not found');
  END IF;

  v_candidate := CASE
    WHEN v_requested_username ~ '^[A-Za-z0-9_]{1,20}$'
      AND public.is_username_allowed(v_requested_username)
      AND (
        NOT public.is_username_reserved(v_requested_username)
        OR EXISTS (
          SELECT 1
          FROM public.reserved_usernames reserved
          WHERE reserved.enabled
            AND reserved.username_key = public.normalize_username_key(v_requested_username)
            AND reserved.grandfathered_profile_id = v_user_id
        )
      )
    THEN v_requested_username
    ELSE 'player_' || substr(replace(v_user_id::text, '-', ''), 1, 13)
  END;

  INSERT INTO public.profiles (id, username)
  VALUES (v_user_id, v_candidate)
  ON CONFLICT DO NOTHING;

  IF NOT FOUND THEN
    FOR v_attempt IN 1..5 LOOP
      v_candidate := 'p_' || encode(extensions.gen_random_bytes(9), 'hex');
      INSERT INTO public.profiles (id, username)
      VALUES (v_user_id, v_candidate)
      ON CONFLICT DO NOTHING;
      EXIT WHEN FOUND;
    END LOOP;
  END IF;

  SELECT json_build_object(
      'id', p.id,
      'username', p.username,
      'display_name', p.display_name,
      'bio', p.bio,
      'current_streak', p.current_streak,
      'longest_streak', p.longest_streak,
      'ep_spent', p.ep_spent,
      'lifetime_ep', p.lifetime_ep,
      'total_rolls', p.total_rolls,
      'is_staff', p.is_staff,
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

  RETURN COALESCE(v_profile, json_build_object('success', false, 'error', 'Profile recovery failed'));
END;
$$;

COMMENT ON FUNCTION public.get_my_profile() IS
  'Authenticated owner profile projection and missing-profile recovery, including the public identity fields used by Profile Studio.';

REVOKE ALL ON FUNCTION public.get_my_profile() FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;

COMMIT;
