-- Replace the active Avatar Effect catalog with the first four reference
-- effects. Historical rows remain legacy-readable, while current equipped
-- selections that no longer have a renderer are cleared safely.
BEGIN;

ALTER TABLE public.shop_items DROP CONSTRAINT IF EXISTS shop_items_shape_check;

UPDATE public.shop_items
SET catalog_status = 'legacy'
WHERE slot = 'avatar_effect'
  AND css_value NOT IN ('3d-parallax', 'glitch-slicer', 'liquid-blob', 'cyber-hud');

INSERT INTO public.shop_items (
  item_key, name, slot, cost, css_type, css_value, available_from, available_until,
  rarity, description, collection, stackable, access_tier, entitlement_key, catalog_status
) VALUES
  ('avatar_effect_3d_parallax', '3D Parallax Tilt', 'avatar_effect', 0, 'renderer', '3d-parallax', NULL, NULL, 'Epic', 'A softly tilted portrait lifts away from the profile surface with a deep shadow.', 'Signal', false, 'free', NULL, 'active'),
  ('avatar_effect_glitch_slicer', 'Glitch Slicer', 'avatar_effect', 0, 'renderer', 'glitch-slicer', NULL, NULL, 'Epic', 'Crisp red and cyan slices interrupt the portrait in short controlled bursts.', 'Static Bloom', false, 'free', NULL, 'active'),
  ('avatar_effect_liquid_blob', 'Liquid Blob', 'avatar_effect', 0, 'renderer', 'liquid-blob', NULL, NULL, 'Epic', 'A bright organic silhouette slowly morphs around the portrait.', 'Prism', false, 'free', NULL, 'active'),
  ('avatar_effect_cyber_hud', 'Cyber HUD', 'avatar_effect', 0, 'renderer', 'cyber-hud', NULL, NULL, 'Anomaly', 'Precision rings and corner ticks frame the portrait like a clean instrument readout.', 'Signal', false, 'free', NULL, 'active')
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

UPDATE public.profiles
SET equipped_cosmetics = equipped_cosmetics - 'avatar_effect'
WHERE equipped_cosmetics ? 'avatar_effect'
  AND equipped_cosmetics->>'avatar_effect' NOT IN (
    'avatar_effect_3d_parallax',
    'avatar_effect_glitch_slicer',
    'avatar_effect_liquid_blob',
    'avatar_effect_cyber_hud'
  );

