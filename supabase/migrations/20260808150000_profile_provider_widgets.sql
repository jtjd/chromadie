-- Bounded provider widgets for profile expression.
-- Only normalized provider/type/id records are stored. The public renderer owns
-- the embed URL; profile owners never supply markup, scripts, or frame sources.

BEGIN;

CREATE OR REPLACE FUNCTION public.normalize_profile_widgets(
  p_input jsonb,
  p_legacy_type text DEFAULT NULL,
  p_legacy_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SET search_path TO public, pg_catalog
AS $function$
DECLARE
  v_item jsonb;
  v_provider text;
  v_type text;
  v_id text;
  v_visible boolean;
  v_result jsonb := '[]'::jsonb;
  v_seen text[] := ARRAY[]::text[];
  v_order integer := 0;
BEGIN
  IF jsonb_typeof(coalesce(p_input, '[]'::jsonb)) = 'array' THEN
    FOR v_item IN
      SELECT widget_input
      FROM jsonb_array_elements(coalesce(p_input, '[]'::jsonb)) WITH ORDINALITY AS widget_rows(widget_input, widget_order)
      WHERE widget_order <= 4
      ORDER BY widget_order
    LOOP
      IF jsonb_typeof(v_item) <> 'object' THEN
        CONTINUE;
      END IF;
      v_provider := lower(btrim(coalesce(v_item->>'provider', '')));
      v_type := lower(btrim(coalesce(v_item->>'type', '')));
      v_id := btrim(coalesce(v_item->>'id', ''));
      v_visible := CASE
        WHEN v_item->>'visible' IN ('true', 'false') THEN (v_item->>'visible')::boolean
        ELSE true
      END;

      IF (
        (v_provider = 'spotify' AND v_type IN ('track', 'playlist', 'album') AND v_id ~ '^[A-Za-z0-9]{22}$')
        OR (v_provider = 'youtube' AND v_type = 'video' AND v_id ~ '^[A-Za-z0-9_-]{11}$')
      ) AND NOT (v_provider = ANY(v_seen)) THEN
        v_result := v_result || jsonb_build_array(jsonb_build_object(
          'provider', v_provider,
          'type', v_type,
          'id', v_id,
          'visible', v_visible,
          'order', v_order
        ));
        v_seen := array_append(v_seen, v_provider);
        v_order := v_order + 1;
        IF v_order >= 2 THEN
          EXIT;
        END IF;
      END IF;
    END LOOP;
  END IF;

  -- Existing Spotify fields remain readable during the additive transition.
  IF v_order = 0
     AND p_legacy_type IN ('track', 'playlist', 'album')
     AND coalesce(p_legacy_id, '') ~ '^[A-Za-z0-9]{22}$' THEN
    v_result := jsonb_build_array(jsonb_build_object(
      'provider', 'spotify',
      'type', p_legacy_type,
      'id', p_legacy_id,
      'visible', true,
      'order', 0
    ));
  END IF;

  RETURN v_result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.profile_widgets_patch(p_patch jsonb)
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path TO public, pg_catalog
AS $function$
  SELECT jsonb_build_object(
    'widgets', public.normalize_profile_widgets(
      CASE WHEN jsonb_typeof(coalesce(p_patch, '{}'::jsonb)->'widgets') = 'array'
        THEN coalesce(p_patch, '{}'::jsonb)->'widgets' ELSE '[]'::jsonb END
    )
  );
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
      'content', public.normalize_profile_content('{}'::jsonb),
      'widgets', '[]'::jsonb
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
        'content', public.normalize_profile_content(p_input->'content'),
        'widgets', public.normalize_profile_widgets(
          p_input->'widgets',
          p_input->>'spotify_type',
          p_input->>'spotify_id'
        )
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

-- Preserve newer provider widgets when an older whole-config client saves.
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

REVOKE ALL ON FUNCTION public.normalize_profile_widgets(jsonb, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.profile_widgets_patch(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.profile_default_configuration(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.normalize_profile_configuration(jsonb, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.save_profile_configuration_section(text, jsonb, timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.publish_profile_configuration_section(text, jsonb, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_profile_configuration(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_profile_configuration_section(text, jsonb, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.publish_profile_configuration_section(text, jsonb, timestamptz) TO authenticated;

COMMIT;
