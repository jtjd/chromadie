-- Keep the client and server layout markers inseparable. Immersive is a
-- published structural choice, not a transient preview-only flag.
BEGIN;

CREATE OR REPLACE FUNCTION public.profile_composition_patch(p_patch jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SET search_path TO public, pg_catalog
AS $function$
DECLARE
  v_patch jsonb := '{}'::jsonb;
  v_layout text;
BEGIN
  IF jsonb_typeof(p_patch) <> 'object' THEN RETURN v_patch; END IF;

  IF p_patch ? 'layoutVariant' OR p_patch ? 'templateKey' THEN
    v_layout := public.profile_layout_key(
      coalesce(p_patch->>'layoutVariant', p_patch->>'templateKey'),
      'compact'
    );
    v_patch := v_patch || jsonb_build_object(
      'layoutVariant', v_layout,
      'templateKey', v_layout
    );
  END IF;
  IF p_patch ? 'modules' THEN v_patch := v_patch || jsonb_build_object('modules', p_patch->'modules'); END IF;
  IF p_patch ? 'links' THEN v_patch := v_patch || jsonb_build_object('links', p_patch->'links'); END IF;
  IF p_patch ? 'linkStyle' THEN v_patch := v_patch || jsonb_build_object('linkStyle', p_patch->'linkStyle'); END IF;
  IF p_patch ? 'metadata' THEN v_patch := v_patch || jsonb_build_object('metadata', p_patch->'metadata'); END IF;
  RETURN v_patch;
END;
$function$;

UPDATE public.profile_configurations
SET draft_config = public.normalize_profile_configuration(draft_config, draft_config->>'signatureColor'),
    published_config = public.normalize_profile_configuration(published_config, published_config->>'signatureColor'),
    draft_config_v2 = public.profile_configuration_v2_from_v1(public.normalize_profile_configuration(draft_config, draft_config->>'signatureColor')),
    published_config_v2 = public.profile_configuration_v2_from_v1(public.normalize_profile_configuration(published_config, published_config->>'signatureColor')),
    updated_at = now(),
    v2_updated_at = now();

COMMIT;
