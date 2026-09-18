-- Ten authored border designs. Reuse nine IDs and add one finite renderer key.
-- No inventory, profile or progression data is rewritten.
BEGIN;

ALTER TABLE public.shop_items DROP CONSTRAINT IF EXISTS shop_items_shape_check;

ALTER TABLE public.shop_items ADD CONSTRAINT shop_items_shape_check CHECK (
  item_key ~ '^[a-z0-9_]{1,80}$'
  AND slot IN ('consumable', 'title', 'name_font', 'name_material', 'name_motion', 'profile_border', 'cursor_trail', 'avatar_effect', 'profile_layout', 'profile_atmosphere', 'profile_motion')
  AND length(css_value) <= 2000
  AND (available_from IS NULL OR available_until IS NULL OR available_from <= available_until)
  AND (slot IN ('consumable', 'title') OR css_type = 'renderer')
  AND (
    css_type <> 'renderer'
    OR (slot = 'name_font' AND css_value IN ('editorial-serif', 'condensed-sans', 'wide-geometric', 'mono-compact', 'rounded-mono', 'soft-grotesk', 'humanist-display', 'modern-fraktur', 'pixel-display', 'high-contrast-italic', 'neo-slab', 'reverse-contrast', 'industrial-stencil', 'futurist-extended', 'terminal-bitmap', 'rounded-display', 'marker-tag', 'newspaper-black', 'satoshi', 'fira-code', 'poppins', 'jetbrains-mono', 'array', 'silkscreen', 'velocity', 'outfit', 'kode-mono', 'soft-orbit', 'fredoka', 'baloo-2', 'bubblegum-sans', 'comic-neue', 'lilita-one'))
    OR (slot = 'name_material' AND css_value IN ('polished-chrome', 'copper-press', 'glass-emboss', 'fine-outline', 'ink-bleed', 'pearl-foil', 'carbon-cut', 'frosted-edge', 'holographic-film', 'cut-paper', 'neon-tube', 'liquid-mercury', 'oil-slick', 'thermal-ink', 'velvet-ink', 'embroidered-thread', 'engraved-stone', 'crt-phosphor', 'gold-leaf', 'chroma-glass', 'ceramic-glaze', 'blueprint-ink', 'halo-edge'))
    OR (slot = 'name_motion' AND css_value IN ('velvet-sweep', 'refraction-sweep', 'ghost-offset', 'focus-resolve', 'mask-reveal', 'quiet-afterimage', 'soft-rise', 'scanline-reveal', 'particle-drift', 'letter-shuffle', 'fuzzy-signal', 'typewriter-name', 'chromatic-ripple', 'liquid-fill', 'pixel-dissolve', 'echo-collapse', 'heat-shimmer', 'signal-lock', 'letter-cascade', 'orbiting-spark', 'color-memory', 'daily-pulse', 'prism-shatter', 'ink-spread', 'filament-trace', 'prism-fracture', 'molten-rise', 'voltage-arc', 'archive-bloom', 'haunt-glow', 'haunt-particles', 'haunt-rainbow', 'haunt-gradient', 'haunt-fuzzy', 'haunt-reveal', 'haunt-split', 'haunt-flash', 'kinetic-echo', 'magnetic-type', 'neon-particle', 'raster-signal', 'spectrum-flow', 'star-companions', 'heart-pop', 'ion-sweep', 'phase-fracture', 'letterpress'))
    OR (slot = 'profile_border' AND css_value IN ('celestial', 'chroma', 'crystal', 'glitch', 'gold', 'neon', 'prism', 'void', 'signal', 'elastic', 'shimmer-track', 'aurora'))
    OR (slot = 'cursor_trail' AND css_value IN ('signal-trace', 'pixel-wake', 'chroma-ribbon', 'glass-shards', 'ember-ash', 'comet-thread', 'ink-drops', 'orbit-dust', 'static-echo', 'rain-trace', 'gold-fleck', 'ghost-tail', 'color-memory', 'marker-stroke', 'solar-sparks', 'void-lensing', 'plasma-swarm', 'bubble-wake', 'character-bloom', 'emoji-bloom', 'following-dot', 'text-flag', 'springy-emoji'))
    OR (slot = 'avatar_effect' AND css_value IN ('signal-ring', 'neon-halo', 'prism-orbit', 'crystal-aperture', 'chroma-arc', 'ember-crown', 'ashfall', 'gold-laurel', 'ink-stamp', 'paper-tear', 'static-offset', 'pixel-satellites', 'crt-scan', 'void-eclipse', 'ghost-double', 'night-frame', 'daily-aura', 'color-archive', '3d-parallax', 'glitch-slicer', 'liquid-blob', 'cyber-hud', 'butterfly-orbit', 'bat-orbit', 'fireflies', 'moonlit-clouds', 'enchanted-garden', 'prismatic-fracture', 'sakura-neko', 'cloud-bunny', 'crimson-ronin', 'midnight-oni', 'koi-current', 'sakura-petals'))
    OR (slot = 'profile_layout' AND css_value IN ('compact', 'full-bleed', 'sleek', 'framed', 'portfolio'))
    OR (slot = 'profile_atmosphere' AND css_value IN ('rain-window', 'droplets-glass', 'dust-light', 'ink-bloom', 'snowfall', 'silk-folds', 'glass-caustics', 'cinder-drift', 'night-pollen', 'paper-shadow', 'smoke-spiral', 'lumen-flare', 'prism-dust'))
    OR (slot = 'profile_motion' AND css_value IN ('perspective-tilt', 'halo-offset', 'wavefront'))
  )
);

