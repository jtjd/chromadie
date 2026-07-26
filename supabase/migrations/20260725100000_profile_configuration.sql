-- Phase 4: validated, versioned profile expression without broadening the
-- protected profiles table or allowing raw markup/CSS.

BEGIN;

CREATE TABLE IF NOT EXISTS public.profile_configurations (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  config_version integer NOT NULL DEFAULT 1,
  draft_config jsonb NOT NULL,
  published_config jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  CONSTRAINT profile_configurations_version_check CHECK (config_version = 1),
  CONSTRAINT profile_configurations_draft_object_check CHECK (
    jsonb_typeof(draft_config) = 'object'
    AND draft_config->>'version' = '1'
  ),
  CONSTRAINT profile_configurations_published_object_check CHECK (
    jsonb_typeof(published_config) = 'object'
    AND published_config->>'version' = '1'
  )
);

ALTER TABLE public.profile_configurations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.profile_configurations FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.profile_configurations TO service_role;

DROP POLICY IF EXISTS "Owners can read profile configurations" ON public.profile_configurations;
CREATE POLICY "Owners can read profile configurations"
  ON public.profile_configurations
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.profile_default_configuration(p_signature_color text DEFAULT NULL)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path TO pg_catalog
AS $function$
  SELECT jsonb_build_object(
    'version', 1,
    'signatureColor', CASE
      WHEN p_signature_color ~ '^#[0-9A-Fa-f]{6}$' THEN upper(p_signature_color)
      ELSE '#8B7CF6'
    END,
    'layoutVariant', 'immersive',
    'modules', jsonb_build_array(
      jsonb_build_object('id', 'roll', 'visible', true, 'order', 0, 'size', 'wide'),
      jsonb_build_object('id', 'stats', 'visible', true, 'order', 1, 'size', 'wide'),
      jsonb_build_object('id', 'signature', 'visible', true, 'order', 2, 'size', 'medium'),
      jsonb_build_object('id', 'links', 'visible', true, 'order', 3, 'size', 'medium'),
      jsonb_build_object('id', 'recent', 'visible', true, 'order', 4, 'size', 'medium'),
      jsonb_build_object('id', 'achievements', 'visible', true, 'order', 5, 'size', 'medium'),
      jsonb_build_object('id', 'boundary', 'visible', true, 'order', 6, 'size', 'medium'),
      jsonb_build_object('id', 'explore', 'visible', true, 'order', 7, 'size', 'wide')
    ),
    'links', '[]'::jsonb
  );
$function$;

