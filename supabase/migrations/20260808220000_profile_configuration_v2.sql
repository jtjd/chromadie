-- Milestone 11: additive ProfileConfigurationV2 boundary.
-- V1 remains readable and writable during rollout. V2 adds bounded identity,
-- content, provider, link, metadata, and sharing fields without exposing the
-- profile configuration table to browser table writes.

BEGIN;

ALTER TABLE public.profile_configurations
  ADD COLUMN IF NOT EXISTS draft_config_v2 jsonb,
  ADD COLUMN IF NOT EXISTS published_config_v2 jsonb,
  ADD COLUMN IF NOT EXISTS v2_updated_at timestamptz;

ALTER TABLE public.profile_configurations
  DROP CONSTRAINT IF EXISTS profile_configurations_draft_v2_object_check,
  DROP CONSTRAINT IF EXISTS profile_configurations_published_v2_object_check;

ALTER TABLE public.profile_configurations
  ADD CONSTRAINT profile_configurations_draft_v2_object_check CHECK (
    draft_config_v2 IS NULL OR (jsonb_typeof(draft_config_v2) = 'object' AND draft_config_v2->>'version' = '2')
  ),
  ADD CONSTRAINT profile_configurations_published_v2_object_check CHECK (
    published_config_v2 IS NULL OR (jsonb_typeof(published_config_v2) = 'object' AND published_config_v2->>'version' = '2')
  );

CREATE OR REPLACE FUNCTION public.profile_v2_safe_text(p_value text, p_max integer)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path TO pg_catalog
AS $function$
  SELECT left(btrim(regexp_replace(coalesce(p_value, ''), E'[\\x00-\\x1F\\x7F-\\x9F]', '', 'g')), greatest(0, p_max));
$function$;

CREATE OR REPLACE FUNCTION public.profile_v2_normalize_links(p_input jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SET search_path TO public, pg_catalog
AS $function$
DECLARE
  v_item jsonb;
  v_key text;
  v_type text;
  v_label text;
  v_url text;
  v_order integer;
  v_result jsonb := '[]'::jsonb;
  v_seen text[] := ARRAY[]::text[];
  v_index integer := 0;
  v_allowed text[] := ARRAY['website','youtube','twitch','github','discord','twitter','instagram','tiktok','linkedin','bluesky','mastodon','kick','patreon','other'];
BEGIN
  IF jsonb_typeof(coalesce(p_input, '[]'::jsonb)) <> 'array' THEN RETURN '[]'::jsonb; END IF;
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_input) WITH ORDINALITY rows(value, row_number) WHERE row_number <= 25 ORDER BY row_number LOOP
    IF jsonb_typeof(v_item) <> 'object' THEN CONTINUE; END IF;
    v_type := lower(btrim(coalesce(v_item->>'type', 'other')));
    v_label := public.profile_v2_safe_text(v_item->>'label', 40);
    v_url := btrim(coalesce(v_item->>'url', ''));
    v_order := CASE WHEN coalesce(v_item->>'order', '') ~ '^[0-9]{1,2}$' THEN (v_item->>'order')::integer ELSE v_index END;
    v_key := lower(btrim(coalesce(v_item->>'key', '')));
    IF v_key !~ '^[a-z0-9][a-z0-9_-]{0,31}$' THEN v_key := 'l' || substring(md5(coalesce(v_label, '') || '|' || v_url || '|' || v_index::text) FROM 1 FOR 10); END IF;
    IF v_type = ANY(v_allowed)
       AND v_label <> ''
       AND v_url ~ '^https://[^[:space:]<>"'']+$'
       AND length(v_url) <= 2048
       AND v_order BETWEEN 0 AND 24
       AND NOT v_key = ANY(v_seen) THEN
      v_result := v_result || jsonb_build_array(jsonb_build_object(
        'key', v_key,
        'type', v_type,
        'label', v_label,
        'url', v_url,
        'visible', CASE WHEN v_item->>'visible' IN ('true', 'false') THEN (v_item->>'visible')::boolean ELSE true END,
        'order', v_order
      ));
      v_seen := array_append(v_seen, v_key);
      v_index := v_index + 1;
    END IF;
  END LOOP;
  RETURN coalesce((SELECT jsonb_agg(item ORDER BY (item->>'order')::integer) FROM jsonb_array_elements(v_result) item), '[]'::jsonb);
