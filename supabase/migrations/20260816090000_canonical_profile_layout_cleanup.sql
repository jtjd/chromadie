-- Normalize the final legacy layout values, then keep the active database
-- boundary limited to Compact and Full-Bleed. Historical migrations retain
-- their original vocabulary; runtime configuration does not.
BEGIN;

-- The currently installed normalizer still understands the old literal
-- `immersive`, so use it once before replacing that public boundary.
UPDATE public.profiles
SET equipped_cosmetics = jsonb_set(
  coalesce(equipped_cosmetics, '{}'::jsonb),
  '{profile_layout}',
  to_jsonb(
    CASE
      WHEN lower(btrim(coalesce(equipped_cosmetics->>'profile_layout', ''))) IN ('immersive', 'profile_layout_immersive')
        THEN 'profile_layout_full_bleed'
      ELSE 'profile_layout_' || public.profile_layout_key(equipped_cosmetics->>'profile_layout', 'compact')
    END
  ),
  true
)
WHERE equipped_cosmetics ? 'profile_layout';

UPDATE public.profile_configurations
SET draft_config = public.normalize_profile_configuration(draft_config, draft_config->>'signatureColor'),
    published_config = public.normalize_profile_configuration(published_config, published_config->>'signatureColor'),
    draft_config_v2 = public.profile_configuration_v2_from_v1(public.normalize_profile_configuration(draft_config, draft_config->>'signatureColor')),
    published_config_v2 = public.profile_configuration_v2_from_v1(public.normalize_profile_configuration(published_config, published_config->>'signatureColor')),
    updated_at = now(),
    v2_updated_at = now();

-- Existing rows have now been backfilled while the compatibility aliases were
-- still available. The live key resolver is canonical from this point on so
-- old layout names cannot re-enter through an RPC or composition patch.
CREATE OR REPLACE FUNCTION public.profile_layout_key(
  p_value text,
  p_fallback text DEFAULT 'compact'
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO public, pg_catalog
AS $function$
DECLARE
  v_value text := lower(btrim(coalesce(p_value, '')));
  v_fallback text := lower(btrim(coalesce(p_fallback, 'compact')));
BEGIN
  v_value := replace(regexp_replace(v_value, '^profile_layout_', ''), '_', '-');
  v_fallback := replace(regexp_replace(v_fallback, '^profile_layout_', ''), '_', '-');
  IF v_value IN ('compact', 'full-bleed') THEN RETURN v_value; END IF;
  IF v_fallback IN ('compact', 'full-bleed') THEN RETURN v_fallback; END IF;
  RETURN 'compact';
END;
$function$;

ALTER FUNCTION public.normalize_profile_configuration(jsonb, text)
  RENAME TO normalize_profile_configuration_legacy_runtime;

CREATE OR REPLACE FUNCTION public.normalize_profile_configuration(
  p_input jsonb,
  p_fallback_color text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SET search_path TO public, pg_catalog
AS $function$
DECLARE
  v_input jsonb := coalesce(p_input, '{}'::jsonb);
  v_layout text;
BEGIN
  IF jsonb_typeof(v_input) <> 'object' OR coalesce(v_input->>'version', '1') <> '1' THEN
    RETURN NULL;
  END IF;

  v_layout := public.profile_layout_key(
    coalesce(v_input->>'layoutVariant', v_input->>'templateKey'),
    'compact'
  );
  v_input := jsonb_set(v_input, '{layoutVariant}', to_jsonb(v_layout), true);
  v_input := jsonb_set(v_input, '{templateKey}', to_jsonb(v_layout), true);

  RETURN public.normalize_profile_configuration_legacy_runtime(v_input, p_fallback_color);
END;
$function$;

REVOKE ALL ON FUNCTION public.normalize_profile_configuration(jsonb, text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.normalize_profile_configuration_legacy_runtime(jsonb, text) FROM PUBLIC, anon, authenticated, service_role;

COMMIT;
