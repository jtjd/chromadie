-- Replace the temporary multi-layout catalog with the two active profile
-- compositions used by the redesigned product: Compact and Immersive.
-- Existing profile configuration is rewritten once; no legacy layout resolver
-- remains in runtime code after this migration.
BEGIN;

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
  v_fallback text := lower(btrim(coalesce(p_fallback, '')));
BEGIN
  v_value := replace(regexp_replace(v_value, '^profile_layout_', ''), '_', '-');
  v_fallback := replace(regexp_replace(v_fallback, '^profile_layout_', ''), '_', '-');
  IF v_value = 'compact' THEN RETURN 'compact'; END IF;
  IF v_value = 'full-bleed' THEN RETURN 'full-bleed'; END IF;
  IF v_fallback = 'full-bleed' THEN RETURN 'full-bleed'; END IF;
  RETURN 'compact';
END;
$function$;

CREATE OR REPLACE FUNCTION public.profile_composition_patch(p_patch jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SET search_path TO public, pg_catalog
AS $function$
DECLARE
  v_patch jsonb := '{}'::jsonb;
  v_layout text := public.profile_layout_key(p_patch->>'layoutVariant', 'compact');
  v_template_key text := public.profile_layout_key(p_patch->>'templateKey', v_layout);
BEGIN
  IF jsonb_typeof(p_patch) <> 'object' THEN RETURN v_patch; END IF;
  IF p_patch ? 'layoutVariant' THEN
    v_patch := v_patch || jsonb_build_object('layoutVariant', v_layout);
  END IF;
  IF p_patch ? 'modules' THEN v_patch := v_patch || jsonb_build_object('modules', p_patch->'modules'); END IF;
  IF p_patch ? 'links' THEN v_patch := v_patch || jsonb_build_object('links', p_patch->'links'); END IF;
  IF p_patch ? 'linkStyle' THEN v_patch := v_patch || jsonb_build_object('linkStyle', p_patch->'linkStyle'); END IF;
  IF p_patch ? 'metadata' THEN v_patch := v_patch || jsonb_build_object('metadata', p_patch->'metadata'); END IF;
  IF p_patch ? 'templateKey' THEN
    v_patch := v_patch || jsonb_build_object('templateKey', v_template_key);
  END IF;
  RETURN v_patch;
END;
$function$;

-- The earlier configuration migrations still know how to validate the retired
-- layout vocabulary. Keep that validator as the structural safety boundary,
-- but translate its input/output at this final migration so no active profile
-- configuration can carry a legacy layout or template key forward.
CREATE OR REPLACE FUNCTION public.profile_default_configuration(p_signature_color text DEFAULT NULL)
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path TO public, pg_catalog
AS $function$
  SELECT public.profile_default_configuration_legacy_v2(p_signature_color)
    || jsonb_build_object(
      'templateKey', 'compact',
      'layoutVariant', 'compact'
    );
$function$;

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
  v_base_input jsonb := coalesce(p_input, '{}'::jsonb);
  v_v2_input jsonb := coalesce(p_input, '{}'::jsonb);
  v_base jsonb;
  v_layout text;
  v_project_limit integer := 4;
  v_widget_limit integer := 2;
BEGIN
  IF jsonb_typeof(v_base_input) <> 'object' OR coalesce(v_base_input->>'version', '1') <> '1' THEN
    RETURN NULL;
  END IF;

  v_layout := public.profile_layout_key(
    CASE
      WHEN lower(btrim(coalesce(v_base_input->>'layoutVariant', ''))) = 'immersive' THEN 'full-bleed'
      ELSE v_base_input->>'layoutVariant'
    END,
    'compact'
  );

  IF auth.uid() IS NOT NULL AND (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_staff)
    OR EXISTS (
      SELECT 1
      FROM public.profile_entitlements
      WHERE user_id = auth.uid() AND entitlement_key IN ('chromadie_plus', 'atelier_plus')
    )
  ) THEN
    v_project_limit := 10;
    v_widget_limit := 4;
  END IF;

  -- The legacy validator still enforces the original six-link/two-widget V1
  -- shape. Bound only the compatibility input; retain the complete V2 data in
  -- the structured fields overlaid below.
  v_base_input := jsonb_set(
    v_base_input,
    '{layoutVariant}',
    to_jsonb(CASE WHEN v_layout = 'full-bleed' THEN 'immersive' ELSE 'focus' END),
    true
  );
  v_base_input := jsonb_set(
    v_base_input,
    '{links}',
    coalesce((
      SELECT jsonb_agg(item ORDER BY ord)
      FROM (
        SELECT value item, ord
        FROM jsonb_array_elements(
          CASE WHEN jsonb_typeof(v_base_input->'links') = 'array' THEN v_base_input->'links' ELSE '[]'::jsonb END
        ) WITH ORDINALITY rows(value, ord)
        LIMIT 6
      ) limited
    ), '[]'::jsonb),
    true
  );
  v_base_input := jsonb_set(
    v_base_input,
    '{widgets}',
    coalesce((
      SELECT jsonb_agg(item ORDER BY ord)
      FROM (
        SELECT value item, ord
        FROM jsonb_array_elements(
          CASE WHEN jsonb_typeof(v_base_input->'widgets') = 'array' THEN v_base_input->'widgets' ELSE '[]'::jsonb END
        ) WITH ORDINALITY rows(value, ord)
        LIMIT v_widget_limit
      ) limited
    ), '[]'::jsonb),
    true
  );

  IF jsonb_typeof(v_v2_input->'content') = 'object' AND v_v2_input->'content'->>'version' = '2' THEN
    v_v2_input := jsonb_set(
      v_v2_input,
      '{content,projects}',
      coalesce((
        SELECT jsonb_agg(item ORDER BY ord)
        FROM (
          SELECT value item, ord
          FROM jsonb_array_elements(
            CASE WHEN jsonb_typeof(v_v2_input->'content'->'projects') = 'array' THEN v_v2_input->'content'->'projects' ELSE '[]'::jsonb END
          ) WITH ORDINALITY rows(value, ord)
          LIMIT v_project_limit
        ) limited
      ), '[]'::jsonb),
      true
    );
  END IF;
  v_v2_input := jsonb_set(
    v_v2_input,
    '{widgets}',
    coalesce((
      SELECT jsonb_agg(item ORDER BY ord)
      FROM (
        SELECT value item, ord
        FROM jsonb_array_elements(
          CASE WHEN jsonb_typeof(v_v2_input->'widgets') = 'array' THEN v_v2_input->'widgets' ELSE '[]'::jsonb END
        ) WITH ORDINALITY rows(value, ord)
        LIMIT v_widget_limit
      ) limited
    ), '[]'::jsonb),
    true
  );

  v_base := public.normalize_profile_configuration_legacy_v2(v_base_input, p_fallback_color);
  IF v_base IS NULL THEN RETURN NULL; END IF;

  RETURN v_base
    || jsonb_build_object(
      'templateKey', v_layout,
      'layoutVariant', v_layout,
      'links', public.profile_v2_normalize_links(p_input->'links'),
      'content', public.profile_v2_normalize_content(v_v2_input->'content'),
      'widgets', public.profile_v2_normalize_widgets(v_v2_input->'widgets', p_input->>'spotify_type', p_input->>'spotify_id')
    )
    || CASE WHEN jsonb_typeof(p_input->'identityPresentation') = 'object'
      THEN jsonb_build_object('identityPresentation', public.profile_v2_normalize_identity(p_input->'identityPresentation'))
      ELSE '{}'::jsonb END
    || CASE WHEN jsonb_typeof(p_input->'metadata') = 'object'
      THEN jsonb_build_object('metadata', public.profile_v2_normalize_metadata(p_input->'metadata'))
      ELSE '{}'::jsonb END
    || CASE WHEN jsonb_typeof(p_input->'linkStyle') = 'object'
      THEN jsonb_build_object(
        'linkStyle', jsonb_build_object(
          'alignment', CASE WHEN p_input->'linkStyle'->>'alignment' IN ('left', 'center', 'right') THEN p_input->'linkStyle'->>'alignment' ELSE 'left' END,
          'monochrome', CASE WHEN p_input->'linkStyle'->>'monochrome' IN ('true', 'false') THEN (p_input->'linkStyle'->>'monochrome')::boolean ELSE false END,
          'size', least(2, greatest(0, CASE WHEN p_input->'linkStyle'->>'size' ~ '^-?[0-9]{1,3}$' THEN (p_input->'linkStyle'->>'size')::integer ELSE 0 END)),
          'glow', least(2, greatest(0, CASE WHEN p_input->'linkStyle'->>'glow' ~ '^-?[0-9]{1,3}$' THEN (p_input->'linkStyle'->>'glow')::integer ELSE 0 END))
        )
      )
      ELSE '{}'::jsonb END;
