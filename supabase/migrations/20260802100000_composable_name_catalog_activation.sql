-- Phase D2: activate the code-owned composable Name catalog.
--
-- This migration is additive. Legacy Name rows and inventory keys remain
-- intact; the new layer slots share the existing equipped_cosmetics JSONB
-- object and the existing purchase/equip RPC boundaries.

ALTER TABLE public.shop_items
  ADD COLUMN IF NOT EXISTS catalog_status text NOT NULL DEFAULT 'active';

UPDATE public.shop_items
SET catalog_status = 'active'
WHERE catalog_status IS NULL;

ALTER TABLE public.shop_items DROP CONSTRAINT IF EXISTS shop_items_catalog_status_check;
ALTER TABLE public.shop_items ADD CONSTRAINT shop_items_catalog_status_check CHECK (
  catalog_status IN ('active', 'legacy', 'retired')
);

ALTER TABLE public.shop_items DROP CONSTRAINT IF EXISTS shop_items_css_type_check;
ALTER TABLE public.shop_items ADD CONSTRAINT shop_items_css_type_check CHECK (
  css_type IN ('style', 'class', 'text', 'renderer')
);

ALTER TABLE public.shop_items DROP CONSTRAINT IF EXISTS shop_items_shape_check;
ALTER TABLE public.shop_items ADD CONSTRAINT shop_items_shape_check CHECK (
  item_key ~ '^[a-z0-9_]{1,80}$'
  AND slot IN (
    'consumable', 'frame', 'lb_theme', 'name_effect', 'name_font',
    'name_material', 'name_motion', 'orb_shape', 'profile_bg',
    'profile_atmosphere', 'profile_border', 'roll_effect', 'title'
  )
  AND (slot NOT IN ('name_font', 'name_material', 'name_motion') OR css_type = 'renderer')
  AND length(css_value) <= 2000
  AND (available_from IS NULL OR available_until IS NULL OR available_from <= available_until)
  AND (
    css_type <> 'renderer'
    OR (
      slot = 'name_font'
      AND css_value IN (
        'editorial-serif', 'condensed-sans', 'wide-geometric', 'mono-compact',
        'rounded-mono', 'soft-grotesk', 'humanist-display', 'modern-fraktur',
        'pixel-display', 'high-contrast-italic', 'neo-slab', 'reverse-contrast',
        'industrial-stencil', 'futurist-extended', 'terminal-bitmap',
        'rounded-display', 'marker-tag', 'newspaper-black'
      )
    )
    OR (
      slot = 'name_material'
      AND css_value IN (
        'polished-chrome', 'copper-press', 'glass-emboss', 'fine-outline',
        'ink-bleed', 'pearl-foil', 'carbon-cut', 'frosted-edge',
        'holographic-film', 'cut-paper', 'neon-tube', 'liquid-mercury',
        'oil-slick', 'thermal-ink', 'velvet-ink', 'embroidered-thread',
        'engraved-stone', 'crt-phosphor', 'gold-leaf', 'chroma-glass',
        'ceramic-glaze', 'blueprint-ink'
      )
    )
    OR (
      slot = 'name_motion'
      AND css_value IN (
        'velvet-sweep', 'refraction-sweep', 'ghost-offset', 'focus-resolve',
        'mask-reveal', 'quiet-afterimage', 'soft-rise', 'scanline-reveal',
        'particle-drift', 'letter-shuffle', 'fuzzy-signal', 'typewriter-name',
        'chromatic-ripple', 'liquid-fill', 'pixel-dissolve', 'echo-collapse',
        'heat-shimmer', 'signal-lock', 'letter-cascade', 'orbiting-spark',
        'color-memory', 'daily-pulse', 'prism-shatter', 'ink-spread'
      )
    )
  )
);

