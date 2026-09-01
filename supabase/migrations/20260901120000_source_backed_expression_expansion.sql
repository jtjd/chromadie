-- Add the source-backed expression choices as first-class, code-owned
-- catalog rows. The renderer values are allowlisted below; no catalog row can
-- provide executable drawing instructions or an external asset URL.
BEGIN;

ALTER TABLE public.shop_items DROP CONSTRAINT IF EXISTS shop_items_shape_check;

INSERT INTO public.shop_items (
  item_key, name, slot, cost, css_type, css_value, available_from, available_until,
  rarity, description, collection, stackable, access_tier, entitlement_key, catalog_status
) VALUES
  ('name_font_kode_mono', 'Code Current', 'name_font', 0, 'renderer', 'kode-mono', NULL, NULL,
    'Rare', 'A precise coded voice with a compact rhythm and deliberate spacing.', 'Signal', false, 'free', NULL, 'active'),
  ('cursor_trail_bubble_wake', 'Bubble Lift', 'cursor_trail', 0, 'renderer', 'bubble-wake', NULL, NULL,
    'Rare', 'Pale bubbles lift, expand, and drift upward from every pointer pass.', 'Prism', false, 'free', NULL, 'active'),
  ('cursor_trail_character_bloom', 'Glyph Bloom', 'cursor_trail', 0, 'renderer', 'character-bloom', NULL, NULL,
    'Epic', 'Tiny colored glyphs launch from the pointer, rotate, and resolve into silence.', 'Archive', false, 'free', NULL, 'active'),
  ('cursor_trail_emoji_bloom', 'Joy Burst', 'cursor_trail', 0, 'renderer', 'emoji-bloom', NULL, NULL,
    'Epic', 'A rotating set of bright faces floats out of the pointer path and gently falls away.', 'Ember', false, 'free', NULL, 'active'),
  ('cursor_trail_following_dot', 'Orbit Dot', 'cursor_trail', 0, 'renderer', 'following-dot', NULL, NULL,
    'Rare', 'A dense ten-pixel point follows the pointer with a measured ten-frame lag.', 'Signal', false, 'free', NULL, 'active'),
  ('cursor_trail_text_flag', 'Signal Ribbon', 'cursor_trail', 0, 'renderer', 'text-flag', NULL, NULL,
    'Epic', 'A compact Chromadie word ribbon follows the pointer with a five-pixel wave.', 'Static Bloom', false, 'free', NULL, 'active'),
  ('cursor_trail_springy_emoji', 'Elastic Emoji', 'cursor_trail', 0, 'renderer', 'springy-emoji', NULL, NULL,
    'Anomaly', 'Seven linked emoji nodes stretch, settle, and bounce against the profile bounds.', 'Prism', false, 'free', NULL, 'active')
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
    OR (slot = 'name_font' AND css_value IN ('editorial-serif', 'condensed-sans', 'wide-geometric', 'mono-compact', 'rounded-mono', 'soft-grotesk', 'humanist-display', 'modern-fraktur', 'pixel-display', 'high-contrast-italic', 'neo-slab', 'reverse-contrast', 'industrial-stencil', 'futurist-extended', 'terminal-bitmap', 'rounded-display', 'marker-tag', 'newspaper-black', 'satoshi', 'fira-code', 'poppins', 'jetbrains-mono', 'array', 'silkscreen', 'velocity', 'outfit', 'kode-mono'))
    OR (slot = 'name_material' AND css_value IN ('polished-chrome', 'copper-press', 'glass-emboss', 'fine-outline', 'ink-bleed', 'pearl-foil', 'carbon-cut', 'frosted-edge', 'holographic-film', 'cut-paper', 'neon-tube', 'liquid-mercury', 'oil-slick', 'thermal-ink', 'velvet-ink', 'embroidered-thread', 'engraved-stone', 'crt-phosphor', 'gold-leaf', 'chroma-glass', 'ceramic-glaze', 'blueprint-ink'))
    OR (slot = 'name_motion' AND css_value IN ('velvet-sweep', 'refraction-sweep', 'ghost-offset', 'focus-resolve', 'mask-reveal', 'quiet-afterimage', 'soft-rise', 'scanline-reveal', 'particle-drift', 'letter-shuffle', 'fuzzy-signal', 'typewriter-name', 'chromatic-ripple', 'liquid-fill', 'pixel-dissolve', 'echo-collapse', 'heat-shimmer', 'signal-lock', 'letter-cascade', 'orbiting-spark', 'color-memory', 'daily-pulse', 'prism-shatter', 'ink-spread', 'filament-trace', 'prism-fracture', 'molten-rise', 'voltage-arc', 'archive-bloom', 'haunt-glow', 'haunt-particles', 'haunt-rainbow', 'haunt-gradient', 'haunt-fuzzy', 'haunt-reveal', 'haunt-split', 'haunt-flash', 'kinetic-echo', 'magnetic-type', 'neon-particle', 'raster-signal'))
    OR (slot = 'profile_border' AND css_value IN ('celestial', 'chroma', 'crystal', 'glitch', 'gold', 'neon', 'prism', 'void', 'signal', 'elastic'))
    OR (slot = 'cursor_trail' AND css_value IN ('signal-trace', 'pixel-wake', 'chroma-ribbon', 'glass-shards', 'ember-ash', 'comet-thread', 'ink-drops', 'orbit-dust', 'static-echo', 'rain-trace', 'gold-fleck', 'ghost-tail', 'color-memory', 'marker-stroke', 'solar-sparks', 'void-lensing', 'plasma-swarm', 'bubble-wake', 'character-bloom', 'emoji-bloom', 'following-dot', 'text-flag', 'springy-emoji'))
    OR (slot = 'avatar_effect' AND css_value IN ('signal-ring', 'neon-halo', 'prism-orbit', 'crystal-aperture', 'chroma-arc', 'ember-crown', 'ashfall', 'gold-laurel', 'ink-stamp', 'paper-tear', 'static-offset', 'pixel-satellites', 'crt-scan', 'void-eclipse', 'ghost-double', 'night-frame', 'daily-aura', 'color-archive', '3d-parallax', 'glitch-slicer', 'liquid-blob', 'cyber-hud', 'butterfly-orbit', 'bat-orbit'))
    OR (slot = 'profile_layout' AND css_value IN ('compact', 'full-bleed', 'sleek', 'framed', 'portfolio'))
    OR (slot = 'profile_atmosphere' AND css_value IN ('rain-window', 'droplets-glass', 'dust-light', 'ink-bloom', 'snowfall', 'silk-folds', 'glass-caustics', 'cinder-drift', 'night-pollen', 'paper-shadow', 'smoke-spiral', 'lumen-flare', 'prism-dust'))
    OR (slot = 'profile_motion' AND css_value IN ('perspective-tilt', 'halo-offset', 'wavefront'))
  )
);

INSERT INTO public.meta (key, value)
VALUES ('shop_version', '2026-09-01T12:00:00Z')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

DO $verification$
DECLARE
  active_count bigint;
  font_count bigint;
  cursor_count bigint;
BEGIN
  SELECT count(*) INTO active_count FROM public.shop_items WHERE catalog_status = 'active';
  IF active_count <> 94 THEN RAISE EXCEPTION 'Expected 94 active catalog rows, found %', active_count; END IF;
  SELECT count(*) INTO font_count FROM public.shop_items WHERE slot = 'name_font' AND catalog_status = 'active';
  IF font_count <> 11 THEN RAISE EXCEPTION 'Expected 11 active Name Font rows, found %', font_count; END IF;
  SELECT count(*) INTO cursor_count FROM public.shop_items WHERE slot = 'cursor_trail' AND catalog_status = 'active';
  IF cursor_count <> 23 THEN RAISE EXCEPTION 'Expected 23 active Cursor Trail rows, found %', cursor_count; END IF;
END;
$verification$;

COMMIT;
