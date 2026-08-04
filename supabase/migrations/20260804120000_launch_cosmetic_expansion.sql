-- Launch cosmetic expansion: cursor trails, avatar effects, and paid layouts.
-- The new slots use the existing server-authoritative purchase/equip boundary
-- and finite renderer registries in the client.

BEGIN;

UPDATE public.profiles
SET equipped_cosmetics = COALESCE(
  (
    SELECT jsonb_object_agg(entry.key, entry.value)
    FROM jsonb_each(COALESCE(public.profiles.equipped_cosmetics, '{}'::jsonb)) AS entry(key, value)
    WHERE entry.key IN (
      'name_font', 'name_material', 'name_motion', 'profile_border', 'title',
      'cursor_trail', 'avatar_effect', 'profile_layout'
    )
  ),
  '{}'::jsonb
);

ALTER TABLE public.shop_items DROP CONSTRAINT IF EXISTS shop_items_shape_check;

INSERT INTO public.shop_items (
  item_key, name, slot, cost, css_type, css_value, available_from, available_until,
  rarity, description, collection, stackable, access_tier, entitlement_key, catalog_status
) VALUES
  ('cursor_trail_signal_trace', 'Signal Trace', 'cursor_trail', 160000, 'renderer', 'signal-trace', NULL, NULL, 'Rare', 'A thin cyan/lime line joining recent pointer positions with a fast clean fade.', 'Signal', false, 'earned', NULL, 'active'),
  ('cursor_trail_pixel_wake', 'Pixel Wake', 'cursor_trail', 180000, 'renderer', 'pixel-wake', NULL, NULL, 'Rare', 'Crisp square pixels shed from movement and dissolve without blur.', 'Static Bloom', false, 'earned', NULL, 'active'),
  ('cursor_trail_chroma_ribbon', 'Chroma Ribbon', 'cursor_trail', 340000, 'renderer', 'chroma-ribbon', NULL, NULL, 'Epic', 'A narrow three-band ribbon follows pointer curvature without covering links.', 'Prism', false, 'earned', NULL, 'active'),
  ('cursor_trail_glass_shards', 'Glass Shards', 'cursor_trail', 360000, 'renderer', 'glass-shards', NULL, NULL, 'Epic', 'Sparse translucent facets rotate with controlled refracted highlights.', 'Prism', false, 'earned', NULL, 'active'),
  ('cursor_trail_ember_ash', 'Ember Ash', 'cursor_trail', 210000, 'renderer', 'ember-ash', NULL, NULL, 'Rare', 'Small warm embers drift upward from the pointer path and cool quickly.', 'Ember', false, 'earned', NULL, 'active'),
  ('cursor_trail_comet_thread', 'Comet Thread', 'cursor_trail', 330000, 'renderer', 'comet-thread', NULL, NULL, 'Epic', 'A fine pale comet tail with a dark central thread and clean taper.', 'Nocturne', false, 'earned', NULL, 'active'),
  ('cursor_trail_ink_drops', 'Ink Drops', 'cursor_trail', 220000, 'renderer', 'ink-drops', NULL, NULL, 'Rare', 'Small ink impressions appear along the path with restrained paper-like spread.', 'Archive', false, 'earned', NULL, 'active'),
  ('cursor_trail_orbit_dust', 'Orbit Dust', 'cursor_trail', 350000, 'renderer', 'orbit-dust', NULL, NULL, 'Epic', 'A few particles orbit the recent path before collapsing inward.', 'Prism', false, 'earned', NULL, 'active'),
  ('cursor_trail_static_echo', 'Static Echo', 'cursor_trail', 320000, 'renderer', 'static-echo', NULL, NULL, 'Epic', 'Brief offset pointer afterimages create crisp signal breakup without screen shake.', 'Static Bloom', false, 'earned', NULL, 'active'),
  ('cursor_trail_rain_trace', 'Rain Trace', 'cursor_trail', 230000, 'renderer', 'rain-trace', NULL, NULL, 'Rare', 'Short vertical dashes fall from recent pointer points and disappear quickly.', 'Signal', false, 'earned', NULL, 'active'),
  ('cursor_trail_gold_fleck', 'Gold Fleck', 'cursor_trail', 370000, 'renderer', 'gold-fleck', NULL, NULL, 'Epic', 'Sparse angular gold-leaf pieces catch light without becoming confetti.', 'Archive', false, 'earned', NULL, 'active'),
  ('cursor_trail_ghost_tail', 'Ghost Tail', 'cursor_trail', 320000, 'renderer', 'ghost-tail', NULL, NULL, 'Epic', 'Low-opacity pointer echoes compress into a soft dark tail.', 'Nocturne', false, 'earned', NULL, 'active'),
  ('cursor_trail_color_memory', 'Color Memory', 'cursor_trail', 540000, 'renderer', 'color-memory', NULL, NULL, 'Anomaly', 'The trail moves through the user’s recent roll colors in chronological order.', 'Prism', false, 'earned', NULL, 'active'),
  ('cursor_trail_marker_stroke', 'Marker Stroke', 'cursor_trail', 360000, 'renderer', 'marker-stroke', NULL, NULL, 'Epic', 'A pressure-like hand-drawn stroke has a dry marker edge and bounded width.', 'Archive', false, 'earned', NULL, 'active'),
  ('cursor_trail_solar_sparks', 'Solar Sparks', 'cursor_trail', 520000, 'renderer', 'solar-sparks', NULL, NULL, 'Anomaly', 'Fine sparks and an occasional restrained flare respond to pointer speed.', 'Ember', false, 'earned', NULL, 'active'),
  ('cursor_trail_void_lensing', 'Void Lensing', 'cursor_trail', 700000, 'renderer', 'void-lensing', NULL, NULL, 'Mythic', 'A dark lens ring separates violet and cyan around a narrow spectral wake.', 'Nocturne', false, 'earned', NULL, 'active'),
  ('avatar_effect_signal_ring', 'Signal Ring', 'avatar_effect', 180000, 'renderer', 'signal-ring', NULL, NULL, 'Rare', 'A precise ring with scanner ticks and a restrained rotating signal mark.', 'Signal', false, 'earned', NULL, 'active'),
  ('avatar_effect_neon_halo', 'Neon Halo', 'avatar_effect', 320000, 'renderer', 'neon-halo', NULL, NULL, 'Epic', 'A bright inner halo and soft breathing outer glow preserve the image.', 'Signal', false, 'earned', NULL, 'active'),
  ('avatar_effect_prism_orbit', 'Prism Orbit', 'avatar_effect', 350000, 'renderer', 'prism-orbit', NULL, NULL, 'Epic', 'Three small refractive facets orbit the avatar on separate paths.', 'Prism', false, 'earned', NULL, 'active'),
  ('avatar_effect_crystal_aperture', 'Crystal Aperture', 'avatar_effect', 360000, 'renderer', 'crystal-aperture', NULL, NULL, 'Epic', 'Faceted corner pieces form a camera-like crystal aperture around the avatar.', 'Prism', false, 'earned', NULL, 'active'),
  ('avatar_effect_chroma_arc', 'Chroma Arc', 'avatar_effect', 520000, 'renderer', 'chroma-arc', NULL, NULL, 'Anomaly', 'Segmented spectral arcs travel around the avatar with deliberate resting gaps.', 'Prism', false, 'earned', NULL, 'active'),
  ('avatar_effect_ember_crown', 'Ember Crown', 'avatar_effect', 380000, 'renderer', 'ember-crown', NULL, NULL, 'Epic', 'A compact crown of warm sparks and metal-like points sits above the avatar.', 'Ember', false, 'earned', NULL, 'active'),
  ('avatar_effect_ashfall', 'Ashfall', 'avatar_effect', 230000, 'renderer', 'ashfall', NULL, NULL, 'Rare', 'Sparse ash falls behind the avatar without crossing the face.', 'Ember', false, 'earned', NULL, 'active'),
  ('avatar_effect_gold_laurel', 'Gold Laurel', 'avatar_effect', 390000, 'renderer', 'gold-laurel', NULL, NULL, 'Epic', 'A clean angular laurel frames the lower sides with a measured metallic glint.', 'Archive', false, 'earned', NULL, 'active'),
  ('avatar_effect_ink_stamp', 'Ink Stamp', 'avatar_effect', 220000, 'renderer', 'ink-stamp', NULL, NULL, 'Rare', 'Misregistered print edges and halftone marks create a stamped portrait.', 'Archive', false, 'earned', NULL, 'active'),
  ('avatar_effect_paper_tear', 'Paper Tear', 'avatar_effect', 350000, 'renderer', 'paper-tear', NULL, NULL, 'Epic', 'A bounded torn-paper mask reveals a layered paper edge around the image.', 'Archive', false, 'earned', NULL, 'active'),
  ('avatar_effect_static_offset', 'Static Offset', 'avatar_effect', 340000, 'renderer', 'static-offset', NULL, NULL, 'Epic', 'Brief cyan and rose image offsets appear during a controlled interruption.', 'Static Bloom', false, 'earned', NULL, 'active'),
  ('avatar_effect_pixel_satellites', 'Pixel Satellites', 'avatar_effect', 240000, 'renderer', 'pixel-satellites', NULL, NULL, 'Rare', 'Small square satellites orbit in stepped pixel motion.', 'Static Bloom', false, 'earned', NULL, 'active'),
  ('avatar_effect_crt_scan', 'CRT Scan', 'avatar_effect', 330000, 'renderer', 'crt-scan', NULL, NULL, 'Epic', 'Phosphor edge light, corner marks, and a slow scan pass create a screen portrait.', 'Static Bloom', false, 'earned', NULL, 'active'),
  ('avatar_effect_void_eclipse', 'Void Eclipse', 'avatar_effect', 560000, 'renderer', 'void-eclipse', NULL, NULL, 'Anomaly', 'A near-black eclipse halo with violet lensing adds depth without hiding the face.', 'Nocturne', false, 'earned', NULL, 'active'),
  ('avatar_effect_ghost_double', 'Ghost Double', 'avatar_effect', 350000, 'renderer', 'ghost-double', NULL, NULL, 'Epic', 'A subtle offset duplicate appears behind the avatar during a controlled pulse.', 'Nocturne', false, 'earned', NULL, 'active'),
  ('avatar_effect_night_frame', 'Night Frame', 'avatar_effect', 220000, 'renderer', 'night-frame', NULL, NULL, 'Rare', 'A dark precision mount with pale corner cuts gives the avatar editorial weight.', 'Nocturne', false, 'earned', NULL, 'active'),
  ('avatar_effect_daily_aura', 'Daily Aura', 'avatar_effect', 400000, 'renderer', 'daily-aura', NULL, NULL, 'Epic', 'A readable aura derived from the current daily color surrounds the avatar.', 'Prism', false, 'earned', NULL, 'active'),
  ('avatar_effect_color_archive', 'Color Archive', 'avatar_effect', 720000, 'renderer', 'color-archive', NULL, NULL, 'Mythic', 'Recent roll colors form four animated archival segments around the portrait.', 'Prism', false, 'earned', NULL, 'active'),
  ('profile_layout_split_signal', 'Split Signal', 'profile_layout', 320000, 'renderer', 'split-signal', NULL, NULL, 'Rare', 'A persistent identity rail sits left while profile modules compose on the right and stack on mobile.', 'Signal', false, 'earned', NULL, 'active'),
  ('profile_layout_archive_index', 'Archive Index', 'profile_layout', 300000, 'renderer', 'archive-index', NULL, NULL, 'Rare', 'Numbered editorial sections, thin rules, and a strong chronological reading path.', 'Archive', false, 'earned', NULL, 'active'),
  ('profile_layout_prism_mosaic', 'Prism Mosaic', 'profile_layout', 450000, 'renderer', 'prism-mosaic', NULL, NULL, 'Epic', 'A balanced modular grid uses meaningful wide and narrow spans driven by the daily color.', 'Prism', false, 'earned', NULL, 'active'),
  ('profile_layout_night_terminal', 'Night Terminal', 'profile_layout', 480000, 'renderer', 'night-terminal', NULL, NULL, 'Epic', 'A compact technical composition uses metadata rails and precise labels without hacker-green clichés.', 'Nocturne', false, 'earned', NULL, 'active'),
  ('profile_layout_story_stack', 'Story Stack', 'profile_layout', 600000, 'renderer', 'story-stack', NULL, NULL, 'Anomaly', 'A vertical narrative composition emphasizes identity, today’s roll, history, and achievements in sequence.', 'Ember', false, 'earned', NULL, 'active')
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
  AND slot IN (
    'consumable', 'title', 'name_font', 'name_material', 'name_motion', 'profile_border',
    'cursor_trail', 'avatar_effect', 'profile_layout'
  )
  AND length(css_value) <= 2000
  AND (available_from IS NULL OR available_until IS NULL OR available_from <= available_until)
  AND (slot IN ('consumable', 'title') OR css_type = 'renderer')
  AND (
    css_type <> 'renderer'
    OR (
      slot = 'name_font'
      AND css_value IN (
        'editorial-serif', 'condensed-sans', 'wide-geometric', 'mono-compact', 'rounded-mono',
        'soft-grotesk', 'humanist-display', 'modern-fraktur', 'pixel-display', 'high-contrast-italic',
        'neo-slab', 'reverse-contrast', 'industrial-stencil', 'futurist-extended', 'terminal-bitmap',
        'rounded-display', 'marker-tag', 'newspaper-black'
      )
    )
    OR (
      slot = 'name_material'
      AND css_value IN (
        'polished-chrome', 'copper-press', 'glass-emboss', 'fine-outline', 'ink-bleed', 'pearl-foil',
        'carbon-cut', 'frosted-edge', 'holographic-film', 'cut-paper', 'neon-tube', 'liquid-mercury',
        'oil-slick', 'thermal-ink', 'velvet-ink', 'embroidered-thread', 'engraved-stone', 'crt-phosphor',
        'gold-leaf', 'chroma-glass', 'ceramic-glaze', 'blueprint-ink'
      )
    )
    OR (
      slot = 'name_motion'
      AND css_value IN (
        'velvet-sweep', 'refraction-sweep', 'ghost-offset', 'focus-resolve', 'mask-reveal',
        'quiet-afterimage', 'soft-rise', 'scanline-reveal', 'particle-drift', 'letter-shuffle',
        'fuzzy-signal', 'typewriter-name', 'chromatic-ripple', 'liquid-fill', 'pixel-dissolve',
        'echo-collapse', 'heat-shimmer', 'signal-lock', 'letter-cascade', 'orbiting-spark',
        'color-memory', 'daily-pulse', 'prism-shatter', 'ink-spread'
      )
    )
    OR (slot = 'profile_border' AND css_value IN ('celestial', 'chroma', 'crystal', 'glitch', 'gold', 'neon', 'prism', 'void', 'signal'))
    OR (slot = 'cursor_trail' AND css_value IN ('signal-trace', 'pixel-wake', 'chroma-ribbon', 'glass-shards', 'ember-ash', 'comet-thread', 'ink-drops', 'orbit-dust', 'static-echo', 'rain-trace', 'gold-fleck', 'ghost-tail', 'color-memory', 'marker-stroke', 'solar-sparks', 'void-lensing'))
    OR (slot = 'avatar_effect' AND css_value IN ('signal-ring', 'neon-halo', 'prism-orbit', 'crystal-aperture', 'chroma-arc', 'ember-crown', 'ashfall', 'gold-laurel', 'ink-stamp', 'paper-tear', 'static-offset', 'pixel-satellites', 'crt-scan', 'void-eclipse', 'ghost-double', 'night-frame', 'daily-aura', 'color-archive'))
    OR (slot = 'profile_layout' AND css_value IN ('split-signal', 'archive-index', 'prism-mosaic', 'night-terminal', 'story-stack'))
  )
);

