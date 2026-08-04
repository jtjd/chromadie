-- Split the weather atmospheres: Rain Window is rain-only, while Droplets on
-- Glass is a separate authored still built from real windshield droplets.
BEGIN;

-- The prior atmosphere migration has a closed renderer allowlist. Open the
-- constraint before inserting the new key, then restore the complete check
-- below with the new value included.
ALTER TABLE public.shop_items DROP CONSTRAINT IF EXISTS shop_items_shape_check;

INSERT INTO public.shop_items (
  item_key, name, slot, cost, css_type, css_value, available_from, available_until,
  rarity, description, collection, stackable, access_tier, entitlement_key, catalog_status
) VALUES (
  'profile_atmosphere_droplets_glass', 'Droplets on Glass', 'profile_atmosphere', 240000,
  'renderer', 'droplets-glass', NULL, NULL, 'Rare',
  'Realistic beads and trails cling to a pane, catching the daily color without obscuring the profile.',
  'Archive', false, 'earned', NULL, 'active'
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

UPDATE public.shop_items
SET description = 'A seamless fall of fine rain turns the profile into a quiet weather signal.'
WHERE item_key = 'profile_atmosphere_rain_window';

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
    OR (slot = 'profile_atmosphere' AND css_value IN ('signal-garden', 'aurora-veil', 'rain-window', 'droplets-glass', 'emberfall', 'paper-archive', 'prism-lens', 'lunar-tide', 'color-memory'))
  )
);

INSERT INTO public.meta (key, value) VALUES ('shop_version', '2026-08-04T18:30:00Z')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

DO $verification$
DECLARE active_count bigint; atmosphere_count bigint;
BEGIN
  SELECT count(*) INTO active_count FROM public.shop_items WHERE catalog_status = 'active';
  IF active_count <> 123 THEN RAISE EXCEPTION 'Expected 123 active catalog rows, found %', active_count; END IF;
  SELECT count(*) INTO atmosphere_count FROM public.shop_items WHERE slot = 'profile_atmosphere' AND catalog_status = 'active';
  IF atmosphere_count <> 9 THEN RAISE EXCEPTION 'Expected 9 active Profile Atmosphere rows, found %', atmosphere_count; END IF;
END;
$verification$;

COMMIT;
