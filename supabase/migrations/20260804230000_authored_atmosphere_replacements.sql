-- Add seven sourced Pexels video plates to replace the retired procedural
-- atmosphere presets. New keys are additive and do not reuse retired product
-- identities or restore historical inventory references.
BEGIN;

ALTER TABLE public.shop_items DROP CONSTRAINT IF EXISTS shop_items_shape_check;
ALTER TABLE public.shop_items DROP CONSTRAINT IF EXISTS shop_items_atmosphere_renderer_check;

INSERT INTO public.shop_items (
  item_key, name, slot, cost, css_type, css_value, available_from, available_until,
  rarity, description, collection, stackable, access_tier, entitlement_key, catalog_status
) VALUES
  ('profile_atmosphere_silk_folds', 'Silk Folds', 'profile_atmosphere', 320000, 'renderer', 'silk-folds', NULL, NULL, 'Rare', 'Moving folds of black silk carry a restrained sheen through the profile without adding a frame.', 'Prism', false, 'earned', NULL, 'active'),
  ('profile_atmosphere_glass_caustics', 'Glass Caustics', 'profile_atmosphere', 460000, 'renderer', 'glass-caustics', NULL, NULL, 'Epic', 'Refracted water light breaks across the page like a quiet pane catching the daily color.', 'Archive', false, 'earned', NULL, 'active'),
  ('profile_atmosphere_cinder_drift', 'Cinder Drift', 'profile_atmosphere', 430000, 'renderer', 'cinder-drift', NULL, NULL, 'Epic', 'Fine sparks lift through a dark field, adding a warm trace of motion behind the identity.', 'Ember', false, 'earned', NULL, 'active'),
  ('profile_atmosphere_night_pollen', 'Night Pollen', 'profile_atmosphere', 340000, 'renderer', 'night-pollen', NULL, NULL, 'Rare', 'Sparse points of out-of-focus light drift across a nocturnal field with a photographic softness.', 'Nocturne', false, 'earned', NULL, 'active'),
  ('profile_atmosphere_paper_shadow', 'Paper Shadow', 'profile_atmosphere', 300000, 'renderer', 'paper-shadow', NULL, NULL, 'Rare', 'Crumpled black paper gives the atmosphere a tactile surface and a quiet record of pressure.', 'Archive', false, 'earned', NULL, 'active'),
  ('profile_atmosphere_smoke_spiral', 'Smoke Spiral', 'profile_atmosphere', 580000, 'renderer', 'smoke-spiral', NULL, NULL, 'Anomaly', 'A slow, sculptural spiral of smoke turns the background into a living study of air and light.', 'Prism', false, 'earned', NULL, 'active'),
  ('profile_atmosphere_lumen_flare', 'Lumen Flare', 'profile_atmosphere', 640000, 'renderer', 'lumen-flare', NULL, NULL, 'Mythic', 'A distant lens flare blooms and recedes like a signal arriving through the dark.', 'Signal', false, 'earned', NULL, 'active')
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
    OR (slot = 'name_motion' AND css_value IN ('velvet-sweep', 'refraction-sweep', 'ghost-offset', 'focus-resolve', 'mask-reveal', 'quiet-afterimage', 'soft-rise', 'scanline-reveal', 'particle-drift', 'letter-shuffle', 'fuzzy-signal', 'typewriter-name', 'chromatic-ripple', 'liquid-fill', 'pixel-dissolve', 'echo-collapse', 'heat-shimmer', 'signal-lock', 'letter-cascade', 'orbiting-spark', 'color-memory', 'daily-pulse', 'prism-shatter', 'ink-spread'))
    OR (slot = 'profile_border' AND css_value IN ('celestial', 'chroma', 'crystal', 'glitch', 'gold', 'neon', 'prism', 'void', 'signal'))
    OR (slot = 'cursor_trail' AND css_value IN ('signal-trace', 'pixel-wake', 'chroma-ribbon', 'glass-shards', 'ember-ash', 'comet-thread', 'ink-drops', 'orbit-dust', 'static-echo', 'rain-trace', 'gold-fleck', 'ghost-tail', 'color-memory', 'marker-stroke', 'solar-sparks', 'void-lensing'))
    OR (slot = 'avatar_effect' AND css_value IN ('signal-ring', 'neon-halo', 'prism-orbit', 'crystal-aperture', 'chroma-arc', 'ember-crown', 'ashfall', 'gold-laurel', 'ink-stamp', 'paper-tear', 'static-offset', 'pixel-satellites', 'crt-scan', 'void-eclipse', 'ghost-double', 'night-frame', 'daily-aura', 'color-archive'))
    OR (slot = 'profile_layout' AND css_value IN ('split-signal', 'archive-index', 'prism-mosaic', 'night-terminal', 'story-stack'))
    OR (slot = 'profile_atmosphere' AND css_value IN ('rain-window', 'droplets-glass', 'dust-light', 'ink-bloom', 'snowfall', 'silk-folds', 'glass-caustics', 'cinder-drift', 'night-pollen', 'paper-shadow', 'smoke-spiral', 'lumen-flare'))
  )
);

ALTER TABLE public.shop_items ADD CONSTRAINT shop_items_atmosphere_renderer_check CHECK (
  slot <> 'profile_atmosphere'
  OR css_value IN ('rain-window', 'droplets-glass', 'dust-light', 'ink-bloom', 'snowfall', 'silk-folds', 'glass-caustics', 'cinder-drift', 'night-pollen', 'paper-shadow', 'smoke-spiral', 'lumen-flare')
);

INSERT INTO public.meta (key, value) VALUES ('shop_version', '2026-08-04T23:00:00Z')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

DO $verification$
DECLARE active_count bigint; atmosphere_count bigint;
BEGIN
  SELECT count(*) INTO active_count FROM public.shop_items WHERE catalog_status = 'active';
  IF active_count <> 126 THEN RAISE EXCEPTION 'Expected 126 active catalog rows, found %', active_count; END IF;
  SELECT count(*) INTO atmosphere_count FROM public.shop_items WHERE slot = 'profile_atmosphere' AND catalog_status = 'active';
  IF atmosphere_count <> 12 THEN RAISE EXCEPTION 'Expected 12 active Profile Atmosphere rows, found %', atmosphere_count; END IF;
END;
$verification$;

COMMIT;
