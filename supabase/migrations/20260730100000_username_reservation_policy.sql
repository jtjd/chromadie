-- Phase 13.1: exact username reservations and database-authoritative policy.
-- Existing confirmed staff identity Admin is grandfathered without changing its URL.

BEGIN;

ALTER TABLE public.username_blocklist ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.username_blocklist FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.username_blocklist TO service_role;

CREATE TABLE IF NOT EXISTS public.reserved_usernames (
  username_key text PRIMARY KEY,
  category text NOT NULL,
  reason text NOT NULL,
  release_policy text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  grandfathered_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT reserved_usernames_key_check CHECK (
    username_key = lower(btrim(username_key))
    AND username_key ~ '^[a-z0-9_]{3,20}$'
  ),
  CONSTRAINT reserved_usernames_category_check CHECK (
    category IN ('route', 'brand', 'official', 'trust', 'system', 'protected')
  ),
  CONSTRAINT reserved_usernames_release_policy_check CHECK (
    release_policy IN ('never', 'manual')
  )
);

COMMENT ON TABLE public.reserved_usernames IS
  'Exact normalized username reservations. This policy blocks new ownership without exposing policy rows to browser roles.';
COMMENT ON COLUMN public.reserved_usernames.grandfathered_profile_id IS
  'Existing approved owner retained during a reservation cutover; it cannot be claimed by another profile.';

ALTER TABLE public.reserved_usernames ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.reserved_usernames FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.reserved_usernames TO service_role;

