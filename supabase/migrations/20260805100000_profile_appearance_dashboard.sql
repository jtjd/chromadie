-- Full-page profile dashboard appearance contract.
-- Appearance is additive: existing profile configuration fields and RPCs remain
-- valid while new clients can save/publish the visual section independently.

BEGIN;

ALTER FUNCTION public.profile_default_configuration(text)
  RENAME TO profile_default_configuration_legacy;

-- The roll-visibility migration already wraps the original normalizer under
-- *_legacy. Preserve that wrapper as the compatibility layer we extend here.
ALTER FUNCTION public.normalize_profile_configuration(jsonb, text)
  RENAME TO normalize_profile_configuration_roll_visibility;

CREATE OR REPLACE FUNCTION public.profile_safe_hex(p_value text, p_fallback text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path TO pg_catalog
AS $function$
  SELECT CASE
    WHEN COALESCE(p_value, '') ~ '^#[0-9A-Fa-f]{6}$' THEN upper(p_value)
    ELSE p_fallback
  END;
$function$;

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
    )
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.profile_default_configuration(p_signature_color text DEFAULT NULL)
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path TO public, pg_catalog
AS $function$
  SELECT public.profile_default_configuration_legacy('#CDD2FF')
    || jsonb_build_object(
      'signatureColor', '#CDD2FF',
      'appearance', public.normalize_profile_appearance(
        '{}'::jsonb,
        '#CDD2FF'
      )
    );
$function$;

