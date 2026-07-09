-- Make profile hydration resilient when a signed-in auth user exists but the
-- corresponding profiles row is missing.

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
AS $$
DECLARE
  v_requested_username text := nullif(trim(coalesce(new.raw_user_meta_data->>'username', '')), '');
  v_username text := coalesce(v_requested_username, 'player_' || substr(replace(new.id::text, '-', ''), 1, 8));
BEGIN
  IF lower(v_username) IN ('guest', 'anon', 'anonymous') THEN
    v_username := 'player_' || substr(replace(new.id::text, '-', ''), 1, 8);
  END IF;

  INSERT INTO public.profiles (id, username)
  VALUES (new.id, v_username);
  RETURN new;
EXCEPTION
  WHEN unique_violation THEN
    INSERT INTO public.profiles (id, username)
    VALUES (new.id, 'player_' || substr(replace(new.id::text, '-', ''), 1, 8))
    ON CONFLICT (id) DO NOTHING;
    RETURN new;
END;
$$;

DROP FUNCTION IF EXISTS public.get_my_profile();

CREATE OR REPLACE FUNCTION public.get_my_profile() RETURNS json
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_requested_username text := nullif(trim(coalesce(auth.jwt() ->> 'username', '')), '');
  v_username text := coalesce(v_requested_username, 'player_' || substr(replace(v_user_id::text, '-', ''), 1, 8));
  v_profile json;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  IF lower(v_username) IN ('guest', 'anon', 'anonymous') THEN
    v_username := 'player_' || substr(replace(v_user_id::text, '-', ''), 1, 8);
  END IF;

  INSERT INTO public.profiles (id, username)
  VALUES (v_user_id, v_username)
  ON CONFLICT (id) DO NOTHING;

  BEGIN
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
    FROM profiles p
    WHERE p.id = v_user_id;
  EXCEPTION
    WHEN unique_violation THEN
      INSERT INTO public.profiles (id, username)
      VALUES (v_user_id, 'player_' || substr(replace(v_user_id::text, '-', ''), 1, 8))
      ON CONFLICT (id) DO NOTHING;

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
      FROM profiles p
      WHERE p.id = v_user_id;
  END;

  IF v_profile IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Profile not found');
  END IF;

  RETURN v_profile;
END;
$$;

GRANT ALL ON FUNCTION public.get_my_profile() TO anon;
GRANT ALL ON FUNCTION public.get_my_profile() TO authenticated;
GRANT ALL ON FUNCTION public.get_my_profile() TO service_role;
