-- Dashboard parity continuation: structured templates and premium expression.
-- Templates change only the validated composition shape. They never copy
-- assets, grant entitlements, alter gameplay, or replace the existing equip
-- and purchase authority.

BEGIN;

ALTER FUNCTION public.profile_default_configuration(text)
  RENAME TO profile_default_configuration_legacy_v2;

ALTER FUNCTION public.normalize_profile_configuration(jsonb, text)
  RENAME TO normalize_profile_configuration_legacy_v2;

CREATE OR REPLACE FUNCTION public.profile_default_configuration(p_signature_color text DEFAULT NULL)
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path TO public, pg_catalog
AS $function$
  SELECT public.profile_default_configuration_legacy_v2(p_signature_color)
    || jsonb_build_object('templateKey', 'signal');
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
  SELECT base_config || jsonb_build_object(
    'templateKey', CASE
      WHEN p_input->>'templateKey' IN ('signal', 'editorial', 'archive', 'atelier', 'custom')
        THEN p_input->>'templateKey'
      WHEN base_config->>'layoutVariant' = 'editorial' THEN 'editorial'
      WHEN base_config->>'layoutVariant' = 'focus' THEN 'archive'
      ELSE 'signal'
    END
  )
  FROM (
    SELECT public.normalize_profile_configuration_legacy_v2(p_input, p_fallback_color) AS base_config
  ) normalized;
$function$;

CREATE OR REPLACE FUNCTION public.profile_composition_patch(p_patch jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SET search_path TO public, pg_catalog
AS $function$
DECLARE
  v_patch jsonb := '{}'::jsonb;
  v_template_key text := lower(btrim(coalesce(p_patch->>'templateKey', '')));
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
  IF v_template_key IN ('signal', 'editorial', 'archive', 'custom') THEN
    v_patch := v_patch || jsonb_build_object('templateKey', v_template_key);
  ELSIF v_template_key = 'atelier'
    AND auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.profile_entitlements
      WHERE user_id = auth.uid()
        AND entitlement_key = 'atelier_plus'
    ) THEN
    v_patch := v_patch || jsonb_build_object('templateKey', 'atelier');
  END IF;
  RETURN v_patch;
END;
$function$;