-- The old Name products remain usable by owners, but are no longer offered
-- for new EP purchases. Keys and prices are intentionally unchanged.
UPDATE public.shop_items
SET catalog_status = 'legacy'
WHERE item_key IN (
  'name_prism_atelier', 'name_drop_shadow', 'name_italic', 'name_glow_blue',
  'name_glow_green', 'name_smallcaps', 'name_glow_purple', 'name_glow_red',
  'name_glow_pink_neon', 'name_glow_gold', 'name_gradient_purple',
  'name_gradient_fire', 'name_ice', 'name_toxic', 'name_slow_pulse',
  'name_signal', 'name_flicker_neon', 'name_matrix_rain', 'name_rainbow',
  'name_diamond_shimmer', 'name_holographic', 'name_pulsing_glow',
  'name_shining_gold', 'name_glitch_effect', 'name_ocean_wave', 'name_inferno',
  'name_sunset_blur', 'name_void', 'name_chroma'
);

INSERT INTO public.shop_items (
  item_key, name, slot, cost, css_type, css_value, available_from, available_until,
  rarity, description, collection, stackable, access_tier, entitlement_key, catalog_status
) VALUES
  ('name_font_editorial_serif', 'Editorial Serif', 'name_font', 180000, 'renderer', 'editorial-serif', NULL, NULL, 'Rare', 'A measured serif with high-contrast strokes for an archival signature.', 'Archive', false, 'earned', NULL, 'active'),
  ('name_font_condensed_sans', 'Condensed Sans', 'name_font', 180000, 'renderer', 'condensed-sans', NULL, NULL, 'Rare', 'A narrow sans-serif that gives the name a compact editorial profile.', 'Nocturne', false, 'earned', NULL, 'active'),
  ('name_font_wide_geometric', 'Wide Geometric', 'name_font', 180000, 'renderer', 'wide-geometric', NULL, NULL, 'Rare', 'A broad geometric display face with open, architectural forms.', 'Prism', false, 'earned', NULL, 'active'),
  ('name_font_mono_compact', 'Mono Compact', 'name_font', 120000, 'renderer', 'mono-compact', NULL, NULL, 'Uncommon', 'A precise bundled monospace with compact technical rhythm.', 'Signal', false, 'earned', NULL, 'active'),
  ('name_font_rounded_mono', 'Rounded Mono', 'name_font', 170000, 'renderer', 'rounded-mono', NULL, NULL, 'Rare', 'A softened monospace with rounded terminals and steady spacing.', 'Static Bloom', false, 'earned', NULL, 'active'),
  ('name_font_soft_grotesk', 'Soft Grotesk', 'name_font', 130000, 'renderer', 'soft-grotesk', NULL, NULL, 'Uncommon', 'A calm modern sans with balanced proportions for everyday identity.', 'Nocturne', false, 'earned', NULL, 'active'),
  ('name_font_humanist_display', 'Humanist Display', 'name_font', 190000, 'renderer', 'humanist-display', NULL, NULL, 'Rare', 'A warm humanist display face with readable, lifted curves.', 'Archive', false, 'earned', NULL, 'active'),
  ('name_font_modern_fraktur', 'Modern Fraktur', 'name_font', 320000, 'renderer', 'modern-fraktur', NULL, NULL, 'Epic', 'A dramatic blackletter-inspired face with carved historical character.', 'Nocturne', false, 'earned', NULL, 'active'),
  ('name_font_pixel_display', 'Pixel Display', 'name_font', 190000, 'renderer', 'pixel-display', NULL, NULL, 'Rare', 'A squared display face that gives the name a deliberate digital edge.', 'Static Bloom', false, 'earned', NULL, 'active'),
  ('name_font_high_contrast_italic', 'High-Contrast Italic', 'name_font', 310000, 'renderer', 'high-contrast-italic', NULL, NULL, 'Epic', 'A sharp italic display face with a fashion-editorial slant.', 'Archive', false, 'earned', NULL, 'active'),
  ('name_font_neo_slab', 'Neo Slab', 'name_font', 210000, 'renderer', 'neo-slab', NULL, NULL, 'Rare', 'A sturdy slab serif that gives the name a printed, grounded weight.', 'Archive', false, 'earned', NULL, 'active'),
  ('name_font_reverse_contrast', 'Reverse Contrast', 'name_font', 330000, 'renderer', 'reverse-contrast', NULL, NULL, 'Epic', 'A sculptural display face with unexpected thick-and-thin contrast.', 'Archive', false, 'earned', NULL, 'active'),
  ('name_font_industrial_stencil', 'Industrial Stencil', 'name_font', 340000, 'renderer', 'industrial-stencil', NULL, NULL, 'Epic', 'A cut stencil face with utilitarian, engineered lettering.', 'Signal', false, 'earned', NULL, 'active'),
  ('name_font_futurist_extended', 'Futurist Extended', 'name_font', 230000, 'renderer', 'futurist-extended', NULL, NULL, 'Rare', 'An extended geometric face that stretches the name into a horizon.', 'Prism', false, 'earned', NULL, 'active'),
  ('name_font_terminal_bitmap', 'Terminal Bitmap', 'name_font', 190000, 'renderer', 'terminal-bitmap', NULL, NULL, 'Rare', 'A low-resolution terminal face with unmistakable screen-era texture.', 'Static Bloom', false, 'earned', NULL, 'active'),
  ('name_font_rounded_display', 'Rounded Display', 'name_font', 210000, 'renderer', 'rounded-display', NULL, NULL, 'Rare', 'A friendly rounded display face with soft, confident volume.', 'Prism', false, 'earned', NULL, 'active'),
  ('name_font_marker_tag', 'Marker Tag', 'name_font', 350000, 'renderer', 'marker-tag', NULL, NULL, 'Epic', 'A hand-marked face that gives the name a quick, personal gesture.', 'Ember', false, 'earned', NULL, 'active'),
  ('name_font_newspaper_black', 'Newspaper Black', 'name_font', 320000, 'renderer', 'newspaper-black', NULL, NULL, 'Epic', 'A dense headline face with the authority of a printed front page.', 'Archive', false, 'earned', NULL, 'active'),
  ('name_material_polished_chrome', 'Polished Chrome', 'name_material', 340000, 'renderer', 'polished-chrome', NULL, NULL, 'Epic', 'A cool reflective metal finish with crisp silver highlights across the letters.', 'Nocturne', false, 'earned', NULL, 'active'),
  ('name_material_copper_press', 'Copper Press', 'name_material', 220000, 'renderer', 'copper-press', NULL, NULL, 'Rare', 'A warm pressed-copper surface with dark edges and burnished light.', 'Ember', false, 'earned', NULL, 'active'),
  ('name_material_glass_emboss', 'Glass Emboss', 'name_material', 350000, 'renderer', 'glass-emboss', NULL, NULL, 'Epic', 'A translucent embossed surface with a raised, refracted edge.', 'Prism', false, 'earned', NULL, 'active'),
  ('name_material_fine_outline', 'Fine Outline', 'name_material', 140000, 'renderer', 'fine-outline', NULL, NULL, 'Uncommon', 'A precise hairline contour that lets the daily color breathe through.', 'Archive', false, 'earned', NULL, 'active'),
  ('name_material_ink_bleed', 'Ink Bleed', 'name_material', 210000, 'renderer', 'ink-bleed', NULL, NULL, 'Rare', 'A soft paper-and-ink edge that blooms gently beyond the glyphs.', 'Archive', false, 'earned', NULL, 'active'),
  ('name_material_pearl_foil', 'Pearl Foil', 'name_material', 360000, 'renderer', 'pearl-foil', NULL, NULL, 'Epic', 'A pearlescent foil with quiet pastel reflections and a polished face.', 'Prism', false, 'earned', NULL, 'active'),
  ('name_material_carbon_cut', 'Carbon Cut', 'name_material', 230000, 'renderer', 'carbon-cut', NULL, NULL, 'Rare', 'A dark carbon surface scored with restrained silver facets.', 'Nocturne', false, 'earned', NULL, 'active'),
  ('name_material_frosted_edge', 'Frosted Edge', 'name_material', 210000, 'renderer', 'frosted-edge', NULL, NULL, 'Rare', 'An icy face with a clean frosted rim and high readability.', 'Signal', false, 'earned', NULL, 'active'),
  ('name_material_holographic_film', 'Holographic Film', 'name_material', 540000, 'renderer', 'holographic-film', NULL, NULL, 'Anomaly', 'A thin holographic film that shifts through restrained spectral bands.', 'Prism', false, 'earned', NULL, 'active'),
  ('name_material_cut_paper', 'Cut Paper', 'name_material', 200000, 'renderer', 'cut-paper', NULL, NULL, 'Rare', 'Layered paper edges give the name a tactile handmade profile.', 'Archive', false, 'earned', NULL, 'active'),
  ('name_material_neon_tube', 'Neon Tube', 'name_material', 380000, 'renderer', 'neon-tube', NULL, NULL, 'Epic', 'A bounded neon-tube face with a bright inner core and colored rim.', 'Signal', false, 'earned', NULL, 'active'),
  ('name_material_liquid_mercury', 'Liquid Mercury', 'name_material', 560000, 'renderer', 'liquid-mercury', NULL, NULL, 'Anomaly', 'A fluid mercury surface with bright specular bands and dark weight.', 'Nocturne', false, 'earned', NULL, 'active'),
  ('name_material_oil_slick', 'Oil Slick', 'name_material', 390000, 'renderer', 'oil-slick', NULL, NULL, 'Epic', 'An oil-slick surface blends deep violet, teal, and amber reflections.', 'Prism', false, 'earned', NULL, 'active'),
  ('name_material_thermal_ink', 'Thermal Ink', 'name_material', 380000, 'renderer', 'thermal-ink', NULL, NULL, 'Epic', 'Heat-responsive ink shifts from cool violet through cyan, gold, and rose.', 'Signal', false, 'earned', NULL, 'active'),
  ('name_material_velvet_ink', 'Velvet Ink', 'name_material', 250000, 'renderer', 'velvet-ink', NULL, NULL, 'Rare', 'A plush velvet surface with a saturated pile and soft highlight.', 'Ember', false, 'earned', NULL, 'active'),
  ('name_material_embroidered_thread', 'Embroidered Thread', 'name_material', 370000, 'renderer', 'embroidered-thread', NULL, NULL, 'Epic', 'Thread-like ridges give the letters a tactile stitched surface.', 'Archive', false, 'earned', NULL, 'active'),
  ('name_material_engraved_stone', 'Engraved Stone', 'name_material', 260000, 'renderer', 'engraved-stone', NULL, NULL, 'Rare', 'A carved stone face with durable shadowed grooves and pale edges.', 'Nocturne', false, 'earned', NULL, 'active'),
  ('name_material_crt_phosphor', 'CRT Phosphor', 'name_material', 350000, 'renderer', 'crt-phosphor', NULL, NULL, 'Epic', 'A green phosphor face with a controlled screen glow and scan texture.', 'Static Bloom', false, 'earned', NULL, 'active'),
  ('name_material_gold_leaf', 'Gold Leaf', 'name_material', 570000, 'renderer', 'gold-leaf', NULL, NULL, 'Anomaly', 'Layered gold leaf catches warm highlights across the letterforms.', 'Archive', false, 'earned', NULL, 'active'),
  ('name_material_chroma_glass', 'Chroma Glass', 'name_material', 400000, 'renderer', 'chroma-glass', NULL, NULL, 'Epic', 'A translucent glass face carries a bounded spectrum around the daily color.', 'Prism', false, 'earned', NULL, 'active'),
  ('name_material_ceramic_glaze', 'Ceramic Glaze', 'name_material', 390000, 'renderer', 'ceramic-glaze', NULL, NULL, 'Epic', 'A fired ceramic glaze adds a smooth warm coat and deep edge.', 'Ember', false, 'earned', NULL, 'active'),
  ('name_material_blueprint_ink', 'Blueprint Ink', 'name_material', 240000, 'renderer', 'blueprint-ink', NULL, NULL, 'Rare', 'A technical blue ink face with pale drafting-line highlights.', 'Signal', false, 'earned', NULL, 'active'),
  ('name_motion_velvet_sweep', 'Velvet Sweep', 'name_motion', 360000, 'renderer', 'velvet-sweep', NULL, NULL, 'Epic', 'A soft satin highlight travels across the name.', 'Ember', false, 'earned', NULL, 'active'),
  ('name_motion_refraction_sweep', 'Refraction Sweep', 'name_motion', 350000, 'renderer', 'refraction-sweep', NULL, NULL, 'Epic', 'Cyan and rose refraction bands cross the letters.', 'Prism', false, 'earned', NULL, 'active'),
  ('name_motion_ghost_offset', 'Ghost Offset', 'name_motion', 320000, 'renderer', 'ghost-offset', NULL, NULL, 'Epic', 'Slow chromatic echoes drift behind the name.', 'Static Bloom', false, 'earned', NULL, 'active'),
  ('name_motion_focus_resolve', 'Focus Resolve', 'name_motion', 230000, 'renderer', 'focus-resolve', NULL, NULL, 'Rare', 'The name resolves from controlled blur.', 'Nocturne', false, 'earned', NULL, 'active'),
  ('name_motion_mask_reveal', 'Mask Reveal', 'name_motion', 210000, 'renderer', 'mask-reveal', NULL, NULL, 'Rare', 'A clean horizontal reveal.', 'Archive', false, 'earned', NULL, 'active'),
  ('name_motion_quiet_afterimage', 'Quiet Afterimage', 'name_motion', 240000, 'renderer', 'quiet-afterimage', NULL, NULL, 'Rare', 'A restrained delayed copy trails the text.', 'Static Bloom', false, 'earned', NULL, 'active'),
  ('name_motion_soft_rise', 'Soft Rise', 'name_motion', 150000, 'renderer', 'soft-rise', NULL, NULL, 'Uncommon', 'A subtle entrance from below.', 'Ember', false, 'earned', NULL, 'active'),
  ('name_motion_scanline_reveal', 'Scanline Reveal', 'name_motion', 330000, 'renderer', 'scanline-reveal', NULL, NULL, 'Epic', 'A scanning line reveals the name.', 'Signal', false, 'earned', NULL, 'active'),
  ('name_motion_particle_drift', 'Particle Drift', 'name_motion', 370000, 'renderer', 'particle-drift', NULL, NULL, 'Epic', 'Small particles lift from the letterforms.', 'Prism', false, 'earned', NULL, 'active'),
  ('name_motion_letter_shuffle', 'Letter Shuffle', 'name_motion', 520000, 'renderer', 'letter-shuffle', NULL, NULL, 'Anomaly', 'Characters rearrange before locking into place.', 'Static Bloom', false, 'earned', NULL, 'active'),
  ('name_motion_fuzzy_signal', 'Fuzzy Signal', 'name_motion', 340000, 'renderer', 'fuzzy-signal', NULL, NULL, 'Epic', 'Controlled horizontal signal slices distort the name.', 'Signal', false, 'earned', NULL, 'active'),
  ('name_motion_typewriter_name', 'Typewriter Name', 'name_motion', 230000, 'renderer', 'typewriter-name', NULL, NULL, 'Rare', 'Characters appear one by one.', 'Archive', false, 'earned', NULL, 'active'),
  ('name_motion_chromatic_ripple', 'Chromatic Ripple', 'name_motion', 410000, 'renderer', 'chromatic-ripple', NULL, NULL, 'Epic', 'A colored wave bends vertical sections of the letters.', 'Prism', false, 'earned', NULL, 'active'),
  ('name_motion_liquid_fill', 'Liquid Fill', 'name_motion', 580000, 'renderer', 'liquid-fill', NULL, NULL, 'Anomaly', 'Today’s color rises inside the name and settles.', 'Prism', false, 'earned', NULL, 'active'),
  ('name_motion_pixel_dissolve', 'Pixel Dissolve', 'name_motion', 390000, 'renderer', 'pixel-dissolve', NULL, NULL, 'Epic', 'The name assembles from a field of square fragments.', 'Static Bloom', false, 'earned', NULL, 'active'),
  ('name_motion_echo_collapse', 'Echo Collapse', 'name_motion', 380000, 'renderer', 'echo-collapse', NULL, NULL, 'Epic', 'Distant copies converge into the final name.', 'Nocturne', false, 'earned', NULL, 'active'),
  ('name_motion_heat_shimmer', 'Heat Shimmer', 'name_motion', 270000, 'renderer', 'heat-shimmer', NULL, NULL, 'Rare', 'Thin horizontal bands refract like rising heat.', 'Ember', false, 'earned', NULL, 'active'),
  ('name_motion_signal_lock', 'Signal Lock', 'name_motion', 370000, 'renderer', 'signal-lock', NULL, NULL, 'Epic', 'Misaligned signal slices snap cleanly into place.', 'Signal', false, 'earned', NULL, 'active'),
  ('name_motion_letter_cascade', 'Letter Cascade', 'name_motion', 380000, 'renderer', 'letter-cascade', NULL, NULL, 'Epic', 'Characters fall individually into their final positions.', 'Archive', false, 'earned', NULL, 'active'),
  ('name_motion_orbiting_spark', 'Orbiting Spark', 'name_motion', 400000, 'renderer', 'orbiting-spark', NULL, NULL, 'Epic', 'A bright spark traces around the name.', 'Prism', false, 'earned', NULL, 'active'),
  ('name_motion_color_memory', 'Color Memory', 'name_motion', 600000, 'renderer', 'color-memory', NULL, NULL, 'Anomaly', 'Recent rolled colors pass through the lettering in sequence.', 'Prism', false, 'earned', NULL, 'active'),
  ('name_motion_daily_pulse', 'Daily Pulse', 'name_motion', 410000, 'renderer', 'daily-pulse', NULL, NULL, 'Epic', 'Today’s color blooms outward from the center.', 'Ember', false, 'earned', NULL, 'active'),
  ('name_motion_prism_shatter', 'Prism Shatter', 'name_motion', 760000, 'renderer', 'prism-shatter', NULL, NULL, 'Mythic', 'Faceted fragments separate and reassemble.', 'Prism', false, 'earned', NULL, 'active'),
  ('name_motion_ink_spread', 'Ink Spread', 'name_motion', 390000, 'renderer', 'ink-spread', NULL, NULL, 'Epic', 'Soft ink expands into crisp finished letterforms.', 'Archive', false, 'earned', NULL, 'active')
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

