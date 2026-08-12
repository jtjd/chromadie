-- Replace the novelty profile-layout catalog with five small structural
-- layouts. The migration preserves owned cosmetics and profile configuration;
-- it only retires the old renderer identities and maps them to the new keys.

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
  v_fallback text := lower(btrim(coalesce(p_fallback, 'compact')));
BEGIN
  v_value := replace(regexp_replace(v_value, '^profile_layout_', ''), '_', '-');
  v_fallback := replace(regexp_replace(v_fallback, '^profile_layout_', ''), '_', '-');
  RETURN CASE v_value
    WHEN 'compact' THEN 'compact'
    WHEN 'sleek' THEN 'sleek'
    WHEN 'minimal' THEN 'minimal'
    WHEN 'modern' THEN 'modern'
    WHEN 'portfolio' THEN 'portfolio'
    WHEN 'immersive' THEN 'compact'
    WHEN 'focus' THEN 'compact'
    WHEN 'editorial' THEN 'sleek'
    WHEN 'signal' THEN 'compact'
    WHEN 'archive' THEN 'portfolio'
    WHEN 'atelier' THEN 'modern'
    WHEN 'split-signal' THEN 'sleek'
    WHEN 'archive-index' THEN 'portfolio'
    WHEN 'prism-mosaic' THEN 'modern'
    WHEN 'night-terminal' THEN 'minimal'
    WHEN 'story-stack' THEN 'portfolio'
    ELSE CASE v_fallback
      WHEN 'sleek' THEN 'sleek'
      WHEN 'minimal' THEN 'minimal'
      WHEN 'modern' THEN 'modern'
      WHEN 'portfolio' THEN 'portfolio'
      WHEN 'editorial' THEN 'sleek'
      WHEN 'archive' THEN 'portfolio'
      WHEN 'atelier' THEN 'modern'
      ELSE 'compact'
    END
  END;
END;
$function$;

-- The historical normalizer only accepts the retired layout values. Feed it a
-- compatible internal value, then restore the new public key in its result.
CREATE OR REPLACE FUNCTION public.profile_default_configuration(p_signature_color text DEFAULT NULL)
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path TO public, pg_catalog
AS $function$
  SELECT public.profile_default_configuration_legacy_v2(p_signature_color)
    || jsonb_build_object('templateKey', 'compact', 'layoutVariant', 'compact');
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
  v_template text;
  v_legacy_layout text;
  v_project_limit integer := 4;
  v_widget_limit integer := 2;