END;
$function$;

CREATE OR REPLACE FUNCTION public.profile_v2_normalize_widgets(p_input jsonb, p_legacy_type text DEFAULT NULL, p_legacy_id text DEFAULT NULL)
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
  v_result jsonb := '[]'::jsonb;
  v_seen text[] := ARRAY[]::text[];
  v_order integer := 0;
  v_valid boolean;
BEGIN
  IF jsonb_typeof(coalesce(p_input, '[]'::jsonb)) <> 'array' THEN p_input := '[]'::jsonb; END IF;
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_input) WITH ORDINALITY rows(value, row_number) WHERE row_number <= 4 ORDER BY row_number LOOP
    IF jsonb_typeof(v_item) <> 'object' THEN CONTINUE; END IF;
    v_provider := lower(btrim(coalesce(v_item->>'provider', '')));
    v_type := lower(btrim(coalesce(v_item->>'type', '')));
    v_id := btrim(coalesce(v_item->>'id', ''));
    v_valid := (v_provider = 'spotify' AND v_type IN ('track','playlist','album') AND v_id ~ '^[A-Za-z0-9]{22}$')
      OR (v_provider = 'youtube' AND v_type = 'video' AND v_id ~ '^[A-Za-z0-9_-]{11}$')
      OR (v_provider = 'github' AND v_type = 'user' AND v_id ~ '^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$')
      OR (v_provider = 'twitch' AND v_type = 'channel' AND v_id ~ '^[A-Za-z0-9_]{4,25}$')
      OR (v_provider = 'lastfm' AND v_type = 'user' AND v_id ~ '^[A-Za-z0-9][A-Za-z0-9_-]{0,38}$')
      OR (v_provider = 'discord' AND v_type = 'server' AND v_id ~ '^[A-Za-z0-9-]{2,32}$');
    IF v_valid AND NOT v_provider = ANY(v_seen) THEN
      v_result := v_result || jsonb_build_array(jsonb_build_object('provider', v_provider, 'type', v_type, 'id', v_id, 'visible', CASE WHEN v_item->>'visible' IN ('true', 'false') THEN (v_item->>'visible')::boolean ELSE true END, 'order', v_order));
      v_seen := array_append(v_seen, v_provider);
      v_order := v_order + 1;
    END IF;
    IF v_order >= 4 THEN EXIT; END IF;
  END LOOP;
  IF v_order = 0 AND p_legacy_type IN ('track','playlist','album') AND coalesce(p_legacy_id, '') ~ '^[A-Za-z0-9]{22}$' THEN
    RETURN jsonb_build_array(jsonb_build_object('provider','spotify','type',p_legacy_type,'id',p_legacy_id,'visible',true,'order',0));
  END IF;
  RETURN v_result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.profile_v2_normalize_content(p_input jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SET search_path TO public, pg_catalog
AS $function$
DECLARE
  v_about jsonb := CASE WHEN jsonb_typeof(coalesce(p_input, '{}'::jsonb)->'about') = 'object' THEN p_input->'about' ELSE '{}'::jsonb END;
  v_markdown text;
  v_projects jsonb;
BEGIN
  IF coalesce(p_input->>'version', '1') <> '2' THEN RETURN public.normalize_profile_content(p_input); END IF;
  v_markdown := left(btrim(regexp_replace(coalesce(v_about->>'markdown', v_about->>'body', ''), '<[^>]*>', '', 'g')), 1200);
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'title', public.profile_v2_safe_text(item->>'title', 60),
    'description', public.profile_v2_safe_text(item->>'description', 180),
    'url', CASE WHEN btrim(coalesce(item->>'url','')) ~ '^https://[^[:space:]<>"'']+$' THEN left(btrim(item->>'url'), 2048) ELSE '' END,
    'visible', CASE WHEN item->>'visible' IN ('true', 'false') THEN (item->>'visible')::boolean ELSE true END,
    'order', rows.row_number - 1
  ) ORDER BY rows.row_number), '[]'::jsonb)
  INTO v_projects
  FROM jsonb_array_elements(CASE WHEN jsonb_typeof(p_input->'projects') = 'array' THEN p_input->'projects' ELSE '[]'::jsonb END) WITH ORDINALITY rows(item, row_number)
  WHERE rows.row_number <= 10 AND jsonb_typeof(item) = 'object';
  RETURN jsonb_build_object('version', 2, 'about', jsonb_build_object('visible', CASE WHEN v_about->>'visible' IN ('true', 'false') THEN (v_about->>'visible')::boolean ELSE true END, 'heading', coalesce(nullif(public.profile_v2_safe_text(v_about->>'heading', 40), ''), 'About'), 'markdown', v_markdown), 'projects', v_projects);
