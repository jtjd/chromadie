-- Add the reference-first Immersive profile composition to the existing
-- structural layout catalog. This changes only the validated layout key and
-- its renderer; profile data, cosmetics, media, and shop navigation remain
-- on their existing contracts.
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
    WHEN 'full-bleed' THEN 'full-bleed'
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
      WHEN 'full-bleed' THEN 'full-bleed'
      WHEN 'editorial' THEN 'sleek'
      WHEN 'archive' THEN 'portfolio'
      WHEN 'atelier' THEN 'modern'
      ELSE 'compact'
    END
  END;
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
  IF v_template_key IN ('compact', 'sleek', 'minimal', 'modern', 'portfolio', 'full-bleed') THEN
    v_patch := v_patch || jsonb_build_object('templateKey', v_template_key);
  ELSIF v_template_key IN ('signal', 'editorial', 'archive', 'atelier', 'custom') THEN
    v_patch := v_patch || jsonb_build_object('templateKey', public.profile_layout_key(v_template_key, v_layout));
  END IF;
  RETURN v_patch;
END;
$function$;

ALTER TABLE public.shop_items DROP CONSTRAINT IF EXISTS shop_items_shape_check;

INSERT INTO public.shop_items (
  item_key, name, slot, cost, css_type, css_value, available_from, available_until,
  rarity, description, collection, stackable, access_tier, entitlement_key, catalog_status
) VALUES (
  'profile_layout_full_bleed',
  'Immersive',
  'profile_layout',
  0,
  'renderer',
  'full-bleed',
  NULL,
  NULL,
  'Uncommon',
  'A full-viewport identity scene with a large avatar, bio, and icon links.',
  'Layouts',
  false,
  'free',
  NULL,
  'active'
)
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
    OR (slot = 'profile_layout' AND css_value IN ('compact', 'sleek', 'minimal', 'modern', 'portfolio', 'full-bleed'))
    OR (slot = 'profile_atmosphere' AND css_value IN ('rain-window', 'droplets-glass', 'dust-light', 'ink-bloom', 'snowfall', 'silk-folds', 'glass-caustics', 'cinder-drift', 'night-pollen', 'paper-shadow', 'smoke-spiral', 'lumen-flare'))
    OR (slot = 'profile_motion' AND css_value IN ('perspective-tilt'))
  )
);

UPDATE public.meta
SET value = '2026-08-15T12:00:00Z'
WHERE key = 'shop_version';

DO $verification$
DECLARE
  active_count bigint;
  layout_count bigint;
BEGIN
  SELECT count(*) INTO active_count FROM public.shop_items WHERE catalog_status = 'active';
  SELECT count(*) INTO layout_count FROM public.shop_items WHERE slot = 'profile_layout' AND catalog_status = 'active';
  IF active_count <> 101 THEN RAISE EXCEPTION 'Expected 101 active catalog rows, found %', active_count; END IF;
  IF layout_count <> 6 THEN RAISE EXCEPTION 'Expected 6 active Profile Layout rows, found %', layout_count; END IF;
END;
$verification$;

COMMIT;