BEGIN
  IF jsonb_typeof(v_base_input) <> 'object' OR coalesce(v_base_input->>'version', '1') <> '1' THEN
    RETURN NULL;
  END IF;

  IF auth.uid() IS NOT NULL AND (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_staff)
    OR EXISTS (
      SELECT 1 FROM public.profile_entitlements
      WHERE user_id = auth.uid() AND entitlement_key IN ('chromadie_plus', 'atelier_plus')
    )
  ) THEN
    v_project_limit := 10;
    v_widget_limit := 4;
  END IF;

  v_layout := public.profile_layout_key(
    v_base_input->>'layoutVariant',
    public.profile_layout_key(v_base_input->>'templateKey', 'compact')
  );
  v_legacy_layout := CASE v_layout
    WHEN 'sleek' THEN 'editorial'
    ELSE 'focus'
  END;
  v_base_input := jsonb_set(v_base_input, '{layoutVariant}', to_jsonb(v_legacy_layout), true);
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

  v_template := CASE lower(btrim(coalesce(p_input->>'templateKey', '')))
    WHEN 'compact' THEN 'compact'
    WHEN 'sleek' THEN 'sleek'
    WHEN 'minimal' THEN 'minimal'
    WHEN 'modern' THEN 'modern'
    WHEN 'portfolio' THEN 'portfolio'
    WHEN 'signal' THEN 'compact'
    WHEN 'editorial' THEN 'sleek'
    WHEN 'archive' THEN 'portfolio'
    WHEN 'atelier' THEN 'modern'
    WHEN 'custom' THEN v_layout
    ELSE v_layout
  END;

  RETURN v_base
    || jsonb_build_object('templateKey', v_template, 'layoutVariant', v_layout)
    || jsonb_build_object(
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

CREATE OR REPLACE FUNCTION public.profile_composition_patch(p_patch jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SET search_path TO public, pg_catalog
AS $function$
DECLARE
  v_patch jsonb := '{}'::jsonb;
  v_layout text := public.profile_layout_key(p_patch->>'layoutVariant', 'compact');
  v_template_key text := lower(btrim(coalesce(p_patch->>'templateKey', '')));
BEGIN
  IF jsonb_typeof(p_patch) <> 'object' THEN RETURN v_patch; END IF;
  IF p_patch ? 'layoutVariant' THEN v_patch := v_patch || jsonb_build_object('layoutVariant', v_layout); END IF;
  IF p_patch ? 'modules' THEN v_patch := v_patch || jsonb_build_object('modules', p_patch->'modules'); END IF;
  IF p_patch ? 'links' THEN v_patch := v_patch || jsonb_build_object('links', p_patch->'links'); END IF;
  IF p_patch ? 'linkStyle' THEN v_patch := v_patch || jsonb_build_object('linkStyle', p_patch->'linkStyle'); END IF;
  IF p_patch ? 'metadata' THEN v_patch := v_patch || jsonb_build_object('metadata', p_patch->'metadata'); END IF;
  IF v_template_key IN ('compact', 'sleek', 'minimal', 'modern', 'portfolio') THEN
    v_patch := v_patch || jsonb_build_object('templateKey', v_template_key);
  ELSIF v_template_key IN ('signal', 'editorial', 'archive', 'atelier', 'custom') THEN
    v_patch := v_patch || jsonb_build_object('templateKey', public.profile_layout_key(v_template_key, v_layout));
  END IF;
  RETURN v_patch;
END;
$function$;

ALTER TABLE public.shop_items DROP CONSTRAINT IF EXISTS shop_items_shape_check;
ALTER TABLE public.shop_items DROP CONSTRAINT IF EXISTS shop_items_atmosphere_renderer_check;

-- Keep the old rows as retired records so historical ownership/audit data is
-- not deleted. Their renderer values are moved into the finite new allowlist.
UPDATE public.shop_items
SET css_value = CASE css_value
  WHEN 'split-signal' THEN 'sleek'
  WHEN 'archive-index' THEN 'portfolio'
  WHEN 'prism-mosaic' THEN 'modern'
  WHEN 'night-terminal' THEN 'minimal'
  WHEN 'story-stack' THEN 'portfolio'
  ELSE css_value
END,
    catalog_status = 'retired'
WHERE slot = 'profile_layout'
  AND css_value IN ('split-signal', 'archive-index', 'prism-mosaic', 'night-terminal', 'story-stack');

INSERT INTO public.shop_items (
  item_key, name, slot, cost, css_type, css_value, available_from, available_until,
  rarity, description, collection, stackable, access_tier, entitlement_key, catalog_status
) VALUES
  ('profile_layout_compact', 'Compact', 'profile_layout', 0, 'renderer', 'compact', NULL, NULL, 'Uncommon', 'A small centered identity surface that leaves the user background in charge.', 'Layouts', false, 'free', NULL, 'active'),
  ('profile_layout_sleek', 'Sleek', 'profile_layout', 0, 'renderer', 'sleek', NULL, NULL, 'Uncommon', 'A compact identity card with small detached presence and music strips.', 'Layouts', false, 'free', NULL, 'active'),
  ('profile_layout_minimal', 'Minimal', 'profile_layout', 0, 'renderer', 'minimal', NULL, NULL, 'Uncommon', 'A free-floating identity treatment with almost no structural container.', 'Layouts', false, 'free', NULL, 'active'),
  ('profile_layout_modern', 'Modern', 'profile_layout', 0, 'renderer', 'modern', NULL, NULL, 'Uncommon', 'A compact identity surface with a quiet secondary widget treatment.', 'Layouts', false, 'free', NULL, 'active'),
  ('profile_layout_portfolio', 'Portfolio', 'profile_layout', 0, 'renderer', 'portfolio', NULL, NULL, 'Uncommon', 'A restrained landing view that opens into a longer personal profile story.', 'Layouts', false, 'free', NULL, 'active')
ON CONFLICT (item_key) DO UPDATE SET
  name = EXCLUDED.name,
  slot = EXCLUDED.slot,
  cost = EXCLUDED.cost,
  css_type = EXCLUDED.css_type,
  css_value = EXCLUDED.css_value,
  rarity = EXCLUDED.rarity,
  description = EXCLUDED.description,
  collection = EXCLUDED.collection,
  stackable = EXCLUDED.stackable,
  access_tier = EXCLUDED.access_tier,
  entitlement_key = EXCLUDED.entitlement_key,
  catalog_status = EXCLUDED.catalog_status;

ALTER TABLE public.shop_items ADD CONSTRAINT shop_items_shape_check CHECK (
  item_key ~ '^[a-z0-9_]{1,80}$'
  AND slot IN ('consumable', 'title', 'name_font', 'name_material', 'name_motion', 'profile_border', 'cursor_trail', 'avatar_effect', 'profile_layout', 'profile_atmosphere')
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
    OR (slot = 'profile_layout' AND css_value IN ('compact', 'sleek', 'minimal', 'modern', 'portfolio'))
    OR (slot = 'profile_atmosphere' AND css_value IN ('rain-window', 'droplets-glass', 'dust-light', 'ink-bloom', 'snowfall', 'silk-folds', 'glass-caustics', 'cinder-drift', 'night-pollen', 'paper-shadow', 'smoke-spiral', 'lumen-flare'))
  )
);

ALTER TABLE public.shop_items ADD CONSTRAINT shop_items_atmosphere_renderer_check CHECK (
  slot <> 'profile_atmosphere'
  OR css_value IN ('rain-window', 'droplets-glass', 'dust-light', 'ink-bloom', 'snowfall', 'silk-folds', 'glass-caustics', 'cinder-drift', 'night-pollen', 'paper-shadow', 'smoke-spiral', 'lumen-flare')
);

-- Preserve inventory and equipped state with a one-to-one old -> new map.
-- Merge quantities first because a user may already own both a retired layout
-- and its replacement. A direct UPDATE would violate the inventory's unique
-- (user_id, item_key) constraint in that case.
WITH legacy_inventory AS (
  SELECT
    user_id,
    CASE item_key
      WHEN 'profile_layout_split_signal' THEN 'profile_layout_sleek'
      WHEN 'profile_layout_archive_index' THEN 'profile_layout_portfolio'
      WHEN 'profile_layout_prism_mosaic' THEN 'profile_layout_modern'
      WHEN 'profile_layout_night_terminal' THEN 'profile_layout_minimal'
      WHEN 'profile_layout_story_stack' THEN 'profile_layout_compact'
    END AS replacement_key,
    sum(quantity)::integer AS replacement_quantity
  FROM public.inventory
  WHERE item_key IN ('profile_layout_split_signal', 'profile_layout_archive_index', 'profile_layout_prism_mosaic', 'profile_layout_night_terminal', 'profile_layout_story_stack')
  GROUP BY user_id, item_key
)
INSERT INTO public.inventory (user_id, item_key, quantity)
SELECT user_id, replacement_key, replacement_quantity
FROM legacy_inventory
ON CONFLICT (user_id, item_key) DO UPDATE
SET quantity = public.inventory.quantity + EXCLUDED.quantity;

DELETE FROM public.inventory
WHERE item_key IN ('profile_layout_split_signal', 'profile_layout_archive_index', 'profile_layout_prism_mosaic', 'profile_layout_night_terminal', 'profile_layout_story_stack');

UPDATE public.profiles
SET equipped_cosmetics = jsonb_set(
  coalesce(equipped_cosmetics, '{}'::jsonb),
  '{profile_layout}',
  to_jsonb('profile_layout_' || public.profile_layout_key(equipped_cosmetics->>'profile_layout', 'compact')),
  true
)
WHERE equipped_cosmetics ? 'profile_layout';

UPDATE public.profile_configurations
SET draft_config = public.normalize_profile_configuration(draft_config, draft_config->>'signatureColor'),
    published_config = public.normalize_profile_configuration(published_config, published_config->>'signatureColor'),
    draft_config_v2 = public.profile_configuration_v2_from_v1(public.normalize_profile_configuration(draft_config, draft_config->>'signatureColor')),
    published_config_v2 = public.profile_configuration_v2_from_v1(public.normalize_profile_configuration(published_config, published_config->>'signatureColor')),
    v2_updated_at = now();

REVOKE ALL ON FUNCTION public.profile_layout_key(text, text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.normalize_profile_configuration(jsonb, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.profile_composition_patch(jsonb) FROM PUBLIC, anon, authenticated;

DO $verification$
DECLARE
  v_active_count bigint;
  v_layout_count bigint;
BEGIN
  SELECT count(*) INTO v_active_count FROM public.shop_items WHERE catalog_status = 'active';
  SELECT count(*) INTO v_layout_count FROM public.shop_items WHERE slot = 'profile_layout' AND catalog_status = 'active';
  IF v_active_count <> 99 THEN RAISE EXCEPTION 'Expected 99 active catalog rows, found %', v_active_count; END IF;
  IF v_layout_count <> 5 THEN RAISE EXCEPTION 'Expected 5 active Profile Layout rows, found %', v_layout_count; END IF;
END;
$verification$;

COMMIT;