END;
$function$;

CREATE OR REPLACE FUNCTION public.profile_v2_normalize_identity(p_input jsonb)
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path TO public, pg_catalog
AS $function$
  SELECT jsonb_build_object(
    'version', 1,
    'location', public.profile_v2_safe_text(p_input->>'location', 60),
    'timezone', CASE WHEN coalesce(p_input->>'timezone','') ~ '^[A-Za-z0-9_+./:-]{1,40}$' THEN p_input->>'timezone' ELSE '' END,
    'showJoinDate', CASE WHEN p_input->>'showJoinDate' IN ('true', 'false') THEN (p_input->>'showJoinDate')::boolean ELSE false END,
    'showAvatar', CASE WHEN p_input->>'showAvatar' IN ('true', 'false') THEN (p_input->>'showAvatar')::boolean ELSE true END,
    'descriptionMode', CASE WHEN p_input->>'descriptionMode' IN ('plain','typewriter') THEN p_input->>'descriptionMode' ELSE 'plain' END,
    'entryAnimation', CASE WHEN p_input->>'entryAnimation' IN ('none','fade','rise','focus') THEN p_input->>'entryAnimation' ELSE 'none' END
  );
$function$;

CREATE OR REPLACE FUNCTION public.profile_v2_normalize_metadata(p_input jsonb)
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path TO public, pg_catalog
AS $function$
  SELECT jsonb_build_object(
    'version', 1,
    'title', public.profile_v2_safe_text(p_input->>'title', 80),
    'description', public.profile_v2_safe_text(p_input->>'description', 200),
    'embedColor', CASE WHEN p_input->>'embedColor' ~ '^#[0-9A-Fa-f]{6}$' THEN upper(p_input->>'embedColor') ELSE '#CDD2FF' END,
    'faviconPath', CASE WHEN coalesce(p_input->>'faviconPath','') ~ '^profile_media/[0-9a-f-]{36}/[0-9a-f-]{36}[.]webp$' THEN p_input->>'faviconPath' ELSE NULL END,
    'bannerPath', CASE WHEN coalesce(p_input->>'bannerPath','') ~ '^profile_media/[0-9a-f-]{36}/[0-9a-f-]{36}[.]webp$' THEN p_input->>'bannerPath' ELSE NULL END
  );
$function$;

