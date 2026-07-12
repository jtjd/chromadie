-- Pending email-confirmation accounts should not permanently reserve a name.
-- If a new signup requests a username held by an unconfirmed account, move
-- the pending profile to its deterministic fallback and give the new account
-- the requested username.

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
AS $$
DECLARE
  v_requested_username text := nullif(trim(coalesce(new.raw_user_meta_data->>'username', '')), '');
  v_fallback_username text := 'player_' || substr(replace(new.id::text, '-', ''), 1, 8);
  v_existing_id uuid;
  v_existing_pending boolean := false;
BEGIN
  IF lower(coalesce(v_requested_username, '')) IN ('guest', 'anon', 'anonymous') THEN
    v_requested_username := NULL;
  END IF;

  INSERT INTO public.profiles (id, username)
  VALUES (new.id, coalesce(v_requested_username, v_fallback_username));
  RETURN new;
EXCEPTION
  WHEN unique_violation THEN
    IF v_requested_username IS NOT NULL THEN
      SELECT p.id, (u.email_confirmed_at IS NULL)
      INTO v_existing_id, v_existing_pending
      FROM public.profiles p
      JOIN auth.users u ON u.id = p.id
      WHERE lower(p.username) = lower(v_requested_username)
        AND p.id <> new.id
      LIMIT 1;

      IF v_existing_pending AND v_existing_id IS NOT NULL THEN
        UPDATE public.profiles
        SET username = 'player_' || substr(replace(v_existing_id::text, '-', ''), 1, 8)
        WHERE id = v_existing_id;

        INSERT INTO public.profiles (id, username)
        VALUES (new.id, v_requested_username)
        ON CONFLICT (id) DO NOTHING;
        RETURN new;
      END IF;
    END IF;

    INSERT INTO public.profiles (id, username)
    VALUES (new.id, v_fallback_username)
    ON CONFLICT (id) DO NOTHING;
    RETURN new;
END;
$$;