INSERT INTO public.reserved_usernames (username_key, category, reason, release_policy)
VALUES
  ('account', 'route', 'Hard-reserved identity.', 'never'),
  ('accounts', 'route', 'Hard-reserved identity.', 'never'),
  ('admin', 'protected', 'Hard-reserved identity.', 'never'),
  ('administrator', 'protected', 'Hard-reserved identity.', 'never'),
  ('api', 'route', 'Hard-reserved identity.', 'never'),
  ('assets', 'route', 'Hard-reserved identity.', 'never'),
  ('auth', 'route', 'Hard-reserved identity.', 'never'),
  ('callback', 'route', 'Hard-reserved identity.', 'never'),
  ('challenge', 'route', 'Hard-reserved identity.', 'never'),
  ('challenges', 'route', 'Hard-reserved identity.', 'never'),
  ('changelog', 'route', 'Hard-reserved identity.', 'never'),
  ('discover', 'route', 'Hard-reserved identity.', 'never'),
  ('docs', 'route', 'Hard-reserved identity.', 'never'),
  ('documentation', 'route', 'Hard-reserved identity.', 'never'),
  ('edit', 'route', 'Hard-reserved identity.', 'never'),
  ('explore', 'route', 'Hard-reserved identity.', 'never'),
  ('faq', 'route', 'Hard-reserved identity.', 'never'),
  ('featured', 'route', 'Hard-reserved identity.', 'never'),
  ('help', 'route', 'Hard-reserved identity.', 'never'),
  ('home', 'route', 'Hard-reserved identity.', 'never'),
  ('howtoplay', 'route', 'Hard-reserved identity.', 'never'),
  ('leaderboard', 'route', 'Hard-reserved identity.', 'never'),
  ('legal', 'route', 'Hard-reserved identity.', 'never'),
  ('login', 'route', 'Hard-reserved identity.', 'never'),
  ('logout', 'route', 'Hard-reserved identity.', 'never'),
  ('notifications', 'route', 'Hard-reserved identity.', 'never'),
  ('oauth', 'route', 'Hard-reserved identity.', 'never'),
  ('password', 'route', 'Hard-reserved identity.', 'never'),
  ('privacy', 'route', 'Hard-reserved identity.', 'never'),
  ('profile', 'route', 'Hard-reserved identity.', 'never'),
  ('profiles', 'route', 'Hard-reserved identity.', 'never'),
  ('prototype', 'route', 'Hard-reserved identity.', 'never'),
  ('random', 'route', 'Hard-reserved identity.', 'never'),
  ('rankings', 'route', 'Hard-reserved identity.', 'never'),
  ('recent', 'route', 'Hard-reserved identity.', 'never'),
  ('register', 'route', 'Hard-reserved identity.', 'never'),
  ('resetpassword', 'route', 'Hard-reserved identity.', 'never'),
  ('rising', 'route', 'Hard-reserved identity.', 'never'),
  ('robots', 'route', 'Hard-reserved identity.', 'never'),
  ('roll', 'route', 'Hard-reserved identity.', 'never'),
  ('search', 'route', 'Hard-reserved identity.', 'never'),
  ('settings', 'route', 'Hard-reserved identity.', 'never'),
  ('shop', 'route', 'Hard-reserved identity.', 'never'),
  ('signup', 'route', 'Hard-reserved identity.', 'never'),
  ('sitemap', 'route', 'Hard-reserved identity.', 'never'),
  ('status', 'route', 'Hard-reserved identity.', 'never'),
  ('store', 'route', 'Hard-reserved identity.', 'never'),
  ('studio', 'route', 'Hard-reserved identity.', 'never'),
  ('support', 'route', 'Hard-reserved identity.', 'never'),
  ('terms', 'route', 'Hard-reserved identity.', 'never'),
  ('trending', 'route', 'Hard-reserved identity.', 'never'),
  ('verify', 'route', 'Hard-reserved identity.', 'never'),
  ('verification', 'route', 'Hard-reserved identity.', 'never'),
  ('webhook', 'route', 'Hard-reserved identity.', 'never'),
  ('webhooks', 'route', 'Hard-reserved identity.', 'never'),
  ('chm', 'brand', 'Hard-reserved identity.', 'never'),
  ('chmlol', 'brand', 'Hard-reserved identity.', 'never'),
  ('chromadie', 'brand', 'Hard-reserved identity.', 'never'),
  ('chromadielol', 'brand', 'Hard-reserved identity.', 'never'),
  ('official', 'brand', 'Hard-reserved identity.', 'never'),
  ('officialchm', 'brand', 'Hard-reserved identity.', 'never'),
  ('officialchromadie', 'brand', 'Hard-reserved identity.', 'never'),
  ('chmofficial', 'brand', 'Hard-reserved identity.', 'never'),
  ('chromadieofficial', 'brand', 'Hard-reserved identity.', 'never'),
  ('chm_official', 'brand', 'Hard-reserved identity.', 'never'),
  ('chromadie_official', 'brand', 'Hard-reserved identity.', 'never'),
  ('team', 'official', 'Hard-reserved identity.', 'never'),
  ('chmteam', 'official', 'Hard-reserved identity.', 'never'),
  ('chromadieteam', 'official', 'Hard-reserved identity.', 'never'),
  ('chm_team', 'official', 'Hard-reserved identity.', 'never'),
  ('chromadie_team', 'official', 'Hard-reserved identity.', 'never'),
  ('staff', 'official', 'Hard-reserved identity.', 'never'),
  ('chmstaff', 'official', 'Hard-reserved identity.', 'never'),
  ('chromadiestaff', 'official', 'Hard-reserved identity.', 'never'),
  ('chm_staff', 'official', 'Hard-reserved identity.', 'never'),
  ('chromadie_staff', 'official', 'Hard-reserved identity.', 'never'),
  ('founder', 'official', 'Hard-reserved identity.', 'never'),
  ('founders', 'official', 'Hard-reserved identity.', 'never'),
  ('chmfounder', 'official', 'Hard-reserved identity.', 'never'),
  ('chromadiefounder', 'official', 'Hard-reserved identity.', 'never'),
  ('chm_founder', 'official', 'Hard-reserved identity.', 'never'),
  ('chromadie_founder', 'official', 'Hard-reserved identity.', 'never'),
  ('owner', 'official', 'Hard-reserved identity.', 'never'),
  ('owners', 'official', 'Hard-reserved identity.', 'never'),
  ('dev', 'official', 'Hard-reserved identity.', 'never'),
  ('developer', 'official', 'Hard-reserved identity.', 'never'),
  ('developers', 'official', 'Hard-reserved identity.', 'never'),
  ('chmdev', 'official', 'Hard-reserved identity.', 'never'),
  ('chromadiedev', 'official', 'Hard-reserved identity.', 'never'),
  ('chm_dev', 'official', 'Hard-reserved identity.', 'never'),
  ('chromadie_dev', 'official', 'Hard-reserved identity.', 'never'),
  ('abuse', 'trust', 'Hard-reserved identity.', 'never'),
  ('safety', 'trust', 'Hard-reserved identity.', 'never'),
  ('security', 'trust', 'Hard-reserved identity.', 'never'),
  ('trust', 'trust', 'Hard-reserved identity.', 'never'),
  ('trustandsafety', 'trust', 'Hard-reserved identity.', 'never'),
  ('moderation', 'trust', 'Hard-reserved identity.', 'never'),
  ('moderator', 'trust', 'Hard-reserved identity.', 'never'),
  ('moderators', 'trust', 'Hard-reserved identity.', 'never'),
  ('mod', 'trust', 'Hard-reserved identity.', 'never'),
  ('mods', 'trust', 'Hard-reserved identity.', 'never'),
  ('compliance', 'trust', 'Hard-reserved identity.', 'never'),
  ('helpdesk', 'trust', 'Hard-reserved identity.', 'never'),
  ('customersupport', 'trust', 'Hard-reserved identity.', 'never'),
  ('customer_support', 'trust', 'Hard-reserved identity.', 'never'),
  ('chmsupport', 'trust', 'Hard-reserved identity.', 'never'),
  ('chromadiesupport', 'trust', 'Hard-reserved identity.', 'never'),
  ('chm_support', 'trust', 'Hard-reserved identity.', 'never'),
  ('chromadie_support', 'trust', 'Hard-reserved identity.', 'never'),
  ('system', 'system', 'Hard-reserved identity.', 'never'),
  ('service', 'system', 'Hard-reserved identity.', 'never'),
  ('services', 'system', 'Hard-reserved identity.', 'never'),
  ('bot', 'system', 'Hard-reserved identity.', 'never'),
  ('bots', 'system', 'Hard-reserved identity.', 'never'),
  ('automation', 'system', 'Hard-reserved identity.', 'never'),
  ('webmaster', 'system', 'Hard-reserved identity.', 'never'),
  ('postmaster', 'system', 'Hard-reserved identity.', 'never'),
  ('hostmaster', 'system', 'Hard-reserved identity.', 'never'),
  ('sysadmin', 'system', 'Hard-reserved identity.', 'never'),
  ('root', 'system', 'Hard-reserved identity.', 'never'),
  ('database', 'system', 'Hard-reserved identity.', 'never'),
  ('dbadmin', 'system', 'Hard-reserved identity.', 'never'),
  ('mail', 'system', 'Hard-reserved identity.', 'never'),
  ('email', 'system', 'Hard-reserved identity.', 'never'),
  ('noreply', 'system', 'Hard-reserved identity.', 'never'),
  ('no_reply', 'system', 'Hard-reserved identity.', 'never'),
  ('announcement', 'system', 'Hard-reserved identity.', 'never'),
  ('announcements', 'system', 'Hard-reserved identity.', 'never'),
  ('guest', 'protected', 'Hard-reserved identity.', 'never'),
  ('anon', 'protected', 'Hard-reserved identity.', 'never'),
  ('anonymous', 'protected', 'Hard-reserved identity.', 'never'),
  ('about', 'protected', 'Protected identity held for manual release.', 'manual'),
  ('blog', 'protected', 'Protected identity held for manual release.', 'manual'),
  ('careers', 'protected', 'Protected identity held for manual release.', 'manual'),
  ('jobs', 'protected', 'Protected identity held for manual release.', 'manual'),
  ('contact', 'protected', 'Protected identity held for manual release.', 'manual'),
  ('press', 'protected', 'Protected identity held for manual release.', 'manual'),
  ('media', 'protected', 'Protected identity held for manual release.', 'manual'),
  ('news', 'protected', 'Protected identity held for manual release.', 'manual'),
  ('updates', 'protected', 'Protected identity held for manual release.', 'manual'),
  ('roadmap', 'protected', 'Protected identity held for manual release.', 'manual'),
  ('community', 'protected', 'Protected identity held for manual release.', 'manual'),
  ('creator', 'protected', 'Protected identity held for manual release.', 'manual'),
  ('creators', 'protected', 'Protected identity held for manual release.', 'manual'),
  ('partner', 'protected', 'Protected identity held for manual release.', 'manual'),
  ('partners', 'protected', 'Protected identity held for manual release.', 'manual'),
  ('ambassador', 'protected', 'Protected identity held for manual release.', 'manual'),
  ('ambassadors', 'protected', 'Protected identity held for manual release.', 'manual'),
  ('event', 'protected', 'Protected identity held for manual release.', 'manual'),
  ('events', 'protected', 'Protected identity held for manual release.', 'manual'),
  ('contest', 'protected', 'Protected identity held for manual release.', 'manual'),
  ('contests', 'protected', 'Protected identity held for manual release.', 'manual'),
  ('giveaway', 'protected', 'Protected identity held for manual release.', 'manual'),
  ('giveaways', 'protected', 'Protected identity held for manual release.', 'manual'),
  ('billing', 'protected', 'Protected identity held for manual release.', 'manual'),
  ('payment', 'protected', 'Protected identity held for manual release.', 'manual'),
  ('payments', 'protected', 'Protected identity held for manual release.', 'manual'),
  ('premium', 'protected', 'Protected identity held for manual release.', 'manual'),
  ('subscription', 'protected', 'Protected identity held for manual release.', 'manual'),
  ('subscriptions', 'protected', 'Protected identity held for manual release.', 'manual'),
  ('discord', 'protected', 'Protected identity held for manual release.', 'manual'),
  ('spotify', 'protected', 'Protected identity held for manual release.', 'manual'),
  ('youtube', 'protected', 'Protected identity held for manual release.', 'manual'),
  ('twitch', 'protected', 'Protected identity held for manual release.', 'manual'),
  ('twitter', 'protected', 'Protected identity held for manual release.', 'manual'),
  ('instagram', 'protected', 'Protected identity held for manual release.', 'manual'),
  ('tiktok', 'protected', 'Protected identity held for manual release.', 'manual'),
  ('github', 'protected', 'Protected identity held for manual release.', 'manual'),
  ('steam', 'protected', 'Protected identity held for manual release.', 'manual'),
  ('reddit', 'protected', 'Protected identity held for manual release.', 'manual'),
  ('facebook', 'protected', 'Protected identity held for manual release.', 'manual')
