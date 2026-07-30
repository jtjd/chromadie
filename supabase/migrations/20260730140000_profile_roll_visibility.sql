-- Allow the existing profile module visibility control to hide a daily roll
-- from visitors. Owners still see their own roll so gameplay remains reachable.

BEGIN;

ALTER FUNCTION public.normalize_profile_configuration(jsonb, text)
  RENAME TO normalize_profile_configuration_legacy;

CREATE OR REPLACE FUNCTION public.normalize_profile_configuration(
  p_input jsonb,
  p_fallback_color text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
DECLARE
  v_input jsonb := p_input;
  v_normalized jsonb;
  v_roll_hidden boolean := false;
BEGIN
  IF jsonb_typeof(p_input) = 'object' AND jsonb_typeof(p_input->'modules') = 'array' THEN
    v_roll_hidden := EXISTS (
      SELECT 1
      FROM jsonb_array_elements(p_input->'modules') AS module
      WHERE module->>'id' = 'roll'
        AND module->>'visible' = 'false'
    );

    IF v_roll_hidden THEN
      v_input := jsonb_set(
        p_input,
        '{modules}',
        (
          SELECT jsonb_agg(
            CASE
              WHEN module->>'id' = 'roll' THEN module || jsonb_build_object('visible', true)
              ELSE module
            END
            ORDER BY (module->>'order')::integer
          )
          FROM jsonb_array_elements(p_input->'modules') AS module
        ),
        true
      );
    END IF;
  END IF;

  v_normalized := public.normalize_profile_configuration_legacy(v_input, p_fallback_color);
  IF v_normalized IS NULL OR NOT v_roll_hidden THEN
    RETURN v_normalized;
  END IF;

  RETURN jsonb_set(
    v_normalized,
    '{modules}',
    (
      SELECT jsonb_agg(
        CASE
          WHEN module->>'id' = 'roll' THEN module || jsonb_build_object('visible', false)
          ELSE module
        END
        ORDER BY (module->>'order')::integer
      )
      FROM jsonb_array_elements(v_normalized->'modules') AS module
    ),
    true
  );
END;
$function$;

COMMENT ON FUNCTION public.normalize_profile_configuration(jsonb, text) IS
  'Normalizes profile configuration while preserving the existing module contract and allowing owners to hide the daily roll from visitors.';

REVOKE ALL ON FUNCTION public.normalize_profile_configuration(jsonb, text) FROM PUBLIC, anon, authenticated, service_role;

-- Keep the compatibility parameter in the public identity signature while
-- making it explicit that username is the only display name.
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
  v_bio text;
  v_username text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '28000', MESSAGE = 'Not authenticated';
  END IF;

  PERFORM p_display_name;
  v_bio := public.normalize_profile_identity_text(p_bio, 'Bio', 160);

  UPDATE public.profiles
  SET display_name = username,
      bio = v_bio
  WHERE id = v_user_id
  RETURNING username INTO v_username;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Profile not found';
  END IF;

  RETURN jsonb_build_object(
    'username', v_username,
    'display_name', v_username,
    'bio', v_bio
  );
END;
$function$;

COMMENT ON FUNCTION public.update_my_profile_identity(text, text) IS
  'Authenticated public-identity boundary. Username is the sole display name; only the optional plain-text bio is user-editable.';

COMMIT;