-- The legacy normalizer remains the base compatibility contract. It receives a
-- six-link/two-widget projection, then V2-safe fields are overlaid additively.
CREATE OR REPLACE FUNCTION public.normalize_profile_configuration(p_input jsonb, p_fallback_color text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SET search_path TO public, pg_catalog
AS $function$
DECLARE
  v_base_input jsonb := coalesce(p_input, '{}'::jsonb);
  v_v2_input jsonb := coalesce(p_input, '{}'::jsonb);
  v_base jsonb;
  v_project_limit integer := 4;
  v_widget_limit integer := 2;
BEGIN
  IF jsonb_typeof(v_base_input) <> 'object' OR coalesce(v_base_input->>'version','1') <> '1' THEN RETURN NULL; END IF;
  IF auth.uid() IS NOT NULL AND (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_staff)
    OR EXISTS (SELECT 1 FROM public.profile_entitlements WHERE user_id = auth.uid() AND entitlement_key IN ('chromadie_plus', 'atelier_plus'))
  ) THEN
    v_project_limit := 10;
    v_widget_limit := 4;
  END IF;
  v_base_input := jsonb_set(v_base_input, '{links}', coalesce((SELECT jsonb_agg(item ORDER BY ord) FROM (SELECT value item, ord FROM jsonb_array_elements(CASE WHEN jsonb_typeof(v_base_input->'links') = 'array' THEN v_base_input->'links' ELSE '[]'::jsonb END) WITH ORDINALITY rows(value, ord) LIMIT 6) limited), '[]'::jsonb), true);
  v_base_input := jsonb_set(v_base_input, '{widgets}', coalesce((SELECT jsonb_agg(item ORDER BY ord) FROM (SELECT value item, ord FROM jsonb_array_elements(CASE WHEN jsonb_typeof(v_base_input->'widgets') = 'array' THEN v_base_input->'widgets' ELSE '[]'::jsonb END) WITH ORDINALITY rows(value, ord) LIMIT v_widget_limit) limited), '[]'::jsonb), true);
  IF jsonb_typeof(v_v2_input->'content') = 'object' AND v_v2_input->'content'->>'version' = '2' THEN
    v_v2_input := jsonb_set(v_v2_input, '{content,projects}', coalesce((SELECT jsonb_agg(item ORDER BY ord) FROM (SELECT value item, ord FROM jsonb_array_elements(CASE WHEN jsonb_typeof(v_v2_input->'content'->'projects') = 'array' THEN v_v2_input->'content'->'projects' ELSE '[]'::jsonb END) WITH ORDINALITY rows(value, ord) LIMIT v_project_limit) limited), '[]'::jsonb), true);
  END IF;
  v_v2_input := jsonb_set(v_v2_input, '{widgets}', coalesce((SELECT jsonb_agg(item ORDER BY ord) FROM (SELECT value item, ord FROM jsonb_array_elements(CASE WHEN jsonb_typeof(v_v2_input->'widgets') = 'array' THEN v_v2_input->'widgets' ELSE '[]'::jsonb END) WITH ORDINALITY rows(value, ord) LIMIT v_widget_limit) limited), '[]'::jsonb), true);
  v_base := public.normalize_profile_configuration_legacy_v2(v_base_input, p_fallback_color);
  IF v_base IS NULL THEN RETURN NULL; END IF;
  v_base := v_base || jsonb_build_object(
    'templateKey', CASE
      WHEN p_input->>'templateKey' IN ('signal', 'editorial', 'archive', 'atelier', 'custom') THEN p_input->>'templateKey'
      WHEN v_base->>'layoutVariant' = 'editorial' THEN 'editorial'
      WHEN v_base->>'layoutVariant' = 'focus' THEN 'archive'
      ELSE 'signal'
    END
  );
  RETURN v_base
    || jsonb_build_object(
      'links', public.profile_v2_normalize_links(p_input->'links'),
      'content', public.profile_v2_normalize_content(v_v2_input->'content'),
      'widgets', public.profile_v2_normalize_widgets(v_v2_input->'widgets', p_input->>'spotify_type', p_input->>'spotify_id')
    )
    || CASE WHEN jsonb_typeof(p_input->'identityPresentation') = 'object' THEN jsonb_build_object('identityPresentation', public.profile_v2_normalize_identity(p_input->'identityPresentation')) ELSE '{}'::jsonb END
    || CASE WHEN jsonb_typeof(p_input->'metadata') = 'object' THEN jsonb_build_object('metadata', public.profile_v2_normalize_metadata(p_input->'metadata')) ELSE '{}'::jsonb END
    || CASE WHEN jsonb_typeof(p_input->'linkStyle') = 'object' THEN jsonb_build_object('linkStyle', jsonb_build_object('alignment', CASE WHEN p_input->'linkStyle'->>'alignment' IN ('left','center','right') THEN p_input->'linkStyle'->>'alignment' ELSE 'left' END, 'monochrome', CASE WHEN p_input->'linkStyle'->>'monochrome' IN ('true', 'false') THEN (p_input->'linkStyle'->>'monochrome')::boolean ELSE false END, 'size', least(2, greatest(0, CASE WHEN p_input->'linkStyle'->>'size' ~ '^-?[0-9]{1,3}$' THEN (p_input->'linkStyle'->>'size')::integer ELSE 0 END)), 'glow', least(2, greatest(0, CASE WHEN p_input->'linkStyle'->>'glow' ~ '^-?[0-9]{1,3}$' THEN (p_input->'linkStyle'->>'glow')::integer ELSE 0 END)))) ELSE '{}'::jsonb END;
