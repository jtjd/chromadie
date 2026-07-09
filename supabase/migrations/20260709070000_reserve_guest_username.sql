-- Prevent guest-like usernames from becoming real authenticated accounts.
-- Guest mode is local-only; authenticated profiles must not use reserved names.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_reserved_username_check'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_reserved_username_check
      CHECK (lower(username) NOT IN ('guest', 'anon', 'anonymous'));
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
AS $$
DECLARE
  v_username text := lower(coalesce(new.raw_user_meta_data->>'username', ''));
BEGIN
  IF v_username IN ('guest', 'anon', 'anonymous') THEN
    RAISE EXCEPTION 'Reserved username';
  END IF;

  INSERT INTO public.profiles (id, username)
  VALUES (new.id, new.raw_user_meta_data->>'username');
  RETURN new;
END;
$$;
