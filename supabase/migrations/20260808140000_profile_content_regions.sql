-- Bounded public About and Projects regions for profile identity.
-- Content is structured plain text and HTTPS links; it never accepts markup,
-- scripts, styles, embeds, or arbitrary profile-authored code.

BEGIN;

CREATE OR REPLACE FUNCTION public.profile_safe_content_text(
  p_value text,
  p_max integer,
  p_allow_lines boolean DEFAULT false
)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path TO pg_catalog
AS $function$
  SELECT left(
    btrim(
      regexp_replace(
        replace(coalesce(p_value, ''), chr(13) || chr(10), chr(10)),
        CASE WHEN p_allow_lines
          THEN E'[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F\\x7F]'
          ELSE E'[\\x00-\\x1F\\x7F]'
        END,
        '',
        'g'
      )
    ),
    greatest(0, p_max)
  );
$function$;

CREATE OR REPLACE FUNCTION public.normalize_profile_content(p_input jsonb)
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path TO public, pg_catalog
AS $function$
  SELECT jsonb_build_object(
    'version', 1,
    'about', jsonb_build_object(
      'visible', COALESCE(
        CASE WHEN about_input->>'visible' IN ('true', 'false') THEN (about_input->>'visible')::boolean END,
        true
      ),
      'heading', COALESCE(NULLIF(public.profile_safe_content_text(about_input->>'heading', 40, false), ''), 'About'),
      'body', public.profile_safe_content_text(about_input->>'body', 600, true)
    ),
    'projects', COALESCE(project_rows.projects, '[]'::jsonb)
  )
  FROM (
    SELECT CASE WHEN jsonb_typeof(coalesce(p_input, '{}'::jsonb)->'about') = 'object'
      THEN coalesce(p_input, '{}'::jsonb)->'about' ELSE '{}'::jsonb END AS about_input
  ) about
  LEFT JOIN LATERAL (
    SELECT jsonb_agg(
      jsonb_build_object(
        'title', public.profile_safe_content_text(project_input->>'title', 60, false),
        'description', public.profile_safe_content_text(project_input->>'description', 180, false),
        'url', CASE
          WHEN btrim(coalesce(project_input->>'url', '')) = '' THEN ''
          WHEN length(btrim(project_input->>'url')) <= 2048
            AND btrim(project_input->>'url') ~ '^https://[^\\s<>"'']+$'
            THEN btrim(project_input->>'url')
          ELSE ''
        END,
        'visible', COALESCE(
          CASE WHEN project_input->>'visible' IN ('true', 'false') THEN (project_input->>'visible')::boolean END,
          true
        ),
        'order', project_order - 1
      ) ORDER BY project_order
    ) AS projects
    FROM jsonb_array_elements(
      CASE WHEN jsonb_typeof(coalesce(p_input, '{}'::jsonb)->'projects') = 'array'
        THEN coalesce(p_input, '{}'::jsonb)->'projects' ELSE '[]'::jsonb END
    ) WITH ORDINALITY AS project_rows(project_input, project_order)
    WHERE project_order <= 4
      AND jsonb_typeof(project_input) = 'object'
  ) project_rows ON true;
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
      'appearance', public.normalize_profile_appearance('{}'::jsonb, '#CDD2FF'),
      'content', public.normalize_profile_content('{}'::jsonb)
    );
$function$;

CREATE OR REPLACE FUNCTION public.profile_content_patch(p_patch jsonb)
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path TO public, pg_catalog
AS $function$
  SELECT jsonb_build_object(
    'about', CASE WHEN jsonb_typeof(coalesce(p_patch, '{}'::jsonb)->'about') = 'object'
      THEN coalesce(p_patch, '{}'::jsonb)->'about' ELSE '{}'::jsonb END,
    'projects', CASE WHEN jsonb_typeof(coalesce(p_patch, '{}'::jsonb)->'projects') = 'array'
      THEN coalesce(p_patch, '{}'::jsonb)->'projects' ELSE '[]'::jsonb END
  );
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
        'appearance', appearance_config,
        'signatureColor', appearance_config->'colors'->>'accent',
        'content', public.normalize_profile_content(p_input->'content')
      )
  END
  FROM (SELECT public.normalize_profile_configuration_roll_visibility(p_input, p_fallback_color) AS base_config) normalized
  CROSS JOIN LATERAL (
    SELECT public.normalize_profile_appearance(
      p_input->'appearance',
      COALESCE(p_input->>'signatureColor', p_fallback_color, '#CDD2FF')
    ) AS appearance_config
  ) appearance;
$function$;

-- Add the public shape to existing rows without promoting private drafts.
UPDATE public.profile_configurations
SET draft_config = public.normalize_profile_configuration(draft_config, draft_config->>'signatureColor'),
    published_config = public.normalize_profile_configuration(published_config, published_config->>'signatureColor');

-- Preserve content when an older whole-config client saves over a newer draft.
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
  v_normalized jsonb;
  v_fallback text;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  IF p_section NOT IN ('appearance', 'composition', 'content') OR jsonb_typeof(p_patch) <> 'object' THEN
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
  ELSE
    v_composition_patch := public.profile_composition_patch(p_patch);
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
  v_normalized_draft jsonb;
  v_normalized_published jsonb;
  v_fallback text;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  IF p_section NOT IN ('appearance', 'composition', 'content') OR jsonb_typeof(p_patch) <> 'object' THEN
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
  ELSE
    v_composition_patch := public.profile_composition_patch(p_patch);
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

REVOKE ALL ON FUNCTION public.profile_safe_content_text(text, integer, boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.normalize_profile_content(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.profile_content_patch(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.profile_default_configuration(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.normalize_profile_configuration(jsonb, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.save_profile_configuration_section(text, jsonb, timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.publish_profile_configuration_section(text, jsonb, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_profile_configuration(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_profile_configuration_section(text, jsonb, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.publish_profile_configuration_section(text, jsonb, timestamptz) TO authenticated;

COMMIT;
