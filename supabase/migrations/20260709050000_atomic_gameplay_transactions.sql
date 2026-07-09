-- Phase 2 launch hardening:
-- Serialize gameplay mutations on the user's profile row so purchases,
-- rerolls, and wallet changes cannot race each other.

-- Preserve the existing purchase logic as an internal implementation.
ALTER FUNCTION public.purchase_item(text) RENAME TO purchase_item_impl;

CREATE OR REPLACE FUNCTION public.purchase_item(p_item_key text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
AS $$
DECLARE
    v_user_id uuid := auth.uid();
BEGIN
    IF v_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Not authenticated');
    END IF;

    PERFORM 1
    FROM profiles
    WHERE id = v_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Profile not found');
    END IF;

    RETURN public.purchase_item_impl(p_item_key);
END;
$$;

REVOKE ALL ON FUNCTION public.purchase_item_impl(text) FROM anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.purchase_item(text) TO anon;
GRANT ALL ON FUNCTION public.purchase_item(text) TO authenticated;
GRANT ALL ON FUNCTION public.purchase_item(text) TO service_role;

-- Preserve the existing roll logic as an internal implementation.
ALTER FUNCTION public.roll_die(boolean) RENAME TO roll_die_impl;

CREATE OR REPLACE FUNCTION public.roll_die(p_is_reroll boolean DEFAULT false) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
AS $$
DECLARE
    v_user_id uuid := auth.uid();
BEGIN
    IF v_user_id IS NOT NULL THEN
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

REVOKE ALL ON FUNCTION public.roll_die_impl(boolean) FROM anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.roll_die(boolean) TO anon;
GRANT ALL ON FUNCTION public.roll_die(boolean) TO authenticated;
GRANT ALL ON FUNCTION public.roll_die(boolean) TO service_role;