CREATE OR REPLACE FUNCTION public.profile_composition_patch(p_patch jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SET search_path TO public, pg_catalog
AS $function$
DECLARE
  v_patch jsonb := '{}'::jsonb;
BEGIN
  IF jsonb_typeof(p_patch) <> 'object' THEN
    RETURN v_patch;
  END IF;
  IF p_patch ? 'layoutVariant' THEN
    v_patch := v_patch || jsonb_build_object('layoutVariant', p_patch->'layoutVariant');
  END IF;
  IF p_patch ? 'modules' THEN
    v_patch := v_patch || jsonb_build_object('modules', p_patch->'modules');
  END IF;
  IF p_patch ? 'links' THEN
    v_patch := v_patch || jsonb_build_object('links', p_patch->'links');
  END IF;
  RETURN v_patch;
END;
$function$;

CREATE OR REPLACE FUNCTION public.normalize_profile_configuration(
  p_input jsonb,
  p_fallback_color text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path TO public, pg_catalog
AS $function$
  SELECT CASE
    WHEN base_config IS NULL THEN NULL
    ELSE base_config
      || jsonb_build_object(
        'appearance', public.normalize_profile_appearance(
          p_input->'appearance',
          COALESCE(p_input->>'signatureColor', p_fallback_color, '#CDD2FF')
        ),
        'signatureColor', public.normalize_profile_appearance(
          p_input->'appearance',
          COALESCE(p_input->>'signatureColor', p_fallback_color, '#CDD2FF')
        )->'colors'->>'accent'
      )
  END
  FROM (SELECT public.normalize_profile_configuration_roll_visibility(p_input, p_fallback_color) AS base_config) normalized;
$function$;

-- Add appearance to old rows without promoting private drafts.
UPDATE public.profile_configurations
SET draft_config = public.normalize_profile_configuration(draft_config, draft_config->>'signatureColor'),
    published_config = public.normalize_profile_configuration(published_config, published_config->>'signatureColor');

-- Older clients submit the original top-level contract. Preserve the stored
-- appearance when those clients save a draft during the rolling migration.
CREATE OR REPLACE FUNCTION public.save_profile_configuration(p_draft jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, pg_catalog
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_fallback text;
  v_existing_draft jsonb;
  v_input jsonb := p_draft;
  v_normalized jsonb;
  v_published jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  SELECT mood_color INTO v_fallback FROM public.profiles WHERE id = v_user_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Profile not found');
  END IF;
  SELECT draft_config INTO v_existing_draft FROM public.profile_configurations WHERE user_id = v_user_id;
  IF jsonb_typeof(v_input) = 'object' AND NOT (v_input ? 'appearance') AND v_existing_draft ? 'appearance' THEN
    v_input := v_input || jsonb_build_object('appearance', v_existing_draft->'appearance');
  END IF;
  -- The legacy whole-config RPC only receives the top-level alias. Mirror it
  -- into appearance before normalization so older clients keep their chosen
  -- accent while the new structured appearance contract remains authoritative.
  IF jsonb_typeof(v_input) = 'object'
     AND COALESCE(v_input->>'signatureColor', '') ~ '^#[0-9A-Fa-f]{6}$'
     AND jsonb_typeof(v_input->'appearance') = 'object' THEN
    v_input := jsonb_set(v_input, '{appearance,colors,accent}', to_jsonb(upper(v_input->>'signatureColor')), true);
  END IF;
  v_normalized := public.normalize_profile_configuration(v_input, v_fallback);
  IF v_normalized IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'That profile configuration is not valid.');
  END IF;
  INSERT INTO public.profile_configurations (user_id, draft_config, published_config)
  VALUES (v_user_id, v_normalized, public.profile_default_configuration(v_fallback))
  ON CONFLICT (user_id) DO UPDATE
  SET draft_config = EXCLUDED.draft_config, updated_at = now();
  SELECT published_config INTO v_published FROM public.profile_configurations WHERE user_id = v_user_id;
  RETURN jsonb_build_object('success', true, 'draft', v_normalized, 'published', v_published);
END;
$function$;

CREATE OR REPLACE FUNCTION public.save_profile_configuration_section(
  p_section text,
  p_patch jsonb,
  p_expected_updated_at timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, pg_catalog
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_record public.profile_configurations%ROWTYPE;
  v_default jsonb;
  v_draft jsonb;
  v_composition_patch jsonb;
  v_normalized jsonb;
  v_fallback text;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  IF p_section NOT IN ('appearance', 'composition') OR jsonb_typeof(p_patch) <> 'object' THEN
    RETURN jsonb_build_object('success', false, 'error', 'That profile section is not valid.');
  END IF;

  SELECT mood_color INTO v_fallback FROM public.profiles WHERE id = v_user_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Profile not found');
  END IF;

  v_default := public.profile_default_configuration(v_fallback);
  SELECT * INTO v_record FROM public.profile_configurations WHERE user_id = v_user_id FOR UPDATE;
  IF NOT FOUND THEN
    v_record.user_id := v_user_id;
    v_record.draft_config := v_default;
    v_record.published_config := v_default;
    v_record.updated_at := now();
    INSERT INTO public.profile_configurations (user_id, draft_config, published_config)
    VALUES (v_user_id, v_default, v_default);
    SELECT * INTO v_record FROM public.profile_configurations WHERE user_id = v_user_id FOR UPDATE;
  END IF;
  IF p_expected_updated_at IS NOT NULL AND v_record.updated_at <> p_expected_updated_at THEN
    RETURN jsonb_build_object('success', false, 'code', 'conflict', 'error', 'This profile changed in another tab.', 'updated_at', v_record.updated_at, 'draft', v_record.draft_config, 'published', v_record.published_config);
  END IF;

  v_draft := v_record.draft_config;
  IF p_section = 'appearance' THEN
    v_draft := v_draft || jsonb_build_object(
      'appearance', COALESCE(v_draft->'appearance', '{}'::jsonb) || p_patch
    );
  ELSE
    v_composition_patch := public.profile_composition_patch(p_patch);
    IF v_composition_patch ? 'layoutVariant' THEN
      v_draft := jsonb_set(v_draft, '{layoutVariant}', v_composition_patch->'layoutVariant', true);
    END IF;
    IF v_composition_patch ? 'modules' THEN
      v_draft := jsonb_set(v_draft, '{modules}', v_composition_patch->'modules', true);
    END IF;
    IF v_composition_patch ? 'links' THEN
      v_draft := jsonb_set(v_draft, '{links}', v_composition_patch->'links', true);
    END IF;
  END IF;
  v_normalized := public.normalize_profile_configuration(v_draft, v_fallback);
  IF v_normalized IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'That profile section is not valid.');
  END IF;

  UPDATE public.profile_configurations
  SET draft_config = v_normalized, updated_at = now()
  WHERE user_id = v_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'draft', v_normalized,
    'published', v_record.published_config,
    'updated_at', (SELECT updated_at FROM public.profile_configurations WHERE user_id = v_user_id)
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.publish_profile_configuration_section(
  p_section text,
  p_patch jsonb,
  p_expected_updated_at timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, pg_catalog
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_record public.profile_configurations%ROWTYPE;
  v_default jsonb;
  v_draft jsonb;
  v_composition_patch jsonb;
  v_published jsonb;
  v_normalized_draft jsonb;
  v_normalized_published jsonb;
  v_fallback text;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  IF p_section NOT IN ('appearance', 'composition') OR jsonb_typeof(p_patch) <> 'object' THEN
    RETURN jsonb_build_object('success', false, 'error', 'That profile section is not valid.');
  END IF;
  SELECT mood_color INTO v_fallback FROM public.profiles WHERE id = v_user_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Profile not found');
  END IF;
  v_default := public.profile_default_configuration(v_fallback);
  SELECT * INTO v_record FROM public.profile_configurations WHERE user_id = v_user_id FOR UPDATE;
  IF NOT FOUND THEN
    v_record.draft_config := v_default;
    v_record.published_config := v_default;
    v_record.updated_at := now();
    INSERT INTO public.profile_configurations (user_id, draft_config, published_config)
    VALUES (v_user_id, v_default, v_default);
    SELECT * INTO v_record FROM public.profile_configurations WHERE user_id = v_user_id FOR UPDATE;
  END IF;
  IF p_expected_updated_at IS NOT NULL AND v_record.updated_at <> p_expected_updated_at THEN
    RETURN jsonb_build_object('success', false, 'code', 'conflict', 'error', 'This profile changed in another tab.', 'updated_at', v_record.updated_at, 'draft', v_record.draft_config, 'published', v_record.published_config);
  END IF;

  v_draft := v_record.draft_config;
  v_published := v_record.published_config;
  IF p_section = 'appearance' THEN
    v_draft := v_draft || jsonb_build_object('appearance', COALESCE(v_draft->'appearance', '{}'::jsonb) || p_patch);
    v_published := v_record.published_config || jsonb_build_object('appearance', COALESCE(v_record.published_config->'appearance', '{}'::jsonb) || p_patch);
  ELSE
    v_composition_patch := public.profile_composition_patch(p_patch);
    IF v_composition_patch ? 'layoutVariant' THEN
      v_draft := jsonb_set(v_draft, '{layoutVariant}', v_composition_patch->'layoutVariant', true);
      v_published := jsonb_set(v_record.published_config, '{layoutVariant}', v_composition_patch->'layoutVariant', true);
    END IF;
    IF v_composition_patch ? 'modules' THEN
      v_draft := jsonb_set(v_draft, '{modules}', v_composition_patch->'modules', true);
      v_published := jsonb_set(v_published, '{modules}', v_composition_patch->'modules', true);
    END IF;
    IF v_composition_patch ? 'links' THEN
      v_draft := jsonb_set(v_draft, '{links}', v_composition_patch->'links', true);
      v_published := jsonb_set(v_published, '{links}', v_composition_patch->'links', true);
    END IF;
  END IF;
  v_normalized_draft := public.normalize_profile_configuration(v_draft, v_fallback);
  v_normalized_published := public.normalize_profile_configuration(v_published, v_fallback);
  IF v_normalized_draft IS NULL OR v_normalized_published IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'That profile section is not valid.');
  END IF;

  UPDATE public.profile_configurations
  SET draft_config = v_normalized_draft,
      published_config = v_normalized_published,
      updated_at = now(),
      published_at = now()
  WHERE user_id = v_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'draft', v_normalized_draft,
    'published', v_normalized_published,
    'updated_at', (SELECT updated_at FROM public.profile_configurations WHERE user_id = v_user_id),
    'published_at', (SELECT published_at FROM public.profile_configurations WHERE user_id = v_user_id)
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.profile_safe_hex(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.normalize_profile_appearance(jsonb, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.profile_default_configuration(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.profile_composition_patch(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.normalize_profile_configuration(jsonb, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.profile_default_configuration_legacy(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.normalize_profile_configuration_roll_visibility(jsonb, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.save_profile_configuration_section(text, jsonb, timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.publish_profile_configuration_section(text, jsonb, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_profile_configuration_section(text, jsonb, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.publish_profile_configuration_section(text, jsonb, timestamptz) TO authenticated;

COMMIT;