-- Older clients read the table directly and reject unknown slots. Keep that
-- read path backward-compatible while the current client uses the RPC below.
DROP POLICY IF EXISTS "Shop items are viewable by everyone." ON public.shop_items;
DROP POLICY IF EXISTS "shop_items are publicly readable" ON public.shop_items;
DROP POLICY IF EXISTS shop_items_legacy_compatible_read ON public.shop_items;
CREATE POLICY shop_items_legacy_compatible_read
  ON public.shop_items FOR SELECT
  USING (slot NOT IN ('name_font', 'name_material', 'name_motion'));

CREATE OR REPLACE FUNCTION public.get_shop_catalog()
RETURNS SETOF public.shop_items
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT *
  FROM public.shop_items
  WHERE catalog_status IN ('active', 'legacy')
  ORDER BY item_key;
$function$;

REVOKE ALL ON FUNCTION public.get_shop_catalog() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_shop_catalog() TO anon, authenticated;

-- Status is checked inside the server-authoritative purchase implementation.
CREATE OR REPLACE FUNCTION public.purchase_item_impl(p_item_key text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_item_slot text;
  v_stackable boolean;
  v_access_tier text;
  v_catalog_status text;
  item_cost bigint;
  user_ep_spent bigint;
  user_lifetime_ep bigint;
  user_staff_ep bigint;
  user_staff_spent bigint;
  user_balance bigint;
  staff_charge bigint;
  normal_charge bigint;
  v_is_staff boolean;
BEGIN
  IF v_user_id IS NULL THEN RETURN json_build_object('success', false, 'error', 'Not authenticated'); END IF;

  SELECT cost, slot, COALESCE(stackable, false), COALESCE(access_tier, 'earned'), COALESCE(catalog_status, 'active')
  INTO item_cost, v_item_slot, v_stackable, v_access_tier, v_catalog_status
  FROM public.shop_items
  WHERE item_key = p_item_key
    AND (available_from IS NULL OR available_from <= public.game_utc_date())
    AND (available_until IS NULL OR available_until >= public.game_utc_date());
  IF item_cost IS NULL THEN RETURN json_build_object('success', false, 'error', 'Invalid item'); END IF;
  IF v_catalog_status <> 'active' THEN
    RETURN json_build_object('success', false, 'error', 'This item is no longer available for purchase.');
  END IF;
  IF v_access_tier = 'premium' THEN
    RETURN json_build_object('success', false, 'error', 'Premium expression is unlocked through an entitlement.');
  END IF;
  IF item_cost <= 0 THEN RETURN json_build_object('success', false, 'error', 'This item cannot be purchased.'); END IF;
  IF v_item_slot = 'consumable' AND p_item_key <> 'reroll_shard' AND NOT v_stackable THEN
    RETURN json_build_object('success', false, 'error', 'Invalid item');
  END IF;

  SELECT COALESCE(ep_spent, 0), COALESCE(lifetime_ep, 0), COALESCE(staff_test_ep, 0),
    COALESCE(staff_test_ep_spent, 0), COALESCE(is_staff, false)
  INTO user_ep_spent, user_lifetime_ep, user_staff_ep, user_staff_spent, v_is_staff
  FROM public.profiles WHERE id = v_user_id FOR UPDATE;
  IF NOT FOUND THEN RETURN json_build_object('success', false, 'error', 'Profile not found'); END IF;

  user_balance := user_lifetime_ep - user_ep_spent
    + CASE WHEN v_is_staff THEN user_staff_ep - user_staff_spent ELSE 0 END;
  IF user_balance < item_cost THEN RETURN json_build_object('success', false, 'error', 'Not enough EP'); END IF;

  IF v_item_slot = 'consumable' THEN
    IF p_item_key = 'reroll_shard' THEN
      UPDATE public.profiles SET reroll_shards = COALESCE(reroll_shards, 0) + 1 WHERE id = v_user_id;
    ELSE
      INSERT INTO public.inventory (user_id, item_key, quantity) VALUES (v_user_id, p_item_key, 1)
      ON CONFLICT (user_id, item_key) DO UPDATE SET quantity = public.inventory.quantity + 1;
    END IF;
  ELSE
    IF EXISTS (SELECT 1 FROM public.inventory WHERE user_id = v_user_id AND item_key = p_item_key) THEN
      RETURN json_build_object('success', false, 'error', 'Already owned');
    END IF;
    INSERT INTO public.inventory (user_id, item_key, quantity) VALUES (v_user_id, p_item_key, 1);
  END IF;

  staff_charge := CASE WHEN v_is_staff
    THEN LEAST(item_cost, GREATEST(user_staff_ep - user_staff_spent, 0)) ELSE 0 END;
  normal_charge := item_cost - staff_charge;
  UPDATE public.profiles
  SET staff_test_ep_spent = COALESCE(staff_test_ep_spent, 0) + staff_charge,
      ep_spent = COALESCE(ep_spent, 0) + normal_charge
  WHERE id = v_user_id;
  RETURN json_build_object('success', true);
END;
$function$;

-- Name layer equipment is atomic with the existing profile-row lock. A
-- composable layer replaces the legacy preset; a legacy preset replaces all
-- three modern layers. Other cosmetic slots are left untouched.
CREATE OR REPLACE FUNCTION public.equip_item(p_item_key text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_current_cosmetics jsonb;
  v_slot text;
  v_access_tier text;
  v_entitlement_key text;
  v_catalog_status text;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  PERFORM 1 FROM public.profiles WHERE id = v_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Profile not found');
  END IF;

  SELECT slot, COALESCE(access_tier, 'earned'), entitlement_key, COALESCE(catalog_status, 'active')
  INTO v_slot, v_access_tier, v_entitlement_key, v_catalog_status
  FROM public.shop_items
  WHERE item_key = p_item_key;
  IF v_slot IS NULL
     OR v_slot = 'consumable'
     OR v_slot NOT IN (
       'name_effect', 'name_font', 'name_material', 'name_motion', 'frame',
       'profile_bg', 'profile_atmosphere', 'roll_effect', 'lb_theme', 'title',
       'orb_shape', 'profile_border'
     ) THEN
    RETURN json_build_object('success', false, 'error', 'Invalid item');
  END IF;
  IF v_catalog_status = 'retired' THEN
    RETURN json_build_object('success', false, 'error', 'This item is retired.');
  END IF;

  IF v_access_tier = 'premium' THEN
    IF v_entitlement_key IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.profile_entitlements
      WHERE user_id = v_user_id AND entitlement_key = v_entitlement_key
    ) THEN
      RETURN json_build_object('success', false, 'error', 'Premium expression requires an entitlement');
    END IF;
  ELSIF v_access_tier <> 'free' AND NOT EXISTS (
    SELECT 1 FROM public.inventory
    WHERE user_id = v_user_id AND item_key = p_item_key
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Item not owned');
  END IF;

  SELECT COALESCE(equipped_cosmetics, '{}'::jsonb)
  INTO v_current_cosmetics
  FROM public.profiles
  WHERE id = v_user_id;

  IF v_slot = 'name_effect' THEN
    v_current_cosmetics := v_current_cosmetics - ARRAY['name_font', 'name_material', 'name_motion'];
  ELSIF v_slot IN ('name_font', 'name_material', 'name_motion') THEN
    v_current_cosmetics := v_current_cosmetics - 'name_effect';
  END IF;
  v_current_cosmetics := v_current_cosmetics || jsonb_build_object(v_slot, p_item_key);

  UPDATE public.profiles
  SET equipped_cosmetics = v_current_cosmetics
  WHERE id = v_user_id;

  RETURN json_build_object('success', true, 'cosmetics', v_current_cosmetics);
END;
$function$;

CREATE OR REPLACE FUNCTION public.unequip_item(p_slot text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_current_cosmetics jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  IF p_slot IS NULL OR p_slot NOT IN (
    'name_effect', 'name_font', 'name_material', 'name_motion', 'frame',
    'profile_bg', 'profile_atmosphere', 'roll_effect', 'lb_theme', 'title',
    'orb_shape', 'profile_border'
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Invalid slot');
  END IF;

  PERFORM 1 FROM public.profiles WHERE id = v_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Profile not found');
  END IF;

  SELECT COALESCE(equipped_cosmetics, '{}'::jsonb)
  INTO v_current_cosmetics
  FROM public.profiles
  WHERE id = v_user_id;

  v_current_cosmetics := v_current_cosmetics - p_slot;
  UPDATE public.profiles
  SET equipped_cosmetics = v_current_cosmetics
  WHERE id = v_user_id;

  RETURN json_build_object('success', true, 'cosmetics', v_current_cosmetics);
END;
$function$;

REVOKE ALL ON FUNCTION public.purchase_item_impl(text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.purchase_item(text) TO anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.equip_item(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.equip_item(text) TO authenticated;
REVOKE ALL ON FUNCTION public.unequip_item(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.unequip_item(text) TO authenticated;

INSERT INTO public.meta (key, value)
VALUES ('shop_version', '2026-08-02T18:00:00Z')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
