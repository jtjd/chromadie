-- Compact profile contract: six total links, rendered as one finite rail.
-- Keep the V1/V2 storage boundary additive, but remove stale seventh-plus
-- entries so the database, editor, preview, and public renderers share one
-- hard limit.

BEGIN;

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
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_input) WITH ORDINALITY rows(value, row_number) WHERE row_number <= 6 ORDER BY row_number LOOP
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
       AND v_order BETWEEN 0 AND 5
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

-- These helpers are migration-only data hygiene primitives. They preserve the
-- current first-six order and reindex it before the stricter V2 normalizer is
-- used again. Browser roles never receive execution on either helper.
CREATE OR REPLACE FUNCTION public.profile_trim_six_link_array(p_input jsonb)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path TO pg_catalog
AS $function$
  SELECT CASE
    WHEN jsonb_typeof(coalesce(p_input, '[]'::jsonb)) = 'array' THEN
      coalesce(
        (
          SELECT jsonb_agg(
            CASE
              WHEN jsonb_typeof(value) = 'object'
                THEN jsonb_set(value, '{order}', to_jsonb((ordinality - 1)::integer), true)
              ELSE value
            END
            ORDER BY ordinality
          )
          FROM jsonb_array_elements(coalesce(p_input, '[]'::jsonb)) WITH ORDINALITY rows(value, ordinality)
          WHERE ordinality <= 6
        ),
        '[]'::jsonb
      )
    ELSE '[]'::jsonb
  END;
$function$;

CREATE OR REPLACE FUNCTION public.profile_trim_six_link_config(p_input jsonb)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path TO public, pg_catalog
AS $function$
  WITH root AS (
    SELECT CASE
      WHEN jsonb_typeof(p_input) = 'object' AND p_input ? 'links'
        THEN jsonb_set(p_input, '{links}', public.profile_trim_six_link_array(p_input->'links'), true)
      ELSE p_input
    END AS value
  )
  SELECT CASE
    WHEN jsonb_typeof(value->'base') = 'object' AND value->'base' ? 'links'
      THEN jsonb_set(value, '{base}', jsonb_set(value->'base', '{links}', public.profile_trim_six_link_array(value->'base'->'links'), true), true)
    ELSE value
  END
  FROM root;
$function$;

CREATE OR REPLACE FUNCTION public.profile_configuration_v2_from_v1(p_input jsonb)
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path TO public, pg_catalog
AS $function$
  SELECT jsonb_build_object(
    'version', 2,
    'base', CASE
      WHEN jsonb_typeof(coalesce(p_input, '{}'::jsonb)) = 'object'
        THEN jsonb_set(coalesce(p_input, '{}'::jsonb), '{links}', public.profile_v2_normalize_links(p_input->'links'), true)
      ELSE '{}'::jsonb
    END,
    'links', public.profile_v2_normalize_links(p_input->'links'),
    'identity', coalesce(p_input->'identityPresentation', public.profile_v2_normalize_identity('{}'::jsonb)),
    'content', coalesce(p_input->'content', public.profile_v2_normalize_content('{}'::jsonb)),
    'widgets', coalesce(p_input->'widgets', '[]'::jsonb),
    'metadata', coalesce(p_input->'metadata', public.profile_v2_normalize_metadata('{}'::jsonb)),
    'sharing', jsonb_build_object('qrEnabled', true, 'previewEnabled', true)
  );
$function$;

-- The product decision is to permanently remove entries beyond six. Preserve
-- the first six in their current array order, including in the V2 base copy.
UPDATE public.profile_configurations
SET draft_config = public.profile_trim_six_link_config(draft_config),
    published_config = public.profile_trim_six_link_config(published_config),
    draft_config_v2 = public.profile_trim_six_link_config(draft_config_v2),
    published_config_v2 = public.profile_trim_six_link_config(published_config_v2),
    updated_at = now(),
    v2_updated_at = now(),
    published_at = CASE
      WHEN (jsonb_typeof(published_config->'links') = 'array' AND jsonb_array_length(published_config->'links') > 6)
        OR (jsonb_typeof(published_config_v2->'links') = 'array' AND jsonb_array_length(published_config_v2->'links') > 6)
        OR (jsonb_typeof(published_config_v2->'base'->'links') = 'array' AND jsonb_array_length(published_config_v2->'base'->'links') > 6)
        THEN now()
      ELSE published_at
    END
WHERE (jsonb_typeof(draft_config->'links') = 'array' AND jsonb_array_length(draft_config->'links') > 6)
   OR (jsonb_typeof(published_config->'links') = 'array' AND jsonb_array_length(published_config->'links') > 6)
   OR (jsonb_typeof(draft_config_v2->'links') = 'array' AND jsonb_array_length(draft_config_v2->'links') > 6)
   OR (jsonb_typeof(published_config_v2->'links') = 'array' AND jsonb_array_length(published_config_v2->'links') > 6)
   OR (jsonb_typeof(draft_config_v2->'base'->'links') = 'array' AND jsonb_array_length(draft_config_v2->'base'->'links') > 6)
   OR (jsonb_typeof(published_config_v2->'base'->'links') = 'array' AND jsonb_array_length(published_config_v2->'base'->'links') > 6);

ALTER TABLE public.profile_configurations
  DROP CONSTRAINT IF EXISTS profile_configurations_draft_links_max_check,
  DROP CONSTRAINT IF EXISTS profile_configurations_published_links_max_check,
  DROP CONSTRAINT IF EXISTS profile_configurations_draft_v2_links_max_check,
  DROP CONSTRAINT IF EXISTS profile_configurations_published_v2_links_max_check;

ALTER TABLE public.profile_configurations
  ADD CONSTRAINT profile_configurations_draft_links_max_check CHECK (
    jsonb_typeof(draft_config->'links') <> 'array' OR jsonb_array_length(draft_config->'links') <= 6
  ),
  ADD CONSTRAINT profile_configurations_published_links_max_check CHECK (
    jsonb_typeof(published_config->'links') <> 'array' OR jsonb_array_length(published_config->'links') <= 6
  ),
  ADD CONSTRAINT profile_configurations_draft_v2_links_max_check CHECK (
    draft_config_v2 IS NULL
    OR (
      (jsonb_typeof(draft_config_v2->'links') <> 'array' OR jsonb_array_length(draft_config_v2->'links') <= 6)
      AND (jsonb_typeof(draft_config_v2->'base'->'links') <> 'array' OR jsonb_array_length(draft_config_v2->'base'->'links') <= 6)
    )
  ),
  ADD CONSTRAINT profile_configurations_published_v2_links_max_check CHECK (
    published_config_v2 IS NULL
    OR (
      (jsonb_typeof(published_config_v2->'links') <> 'array' OR jsonb_array_length(published_config_v2->'links') <= 6)
      AND (jsonb_typeof(published_config_v2->'base'->'links') <> 'array' OR jsonb_array_length(published_config_v2->'base'->'links') <= 6)
    )
  );

REVOKE ALL ON FUNCTION public.profile_trim_six_link_array(jsonb) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.profile_trim_six_link_config(jsonb) FROM PUBLIC, anon, authenticated, service_role;

COMMIT;
