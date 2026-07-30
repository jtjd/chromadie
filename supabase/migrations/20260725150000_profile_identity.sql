-- Phase 13: additive public identity contract.
--
-- Display name and bio are intentionally nullable. Existing profiles retain
-- every historical field and receive no fabricated identity content.

BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS bio text;

COMMENT ON COLUMN public.profiles.display_name IS
  'Optional public plain-text display name; written through update_my_profile_identity.';
COMMENT ON COLUMN public.profiles.bio IS
  'Optional public plain-text bio; written through update_my_profile_identity.';

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_display_name_contract_check,
  DROP CONSTRAINT IF EXISTS profiles_bio_contract_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_display_name_contract_check CHECK (
    display_name IS NULL
    OR (
      char_length(display_name) BETWEEN 1 AND 40
      AND regexp_replace(display_name, '^[[:space:]]+|[[:space:]]+$', '', 'g') <> ''
      AND display_name !~ '[[:cntrl:]]'
    )
  ),
  ADD CONSTRAINT profiles_bio_contract_check CHECK (
    bio IS NULL
    OR (
      char_length(bio) BETWEEN 1 AND 160
      AND regexp_replace(bio, '^[[:space:]]+|[[:space:]]+$', '', 'g') <> ''
      AND bio !~ '[[:cntrl:]]'
    )
  );

-- This helper is deliberately not granted to browser roles. It centralizes
-- normalization for the authoritative update RPC while the table constraints
-- remain a second boundary for privileged database writes.
CREATE OR REPLACE FUNCTION public.normalize_profile_identity_text(
  p_input text,
  p_label text,
  p_max_chars integer
)
RETURNS text
LANGUAGE plpgsql
STABLE
SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  v_value text;
BEGIN
  IF p_input IS NULL THEN
    RETURN NULL;
  END IF;

  -- PostgreSQL text cannot store a NUL byte. The explicit control-character
  -- check below therefore rejects all representable C0/C1 control values,
  -- while the client contract rejects NUL before making the request.
  v_value := regexp_replace(p_input, '^[[:space:]]+|[[:space:]]+$', '', 'g');
  IF v_value = '' THEN
    RETURN NULL;
  END IF;

  IF p_max_chars IS NULL OR p_max_chars < 1 THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'Identity validation is unavailable.';
  END IF;

  IF v_value ~ '[[:cntrl:]]' THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = format('%s cannot contain control characters.', p_label);
  END IF;

  IF char_length(v_value) > p_max_chars THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = format('%s must be %s characters or less.', p_label, p_max_chars);
  END IF;

  RETURN v_value;
END;
$function$;

-- The update boundary derives the profile id exclusively from auth.uid(). It
-- returns only the public identity projection, never account or economy data.
CREATE OR REPLACE FUNCTION public.update_my_profile_identity(
  p_display_name text,
  p_bio text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_display_name text;
  v_bio text;
  v_username text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '28000', MESSAGE = 'Not authenticated';
  END IF;

  v_display_name := public.normalize_profile_identity_text(p_display_name, 'Display name', 40);
  v_bio := public.normalize_profile_identity_text(p_bio, 'Bio', 160);

  UPDATE public.profiles
  SET display_name = v_display_name,
      bio = v_bio
  WHERE id = v_user_id
  RETURNING username INTO v_username;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Profile not found';
  END IF;

  RETURN jsonb_build_object(
    'username', v_username,
    'display_name', v_display_name,
    'bio', v_bio
  );
END;
$function$;

COMMENT ON FUNCTION public.update_my_profile_identity(text, text) IS
  'Authenticated public-identity boundary. Derives the target only from auth.uid(), validates plain text, and returns no private account fields.';

-- This is the only public profile summary projection. It deliberately omits
-- ep_spent, reroll_shards, staff wallet values, private settings, moderation
-- data, and authentication data. Published links remain in the existing
-- get_public_profile_configuration() projection.
CREATE OR REPLACE FUNCTION public.public_profile_identity_projection(p_user_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT jsonb_build_object(
    'id', p.id,
    'username', p.username,
    'display_name', p.display_name,
    'bio', p.bio,
    'current_streak', p.current_streak,
    'longest_streak', p.longest_streak,
    'lifetime_ep', p.lifetime_ep,
    'total_rolls', p.total_rolls,
    'equipped_cosmetics', p.equipped_cosmetics,
    'equipped_badges', p.equipped_badges,
    'mood_color', p.mood_color,
    'best_roll_score', p.best_roll_score,
    'best_roll_hex', p.best_roll_hex,
    'best_roll_rarity', p.best_roll_rarity,
    'is_staff', p.is_staff
  )
  FROM public.profiles p
  WHERE p.id = p_user_id;
$function$;

CREATE OR REPLACE FUNCTION public.get_public_profile_identity(p_username text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT public.public_profile_identity_projection(p.id)
  FROM public.profiles p
  WHERE btrim(p_username) ~ '^[A-Za-z0-9_]{3,20}$'
    AND p.username_key = lower(btrim(p_username))
  LIMIT 1;
$function$;

CREATE OR REPLACE FUNCTION public.get_public_profile_identity_by_id(p_user_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT public.public_profile_identity_projection(p_user_id);
$function$;

COMMENT ON FUNCTION public.get_public_profile_identity(text) IS
  'Bounded public profile projection for canonical username routes; excludes private account, authentication, moderation, and unpublished configuration data.';
COMMENT ON FUNCTION public.get_public_profile_identity_by_id(uuid) IS
  'Bounded public profile projection used by internal profile hydration; returns the same published fields as the username projection.';

REVOKE ALL ON FUNCTION public.normalize_profile_identity_text(text, text, integer) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.update_my_profile_identity(text, text) FROM PUBLIC, anon, service_role;
REVOKE ALL ON FUNCTION public.public_profile_identity_projection(uuid) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_public_profile_identity(text) FROM PUBLIC, authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_public_profile_identity_by_id(uuid) FROM PUBLIC, service_role;

GRANT EXECUTE ON FUNCTION public.update_my_profile_identity(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_profile_identity(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_profile_identity_by_id(uuid) TO anon, authenticated;

COMMIT;
