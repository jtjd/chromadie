-- Add the first profile-level motion cosmetic without changing shop
-- navigation, pricing, or the existing equipped-cosmetics contract.
BEGIN;

-- The previous catalog constraint does not know this new slot. Remove it
-- before inserting the forward-compatible row, then restore the complete
-- allowlist below.
ALTER TABLE public.shop_items DROP CONSTRAINT IF EXISTS shop_items_shape_check;

INSERT INTO public.shop_items (
  item_key, name, slot, cost, css_type, css_value, available_from, available_until,
  rarity, description, collection, stackable, access_tier, entitlement_key, catalog_status
) VALUES (
  'profile_motion_perspective_tilt',
  '3D Tilt',
  'profile_motion',
  0,
  'renderer',
  'perspective-tilt',
  NULL,
  NULL,
  'Uncommon',
  'A restrained perspective shift follows the pointer across the profile surface.',
  'Layouts',
  false,
  'free',
  NULL,
  'active'
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

ALTER TABLE public.shop_items ADD CONSTRAINT shop_items_shape_check CHECK (
  item_key ~ '^[a-z0-9_]{1,80}$'
  AND slot IN ('consumable', 'title', 'name_font', 'name_material', 'name_motion', 'profile_border', 'cursor_trail', 'avatar_effect', 'profile_layout', 'profile_atmosphere', 'profile_motion')
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
    OR (slot = 'profile_layout' AND css_value IN ('compact', 'sleek', 'minimal', 'modern', 'portfolio'))
    OR (slot = 'profile_atmosphere' AND css_value IN ('rain-window', 'droplets-glass', 'dust-light', 'ink-bloom', 'snowfall', 'silk-folds', 'glass-caustics', 'cinder-drift', 'night-pollen', 'paper-shadow', 'smoke-spiral', 'lumen-flare'))
    OR (slot = 'profile_motion' AND css_value IN ('perspective-tilt'))
  )
);

DROP POLICY IF EXISTS shop_items_final_catalog_read ON public.shop_items;
CREATE POLICY shop_items_final_catalog_read ON public.shop_items FOR SELECT USING (
  catalog_status = 'active'
  AND slot IN ('consumable', 'title', 'name_font', 'name_material', 'name_motion', 'profile_border', 'cursor_trail', 'avatar_effect', 'profile_layout', 'profile_atmosphere', 'profile_motion')
);

CREATE OR REPLACE FUNCTION public.get_shop_catalog()
RETURNS SETOF public.shop_items
LANGUAGE sql SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT * FROM public.shop_items
  WHERE catalog_status = 'active'
    AND slot IN ('consumable', 'title', 'name_font', 'name_material', 'name_motion', 'profile_border', 'cursor_trail', 'avatar_effect', 'profile_layout', 'profile_atmosphere', 'profile_motion')
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
  IF v_slot IS NULL OR v_slot NOT IN ('name_font', 'name_material', 'name_motion', 'profile_border', 'title', 'cursor_trail', 'avatar_effect', 'profile_layout', 'profile_atmosphere', 'profile_motion') THEN
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
  IF p_slot IS NULL OR p_slot NOT IN ('name_font', 'name_material', 'name_motion', 'profile_border', 'title', 'cursor_trail', 'avatar_effect', 'profile_layout', 'profile_atmosphere', 'profile_motion') THEN
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

INSERT INTO public.meta (key, value) VALUES ('shop_version', '2026-08-14T05:00:00Z')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

DO $verification$
DECLARE
  active_count bigint;
  motion_count bigint;
BEGIN
  SELECT count(*) INTO active_count FROM public.shop_items WHERE catalog_status = 'active';
  SELECT count(*) INTO motion_count FROM public.shop_items WHERE slot = 'profile_motion' AND catalog_status = 'active';
  IF active_count <> 100 THEN RAISE EXCEPTION 'Expected 100 active catalog rows, found %', active_count; END IF;
  IF motion_count <> 1 THEN RAISE EXCEPTION 'Expected 1 active Profile Motion row, found %', motion_count; END IF;
END;
$verification$;

COMMIT;
