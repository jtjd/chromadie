-- Hard stop for reroll replay/race issues.
-- Serialize all roll mutations per authenticated user before the gameplay
-- implementation runs so refreshes, duplicate tabs, and concurrent requests
-- cannot enter the roll transaction at the same time.

CREATE OR REPLACE FUNCTION public.roll_die(p_is_reroll boolean DEFAULT false) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
AS $$
DECLARE
    v_user_id uuid := auth.uid();
BEGIN
    IF v_user_id IS NOT NULL THEN
        -- Serialize all gameplay mutations for the same user inside one transaction.
        PERFORM pg_advisory_xact_lock(hashtext(v_user_id::text), 9341);

        PERFORM 1
        FROM profiles
        WHERE id = v_user_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RETURN jsonb_build_object('success', false, 'error', 'Profile not found.');
        END IF;
    END IF;

    RETURN public.roll_die_impl(p_is_reroll);
END;
$$;

REVOKE ALL ON FUNCTION public.roll_die(boolean) FROM anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.roll_die(boolean) TO anon;
GRANT ALL ON FUNCTION public.roll_die(boolean) TO authenticated;
GRANT ALL ON FUNCTION public.roll_die(boolean) TO service_role;
