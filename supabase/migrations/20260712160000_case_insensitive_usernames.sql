-- Usernames remain display-case preserving, but identity and uniqueness are
-- case-insensitive. For example, ChromaDie, chromadie, and CHROMADIE are the
-- same username for lookup and signup purposes.

-- Resolve any legacy case-only collisions before adding the canonical index.
-- The oldest profile keeps the name; later collisions receive deterministic
-- fallback names derived from their user id.
DO $$
DECLARE
  v_profile record;
BEGIN
  FOR v_profile IN
    SELECT id
    FROM (
      SELECT id,
        row_number() OVER (PARTITION BY lower(username) ORDER BY created_at, id) AS duplicate_rank
      FROM public.profiles
    ) ranked
    WHERE duplicate_rank > 1
  LOOP
    UPDATE public.profiles
    SET username = 'player_' || substr(replace(v_profile.id::text, '-', ''), 1, 13)
    WHERE id = v_profile.id;
  END LOOP;
END;
$$;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username_key text
  GENERATED ALWAYS AS (lower(username)) STORED;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_key_unique
  ON public.profiles (username_key);

CREATE OR REPLACE FUNCTION public.is_username_available(p_username text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT p_username IS NOT NULL
    AND p_username ~ '^[A-Za-z0-9_]{3,20}$'
    AND NOT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE lower(username) = lower(trim(p_username))
    );
$$;

GRANT EXECUTE ON FUNCTION public.is_username_available(text) TO anon, authenticated, service_role;
