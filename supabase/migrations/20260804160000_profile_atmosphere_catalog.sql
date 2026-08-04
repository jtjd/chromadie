-- Authored profile atmospheres. Background uploads remain independent; this
-- slot adds a bounded scene layer behind the profile identity surface.
BEGIN;

UPDATE public.profiles
SET equipped_cosmetics = COALESCE(
  (
    SELECT jsonb_object_agg(entry.key, entry.value)
    FROM jsonb_each(COALESCE(public.profiles.equipped_cosmetics, '{}'::jsonb)) AS entry(key, value)
    WHERE entry.key IN (
      'name_font', 'name_material', 'name_motion', 'profile_border', 'title',
      'cursor_trail', 'avatar_effect', 'profile_layout', 'profile_atmosphere'
    )
  ),
  '{}'::jsonb
);

-- The preceding launch migration has the older closed slot allowlist. Open it
-- before inserting the new renderer rows, then replace it with the full check
-- below once the rows are present.
ALTER TABLE public.shop_items DROP CONSTRAINT IF EXISTS shop_items_shape_check;

INSERT INTO public.shop_items (
  item_key, name, slot, cost, css_type, css_value, available_from, available_until,
  rarity, description, collection, stackable, access_tier, entitlement_key, catalog_status
) VALUES
  ('profile_atmosphere_signal_garden', 'Signal Garden', 'profile_atmosphere', 180000, 'renderer', 'signal-garden', NULL, NULL, 'Rare', 'Measured signal filaments grow through a quiet field of roll-colored light.', 'Signal', false, 'earned', NULL, 'active'),
  ('profile_atmosphere_aurora_veil', 'Aurora Veil', 'profile_atmosphere', 420000, 'renderer', 'aurora-veil', NULL, NULL, 'Epic', 'Layered luminous veils drift behind the profile with a soft, editorial depth.', 'Prism', false, 'earned', NULL, 'active'),
  ('profile_atmosphere_rain_window', 'Rain Window', 'profile_atmosphere', 260000, 'renderer', 'rain-window', NULL, NULL, 'Rare', 'Refracted glass streaks and distant light make the profile feel viewed through weather.', 'Nocturne', false, 'earned', NULL, 'active'),
  ('profile_atmosphere_emberfall', 'Emberfall', 'profile_atmosphere', 430000, 'renderer', 'emberfall', NULL, NULL, 'Epic', 'A small constellation of warm embers rises through the dark without covering the profile.', 'Ember', false, 'earned', NULL, 'active'),
  ('profile_atmosphere_paper_archive', 'Paper Archive', 'profile_atmosphere', 280000, 'renderer', 'paper-archive', NULL, NULL, 'Rare', 'Registration lines, paper fibers, and a restrained ink wash give the page a tactile history.', 'Archive', false, 'earned', NULL, 'active'),
  ('profile_atmosphere_prism_lens', 'Prism Lens', 'profile_atmosphere', 500000, 'renderer', 'prism-lens', NULL, NULL, 'Epic', 'A precise lens breaks the daily color into quiet spectral planes around the identity.', 'Prism', false, 'earned', NULL, 'active'),
  ('profile_atmosphere_lunar_tide', 'Lunar Tide', 'profile_atmosphere', 620000, 'renderer', 'lunar-tide', NULL, NULL, 'Anomaly', 'A slow lunar arc and a deep tide of light create a composed nocturnal stage.', 'Nocturne', false, 'earned', NULL, 'active'),
  ('profile_atmosphere_color_memory', 'Color Memory', 'profile_atmosphere', 850000, 'renderer', 'color-memory', NULL, NULL, 'Mythic', 'Recent rolls become an authored archive of moving light unique to the profile’s history.', 'Prism', false, 'earned', NULL, 'active')
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

ALTER TABLE public.shop_items DROP CONSTRAINT IF EXISTS shop_items_shape_check;
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
    OR (slot = 'profile_atmosphere' AND css_value IN ('signal-garden', 'aurora-veil', 'rain-window', 'emberfall', 'paper-archive', 'prism-lens', 'lunar-tide', 'color-memory'))
  )
);

DROP POLICY IF EXISTS shop_items_final_catalog_read ON public.shop_items;
CREATE POLICY shop_items_final_catalog_read ON public.shop_items FOR SELECT USING (
  catalog_status = 'active'
  AND slot IN ('consumable', 'title', 'name_font', 'name_material', 'name_motion', 'profile_border', 'cursor_trail', 'avatar_effect', 'profile_layout', 'profile_atmosphere')
);

CREATE OR REPLACE FUNCTION public.get_shop_catalog()
RETURNS SETOF public.shop_items
LANGUAGE sql SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT * FROM public.shop_items
  WHERE catalog_status = 'active'
    AND slot IN ('consumable', 'title', 'name_font', 'name_material', 'name_motion', 'profile_border', 'cursor_trail', 'avatar_effect', 'profile_layout', 'profile_atmosphere')
  ORDER BY item_key;