END;
$function$;

-- Normalize equipped layout values before removing their catalog rows.
UPDATE public.profiles
SET equipped_cosmetics = jsonb_set(
  coalesce(equipped_cosmetics, '{}'::jsonb),
  '{profile_layout}',
  to_jsonb('profile_layout_' || public.profile_layout_key(equipped_cosmetics->>'profile_layout', 'compact')),
  true
)
WHERE equipped_cosmetics ? 'profile_layout';

-- Normalize both publication states and rebuild their V2 projections so an
-- old layout cannot reappear after a later owner/public configuration read.
UPDATE public.profile_configurations
SET draft_config = public.normalize_profile_configuration(draft_config, draft_config->>'signatureColor'),
    published_config = public.normalize_profile_configuration(published_config, published_config->>'signatureColor'),
    draft_config_v2 = public.profile_configuration_v2_from_v1(public.normalize_profile_configuration(draft_config, draft_config->>'signatureColor')),
    published_config_v2 = public.profile_configuration_v2_from_v1(public.normalize_profile_configuration(published_config, published_config->>'signatureColor')),
    v2_updated_at = now();

-- The retired layout items are free structural presets, not earned inventory.
-- Clear their inventory references before removing the catalog rows because
-- inventory.item_key is protected by a foreign key.
DELETE FROM public.inventory AS inventory_row
USING public.shop_items AS item
WHERE inventory_row.item_key = item.item_key
  AND item.slot = 'profile_layout'
  AND item.item_key NOT IN ('profile_layout_compact', 'profile_layout_full_bleed');

