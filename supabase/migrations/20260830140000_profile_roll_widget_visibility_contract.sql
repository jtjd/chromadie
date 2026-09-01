-- Keep daily-roll visibility as a presentation preference. The legacy
-- normalizer still requires every known module to be visible, so normalize a
-- compatible copy and then restore the visitor-facing visibility setting.

BEGIN;

ALTER FUNCTION public.normalize_profile_configuration(jsonb, text)
  RENAME TO normalize_profile_configuration_roll_visibility_legacy;

CREATE OR REPLACE FUNCTION public.normalize_profile_configuration(
  p_input jsonb,
  p_fallback_color text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path TO public, pg_catalog
AS $function$
DECLARE
  v_input jsonb := coalesce(p_input, '{}'::jsonb);
  v_normalized jsonb;
  v_roll_hidden boolean := false;
BEGIN
  IF jsonb_typeof(v_input) = 'object' AND jsonb_typeof(v_input->'modules') = 'array' THEN
    v_roll_hidden := EXISTS (
      SELECT 1
      FROM jsonb_array_elements(v_input->'modules') AS module
      WHERE module->>'id' = 'roll'
        AND module->>'visible' = 'false'
    );

    IF v_roll_hidden THEN
      v_input := jsonb_set(
        v_input,
        '{modules}',
        (
          SELECT jsonb_agg(
            CASE
              WHEN module->>'id' = 'roll' THEN module || jsonb_build_object('visible', true)
              ELSE module
            END
            ORDER BY (module->>'order')::integer
          )
          FROM jsonb_array_elements(v_input->'modules') AS module
        ),
        true
      );
    END IF;
  END IF;

  v_normalized := public.normalize_profile_configuration_roll_visibility_legacy(v_input, p_fallback_color);
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
  'Normalizes profile configuration while preserving the optional daily-roll widget visibility setting.';

REVOKE ALL ON FUNCTION public.normalize_profile_configuration(jsonb, text) FROM PUBLIC, anon, authenticated, service_role;

COMMIT;