CREATE OR REPLACE FUNCTION public.normalize_profile_configuration(
  p_input jsonb,
  p_fallback_color text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SET search_path TO public
AS $function$
DECLARE
  v_module jsonb;
  v_link jsonb;
  v_modules jsonb := '[]'::jsonb;
  v_links jsonb := '[]'::jsonb;
  v_seen_modules text[] := ARRAY[]::text[];
  v_seen_link_orders integer[] := ARRAY[]::integer[];
  v_signature_color text;
  v_layout_variant text;
  v_module_id text;
  v_module_visible text;
  v_module_size text;
  v_module_order integer;
  v_link_type text;
  v_link_label text;
  v_link_url text;
  v_link_visible text;
  v_link_order integer;
  v_allowed_modules text[] := ARRAY['roll', 'stats', 'signature', 'links', 'recent', 'achievements', 'boundary', 'explore'];
  v_allowed_link_types text[] := ARRAY['website', 'youtube', 'twitch', 'github', 'discord', 'twitter', 'instagram', 'tiktok', 'other'];
BEGIN
  IF p_input IS NULL OR jsonb_typeof(p_input) <> 'object' THEN
    RETURN NULL;
  END IF;

  IF COALESCE(p_input->>'version', '1') <> '1' THEN
    RETURN NULL;
  END IF;

  v_signature_color := COALESCE(NULLIF(p_input->>'signatureColor', ''), p_fallback_color, '#8B7CF6');
  IF v_signature_color !~ '^#[0-9A-Fa-f]{6}$' THEN
    RETURN NULL;
  END IF;
  v_signature_color := upper(v_signature_color);

  v_layout_variant := COALESCE(NULLIF(p_input->>'layoutVariant', ''), 'immersive');
  IF v_layout_variant NOT IN ('immersive', 'editorial', 'focus') THEN
    RETURN NULL;
  END IF;

  IF jsonb_typeof(p_input->'modules') <> 'array'
     OR jsonb_array_length(p_input->'modules') <> cardinality(v_allowed_modules) THEN
    RETURN NULL;
  END IF;

  FOR v_module IN SELECT value FROM jsonb_array_elements(p_input->'modules') LOOP
    IF jsonb_typeof(v_module) <> 'object' THEN
      RETURN NULL;
    END IF;

    v_module_id := v_module->>'id';
    v_module_visible := v_module->>'visible';
    v_module_size := v_module->>'size';

    IF v_module_id IS NULL
       OR NOT (v_module_id = ANY(v_allowed_modules))
       OR v_module_id = ANY(v_seen_modules)
       OR v_module_visible NOT IN ('true', 'false')
       OR v_module_size NOT IN ('wide', 'medium', 'narrow')
       OR (v_module_id = 'roll' AND v_module_visible <> 'true')
       OR COALESCE(v_module->>'order', '') !~ '^[0-7]$' THEN
      RETURN NULL;
    END IF;

    v_module_order := (v_module->>'order')::integer;
    IF v_module_order = ANY(v_seen_link_orders) THEN
      RETURN NULL;
    END IF;

    v_modules := v_modules || jsonb_build_array(jsonb_build_object(
      'id', v_module_id,
      'visible', v_module_visible = 'true',
      'order', v_module_order,
      'size', v_module_size
    ));
    v_seen_modules := array_append(v_seen_modules, v_module_id);
    v_seen_link_orders := array_append(v_seen_link_orders, v_module_order);
  END LOOP;

  IF cardinality(v_seen_modules) <> cardinality(v_allowed_modules)
     OR NOT (v_allowed_modules <@ v_seen_modules) THEN
    RETURN NULL;
  END IF;

  IF p_input ? 'links' AND jsonb_typeof(p_input->'links') <> 'array' THEN
    RETURN NULL;
  END IF;
  IF jsonb_array_length(COALESCE(p_input->'links', '[]'::jsonb)) > 6 THEN
    RETURN NULL;
  END IF;

  v_seen_link_orders := ARRAY[]::integer[];
  FOR v_link IN SELECT value FROM jsonb_array_elements(COALESCE(p_input->'links', '[]'::jsonb)) LOOP
    IF jsonb_typeof(v_link) <> 'object' THEN
      RETURN NULL;
    END IF;

    v_link_type := COALESCE(NULLIF(v_link->>'type', ''), 'other');
    v_link_label := btrim(v_link->>'label');
    v_link_url := btrim(v_link->>'url');
    v_link_visible := COALESCE(v_link->>'visible', 'true');

    IF NOT (v_link_type = ANY(v_allowed_link_types))
       OR v_link_label IS NULL
       OR length(v_link_label) < 1
       OR length(v_link_label) > 40
       OR v_link_label ~ '[[:cntrl:]]'
       OR v_link_url IS NULL
       OR length(v_link_url) > 2048
       OR v_link_url !~ '^https://[^[:space:]<>"'']+$'
       OR v_link_visible NOT IN ('true', 'false')
       OR COALESCE(v_link->>'order', '') !~ '^[0-5]$' THEN
      RETURN NULL;
    END IF;

    v_link_order := (v_link->>'order')::integer;
    IF v_link_order = ANY(v_seen_link_orders) THEN
      RETURN NULL;
    END IF;

    v_links := v_links || jsonb_build_array(jsonb_build_object(
      'type', v_link_type,
      'label', v_link_label,
      'url', v_link_url,
      'visible', v_link_visible = 'true',
      'order', v_link_order
    ));
    v_seen_link_orders := array_append(v_seen_link_orders, v_link_order);
  END LOOP;

  RETURN jsonb_build_object(
    'version', 1,
    'signatureColor', v_signature_color,
    'layoutVariant', v_layout_variant,
    'modules', v_modules,
    'links', v_links
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_my_profile_configuration()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_signature_color text;
  v_default jsonb;
  v_record public.profile_configurations%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT mood_color INTO v_signature_color FROM public.profiles WHERE id = v_user_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Profile not found');
  END IF;

  v_default := public.profile_default_configuration(v_signature_color);
  INSERT INTO public.profile_configurations (user_id, draft_config, published_config)
  VALUES (v_user_id, v_default, v_default)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO v_record
  FROM public.profile_configurations
  WHERE user_id = v_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'version', v_record.config_version,
    'draft', v_record.draft_config,
    'published', v_record.published_config,
    'updated_at', v_record.updated_at,
    'published_at', v_record.published_at
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.save_profile_configuration(p_draft jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_signature_color text;
  v_normalized jsonb;
  v_published jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT mood_color INTO v_signature_color FROM public.profiles WHERE id = v_user_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Profile not found');
  END IF;

  v_normalized := public.normalize_profile_configuration(p_draft, v_signature_color);
  IF v_normalized IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'That profile configuration is not valid.');
  END IF;

  INSERT INTO public.profile_configurations (user_id, draft_config, published_config)
  VALUES (
    v_user_id,
    v_normalized,
    public.profile_default_configuration(v_signature_color)
  )
  ON CONFLICT (user_id) DO UPDATE
  SET draft_config = EXCLUDED.draft_config,
      updated_at = now();

  SELECT published_config INTO v_published
  FROM public.profile_configurations
  WHERE user_id = v_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'draft', v_normalized,
    'published', v_published
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.publish_profile_configuration()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_signature_color text;
  v_default jsonb;
  v_draft jsonb;
  v_normalized jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT mood_color INTO v_signature_color FROM public.profiles WHERE id = v_user_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Profile not found');
  END IF;

  v_default := public.profile_default_configuration(v_signature_color);
  SELECT draft_config INTO v_draft
  FROM public.profile_configurations
  WHERE user_id = v_user_id
  FOR UPDATE;
  v_draft := COALESCE(v_draft, v_default);
  v_normalized := public.normalize_profile_configuration(v_draft, v_signature_color);
  IF v_normalized IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'That profile configuration is not valid.');
  END IF;

  INSERT INTO public.profile_configurations (user_id, draft_config, published_config, published_at)
  VALUES (v_user_id, v_normalized, v_normalized, now())
  ON CONFLICT (user_id) DO UPDATE
  SET draft_config = EXCLUDED.draft_config,
      published_config = EXCLUDED.published_config,
      published_at = EXCLUDED.published_at,
      updated_at = now();

  RETURN jsonb_build_object('success', true, 'published', v_normalized);
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_public_profile_configuration(p_user_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $function$
  SELECT COALESCE(c.published_config, public.profile_default_configuration(p.mood_color))
  FROM public.profiles p
  LEFT JOIN public.profile_configurations c ON c.user_id = p.id
  WHERE p.id = p_user_id;
$function$;

REVOKE ALL ON FUNCTION public.profile_default_configuration(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.normalize_profile_configuration(jsonb, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_my_profile_configuration() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.save_profile_configuration(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.publish_profile_configuration() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_public_profile_configuration(uuid) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.get_my_profile_configuration() TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_profile_configuration(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.publish_profile_configuration() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_profile_configuration(uuid) TO anon, authenticated;

COMMIT;
