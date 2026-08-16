-- Add one bounded, opt-in typography scope to the profile appearance config.
-- The equipped Name Font remains the cosmetic authority; this boolean only
-- decides whether that selected custom face is inherited by profile content.

BEGIN;

CREATE OR REPLACE FUNCTION public.normalize_profile_appearance(
  p_input jsonb,
  p_fallback_color text DEFAULT '#CDD2FF'
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SET search_path TO public, pg_catalog
AS $function$
DECLARE
  v_input jsonb := CASE WHEN jsonb_typeof(p_input) = 'object' THEN p_input ELSE '{}'::jsonb END;
  v_colors jsonb := CASE WHEN jsonb_typeof(v_input->'colors') = 'object' THEN v_input->'colors' ELSE '{}'::jsonb END;
  v_surface jsonb := CASE WHEN jsonb_typeof(v_input->'surface') = 'object' THEN v_input->'surface' ELSE '{}'::jsonb END;
  v_background jsonb := CASE WHEN jsonb_typeof(v_input->'background') = 'object' THEN v_input->'background' ELSE '{}'::jsonb END;
  v_gradient jsonb := CASE WHEN jsonb_typeof(v_input->'gradient') = 'object' THEN v_input->'gradient' ELSE '{}'::jsonb END;
  v_border jsonb := CASE WHEN jsonb_typeof(v_input->'border') = 'object' THEN v_input->'border' ELSE '{}'::jsonb END;
  v_fallback text := public.profile_safe_hex(p_fallback_color, '#CDD2FF');
BEGIN
  RETURN jsonb_build_object(
    'version', 1,
    'colors', jsonb_build_object(
      'text', public.profile_safe_hex(v_colors->>'text', '#F4F6FB'),
      'secondaryText', public.profile_safe_hex(v_colors->>'secondaryText', '#AEB6C4'),
      'username', public.profile_safe_hex(v_colors->>'username', '#FFFFFF'),
      'description', public.profile_safe_hex(v_colors->>'description', '#CBD1DC'),
      'background', public.profile_safe_hex(v_colors->>'background', '#07080B'),
      'surface', public.profile_safe_hex(v_colors->>'surface', '#11141B'),
      'accent', public.profile_safe_hex(v_colors->>'accent', public.profile_safe_hex(v_input->>'signatureColor', v_fallback)),
      'highlight', public.profile_safe_hex(v_colors->>'highlight', '#FFFFFF')
    ),
    'surface', jsonb_build_object(
      'opacity', LEAST(100, GREATEST(0, CASE WHEN (v_surface->>'opacity') ~ '^-?[0-9]+$' THEN (v_surface->>'opacity')::integer ELSE 64 END)),
      'blur', LEAST(40, GREATEST(0, CASE WHEN (v_surface->>'blur') ~ '^-?[0-9]+$' THEN (v_surface->>'blur')::integer ELSE 20 END))
    ),
    'background', jsonb_build_object(
      'blur', LEAST(40, GREATEST(0, CASE WHEN (v_background->>'blur') ~ '^-?[0-9]+$' THEN (v_background->>'blur')::integer ELSE 0 END)),
      'imageOpacity', LEAST(100, GREATEST(0, CASE WHEN (v_background->>'imageOpacity') ~ '^-?[0-9]+$' THEN (v_background->>'imageOpacity')::integer ELSE 100 END)),
      'overlayColor', public.profile_safe_hex(v_background->>'overlayColor', '#000000'),
      'overlayOpacity', LEAST(100, GREATEST(0, CASE WHEN (v_background->>'overlayOpacity') ~ '^-?[0-9]+$' THEN (v_background->>'overlayOpacity')::integer ELSE 0 END))
    ),
    'gradient', jsonb_build_object(
      'enabled', v_gradient->>'enabled' = 'true',
      'primary', public.profile_safe_hex(v_gradient->>'primary', '#07080B'),
      'secondary', public.profile_safe_hex(v_gradient->>'secondary', '#171A22'),
      'angle', LEAST(360, GREATEST(0, CASE WHEN (v_gradient->>'angle') ~ '^-?[0-9]+$' THEN (v_gradient->>'angle')::integer ELSE 135 END))
    ),
    'border', jsonb_build_object(
      'enabled', COALESCE(v_border->>'enabled', 'true') = 'true',
      'color', public.profile_safe_hex(v_border->>'color', '#FFFFFF'),
      'width', LEAST(4, GREATEST(0, CASE WHEN (v_border->>'width') ~ '^-?[0-9]+$' THEN (v_border->>'width')::integer ELSE 1 END)),
      'radius', LEAST(48, GREATEST(0, CASE WHEN (v_border->>'radius') ~ '^-?[0-9]+$' THEN (v_border->>'radius')::integer ELSE 24 END)),
      'opacity', LEAST(100, GREATEST(0, CASE WHEN (v_border->>'opacity') ~ '^-?[0-9]+$' THEN (v_border->>'opacity')::integer ELSE 11 END))
    ),
    'useNameFontAcrossProfile', CASE
      WHEN jsonb_typeof(v_input->'useNameFontAcrossProfile') = 'boolean'
        THEN (v_input->>'useNameFontAcrossProfile')::boolean
      ELSE false
    END
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.profile_default_configuration(p_signature_color text DEFAULT NULL)
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path TO public, pg_catalog
AS $function$
  WITH base AS (
    SELECT public.profile_default_configuration_legacy_v2(p_signature_color) AS config
  )
  SELECT config || jsonb_build_object(
    'templateKey', 'compact',
    'layoutVariant', 'compact',
    'appearance', public.normalize_profile_appearance(
      config->'appearance',
      coalesce(p_signature_color, config->>'signatureColor', '#CDD2FF')
    )
  )
  FROM base;
$function$;

-- Backfill both publication states and their V2 projections. Existing
-- profiles receive false without a client round-trip or a publish action.
UPDATE public.profile_configurations
SET draft_config = public.normalize_profile_configuration(draft_config, draft_config->>'signatureColor'),
    published_config = public.normalize_profile_configuration(published_config, published_config->>'signatureColor'),
    draft_config_v2 = public.profile_configuration_v2_from_v1(public.normalize_profile_configuration(draft_config, draft_config->>'signatureColor')),
    published_config_v2 = public.profile_configuration_v2_from_v1(public.normalize_profile_configuration(published_config, published_config->>'signatureColor')),
    updated_at = now(),
    v2_updated_at = now();

-- Removing the selected Name Font must also remove the opt-in scope. Keep the
-- two config generations synchronized because public V2 reads may prefer the
-- published projection over the normalized V1 row.
CREATE OR REPLACE FUNCTION public.unequip_item(p_slot text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_current_cosmetics jsonb;
  v_record public.profile_configurations%ROWTYPE;
  v_draft jsonb;
  v_published jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  IF p_slot IS NULL OR p_slot NOT IN ('name_font', 'name_material', 'name_motion', 'profile_border', 'title', 'cursor_trail', 'avatar_effect', 'profile_layout', 'profile_atmosphere', 'profile_motion') THEN
    RETURN json_build_object('success', false, 'error', 'Invalid slot');
  END IF;

  PERFORM 1 FROM public.profiles WHERE id = v_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Profile not found');
  END IF;

  SELECT COALESCE(equipped_cosmetics, '{}'::jsonb)
  INTO v_current_cosmetics
  FROM public.profiles
  WHERE id = v_user_id;
  v_current_cosmetics := v_current_cosmetics - p_slot;
  UPDATE public.profiles SET equipped_cosmetics = v_current_cosmetics WHERE id = v_user_id;

  IF p_slot = 'name_font' THEN
    SELECT *
    INTO v_record
    FROM public.profile_configurations
    WHERE user_id = v_user_id
    FOR UPDATE;

    IF FOUND AND (
      v_record.draft_config->'appearance'->>'useNameFontAcrossProfile' = 'true'
      OR v_record.published_config->'appearance'->>'useNameFontAcrossProfile' = 'true'
    ) THEN
      v_draft := COALESCE(
        public.normalize_profile_configuration(
          jsonb_set(coalesce(v_record.draft_config, '{}'::jsonb), '{appearance,useNameFontAcrossProfile}', 'false'::jsonb, true),
          v_record.draft_config->>'signatureColor'
        ),
        public.profile_default_configuration(v_record.draft_config->>'signatureColor')
      );
      v_published := COALESCE(
        public.normalize_profile_configuration(
          jsonb_set(coalesce(v_record.published_config, '{}'::jsonb), '{appearance,useNameFontAcrossProfile}', 'false'::jsonb, true),
          v_record.published_config->>'signatureColor'
        ),
        public.profile_default_configuration(v_record.published_config->>'signatureColor')
      );

      UPDATE public.profile_configurations
      SET draft_config = v_draft,
          published_config = v_published,
          draft_config_v2 = public.profile_configuration_v2_from_v1(v_draft),
          published_config_v2 = public.profile_configuration_v2_from_v1(v_published),
          updated_at = now(),
          v2_updated_at = now()
      WHERE user_id = v_user_id;
    END IF;
  END IF;

  RETURN json_build_object('success', true, 'cosmetics', v_current_cosmetics);
END;
$function$;

REVOKE ALL ON FUNCTION public.unequip_item(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.unequip_item(text) TO authenticated;

COMMIT;