$function$;

CREATE OR REPLACE FUNCTION public.equip_item(p_item_key text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid(); v_current_cosmetics jsonb; v_slot text;
  v_access_tier text; v_entitlement_key text; v_catalog_status text;
BEGIN
  IF v_user_id IS NULL THEN RETURN json_build_object('success', false, 'error', 'Not authenticated'); END IF;
  PERFORM 1 FROM public.profiles WHERE id = v_user_id FOR UPDATE;
  IF NOT FOUND THEN RETURN json_build_object('success', false, 'error', 'Profile not found'); END IF;
  SELECT slot, COALESCE(access_tier, 'earned'), entitlement_key, COALESCE(catalog_status, 'active')
    INTO v_slot, v_access_tier, v_entitlement_key, v_catalog_status
    FROM public.shop_items WHERE item_key = p_item_key;
  IF v_slot IS NULL OR v_slot NOT IN ('name_font', 'name_material', 'name_motion', 'profile_border', 'title', 'cursor_trail', 'avatar_effect', 'profile_layout', 'profile_atmosphere') THEN
    RETURN json_build_object('success', false, 'error', 'Invalid item');
  END IF;
  IF v_catalog_status <> 'active' THEN RETURN json_build_object('success', false, 'error', 'This item is no longer available.'); END IF;
  IF v_access_tier = 'premium' THEN
    IF v_entitlement_key IS NULL OR NOT EXISTS (SELECT 1 FROM public.profile_entitlements WHERE user_id = v_user_id AND entitlement_key = v_entitlement_key) THEN
      RETURN json_build_object('success', false, 'error', 'Premium expression requires an entitlement');
    END IF;
  ELSIF v_access_tier <> 'free' AND NOT EXISTS (SELECT 1 FROM public.inventory WHERE user_id = v_user_id AND item_key = p_item_key) THEN
    RETURN json_build_object('success', false, 'error', 'Item not owned');
  END IF;
  SELECT COALESCE(equipped_cosmetics, '{}'::jsonb) INTO v_current_cosmetics FROM public.profiles WHERE id = v_user_id;
  v_current_cosmetics := v_current_cosmetics || jsonb_build_object(v_slot, p_item_key);
  UPDATE public.profiles SET equipped_cosmetics = v_current_cosmetics WHERE id = v_user_id;
  RETURN json_build_object('success', true, 'cosmetics', v_current_cosmetics);
END;
$function$;

CREATE OR REPLACE FUNCTION public.unequip_item(p_slot text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_user_id uuid := auth.uid(); v_current_cosmetics jsonb;
BEGIN
  IF v_user_id IS NULL THEN RETURN json_build_object('success', false, 'error', 'Not authenticated'); END IF;
  IF p_slot IS NULL OR p_slot NOT IN ('name_font', 'name_material', 'name_motion', 'profile_border', 'title', 'cursor_trail', 'avatar_effect', 'profile_layout', 'profile_atmosphere') THEN
    RETURN json_build_object('success', false, 'error', 'Invalid slot');
  END IF;
  PERFORM 1 FROM public.profiles WHERE id = v_user_id FOR UPDATE;
  IF NOT FOUND THEN RETURN json_build_object('success', false, 'error', 'Profile not found'); END IF;
  SELECT COALESCE(equipped_cosmetics, '{}'::jsonb) INTO v_current_cosmetics FROM public.profiles WHERE id = v_user_id;
  v_current_cosmetics := v_current_cosmetics - p_slot;
  UPDATE public.profiles SET equipped_cosmetics = v_current_cosmetics WHERE id = v_user_id;
  RETURN json_build_object('success', true, 'cosmetics', v_current_cosmetics);
END;
$function$;

REVOKE ALL ON FUNCTION public.equip_item(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.equip_item(text) TO authenticated;
REVOKE ALL ON FUNCTION public.unequip_item(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.unequip_item(text) TO authenticated;

INSERT INTO public.meta (key, value) VALUES ('shop_version', '2026-08-04T16:00:00Z')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

DO $verification$
DECLARE active_count bigint; atmosphere_count bigint;
BEGIN
  SELECT count(*) INTO active_count FROM public.shop_items WHERE catalog_status = 'active';
  IF active_count <> 122 THEN RAISE EXCEPTION 'Expected 122 active catalog rows, found %', active_count; END IF;
  SELECT count(*) INTO atmosphere_count FROM public.shop_items WHERE slot = 'profile_atmosphere' AND catalog_status = 'active';
  IF atmosphere_count <> 8 THEN RAISE EXCEPTION 'Expected 8 active Profile Atmosphere rows, found %', atmosphere_count; END IF;
END;
$verification$;

COMMIT;
