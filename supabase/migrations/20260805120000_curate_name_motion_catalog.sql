-- Curate Name Motion into ten authored gestures.
--
-- Existing motion item keys remain in the database for inventory and equipped
-- profile compatibility, but deprecated rows leave the public catalog. Their
-- renderer values remain finite and resolve through the client alias map.
BEGIN;

ALTER TABLE public.shop_items DROP CONSTRAINT IF EXISTS shop_items_shape_check;

UPDATE public.shop_items
SET catalog_status = 'legacy'
WHERE slot = 'name_motion'
  AND css_value NOT IN (
    'fuzzy-signal', 'letter-shuffle', 'chromatic-ripple', 'particle-drift',
    'typewriter-name', 'filament-trace', 'prism-fracture', 'molten-rise',
    'voltage-arc', 'archive-bloom'
  );

INSERT INTO public.shop_items (
  item_key, name, slot, cost, css_type, css_value, available_from, available_until,
  rarity, description, collection, stackable, access_tier, entitlement_key, catalog_status
) VALUES
  ('name_motion_fuzzy_signal', 'Ghost Frequency', 'name_motion', 340000, 'renderer', 'fuzzy-signal', NULL, NULL, 'Epic', 'Controlled horizontal signal slices distort the name.', 'Signal', false, 'earned', NULL, 'active'),
  ('name_motion_letter_shuffle', 'Scramble', 'name_motion', 520000, 'renderer', 'letter-shuffle', NULL, NULL, 'Anomaly', 'Characters rearrange before locking into place.', 'Static Bloom', false, 'earned', NULL, 'active'),
  ('name_motion_chromatic_ripple', 'Color Wake', 'name_motion', 410000, 'renderer', 'chromatic-ripple', NULL, NULL, 'Epic', 'A colored wave bends vertical sections of the letters.', 'Prism', false, 'earned', NULL, 'active'),
  ('name_motion_particle_drift', 'Dustfall', 'name_motion', 420000, 'renderer', 'particle-drift', NULL, NULL, 'Epic', 'A bright field of dust lifts from the letterforms and falls back through them.', 'Prism', false, 'earned', NULL, 'active'),
  ('name_motion_typewriter_name', 'Type In', 'name_motion', 230000, 'renderer', 'typewriter-name', NULL, NULL, 'Rare', 'Characters arrive one by one with a precise editorial cursor.', 'Archive', false, 'earned', NULL, 'active'),
  ('name_motion_filament_trace', 'Filament Trace', 'name_motion', 430000, 'renderer', 'filament-trace', NULL, NULL, 'Epic', 'Luminous filaments thread through the name before tightening into a clean signal.', 'Signal', false, 'earned', NULL, 'active'),
  ('name_motion_prism_fracture', 'Prism Fracture', 'name_motion', 760000, 'renderer', 'prism-fracture', NULL, NULL, 'Mythic', 'The name separates into vivid spectral facets, then snaps back into focus.', 'Prism', false, 'earned', NULL, 'active'),
  ('name_motion_molten_rise', 'Molten Rise', 'name_motion', 580000, 'renderer', 'molten-rise', NULL, NULL, 'Anomaly', 'A hot liquid front climbs through the letters, shedding bright heat at the edge.', 'Ember', false, 'earned', NULL, 'active'),
  ('name_motion_voltage_arc', 'Voltage Arc', 'name_motion', 520000, 'renderer', 'voltage-arc', NULL, NULL, 'Anomaly', 'A living arc jumps between the letterforms in sharp cyan, violet, and white.', 'Signal', false, 'earned', NULL, 'active'),
  ('name_motion_archive_bloom', 'Archive Bloom', 'name_motion', 600000, 'renderer', 'archive-bloom', NULL, NULL, 'Anomaly', 'Stored color memories bloom through the name like layered exposures.', 'Archive', false, 'earned', NULL, 'active')
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
    OR (slot = 'name_motion' AND css_value IN ('velvet-sweep', 'refraction-sweep', 'ghost-offset', 'focus-resolve', 'mask-reveal', 'quiet-afterimage', 'soft-rise', 'scanline-reveal', 'particle-drift', 'letter-shuffle', 'fuzzy-signal', 'typewriter-name', 'chromatic-ripple', 'liquid-fill', 'pixel-dissolve', 'echo-collapse', 'heat-shimmer', 'signal-lock', 'letter-cascade', 'orbiting-spark', 'color-memory', 'daily-pulse', 'prism-shatter', 'ink-spread', 'filament-trace', 'prism-fracture', 'molten-rise', 'voltage-arc', 'archive-bloom'))
    OR (slot = 'profile_border' AND css_value IN ('celestial', 'chroma', 'crystal', 'glitch', 'gold', 'neon', 'prism', 'void', 'signal'))
    OR (slot = 'cursor_trail' AND css_value IN ('signal-trace', 'pixel-wake', 'chroma-ribbon', 'glass-shards', 'ember-ash', 'comet-thread', 'ink-drops', 'orbit-dust', 'static-echo', 'rain-trace', 'gold-fleck', 'ghost-tail', 'color-memory', 'marker-stroke', 'solar-sparks', 'void-lensing'))
    OR (slot = 'avatar_effect' AND css_value IN ('signal-ring', 'neon-halo', 'prism-orbit', 'crystal-aperture', 'chroma-arc', 'ember-crown', 'ashfall', 'gold-laurel', 'ink-stamp', 'paper-tear', 'static-offset', 'pixel-satellites', 'crt-scan', 'void-eclipse', 'ghost-double', 'night-frame', 'daily-aura', 'color-archive'))
    OR (slot = 'profile_layout' AND css_value IN ('split-signal', 'archive-index', 'prism-mosaic', 'night-terminal', 'story-stack'))
    OR (slot = 'profile_atmosphere' AND css_value IN ('rain-window', 'droplets-glass', 'dust-light', 'ink-bloom', 'snowfall', 'silk-folds', 'glass-caustics', 'cinder-drift', 'night-pollen', 'paper-shadow', 'smoke-spiral', 'lumen-flare'))
  )
);

INSERT INTO public.meta (key, value)
VALUES ('shop_version', '2026-08-05T12:00:00Z')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

DO $verification$
DECLARE
  active_count bigint;
  motion_count bigint;
  legacy_motion_count bigint;
BEGIN
  SELECT count(*) INTO active_count FROM public.shop_items WHERE catalog_status = 'active';
  IF active_count <> 112 THEN RAISE EXCEPTION 'Expected 112 active catalog rows, found %', active_count; END IF;
  SELECT count(*) INTO motion_count FROM public.shop_items WHERE slot = 'name_motion' AND catalog_status = 'active';
  IF motion_count <> 10 THEN RAISE EXCEPTION 'Expected 10 active Name Motion rows, found %', motion_count; END IF;
  SELECT count(*) INTO legacy_motion_count FROM public.shop_items WHERE slot = 'name_motion' AND catalog_status = 'legacy';
  IF legacy_motion_count <> 19 THEN RAISE EXCEPTION 'Expected 19 legacy Name Motion rows, found %', legacy_motion_count; END IF;
END;
$verification$;

COMMIT;
