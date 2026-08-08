-- Dashboard Parity Milestone 1A: broaden the authoritative username shape to
-- one through twenty ASCII letters, digits, or underscores. Existing names,
-- uniqueness, moderation, reservations, grants, and RLS remain unchanged.

BEGIN;

ALTER TABLE public.profiles
  DROP CONSTRAINT profiles_username_format_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_username_format_check
  CHECK (username ~ '^[A-Za-z0-9_]{1,20}$');

ALTER TABLE public.challenges
  DROP CONSTRAINT challenges_sender_username_check;
ALTER TABLE public.challenges
  ADD CONSTRAINT challenges_sender_username_check
  CHECK (sender_username IS NULL OR sender_username ~ '^[A-Za-z0-9_]{1,20}$');

ALTER TABLE public.reserved_usernames
  DROP CONSTRAINT reserved_usernames_key_check;
ALTER TABLE public.reserved_usernames
  ADD CONSTRAINT reserved_usernames_key_check CHECK (
    username_key = lower(btrim(username_key))
    AND username_key ~ '^[a-z0-9_]{1,20}$'
  );

-- These Pages route segments were impossible usernames under the old minimum.
-- Reserve them before a one- or two-character profile can be created.
INSERT INTO public.reserved_usernames (username_key, category, reason, release_policy)
VALUES
  ('c', 'route', 'Hard-reserved identity.', 'never'),
  ('og', 'route', 'Hard-reserved identity.', 'never'),
  ('u', 'route', 'Hard-reserved identity.', 'never')
ON CONFLICT (username_key) DO UPDATE
SET category = EXCLUDED.category,
    reason = EXCLUDED.reason,
    release_policy = EXCLUDED.release_policy,
    enabled = true;

CREATE OR REPLACE FUNCTION public.is_username_reserved(p_username text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH normalized AS (
    SELECT public.normalize_username_key(p_username) AS username_key
  )
  SELECT COALESCE(
    normalized.username_key ~ '^[a-z0-9_]{1,20}$'
      AND EXISTS (
        SELECT 1
        FROM public.reserved_usernames reserved
        WHERE reserved.enabled
          AND reserved.username_key = normalized.username_key
      ),
    false
  )
  FROM normalized;
$$;

CREATE OR REPLACE FUNCTION public.is_username_available(p_username text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_username text := nullif(btrim(p_username), '');
  v_key text := public.normalize_username_key(v_username);
BEGIN
  IF v_username IS NULL OR v_key !~ '^[a-z0-9_]{1,20}$' THEN
    RETURN false;
  END IF;

  IF NOT public.is_username_allowed(v_username)
     OR public.is_username_reserved(v_username) THEN
    RETURN false;
  END IF;

  RETURN NOT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.username_key = v_key
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_username_policy()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_username text := nullif(btrim(NEW.username), '');
  v_key text;
  v_reserved public.reserved_usernames%ROWTYPE;
  v_is_reserved boolean := false;
  v_grandfathered boolean := false;
BEGIN
  IF v_username IS NULL OR v_username !~ '^[A-Za-z0-9_]{1,20}$' THEN
    RAISE EXCEPTION 'Username is not available.' USING ERRCODE = 'check_violation';
  END IF;

  NEW.username := v_username;
  v_key := public.normalize_username_key(v_username);

  IF NOT public.is_username_allowed(v_username) THEN
    RAISE EXCEPTION 'Username is not available.' USING ERRCODE = 'check_violation';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.reserved_usernames reserved
    WHERE reserved.enabled AND reserved.username_key = v_key
  )
  INTO v_is_reserved;

  IF v_is_reserved THEN
    SELECT reserved.*
    INTO v_reserved
    FROM public.reserved_usernames reserved
    WHERE reserved.enabled AND reserved.username_key = v_key;

    v_grandfathered := COALESCE(v_reserved.grandfathered_profile_id = NEW.id, false);

    IF NOT v_grandfathered THEN
      RAISE EXCEPTION 'Username is not available.' USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- A requested username remains authoritative during signup. The advisory lock
-- and unique username_key index preserve case-insensitive first-claim races.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_requested_username text := nullif(btrim(new.raw_user_meta_data->>'username'), '');
  v_fallback_username text := 'player_' || substr(replace(new.id::text, '-', ''), 1, 13);
  v_existing_id uuid;
  v_existing_pending boolean;
  v_candidate text;
  v_key text;
BEGIN
  IF v_requested_username IS NOT NULL THEN
    v_key := public.normalize_username_key(v_requested_username);

    IF v_key !~ '^[a-z0-9_]{1,20}$'
       OR NOT public.is_username_allowed(v_requested_username)
       OR public.is_username_reserved(v_requested_username) THEN
      RAISE EXCEPTION 'Username is not available.' USING ERRCODE = 'check_violation';
    END IF;

    PERFORM pg_advisory_xact_lock(hashtext(v_key), 9343);

    SELECT p.id, u.email_confirmed_at IS NULL
    INTO v_existing_id, v_existing_pending
    FROM public.profiles p
    JOIN auth.users u ON u.id = p.id
    WHERE p.username_key = v_key
      AND p.id <> new.id
    FOR UPDATE OF p, u;

    IF v_existing_id IS NOT NULL THEN
      IF NOT v_existing_pending THEN
        RAISE EXCEPTION 'Username is not available.' USING ERRCODE = 'check_violation';
      END IF;

      UPDATE public.profiles
      SET username = 'player_' || substr(replace(v_existing_id::text, '-', ''), 1, 13)
      WHERE id = v_existing_id;
    END IF;

    BEGIN
      INSERT INTO public.profiles (id, username)
      VALUES (new.id, v_requested_username);
    EXCEPTION
      WHEN unique_violation THEN
        RAISE EXCEPTION 'Username is not available.' USING ERRCODE = 'check_violation';
    END;

    RETURN new;
  END IF;

  FOR v_attempt IN 1..5 LOOP
    v_candidate := CASE
      WHEN v_attempt = 1 THEN v_fallback_username
      ELSE 'p_' || encode(extensions.gen_random_bytes(9), 'hex')
    END;

    BEGIN
      INSERT INTO public.profiles (id, username)
      VALUES (new.id, v_candidate);
      RETURN new;
    EXCEPTION
      WHEN unique_violation THEN NULL;
    END;
  END LOOP;

  RAISE EXCEPTION 'Unable to create a profile.' USING ERRCODE = 'check_violation';
END;
$$;

-- Missing-profile recovery accepts the broadened shape but keeps the same
-- moderated/reserved checks and deterministic safe fallback behavior.
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

CREATE OR REPLACE FUNCTION public.get_public_profile_identity(p_username text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT public.public_profile_identity_projection(p.id)
  FROM public.profiles p
  WHERE btrim(p_username) ~ '^[A-Za-z0-9_]{1,20}$'
    AND p.username_key = lower(btrim(p_username))
  LIMIT 1;
$function$;

-- Reassert the established least-privilege grants after replacing functions.
REVOKE ALL ON FUNCTION public.is_username_reserved(text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_username_reserved(text) TO anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.is_username_available(text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_username_available(text) TO anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.enforce_username_policy() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_my_profile() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;
REVOKE ALL ON FUNCTION public.get_public_profile_identity(text) FROM PUBLIC, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_public_profile_identity(text) TO anon, authenticated;

COMMIT;