ALTER TABLE public.shop_items ADD CONSTRAINT shop_items_shape_check CHECK (
  item_key ~ '^[a-z0-9_]{1,80}$'
  AND slot IN ('consumable', 'title', 'name_font', 'name_material', 'name_motion', 'profile_border', 'cursor_trail', 'avatar_effect', 'profile_layout', 'profile_atmosphere', 'profile_motion')
  AND length(css_value) <= 2000
  AND (available_from IS NULL OR available_until IS NULL OR available_from <= available_until)
  AND (slot IN ('consumable', 'title') OR css_type = 'renderer')
  AND (
    css_type <> 'renderer'
    OR (slot = 'name_font' AND css_value IN ('editorial-serif', 'condensed-sans', 'wide-geometric', 'mono-compact', 'rounded-mono', 'soft-grotesk', 'humanist-display', 'modern-fraktur', 'pixel-display', 'high-contrast-italic', 'neo-slab', 'reverse-contrast', 'industrial-stencil', 'futurist-extended', 'terminal-bitmap', 'rounded-display', 'marker-tag', 'newspaper-black', 'satoshi', 'fira-code', 'poppins', 'jetbrains-mono', 'array', 'silkscreen', 'velocity', 'outfit'))
    OR (slot = 'name_material' AND css_value IN ('polished-chrome', 'copper-press', 'glass-emboss', 'fine-outline', 'ink-bleed', 'pearl-foil', 'carbon-cut', 'frosted-edge', 'holographic-film', 'cut-paper', 'neon-tube', 'liquid-mercury', 'oil-slick', 'thermal-ink', 'velvet-ink', 'embroidered-thread', 'engraved-stone', 'crt-phosphor', 'gold-leaf', 'chroma-glass', 'ceramic-glaze', 'blueprint-ink'))
    OR (slot = 'name_motion' AND css_value IN ('velvet-sweep', 'refraction-sweep', 'ghost-offset', 'focus-resolve', 'mask-reveal', 'quiet-afterimage', 'soft-rise', 'scanline-reveal', 'particle-drift', 'letter-shuffle', 'fuzzy-signal', 'typewriter-name', 'chromatic-ripple', 'liquid-fill', 'pixel-dissolve', 'echo-collapse', 'heat-shimmer', 'signal-lock', 'letter-cascade', 'orbiting-spark', 'color-memory', 'daily-pulse', 'prism-shatter', 'ink-spread', 'filament-trace', 'prism-fracture', 'molten-rise', 'voltage-arc', 'archive-bloom', 'haunt-glow', 'haunt-particles', 'haunt-rainbow', 'haunt-gradient', 'haunt-fuzzy', 'haunt-reveal', 'haunt-split', 'haunt-flash'))
    OR (slot = 'profile_border' AND css_value IN ('celestial', 'chroma', 'crystal', 'glitch', 'gold', 'neon', 'prism', 'void', 'signal'))
    OR (slot = 'cursor_trail' AND css_value IN ('signal-trace', 'pixel-wake', 'chroma-ribbon', 'glass-shards', 'ember-ash', 'comet-thread', 'ink-drops', 'orbit-dust', 'static-echo', 'rain-trace', 'gold-fleck', 'ghost-tail', 'color-memory', 'marker-stroke', 'solar-sparks', 'void-lensing'))
    OR (slot = 'avatar_effect' AND css_value IN ('signal-ring', 'neon-halo', 'prism-orbit', 'crystal-aperture', 'chroma-arc', 'ember-crown', 'ashfall', 'gold-laurel', 'ink-stamp', 'paper-tear', 'static-offset', 'pixel-satellites', 'crt-scan', 'void-eclipse', 'ghost-double', 'night-frame', 'daily-aura', 'color-archive', '3d-parallax', 'glitch-slicer', 'liquid-blob', 'cyber-hud'))
    OR (slot = 'profile_layout' AND css_value IN ('compact', 'full-bleed', 'framed'))
    OR (slot = 'profile_atmosphere' AND css_value IN ('rain-window', 'droplets-glass', 'dust-light', 'ink-bloom', 'snowfall', 'silk-folds', 'glass-caustics', 'cinder-drift', 'night-pollen', 'paper-shadow', 'smoke-spiral', 'lumen-flare'))
    OR (slot = 'profile_motion' AND css_value IN ('perspective-tilt'))
  )
);

INSERT INTO public.meta (key, value)
VALUES ('shop_version', '2026-08-17T12:00:00Z')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

DO $verification$
DECLARE
  active_count bigint;
  avatar_count bigint;
  legacy_avatar_count bigint;
BEGIN
  SELECT count(*) INTO active_count FROM public.shop_items WHERE catalog_status = 'active';
  SELECT count(*) INTO avatar_count FROM public.shop_items WHERE slot = 'avatar_effect' AND catalog_status = 'active';
  SELECT count(*) INTO legacy_avatar_count FROM public.shop_items WHERE slot = 'avatar_effect' AND catalog_status = 'legacy';
  IF active_count <> 76 THEN RAISE EXCEPTION 'Expected 76 active catalog rows, found %', active_count; END IF;
  IF avatar_count <> 4 THEN RAISE EXCEPTION 'Expected 4 active Avatar Effect rows, found %', avatar_count; END IF;
  IF legacy_avatar_count <> 18 THEN RAISE EXCEPTION 'Expected 18 legacy Avatar Effect rows, found %', legacy_avatar_count; END IF;
END;
$verification$;

COMMIT;
