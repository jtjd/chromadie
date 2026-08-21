-- Add the approved effect handoff to the existing finite renderer catalog.
-- No legacy rows, inventory records, or equipped loadouts are removed here.
BEGIN;

ALTER TABLE public.shop_items DROP CONSTRAINT IF EXISTS shop_items_shape_check;
ALTER TABLE public.shop_items DROP CONSTRAINT IF EXISTS shop_items_atmosphere_renderer_check;

INSERT INTO public.shop_items (
  item_key, name, slot, cost, css_type, css_value, available_from, available_until,
  rarity, description, collection, stackable, access_tier, entitlement_key, catalog_status
) VALUES
  ('name_motion_kinetic_echo', 'Kinetic Echo', 'name_motion', 0, 'renderer', 'kinetic-echo', NULL, NULL, 'Epic', 'Controlled afterimages follow the name in two offset, color-separated echoes.', 'Signal', false, 'free', NULL, 'active'),
  ('name_motion_magnetic_type', 'Magnetic Type', 'name_motion', 0, 'renderer', 'magnetic-type', NULL, NULL, 'Epic', 'Each glyph responds to the pointer as if the name were suspended in a magnetic field.', 'Prism', false, 'free', NULL, 'active'),
  ('name_motion_neon_particle', 'Neon Particle', 'name_motion', 0, 'renderer', 'neon-particle', NULL, NULL, 'Anomaly', 'A masked internal energy field, edge emission, and micro-particles keep the name electrically alive.', 'Signal', false, 'free', NULL, 'active'),
  ('name_motion_raster_signal', 'Raster Signal', 'name_motion', 0, 'renderer', 'raster-signal', NULL, NULL, 'Epic', 'Monochrome scan rows jitter, duplicate, and displace while the name stays compact and legible.', 'Static Bloom', false, 'free', NULL, 'active'),
  ('border_elastic', 'Elastic Frame', 'profile_border', 0, 'renderer', 'elastic', NULL, NULL, 'Epic', 'A tensioned perimeter bends toward the pointer while keeping the profile boundary in place.', 'Signal', false, 'free', NULL, 'active'),
  ('profile_motion_halo_offset', 'Halo Offset', 'profile_motion', 0, 'renderer', 'halo-offset', NULL, NULL, 'Epic', 'Detached profile shells lag the card motion in three measured layers.', 'Prism', false, 'free', NULL, 'active'),
  ('profile_motion_wavefront', 'Wavefront', 'profile_motion', 0, 'renderer', 'wavefront', NULL, NULL, 'Epic', 'A physical-looking wave crosses the profile once, displaces nearby elements, and settles exactly.', 'Signal', false, 'free', NULL, 'active'),
  ('profile_atmosphere_prism_dust', 'Prism Dust', 'profile_atmosphere', 0, 'renderer', 'prism-dust', NULL, NULL, 'Epic', 'Refractive shards drift at varied depths, catching light in small clustered constellations.', 'Prism', false, 'free', NULL, 'active'),
  ('cursor_trail_plasma_swarm', 'Plasma Swarm', 'cursor_trail', 0, 'renderer', 'plasma-swarm', NULL, NULL, 'Anomaly', 'Charged clusters, hot nodes, and electrical links gather around the moving pointer.', 'Signal', false, 'free', NULL, 'active'),
  ('avatar_effect_butterfly_orbit', 'Butterfly Orbit', 'avatar_effect', 0, 'renderer', 'butterfly-orbit', NULL, NULL, 'Epic', 'A ring of glowing butterflies orbits the real avatar through a projected 3D depth field.', 'Prism', false, 'free', NULL, 'active'),
  ('avatar_effect_bat_orbit', 'Bat Orbit', 'avatar_effect', 0, 'renderer', 'bat-orbit', NULL, NULL, 'Anomaly', 'A flock of dark bats sweeps around the real avatar with curved wings and true front-back depth.', 'Nocturne', false, 'free', NULL, 'active')
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
    OR (slot = 'name_font' AND css_value IN ('editorial-serif', 'condensed-sans', 'wide-geometric', 'mono-compact', 'rounded-mono', 'soft-grotesk', 'humanist-display', 'modern-fraktur', 'pixel-display', 'high-contrast-italic', 'neo-slab', 'reverse-contrast', 'industrial-stencil', 'futurist-extended', 'terminal-bitmap', 'rounded-display', 'marker-tag', 'newspaper-black', 'satoshi', 'fira-code', 'poppins', 'jetbrains-mono', 'array', 'silkscreen', 'velocity', 'outfit'))
    OR (slot = 'name_material' AND css_value IN ('polished-chrome', 'copper-press', 'glass-emboss', 'fine-outline', 'ink-bleed', 'pearl-foil', 'carbon-cut', 'frosted-edge', 'holographic-film', 'cut-paper', 'neon-tube', 'liquid-mercury', 'oil-slick', 'thermal-ink', 'velvet-ink', 'embroidered-thread', 'engraved-stone', 'crt-phosphor', 'gold-leaf', 'chroma-glass', 'ceramic-glaze', 'blueprint-ink'))
    OR (slot = 'name_motion' AND css_value IN ('velvet-sweep', 'refraction-sweep', 'ghost-offset', 'focus-resolve', 'mask-reveal', 'quiet-afterimage', 'soft-rise', 'scanline-reveal', 'particle-drift', 'letter-shuffle', 'fuzzy-signal', 'typewriter-name', 'chromatic-ripple', 'liquid-fill', 'pixel-dissolve', 'echo-collapse', 'heat-shimmer', 'signal-lock', 'letter-cascade', 'orbiting-spark', 'color-memory', 'daily-pulse', 'prism-shatter', 'ink-spread', 'filament-trace', 'prism-fracture', 'molten-rise', 'voltage-arc', 'archive-bloom', 'haunt-glow', 'haunt-particles', 'haunt-rainbow', 'haunt-gradient', 'haunt-fuzzy', 'haunt-reveal', 'haunt-split', 'haunt-flash', 'kinetic-echo', 'magnetic-type', 'neon-particle', 'raster-signal'))
    OR (slot = 'profile_border' AND css_value IN ('celestial', 'chroma', 'crystal', 'glitch', 'gold', 'neon', 'prism', 'void', 'signal', 'elastic'))
    OR (slot = 'cursor_trail' AND css_value IN ('signal-trace', 'pixel-wake', 'chroma-ribbon', 'glass-shards', 'ember-ash', 'comet-thread', 'ink-drops', 'orbit-dust', 'static-echo', 'rain-trace', 'gold-fleck', 'ghost-tail', 'color-memory', 'marker-stroke', 'solar-sparks', 'void-lensing', 'plasma-swarm'))
    OR (slot = 'avatar_effect' AND css_value IN ('signal-ring', 'neon-halo', 'prism-orbit', 'crystal-aperture', 'chroma-arc', 'ember-crown', 'ashfall', 'gold-laurel', 'ink-stamp', 'paper-tear', 'static-offset', 'pixel-satellites', 'crt-scan', 'void-eclipse', 'ghost-double', 'night-frame', 'daily-aura', 'color-archive', '3d-parallax', 'glitch-slicer', 'liquid-blob', 'cyber-hud', 'butterfly-orbit', 'bat-orbit'))
    OR (slot = 'profile_layout' AND css_value IN ('compact', 'full-bleed', 'framed'))
    OR (slot = 'profile_atmosphere' AND css_value IN ('rain-window', 'droplets-glass', 'dust-light', 'ink-bloom', 'snowfall', 'silk-folds', 'glass-caustics', 'cinder-drift', 'night-pollen', 'paper-shadow', 'smoke-spiral', 'lumen-flare', 'prism-dust'))
    OR (slot = 'profile_motion' AND css_value IN ('perspective-tilt', 'halo-offset', 'wavefront'))
  )
);