DELETE FROM public.shop_items
WHERE slot = 'profile_layout'
  AND item_key NOT IN ('profile_layout_compact', 'profile_layout_full_bleed');

ALTER TABLE public.shop_items DROP CONSTRAINT IF EXISTS shop_items_shape_check;

ALTER TABLE public.shop_items ADD CONSTRAINT shop_items_shape_check CHECK (
  item_key ~ '^[a-z0-9_]{1,80}$'
  AND slot IN ('consumable', 'title', 'name_font', 'name_material', 'name_motion', 'profile_border', 'cursor_trail', 'avatar_effect', 'profile_layout', 'profile_atmosphere', 'profile_motion')
  AND length(css_value) <= 2000
  AND (available_from IS NULL OR available_until IS NULL OR available_from <= available_until)
  AND (slot IN ('consumable', 'title') OR css_type = 'renderer')
  AND (
    css_type <> 'renderer'
    OR (slot = 'name_font' AND css_value IN ('editorial-serif', 'condensed-sans', 'wide-geometric', 'mono-compact', 'rounded-mono', 'soft-grotesk', 'humanist-display', 'modern-fraktur', 'pixel-display', 'high-contrast-italic', 'neo-slab', 'reverse-contrast', 'industrial-stencil', 'futurist-extended', 'terminal-bitmap', 'rounded-display', 'marker-tag', 'newspaper-black'))
    OR (slot = 'name_material' AND css_value IN ('polished-chrome', 'copper-press', 'glass-emboss', 'fine-outline', 'ink-bleed', 'pearl-foil', 'carbon-cut', 'frosted-edge', 'holographic-film', 'cut-paper', 'neon-tube', 'liquid-mercury', 'oil-slick', 'thermal-ink', 'velvet-ink', 'embroidered-thread', 'engraved-stone', 'crt-phosphor', 'gold-leaf', 'chroma-glass', 'ceramic-glaze', 'blueprint-ink'))
    OR (slot = 'name_motion' AND css_value IN ('velvet-sweep', 'refraction-sweep', 'ghost-offset', 'focus-resolve', 'mask-reveal', 'quiet-afterimage', 'soft-rise', 'scanline-reveal', 'particle-drift', 'letter-shuffle', 'fuzzy-signal', 'typewriter-name', 'chromatic-ripple', 'liquid-fill', 'pixel-dissolve', 'echo-collapse', 'heat-shimmer', 'signal-lock', 'letter-cascade', 'orbiting-spark', 'color-memory', 'daily-pulse', 'prism-shatter', 'ink-spread', 'filament-trace', 'prism-fracture', 'molten-rise', 'voltage-arc', 'archive-bloom', 'haunt-glow', 'haunt-particles', 'haunt-rainbow', 'haunt-gradient', 'haunt-fuzzy', 'haunt-reveal', 'haunt-split', 'haunt-flash'))
    OR (slot = 'profile_border' AND css_value IN ('celestial', 'chroma', 'crystal', 'glitch', 'gold', 'neon', 'prism', 'void', 'signal'))
    OR (slot = 'cursor_trail' AND css_value IN ('signal-trace', 'pixel-wake', 'chroma-ribbon', 'glass-shards', 'ember-ash', 'comet-thread', 'ink-drops', 'orbit-dust', 'static-echo', 'rain-trace', 'gold-fleck', 'ghost-tail', 'color-memory', 'marker-stroke', 'solar-sparks', 'void-lensing'))
    OR (slot = 'avatar_effect' AND css_value IN ('signal-ring', 'neon-halo', 'prism-orbit', 'crystal-aperture', 'chroma-arc', 'ember-crown', 'ashfall', 'gold-laurel', 'ink-stamp', 'paper-tear', 'static-offset', 'pixel-satellites', 'crt-scan', 'void-eclipse', 'ghost-double', 'night-frame', 'daily-aura', 'color-archive'))
    OR (slot = 'profile_layout' AND css_value IN ('compact', 'full-bleed'))
    OR (slot = 'profile_atmosphere' AND css_value IN ('rain-window', 'droplets-glass', 'dust-light', 'ink-bloom', 'snowfall', 'silk-folds', 'glass-caustics', 'cinder-drift', 'night-pollen', 'paper-shadow', 'smoke-spiral', 'lumen-flare'))
    OR (slot = 'profile_motion' AND css_value IN ('perspective-tilt'))
  )
);

UPDATE public.meta
SET value = '2026-08-15T13:00:00Z'
WHERE key = 'shop_version';

DO $verification$
DECLARE
  active_count bigint;
  layout_count bigint;
BEGIN
  SELECT count(*) INTO active_count FROM public.shop_items WHERE catalog_status = 'active';
  SELECT count(*) INTO layout_count FROM public.shop_items WHERE slot = 'profile_layout' AND catalog_status = 'active';
  IF active_count <> 97 THEN RAISE EXCEPTION 'Expected 97 active catalog rows, found %', active_count; END IF;
  IF layout_count <> 2 THEN RAISE EXCEPTION 'Expected 2 active Profile Layout rows, found %', layout_count; END IF;
END;
$verification$;

COMMIT;