UPDATE public.profile_configurations
SET draft_config = public.normalize_profile_configuration(draft_config, draft_config->>'signatureColor'),
    published_config = public.normalize_profile_configuration(published_config, published_config->>'signatureColor');

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
  IF jsonb_typeof(v_input) = 'object' AND NOT (v_input ? 'content') AND v_existing_draft ? 'content' THEN
    v_input := v_input || jsonb_build_object('content', v_existing_draft->'content');
  END IF;
  IF jsonb_typeof(v_input) = 'object' AND NOT (v_input ? 'widgets') AND v_existing_draft ? 'widgets' THEN
    v_input := v_input || jsonb_build_object('widgets', v_existing_draft->'widgets');
  END IF;
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
  v_content_patch jsonb;
  v_widget_patch jsonb;
  v_normalized jsonb;
  v_fallback text;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  IF p_section NOT IN ('appearance', 'composition', 'content', 'widgets') OR jsonb_typeof(p_patch) <> 'object' THEN
    RETURN jsonb_build_object('success', false, 'error', 'That profile section is not valid.');
  END IF;
  SELECT mood_color INTO v_fallback FROM public.profiles WHERE id = v_user_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Profile not found');
  END IF;

  v_default := public.profile_default_configuration(v_fallback);
  SELECT * INTO v_record FROM public.profile_configurations WHERE user_id = v_user_id FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.profile_configurations (user_id, draft_config, published_config)
    VALUES (v_user_id, v_default, v_default);
    SELECT * INTO v_record FROM public.profile_configurations WHERE user_id = v_user_id FOR UPDATE;
  END IF;
  IF p_expected_updated_at IS NOT NULL AND v_record.updated_at <> p_expected_updated_at THEN
    RETURN jsonb_build_object('success', false, 'code', 'conflict', 'error', 'This profile changed in another tab.', 'updated_at', v_record.updated_at, 'draft', v_record.draft_config, 'published', v_record.published_config);
  END IF;

  v_draft := v_record.draft_config;
  IF p_section = 'appearance' THEN
    v_draft := v_draft || jsonb_build_object('appearance', COALESCE(v_draft->'appearance', '{}'::jsonb) || p_patch);
  ELSIF p_section = 'content' THEN
    v_content_patch := public.profile_content_patch(p_patch);
    v_draft := jsonb_set(v_draft, '{content}', v_content_patch, true);
  ELSIF p_section = 'widgets' THEN
    v_widget_patch := public.profile_widgets_patch(p_patch);
    v_draft := jsonb_set(v_draft, '{widgets}', v_widget_patch->'widgets', true);
  ELSE
    v_composition_patch := public.profile_composition_patch(p_patch);
    IF v_composition_patch ? 'templateKey' THEN v_draft := jsonb_set(v_draft, '{templateKey}', v_composition_patch->'templateKey', true); END IF;
    IF v_composition_patch ? 'layoutVariant' THEN v_draft := jsonb_set(v_draft, '{layoutVariant}', v_composition_patch->'layoutVariant', true); END IF;
    IF v_composition_patch ? 'modules' THEN v_draft := jsonb_set(v_draft, '{modules}', v_composition_patch->'modules', true); END IF;
    IF v_composition_patch ? 'links' THEN v_draft := jsonb_set(v_draft, '{links}', v_composition_patch->'links', true); END IF;
  END IF;
  v_normalized := public.normalize_profile_configuration(v_draft, v_fallback);
  IF v_normalized IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'That profile section is not valid.');
  END IF;
  UPDATE public.profile_configurations SET draft_config = v_normalized, updated_at = now() WHERE user_id = v_user_id;
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
  v_published jsonb;
  v_composition_patch jsonb;
  v_content_patch jsonb;
  v_widget_patch jsonb;
  v_normalized_draft jsonb;
  v_normalized_published jsonb;
  v_fallback text;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  IF p_section NOT IN ('appearance', 'composition', 'content', 'widgets') OR jsonb_typeof(p_patch) <> 'object' THEN
    RETURN jsonb_build_object('success', false, 'error', 'That profile section is not valid.');
  END IF;
  SELECT mood_color INTO v_fallback FROM public.profiles WHERE id = v_user_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Profile not found');
  END IF;
  v_default := public.profile_default_configuration(v_fallback);
  SELECT * INTO v_record FROM public.profile_configurations WHERE user_id = v_user_id FOR UPDATE;
  IF NOT FOUND THEN
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
    v_published := v_published || jsonb_build_object('appearance', COALESCE(v_published->'appearance', '{}'::jsonb) || p_patch);
  ELSIF p_section = 'content' THEN
    v_content_patch := public.profile_content_patch(p_patch);
    v_draft := jsonb_set(v_draft, '{content}', v_content_patch, true);
    v_published := jsonb_set(v_published, '{content}', v_content_patch, true);
  ELSIF p_section = 'widgets' THEN
    v_widget_patch := public.profile_widgets_patch(p_patch);
    v_draft := jsonb_set(v_draft, '{widgets}', v_widget_patch->'widgets', true);
    v_published := jsonb_set(v_published, '{widgets}', v_widget_patch->'widgets', true);
  ELSE
    v_composition_patch := public.profile_composition_patch(p_patch);
    IF v_composition_patch ? 'templateKey' THEN
      v_draft := jsonb_set(v_draft, '{templateKey}', v_composition_patch->'templateKey', true);
      v_published := jsonb_set(v_published, '{templateKey}', v_composition_patch->'templateKey', true);
    END IF;
    IF v_composition_patch ? 'layoutVariant' THEN
      v_draft := jsonb_set(v_draft, '{layoutVariant}', v_composition_patch->'layoutVariant', true);
      v_published := jsonb_set(v_published, '{layoutVariant}', v_composition_patch->'layoutVariant', true);
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
  SET draft_config = v_normalized_draft, published_config = v_normalized_published, updated_at = now(), published_at = now()
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

REVOKE ALL ON FUNCTION public.profile_default_configuration_legacy_v2(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.normalize_profile_configuration_legacy_v2(jsonb, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.profile_composition_patch(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.profile_default_configuration(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.normalize_profile_configuration(jsonb, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.save_profile_configuration(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.save_profile_configuration_section(text, jsonb, timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.publish_profile_configuration_section(text, jsonb, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_profile_configuration(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_profile_configuration_section(text, jsonb, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.publish_profile_configuration_section(text, jsonb, timestamptz) TO authenticated;

COMMIT;
