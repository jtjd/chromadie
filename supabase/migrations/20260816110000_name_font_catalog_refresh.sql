-- Curate the active Profile Effects font choices around the redesigned
-- identity system. Historical renderer rows remain legacy-readable so an
-- equipped profile keeps its visual contract after the catalog changes.
BEGIN;

ALTER TABLE public.shop_items DROP CONSTRAINT IF EXISTS shop_items_shape_check;

UPDATE public.shop_items
SET catalog_status = 'legacy'
WHERE slot = 'name_font'
  AND css_value NOT IN (
    'industrial-stencil', 'marker-tag', 'satoshi', 'fira-code', 'poppins',
    'jetbrains-mono', 'array', 'velocity', 'outfit'
  );

INSERT INTO public.shop_items (
  item_key, name, slot, cost, css_type, css_value, available_from, available_until,
  rarity, description, collection, stackable, access_tier, entitlement_key, catalog_status
) VALUES
  ('name_font_satoshi', 'Satoshi', 'name_font', 0, 'renderer', 'satoshi', NULL, NULL, 'Uncommon', 'A clean contemporary sans with a calm, balanced identity voice.', 'Nocturne', false, 'free', NULL, 'active'),
  ('name_font_fira_code', 'Fira Code', 'name_font', 0, 'renderer', 'fira-code', NULL, NULL, 'Rare', 'A coding-oriented monospace with a crisp, deliberate rhythm.', 'Signal', false, 'free', NULL, 'active'),
  ('name_font_poppins', 'Poppins', 'name_font', 0, 'renderer', 'poppins', NULL, NULL, 'Uncommon', 'A geometric sans with open counters and a polished everyday profile.', 'Prism', false, 'free', NULL, 'active'),
  ('name_font_jetbrains_mono', 'JetBrains Mono', 'name_font', 0, 'renderer', 'jetbrains-mono', NULL, NULL, 'Rare', 'A technical monospace with distinctive shapes and focused spacing.', 'Signal', false, 'free', NULL, 'active'),
  ('name_font_array', 'Array', 'name_font', 0, 'renderer', 'array', NULL, NULL, 'Epic', 'A dot-grid display face that turns the name into a compact signal.', 'Static Bloom', false, 'free', NULL, 'active'),
  ('name_font_velocity', 'Velocity', 'name_font', 0, 'renderer', 'velocity', NULL, NULL, 'Rare', 'A sharp display face with forward motion and an unmistakable silhouette.', 'Signal', false, 'free', NULL, 'active'),
  ('name_font_outfit', 'Outfit', 'name_font', 0, 'renderer', 'outfit', NULL, NULL, 'Uncommon', 'A modern rounded sans with a confident, approachable profile.', 'Nocturne', false, 'free', NULL, 'active')
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

UPDATE public.shop_items
SET access_tier = 'free',
    cost = 0,
    entitlement_key = NULL
WHERE slot = 'name_font'
  AND catalog_status = 'active';

ALTER TABLE public.shop_items ADD CONSTRAINT shop_items_shape_check CHECK (
  item_key ~ '^[a-z0-9_]{1,80}$'
  AND slot IN ('consumable', 'title', 'name_font', 'name_material', 'name_motion', 'profile_border', 'cursor_trail', 'avatar_effect', 'profile_layout', 'profile_atmosphere', 'profile_motion')
  AND length(css_value) <= 2000
  AND (available_from IS NULL OR available_until IS NULL OR available_from <= available_until)
  AND (slot IN ('consumable', 'title') OR css_type = 'renderer')
  AND (
    css_type <> 'renderer'
    OR (slot = 'name_font' AND css_value IN ('editorial-serif', 'condensed-sans', 'wide-geometric', 'mono-compact', 'rounded-mono', 'soft-grotesk', 'humanist-display', 'modern-fraktur', 'pixel-display', 'high-contrast-italic', 'neo-slab', 'reverse-contrast', 'industrial-stencil', 'futurist-extended', 'terminal-bitmap', 'rounded-display', 'marker-tag', 'newspaper-black', 'satoshi', 'fira-code', 'poppins', 'jetbrains-mono', 'array', 'velocity', 'outfit'))
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

INSERT INTO public.meta (key, value)
VALUES ('shop_version', '2026-08-16T11:00:00Z')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

DO $verification$
DECLARE
  active_count bigint;
  font_count bigint;
  legacy_font_count bigint;
BEGIN
  SELECT count(*) INTO active_count FROM public.shop_items WHERE catalog_status = 'active';
  IF active_count <> 88 THEN RAISE EXCEPTION 'Expected 88 active catalog rows, found %', active_count; END IF;
  SELECT count(*) INTO font_count FROM public.shop_items WHERE slot = 'name_font' AND catalog_status = 'active';
  IF font_count <> 9 THEN RAISE EXCEPTION 'Expected 9 active Name Font rows, found %', font_count; END IF;
  SELECT count(*) INTO legacy_font_count FROM public.shop_items WHERE slot = 'name_font' AND catalog_status = 'legacy';
  IF legacy_font_count <> 16 THEN RAISE EXCEPTION 'Expected 16 legacy Name Font rows, found %', legacy_font_count; END IF;
END;
$verification$;

COMMIT;
