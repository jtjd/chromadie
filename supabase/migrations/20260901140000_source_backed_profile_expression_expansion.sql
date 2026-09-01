-- Add the non-cursor behaviors observed in populated public profiles:
-- a rounded edge light track, a full-spectrum name field, a fixed username
-- halo, a shipped display face, and two entry animation values. All visual
-- behavior remains code-owned by Chromadie.
BEGIN;

ALTER TABLE public.shop_items DROP CONSTRAINT IF EXISTS shop_items_shape_check;

INSERT INTO public.shop_items (
  item_key, name, slot, cost, css_type, css_value, available_from, available_until,
  rarity, description, collection, stackable, access_tier, entitlement_key, catalog_status
) VALUES
  ('border_shimmer_track', 'Shimmer Track', 'profile_border', 0, 'renderer', 'shimmer-track', NULL, NULL,
    'Epic', 'Ten soft highlights travel the rounded profile edge in a continuous light track.', 'Prism', false, 'free', NULL, 'active'),
  ('name_font_soft_orbit', 'Soft Orbit', 'name_font', 0, 'renderer', 'soft-orbit', NULL, NULL,
    'Rare', 'A rounded display voice with an easy rhythm and a soft, orbiting silhouette.', 'Prism', false, 'free', NULL, 'active'),
  ('name_material_halo_edge', 'Soft Halo', 'name_material', 0, 'renderer', 'halo-edge', NULL, NULL,
    'Rare', 'A fixed luminous edge lifts the name from the page without changing its fill.', 'Prism', false, 'free', NULL, 'active'),
  ('name_motion_spectrum_flow', 'Spectrum Flow', 'name_motion', 0, 'renderer', 'spectrum-flow', NULL, NULL,
    'Epic', 'A full-spectrum color field travels continuously across the name with a clean, light-filled finish.', 'Prism', false, 'free', NULL, 'active')
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
    OR (slot = 'name_font' AND css_value IN ('editorial-serif', 'condensed-sans', 'wide-geometric', 'mono-compact', 'rounded-mono', 'soft-grotesk', 'humanist-display', 'modern-fraktur', 'pixel-display', 'high-contrast-italic', 'neo-slab', 'reverse-contrast', 'industrial-stencil', 'futurist-extended', 'terminal-bitmap', 'rounded-display', 'marker-tag', 'newspaper-black', 'satoshi', 'fira-code', 'poppins', 'jetbrains-mono', 'array', 'silkscreen', 'velocity', 'outfit', 'kode-mono', 'soft-orbit'))
    OR (slot = 'name_material' AND css_value IN ('polished-chrome', 'copper-press', 'glass-emboss', 'fine-outline', 'ink-bleed', 'pearl-foil', 'carbon-cut', 'frosted-edge', 'holographic-film', 'cut-paper', 'neon-tube', 'liquid-mercury', 'oil-slick', 'thermal-ink', 'velvet-ink', 'embroidered-thread', 'engraved-stone', 'crt-phosphor', 'gold-leaf', 'chroma-glass', 'ceramic-glaze', 'blueprint-ink', 'halo-edge'))
    OR (slot = 'name_motion' AND css_value IN ('velvet-sweep', 'refraction-sweep', 'ghost-offset', 'focus-resolve', 'mask-reveal', 'quiet-afterimage', 'soft-rise', 'scanline-reveal', 'particle-drift', 'letter-shuffle', 'fuzzy-signal', 'typewriter-name', 'chromatic-ripple', 'liquid-fill', 'pixel-dissolve', 'echo-collapse', 'heat-shimmer', 'signal-lock', 'letter-cascade', 'orbiting-spark', 'color-memory', 'daily-pulse', 'prism-shatter', 'ink-spread', 'filament-trace', 'prism-fracture', 'molten-rise', 'voltage-arc', 'archive-bloom', 'haunt-glow', 'haunt-particles', 'haunt-rainbow', 'haunt-gradient', 'haunt-fuzzy', 'haunt-reveal', 'haunt-split', 'haunt-flash', 'kinetic-echo', 'magnetic-type', 'neon-particle', 'raster-signal', 'spectrum-flow'))
    OR (slot = 'profile_border' AND css_value IN ('celestial', 'chroma', 'crystal', 'glitch', 'gold', 'neon', 'prism', 'void', 'signal', 'elastic', 'shimmer-track'))
    OR (slot = 'cursor_trail' AND css_value IN ('signal-trace', 'pixel-wake', 'chroma-ribbon', 'glass-shards', 'ember-ash', 'comet-thread', 'ink-drops', 'orbit-dust', 'static-echo', 'rain-trace', 'gold-fleck', 'ghost-tail', 'color-memory', 'marker-stroke', 'solar-sparks', 'void-lensing', 'plasma-swarm', 'bubble-wake', 'character-bloom', 'emoji-bloom', 'following-dot', 'text-flag', 'springy-emoji'))
    OR (slot = 'avatar_effect' AND css_value IN ('signal-ring', 'neon-halo', 'prism-orbit', 'crystal-aperture', 'chroma-arc', 'ember-crown', 'ashfall', 'gold-laurel', 'ink-stamp', 'paper-tear', 'static-offset', 'pixel-satellites', 'crt-scan', 'void-eclipse', 'ghost-double', 'night-frame', 'daily-aura', 'color-archive', '3d-parallax', 'glitch-slicer', 'liquid-blob', 'cyber-hud', 'butterfly-orbit', 'bat-orbit'))
    OR (slot = 'profile_layout' AND css_value IN ('compact', 'full-bleed', 'sleek', 'framed', 'portfolio'))
    OR (slot = 'profile_atmosphere' AND css_value IN ('rain-window', 'droplets-glass', 'dust-light', 'ink-bloom', 'snowfall', 'silk-folds', 'glass-caustics', 'cinder-drift', 'night-pollen', 'paper-shadow', 'smoke-spiral', 'lumen-flare', 'prism-dust'))
    OR (slot = 'profile_motion' AND css_value IN ('perspective-tilt', 'halo-offset', 'wavefront'))
  )
);