END;
$function$;

CREATE OR REPLACE FUNCTION public.profile_widgets_patch(p_patch jsonb)
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path TO public, pg_catalog
AS $function$
  SELECT jsonb_build_object('widgets', CASE WHEN jsonb_typeof(coalesce(p_patch, '{}'::jsonb)->'widgets') = 'array' THEN coalesce(p_patch, '{}'::jsonb)->'widgets' ELSE '[]'::jsonb END);
$function$;

CREATE OR REPLACE FUNCTION public.profile_content_patch(p_patch jsonb)
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path TO public, pg_catalog
AS $function$
  SELECT jsonb_build_object(
    'version', CASE WHEN coalesce(p_patch->>'version','1') = '2' THEN 2 ELSE 1 END,
    'about', CASE WHEN jsonb_typeof(coalesce(p_patch, '{}'::jsonb)->'about') = 'object' THEN p_patch->'about' ELSE '{}'::jsonb END,
    'projects', CASE WHEN jsonb_typeof(coalesce(p_patch, '{}'::jsonb)->'projects') = 'array' THEN p_patch->'projects' ELSE '[]'::jsonb END
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
  v_template_key text := lower(btrim(coalesce(p_patch->>'templateKey', '')));
BEGIN
  IF jsonb_typeof(p_patch) <> 'object' THEN RETURN v_patch; END IF;
  IF p_patch ? 'layoutVariant' THEN v_patch := v_patch || jsonb_build_object('layoutVariant', p_patch->'layoutVariant'); END IF;
  IF p_patch ? 'modules' THEN v_patch := v_patch || jsonb_build_object('modules', p_patch->'modules'); END IF;
  IF p_patch ? 'links' THEN v_patch := v_patch || jsonb_build_object('links', p_patch->'links'); END IF;
  IF p_patch ? 'linkStyle' THEN v_patch := v_patch || jsonb_build_object('linkStyle', p_patch->'linkStyle'); END IF;
  IF p_patch ? 'metadata' THEN v_patch := v_patch || jsonb_build_object('metadata', p_patch->'metadata'); END IF;
  IF v_template_key IN ('signal','editorial','archive','custom') THEN
    v_patch := v_patch || jsonb_build_object('templateKey', v_template_key);
  ELSIF v_template_key = 'atelier' AND auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM public.profile_entitlements WHERE user_id = auth.uid() AND entitlement_key IN ('atelier_plus','chromadie_plus')) THEN
    v_patch := v_patch || jsonb_build_object('templateKey', 'atelier');
  END IF;
  RETURN v_patch;
