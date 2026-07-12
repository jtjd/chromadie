-- Repair accounts created before pending-signup username reclaim was deployed.
-- A confirmed account's requested username is authoritative; an unconfirmed
-- account must not keep that name reserved.

DO $$
DECLARE
  v_row record;
  v_requested text;
BEGIN
  FOR v_row IN
    SELECT
      u.id AS confirmed_id,
      p.username AS confirmed_username,
      u.raw_user_meta_data->>'username' AS requested_username
    FROM auth.users u
    JOIN public.profiles p ON p.id = u.id
    WHERE u.email_confirmed_at IS NOT NULL
      AND nullif(trim(u.raw_user_meta_data->>'username'), '') IS NOT NULL
      AND p.username LIKE 'player_%'
  LOOP
    v_requested := nullif(trim(v_row.requested_username), '');

    IF lower(v_requested) IN ('guest', 'anon', 'anonymous') THEN
      CONTINUE;
    END IF;

    -- Move an unconfirmed holder out of the way, if one exists.
    UPDATE public.profiles pending_profile
    SET username = 'player_' || substr(replace(pending_profile.id::text, '-', ''), 1, 8)
    FROM auth.users pending_user
    WHERE pending_profile.id = pending_user.id
      AND pending_profile.id <> v_row.confirmed_id
      AND pending_user.email_confirmed_at IS NULL
      AND lower(pending_profile.username) = lower(v_requested);

    -- Only promote when the requested name is now free.
    IF NOT EXISTS (
      SELECT 1
      FROM public.profiles other_profile
      WHERE other_profile.id <> v_row.confirmed_id
        AND lower(other_profile.username) = lower(v_requested)
    ) THEN
      UPDATE public.profiles
      SET username = v_requested
      WHERE id = v_row.confirmed_id;
    END IF;
  END LOOP;
END;
$$;