DROP POLICY IF EXISTS shop_items_final_catalog_read ON public.shop_items;
CREATE POLICY shop_items_final_catalog_read
  ON public.shop_items FOR SELECT
  USING (
    catalog_status = 'active'
    AND slot IN (
      'consumable', 'title', 'name_font', 'name_material', 'name_motion', 'profile_border',
      'cursor_trail', 'avatar_effect', 'profile_layout'
    )
  );

CREATE OR REPLACE FUNCTION public.get_shop_catalog()
RETURNS SETOF public.shop_items
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT *
  FROM public.shop_items
  WHERE catalog_status = 'active'
    AND slot IN (
      'consumable', 'title', 'name_font', 'name_material', 'name_motion', 'profile_border',
      'cursor_trail', 'avatar_effect', 'profile_layout'
    )
  ORDER BY item_key;
$function$;

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

  IF v_slot IS NULL OR v_slot NOT IN (
    'name_font', 'name_material', 'name_motion', 'profile_border', 'title',
    'cursor_trail', 'avatar_effect', 'profile_layout'
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Invalid item');
  END IF;
  IF v_catalog_status <> 'active' THEN
    RETURN json_build_object('success', false, 'error', 'This item is no longer available.');
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
    'name_font', 'name_material', 'name_motion', 'profile_border', 'title',
    'cursor_trail', 'avatar_effect', 'profile_layout'
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

REVOKE ALL ON FUNCTION public.equip_item(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.equip_item(text) TO authenticated;
REVOKE ALL ON FUNCTION public.unequip_item(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.unequip_item(text) TO authenticated;

INSERT INTO public.meta (key, value)
VALUES ('shop_version', '2026-08-04T12:00:00Z')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

DO $verification$
DECLARE
  active_count bigint;
  cursor_count bigint;
  avatar_count bigint;
  layout_count bigint;
BEGIN
  SELECT count(*) INTO active_count FROM public.shop_items WHERE catalog_status = 'active';
  IF active_count <> 114 THEN
    RAISE EXCEPTION 'Expected 114 active catalog rows, found %', active_count;
  END IF;

  SELECT count(*) INTO cursor_count FROM public.shop_items WHERE slot = 'cursor_trail' AND catalog_status = 'active';
  IF cursor_count <> 16 THEN
    RAISE EXCEPTION 'Expected 16 active Cursor Trail rows, found %', cursor_count;
  END IF;

  SELECT count(*) INTO avatar_count FROM public.shop_items WHERE slot = 'avatar_effect' AND catalog_status = 'active';
  IF avatar_count <> 18 THEN
    RAISE EXCEPTION 'Expected 18 active Avatar Effect rows, found %', avatar_count;
  END IF;

  SELECT count(*) INTO layout_count FROM public.shop_items WHERE slot = 'profile_layout' AND catalog_status = 'active';
  IF layout_count <> 5 THEN
    RAISE EXCEPTION 'Expected 5 active paid Profile Layout rows, found %', layout_count;
  END IF;
END;
$verification$;

COMMIT;