UPDATE public.shop_items SET name = 'Rosette', description = 'Satin pink bows, a fine pearl edge and tiny floating hearts.' WHERE item_key = 'border_chroma';
UPDATE public.shop_items SET name = 'Love Letter', description = 'Lipstick-red wax hearts and a blush stitched stationery border.' WHERE item_key = 'border_glitch';
UPDATE public.shop_items SET name = 'Sakura Diary', description = 'Painted cherry blossoms on warm branches with drifting pink petals.' WHERE item_key = 'border_gold';
UPDATE public.shop_items SET name = 'Manga Panel', description = 'Off-white ink panels, red impact marks and animated screentone details.' WHERE item_key = 'border_neon';
UPDATE public.shop_items SET name = 'Midnight Rose', description = 'Crimson roses and dark leaves entwine a tarnished silver edge.' WHERE item_key = 'border_prism';
UPDATE public.shop_items SET name = 'Blackthorn', description = 'Sharp silver thorn vines wrap a dark rim with blood-red glints.' WHERE item_key = 'border_void';
UPDATE public.shop_items SET name = 'Web Angel', description = 'Pixel wings, a lavender heart and nostalgic old-web chrome.' WHERE item_key = 'border_signal';
UPDATE public.shop_items SET name = 'Afterhours', description = 'Torn photocopy tape, pencil scratches and acid-yellow zine doodles.' WHERE item_key = 'border_elastic';
UPDATE public.shop_items SET name = 'Sea Glass', description = 'Translucent tide lines, pearly shells and gently floating water drops.' WHERE item_key = 'border_shimmer_track';

INSERT INTO public.shop_items (
  item_key, name, slot, cost, css_type, css_value, available_from, available_until,
  rarity, description, collection, stackable, access_tier, entitlement_key, catalog_status
) VALUES
  ('border_aurora', 'Wildflower', 'profile_border', 0, 'renderer', 'aurora', NULL, NULL,
   'Epic', 'Garden vines with periwinkle, butter-yellow and ivory flowers.', 'Prism', false, 'free', NULL, 'active')
ON CONFLICT (item_key) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description,
  css_type = EXCLUDED.css_type, css_value = EXCLUDED.css_value;

INSERT INTO public.meta (key, value) VALUES ('shop_version', '2026-09-18T14:00:00Z')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

COMMIT;