END;
$function$;

CREATE OR REPLACE FUNCTION public.profile_configuration_v2_from_v1(p_input jsonb)
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path TO public, pg_catalog
AS $function$
  SELECT jsonb_build_object('version', 2, 'base', p_input, 'links', coalesce(p_input->'links','[]'::jsonb), 'identity', coalesce(p_input->'identityPresentation', public.profile_v2_normalize_identity('{}'::jsonb)), 'content', coalesce(p_input->'content', public.profile_v2_normalize_content('{}'::jsonb)), 'widgets', coalesce(p_input->'widgets','[]'::jsonb), 'metadata', coalesce(p_input->'metadata', public.profile_v2_normalize_metadata('{}'::jsonb)), 'sharing', jsonb_build_object('qrEnabled', true, 'previewEnabled', true));
$function$;

UPDATE public.profile_configurations
SET draft_config = public.normalize_profile_configuration(draft_config, draft_config->>'signatureColor'),
    published_config = public.normalize_profile_configuration(published_config, published_config->>'signatureColor'),
    draft_config_v2 = public.profile_configuration_v2_from_v1(public.normalize_profile_configuration(draft_config, draft_config->>'signatureColor')),
    published_config_v2 = public.profile_configuration_v2_from_v1(public.normalize_profile_configuration(published_config, published_config->>'signatureColor')),
    v2_updated_at = now();