ALTER TABLE public.shop_items ADD CONSTRAINT shop_items_atmosphere_renderer_check CHECK (
  slot <> 'profile_atmosphere'
  OR css_value IN ('rain-window', 'droplets-glass', 'dust-light', 'ink-bloom', 'snowfall', 'silk-folds', 'glass-caustics', 'cinder-drift', 'night-pollen', 'paper-shadow', 'smoke-spiral', 'lumen-flare', 'prism-dust')
);

INSERT INTO public.meta (key, value)
VALUES ('shop_version', '2026-08-21T09:00:00Z')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

DO $verification$
DECLARE
  active_count bigint;
  name_motion_count bigint;
  border_count bigint;
  cursor_count bigint;
  avatar_count bigint;
  atmosphere_count bigint;
  motion_count bigint;
BEGIN
  SELECT count(*) INTO active_count FROM public.shop_items WHERE catalog_status = 'active';
  SELECT count(*) INTO name_motion_count FROM public.shop_items WHERE slot = 'name_motion' AND catalog_status = 'active';
  SELECT count(*) INTO border_count FROM public.shop_items WHERE slot = 'profile_border' AND catalog_status = 'active';
  SELECT count(*) INTO cursor_count FROM public.shop_items WHERE slot = 'cursor_trail' AND catalog_status = 'active';
  SELECT count(*) INTO avatar_count FROM public.shop_items WHERE slot = 'avatar_effect' AND catalog_status = 'active';
  SELECT count(*) INTO atmosphere_count FROM public.shop_items WHERE slot = 'profile_atmosphere' AND catalog_status = 'active';
  SELECT count(*) INTO motion_count FROM public.shop_items WHERE slot = 'profile_motion' AND catalog_status = 'active';
  IF active_count <> 87 THEN RAISE EXCEPTION 'Expected 87 active catalog rows, found %', active_count; END IF;
  IF name_motion_count <> 15 THEN RAISE EXCEPTION 'Expected 15 active Name Motion rows, found %', name_motion_count; END IF;
  IF border_count <> 10 THEN RAISE EXCEPTION 'Expected 10 active Profile Border rows, found %', border_count; END IF;
  IF cursor_count <> 17 THEN RAISE EXCEPTION 'Expected 17 active Cursor Trail rows, found %', cursor_count; END IF;
  IF avatar_count <> 6 THEN RAISE EXCEPTION 'Expected 6 active Avatar Effect rows, found %', avatar_count; END IF;
  IF atmosphere_count <> 14 THEN RAISE EXCEPTION 'Expected 14 active Profile Atmosphere rows, found %', atmosphere_count; END IF;
  IF motion_count <> 3 THEN RAISE EXCEPTION 'Expected 3 active Profile Motion rows, found %', motion_count; END IF;
END;
$verification$;

COMMIT;