CREATE OR REPLACE FUNCTION public.profile_v2_normalize_identity(p_input jsonb)
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path TO public, pg_catalog
AS $function$
  SELECT jsonb_build_object(
    'version', 1,
    'location', public.profile_v2_safe_text(p_input->>'location', 60),
    'timezone', CASE WHEN coalesce(p_input->>'timezone','') ~ '^[A-Za-z0-9_+./:-]{1,40}$' THEN p_input->>'timezone' ELSE '' END,
    'showJoinDate', CASE WHEN p_input->>'showJoinDate' IN ('true', 'false') THEN (p_input->>'showJoinDate')::boolean ELSE false END,
    'showAvatar', CASE WHEN p_input->>'showAvatar' IN ('true', 'false') THEN (p_input->>'showAvatar')::boolean ELSE true END,
    'descriptionMode', CASE WHEN p_input->>'descriptionMode' IN ('plain','typewriter') THEN p_input->>'descriptionMode' ELSE 'plain' END,
    'entryAnimation', CASE WHEN p_input->>'entryAnimation' IN ('none','fade','rise','focus','pop','unfold') THEN p_input->>'entryAnimation' ELSE 'none' END
  );
$function$;

INSERT INTO public.meta (key, value)
VALUES ('shop_version', '2026-09-01T14:00:00Z')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

DO $verification$
DECLARE
  active_count bigint;
  name_motion_count bigint;
  border_count bigint;
BEGIN
  SELECT count(*) INTO active_count FROM public.shop_items WHERE catalog_status = 'active';
  SELECT count(*) INTO name_motion_count FROM public.shop_items WHERE slot = 'name_motion' AND catalog_status = 'active';
  SELECT count(*) INTO border_count FROM public.shop_items WHERE slot = 'profile_border' AND catalog_status = 'active';
  IF active_count <> 98 THEN RAISE EXCEPTION 'Expected 98 active catalog rows, found %', active_count; END IF;
  IF (SELECT count(*) FROM public.shop_items WHERE slot = 'name_font' AND catalog_status = 'active') <> 12 THEN RAISE EXCEPTION 'Expected 12 active Name Font rows'; END IF;
  IF (SELECT count(*) FROM public.shop_items WHERE slot = 'name_material' AND catalog_status = 'active') <> 8 THEN RAISE EXCEPTION 'Expected 8 active Name Material rows'; END IF;
  IF name_motion_count <> 15 THEN RAISE EXCEPTION 'Expected 15 active Name Motion rows, found %', name_motion_count; END IF;
  IF border_count <> 11 THEN RAISE EXCEPTION 'Expected 11 active Profile Border rows, found %', border_count; END IF;
END;
$verification$;

COMMIT;