CREATE OR REPLACE FUNCTION public.get_my_profile_configuration_v2()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, pg_catalog
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_record public.profile_configurations%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Not authenticated'); END IF;
  SELECT * INTO v_record FROM public.profile_configurations WHERE user_id = v_user_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Profile not found'); END IF;
  RETURN jsonb_build_object('success', true, 'version', 2, 'draft', coalesce(v_record.draft_config_v2, public.profile_configuration_v2_from_v1(v_record.draft_config)), 'published', coalesce(v_record.published_config_v2, public.profile_configuration_v2_from_v1(v_record.published_config)), 'updated_at', v_record.updated_at, 'published_at', v_record.published_at);
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_public_profile_configuration_v2(p_user_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $function$
  SELECT coalesce(c.published_config_v2, public.profile_configuration_v2_from_v1(public.get_public_profile_configuration(p_user_id)))
  FROM public.profiles p LEFT JOIN public.profile_configurations c ON c.user_id = p.id WHERE p.id = p_user_id;
$function$;

CREATE OR REPLACE FUNCTION public.save_profile_configuration_v2(p_draft jsonb, p_expected_updated_at timestamptz DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, pg_catalog
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_fallback text;
  v_record public.profile_configurations%ROWTYPE;
  v_base jsonb;
  v_normalized jsonb;
BEGIN
  IF v_user_id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Not authenticated'); END IF;
  SELECT mood_color INTO v_fallback FROM public.profiles WHERE id = v_user_id;
  SELECT * INTO v_record FROM public.profile_configurations WHERE user_id = v_user_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Profile configuration not found'); END IF;
  IF p_expected_updated_at IS NOT NULL AND v_record.updated_at <> p_expected_updated_at THEN RETURN jsonb_build_object('success', false, 'code', 'conflict', 'error', 'This profile changed in another tab.'); END IF;
  IF jsonb_typeof(p_draft) <> 'object' OR p_draft->>'version' <> '2' THEN RETURN jsonb_build_object('success', false, 'error', 'That profile configuration is not valid.'); END IF;
  v_base := coalesce(p_draft->'base', p_draft) || jsonb_build_object('version', 1, 'links', p_draft->'links', 'content', p_draft->'content', 'widgets', p_draft->'widgets');
  IF p_draft ? 'identity' THEN v_base := v_base || jsonb_build_object('identityPresentation', p_draft->'identity'); END IF;
  IF p_draft ? 'metadata' THEN v_base := v_base || jsonb_build_object('metadata', p_draft->'metadata'); END IF;
  v_normalized := public.normalize_profile_configuration(v_base, v_fallback);
  IF v_normalized IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'That profile configuration is not valid.'); END IF;
  UPDATE public.profile_configurations SET draft_config = v_normalized, draft_config_v2 = public.profile_configuration_v2_from_v1(v_normalized) || jsonb_build_object('identity', public.profile_v2_normalize_identity(p_draft->'identity'), 'metadata', public.profile_v2_normalize_metadata(p_draft->'metadata'), 'links', public.profile_v2_normalize_links(p_draft->'links'), 'content', v_normalized->'content', 'widgets', v_normalized->'widgets'), updated_at = now(), v2_updated_at = now() WHERE user_id = v_user_id;
  RETURN jsonb_build_object('success', true, 'version', 2, 'draft', (SELECT draft_config_v2 FROM public.profile_configurations WHERE user_id = v_user_id), 'published', v_record.published_config_v2, 'updated_at', (SELECT updated_at FROM public.profile_configurations WHERE user_id = v_user_id));
END;
$function$;

CREATE OR REPLACE FUNCTION public.publish_profile_configuration_v2(p_expected_updated_at timestamptz DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, pg_catalog
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_record public.profile_configurations%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Not authenticated'); END IF;
  SELECT * INTO v_record FROM public.profile_configurations WHERE user_id = v_user_id FOR UPDATE;
  IF NOT FOUND OR v_record.draft_config_v2 IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'There is no V2 draft to publish.'); END IF;
  IF p_expected_updated_at IS NOT NULL AND v_record.updated_at <> p_expected_updated_at THEN RETURN jsonb_build_object('success', false, 'code', 'conflict', 'error', 'This profile changed in another tab.'); END IF;
  UPDATE public.profile_configurations SET published_config_v2 = draft_config_v2, published_config = draft_config, published_at = now(), updated_at = now(), v2_updated_at = now() WHERE user_id = v_user_id;
  RETURN jsonb_build_object('success', true, 'version', 2, 'draft', (SELECT draft_config_v2 FROM public.profile_configurations WHERE user_id = v_user_id), 'published', (SELECT published_config_v2 FROM public.profile_configurations WHERE user_id = v_user_id), 'published_at', (SELECT published_at FROM public.profile_configurations WHERE user_id = v_user_id));
END;
$function$;

CREATE OR REPLACE FUNCTION public.save_profile_identity_presentation(p_patch jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, pg_catalog
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_identity jsonb;
  v_draft jsonb;
  v_published jsonb;
BEGIN
  IF v_user_id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Not authenticated'); END IF;
  v_identity := public.profile_v2_normalize_identity(coalesce(p_patch->'identityPresentation', p_patch));
  SELECT draft_config, published_config INTO v_draft, v_published FROM public.profile_configurations WHERE user_id = v_user_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Profile configuration not found'); END IF;
  v_draft := jsonb_set(v_draft, '{identityPresentation}', v_identity, true);
  v_published := jsonb_set(v_published, '{identityPresentation}', v_identity, true);
  UPDATE public.profile_configurations SET draft_config = v_draft, published_config = v_published, draft_config_v2 = public.profile_configuration_v2_from_v1(v_draft), published_config_v2 = public.profile_configuration_v2_from_v1(v_published), updated_at = now(), v2_updated_at = now() WHERE user_id = v_user_id;
  RETURN jsonb_build_object('success', true, 'identityPresentation', v_identity, 'draft', v_draft, 'published', v_published);
END;
$function$;

CREATE OR REPLACE FUNCTION public.save_profile_configuration_presentation(p_patch jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, pg_catalog
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_fallback text;
  v_draft jsonb;
  v_published jsonb;
  v_patch jsonb := coalesce(p_patch, '{}'::jsonb);
BEGIN
  IF v_user_id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Not authenticated'); END IF;
  SELECT mood_color INTO v_fallback FROM public.profiles WHERE id = v_user_id;
  SELECT draft_config, published_config INTO v_draft, v_published FROM public.profile_configurations WHERE user_id = v_user_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Profile configuration not found'); END IF;
  IF v_patch ? 'linkStyle' THEN
    v_draft := jsonb_set(v_draft, '{linkStyle}', v_patch->'linkStyle', true);
    v_published := jsonb_set(v_published, '{linkStyle}', v_patch->'linkStyle', true);
  END IF;
  IF v_patch ? 'metadata' THEN
    v_draft := jsonb_set(v_draft, '{metadata}', v_patch->'metadata', true);
    v_published := jsonb_set(v_published, '{metadata}', v_patch->'metadata', true);
  END IF;
  v_draft := public.normalize_profile_configuration(v_draft, v_fallback);
  v_published := public.normalize_profile_configuration(v_published, v_fallback);
  IF v_draft IS NULL OR v_published IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'That profile presentation is not valid.'); END IF;
  UPDATE public.profile_configurations SET draft_config = v_draft, published_config = v_published, draft_config_v2 = public.profile_configuration_v2_from_v1(v_draft), published_config_v2 = public.profile_configuration_v2_from_v1(v_published), updated_at = now(), v2_updated_at = now() WHERE user_id = v_user_id;
  RETURN jsonb_build_object('success', true, 'draft', v_draft, 'published', v_published);
END;
$function$;

CREATE OR REPLACE FUNCTION public.public_profile_identity_projection(p_user_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $function$
  SELECT jsonb_build_object(
    'id', p.id,
    'username', p.username,
    'display_name', p.display_name,
    'bio', p.bio,
    'created_at', p.created_at,
    'current_streak', p.current_streak,
    'longest_streak', p.longest_streak,
    'lifetime_ep', p.lifetime_ep,
    'total_rolls', p.total_rolls,
    'equipped_cosmetics', p.equipped_cosmetics,
    'equipped_badges', p.equipped_badges,
    'mood_color', p.mood_color,
    'best_roll_score', p.best_roll_score,
    'best_roll_hex', p.best_roll_hex,
    'best_roll_rarity', p.best_roll_rarity,
    'is_staff', p.is_staff
  )
  FROM public.profiles p WHERE p.id = p_user_id;
$function$;

REVOKE ALL ON FUNCTION public.profile_v2_safe_text(text, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.profile_v2_normalize_links(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.profile_v2_normalize_widgets(jsonb, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.profile_v2_normalize_content(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.profile_v2_normalize_identity(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.profile_v2_normalize_metadata(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.normalize_profile_configuration(jsonb, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.profile_widgets_patch(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.profile_configuration_v2_from_v1(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_my_profile_configuration_v2() FROM PUBLIC, anon, service_role;
REVOKE ALL ON FUNCTION public.get_public_profile_configuration_v2(uuid) FROM PUBLIC, service_role;
REVOKE ALL ON FUNCTION public.save_profile_configuration_v2(jsonb, timestamptz) FROM PUBLIC, anon, service_role;
REVOKE ALL ON FUNCTION public.publish_profile_configuration_v2(timestamptz) FROM PUBLIC, anon, service_role;
REVOKE ALL ON FUNCTION public.save_profile_identity_presentation(jsonb) FROM PUBLIC, anon, service_role;
REVOKE ALL ON FUNCTION public.save_profile_configuration_presentation(jsonb) FROM PUBLIC, anon, service_role;
REVOKE ALL ON FUNCTION public.public_profile_identity_projection(uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_my_profile_configuration_v2() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_profile_configuration_v2(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_profile_configuration_v2(jsonb, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.publish_profile_configuration_v2(timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_profile_identity_presentation(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_profile_configuration_presentation(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_profile_identity(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_profile_identity_by_id(uuid) TO anon, authenticated;

COMMIT;
