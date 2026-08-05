-- Replace the weak authored motion pass with a compact Haunt-reference set.
-- The implementation is Chromadie-owned Canvas code; only the public behavior
-- vocabulary is used as inspiration. Existing rows stay legacy for history.
BEGIN;

ALTER TABLE public.shop_items DROP CONSTRAINT IF EXISTS shop_items_shape_check;

UPDATE public.shop_items
SET catalog_status = 'legacy'
WHERE slot = 'name_motion'
  AND css_value NOT IN (
    'letter-shuffle', 'typewriter-name', 'haunt-glow', 'haunt-particles',
    'haunt-rainbow', 'haunt-gradient', 'haunt-fuzzy', 'haunt-reveal',
    'haunt-split', 'haunt-flash'
  );

INSERT INTO public.shop_items (
  item_key, name, slot, cost, css_type, css_value, available_from, available_until,
  rarity, description, collection, stackable, access_tier, entitlement_key, catalog_status
) VALUES
  ('name_motion_letter_shuffle', 'Scramble', 'name_motion', 520000, 'renderer', 'letter-shuffle', NULL, NULL, 'Anomaly', 'Characters rearrange before locking into place.', 'Static Bloom', false, 'earned', NULL, 'active'),
  ('name_motion_typewriter_name', 'Type In', 'name_motion', 230000, 'renderer', 'typewriter-name', NULL, NULL, 'Rare', 'Characters arrive one by one with a precise editorial cursor.', 'Archive', false, 'earned', NULL, 'active'),
  ('name_motion_haunt_glow', 'Glow', 'name_motion', 280000, 'renderer', 'haunt-glow', NULL, NULL, 'Rare', 'A concentrated halo breathes around the name without washing out its edge.', 'Signal', false, 'earned', NULL, 'active'),
  ('name_motion_haunt_particles', 'Particles', 'name_motion', 420000, 'renderer', 'haunt-particles', NULL, NULL, 'Epic', 'A bright particle field lifts from the name and dissolves into the surrounding color.', 'Signal', false, 'earned', NULL, 'active'),
  ('name_motion_haunt_rainbow', 'Rainbow', 'name_motion', 620000, 'renderer', 'haunt-rainbow', NULL, NULL, 'Anomaly', 'A saturated spectrum travels across the letterforms with a polished light pass.', 'Prism', false, 'earned', NULL, 'active'),
  ('name_motion_haunt_gradient', 'Gradient', 'name_motion', 360000, 'renderer', 'haunt-gradient', NULL, NULL, 'Rare', 'A deep three-color gradient shifts slowly through the name with a crisp specular edge.', 'Prism', false, 'earned', NULL, 'active'),
  ('name_motion_haunt_fuzzy', 'Fuzzy', 'name_motion', 460000, 'renderer', 'haunt-fuzzy', NULL, NULL, 'Anomaly', 'The name resolves through soft signal noise and brief chromatic separation.', 'Static Bloom', false, 'earned', NULL, 'active'),
  ('name_motion_haunt_reveal', 'Reveal', 'name_motion', 300000, 'renderer', 'haunt-reveal', NULL, NULL, 'Rare', 'A clean light curtain unveils the name from left to right.', 'Archive', false, 'earned', NULL, 'active'),
  ('name_motion_haunt_split', 'Split Reveal', 'name_motion', 540000, 'renderer', 'haunt-split', NULL, NULL, 'Epic', 'Two halves of the name enter on separate planes and meet on the centerline.', 'Archive', false, 'earned', NULL, 'active'),
  ('name_motion_haunt_flash', 'Flash', 'name_motion', 330000, 'renderer', 'haunt-flash', NULL, NULL, 'Rare', 'A sharp white exposure rolls over the name before the color settles.', 'Signal', false, 'earned', NULL, 'active')
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
    OR (slot = 'profile_layout' AND css_value IN ('split-signal', 'archive-index', 'prism-mosaic', 'night-terminal', 'story-stack'))
    OR (slot = 'profile_atmosphere' AND css_value IN ('rain-window', 'droplets-glass', 'dust-light', 'ink-bloom', 'snowfall', 'silk-folds', 'glass-caustics', 'cinder-drift', 'night-pollen', 'paper-shadow', 'smoke-spiral', 'lumen-flare'))
  )
);

INSERT INTO public.meta (key, value)
VALUES ('shop_version', '2026-08-05T14:00:00Z')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

DO $verification$
DECLARE
  active_count bigint;
  motion_count bigint;
  legacy_motion_count bigint;
BEGIN
  SELECT count(*) INTO active_count FROM public.shop_items WHERE catalog_status = 'active';
  IF active_count <> 97 THEN RAISE EXCEPTION 'Expected 97 active catalog rows, found %', active_count; END IF;
  SELECT count(*) INTO motion_count FROM public.shop_items WHERE slot = 'name_motion' AND catalog_status = 'active';
  IF motion_count <> 10 THEN RAISE EXCEPTION 'Expected 10 active Name Motion rows, found %', motion_count; END IF;
  SELECT count(*) INTO legacy_motion_count FROM public.shop_items WHERE slot = 'name_motion' AND catalog_status = 'legacy';
  IF legacy_motion_count <> 27 THEN RAISE EXCEPTION 'Expected 27 legacy Name Motion rows, found %', legacy_motion_count; END IF;
END;
$verification$;

COMMIT;
