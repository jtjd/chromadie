-- Restore the single-purpose profile metadata RPC after removing bio support.

DROP FUNCTION IF EXISTS public.update_profile_meta(text);
DROP FUNCTION IF EXISTS public.update_profile_meta(text, text);

CREATE OR REPLACE FUNCTION public.update_profile_meta(p_mood_color text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_final_color TEXT := NULL;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Not authenticated');
    END IF;

    IF p_mood_color IS NOT NULL AND p_mood_color != '' THEN
        IF p_mood_color !~* '^#[0-9A-F]{6}$' THEN
            RETURN json_build_object('success', false, 'error', 'Invalid color format.');
        END IF;
        v_final_color := p_mood_color;
    END IF;

    UPDATE profiles
    SET mood_color = v_final_color
    WHERE id = v_user_id;

    RETURN json_build_object('success', true, 'mood_color', v_final_color);
END;
$$;

GRANT ALL ON FUNCTION public.update_profile_meta(text) TO anon;
GRANT ALL ON FUNCTION public.update_profile_meta(text) TO authenticated;
GRANT ALL ON FUNCTION public.update_profile_meta(text) TO service_role;