ON CONFLICT (username_key) DO UPDATE
SET category = EXCLUDED.category,
    reason = EXCLUDED.reason,
    release_policy = EXCLUDED.release_policy,
    enabled = true;

-- The only approved existing collision is the confirmed staff profile Admin.
-- Record its owner so the row remains valid while the key stays unavailable to
-- every other profile and to every future signup.
UPDATE public.reserved_usernames reserved
SET grandfathered_profile_id = profiles.id
FROM public.profiles
WHERE reserved.username_key = 'admin'
  AND profiles.username_key = 'admin'
  AND profiles.is_staff = true
  AND (reserved.grandfathered_profile_id IS NULL OR reserved.grandfathered_profile_id = profiles.id);

DO $$
DECLARE
  v_collision text;
BEGIN
  SELECT string_agg(profiles.username, ', ' ORDER BY profiles.username)
  INTO v_collision
  FROM public.profiles
  JOIN public.reserved_usernames reserved
    ON reserved.enabled AND reserved.username_key = profiles.username_key
  WHERE reserved.grandfathered_profile_id IS DISTINCT FROM profiles.id;

  IF v_collision IS NOT NULL THEN
    RAISE EXCEPTION 'Reserved username collision requires explicit remediation: %', v_collision;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.normalize_username_key(p_username text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path TO 'pg_catalog'
AS $$
  SELECT lower(btrim(p_username));
$$;

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
    normalized.username_key ~ '^[a-z0-9_]{3,20}$'
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
  IF v_username IS NULL OR v_key !~ '^[a-z0-9_]{3,20}$' THEN
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
  IF v_username IS NULL OR v_username !~ '^[A-Za-z0-9_]{3,20}$' THEN
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

DROP TRIGGER IF EXISTS profiles_username_moderation ON public.profiles;
DROP TRIGGER IF EXISTS profiles_username_policy ON public.profiles;
CREATE TRIGGER profiles_username_policy
  BEFORE INSERT OR UPDATE OF username ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_username_policy();

-- A requested username is authoritative during signup. Only legacy/system
-- recovery flows may use a generated fallback. Valid names held by an
-- unconfirmed account retain the existing reclaim behavior.
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

    IF v_key !~ '^[a-z0-9_]{3,20}$'
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

-- Missing-profile recovery is a legacy/system path. It may fall back when the
-- auth metadata is invalid, taken, moderated, or reserved; explicit signup
-- requests are rejected by handle_new_user above. The approved Admin owner is
-- the only reserved value permitted during recovery.
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
    WHEN v_requested_username ~ '^[A-Za-z0-9_]{3,20}$'
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

REVOKE ALL ON FUNCTION public.normalize_username_key(text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.normalize_username_key(text) TO anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.is_username_reserved(text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_username_reserved(text) TO anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.is_username_available(text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_username_available(text) TO anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.enforce_username_policy() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_my_profile() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;

COMMIT;
