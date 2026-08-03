-- Lean cosmetic reset for the alpha catalog.
--
-- This is intentionally forward-only. It preserves account, wallet, roll,
-- score, achievement, and title data while removing the obsolete cosmetic
-- catalog and its inventory/equipped references. Apply a verified database
-- backup before running this migration in a remote environment.

BEGIN;

-- Keep only the supported profile loadout keys. Titles remain supported as a
-- promised non-cosmetic profile identity field.
UPDATE public.profiles
SET equipped_cosmetics = COALESCE(
  (
    SELECT jsonb_object_agg(entry.key, entry.value)
    FROM jsonb_each(COALESCE(public.profiles.equipped_cosmetics, '{}'::jsonb)) AS entry(key, value)
    WHERE entry.key IN ('name_font', 'name_material', 'name_motion', 'profile_border', 'title')
  ),
  '{}'::jsonb
);

-- inventory.item_key has an ON DELETE RESTRICT foreign key. Remove the
-- obsolete owned rows before removing their catalog definitions.
DELETE FROM public.inventory AS inventory_row
USING public.shop_items AS item
WHERE inventory_row.item_key = item.item_key
  AND item.slot IN (
    'name_effect', 'frame', 'profile_bg', 'profile_atmosphere',
    'orb_shape', 'roll_effect', 'lb_theme'
  );

DELETE FROM public.shop_items
WHERE slot IN (
  'name_effect', 'frame', 'profile_bg', 'profile_atmosphere',
  'orb_shape', 'roll_effect', 'lb_theme'
);

-- Drop historical renderer/slot checks before normalizing the retained border
-- rows; the old constraints intentionally reject renderer-backed rows.
ALTER TABLE public.shop_items DROP CONSTRAINT IF EXISTS shop_items_css_type_check;
ALTER TABLE public.shop_items DROP CONSTRAINT IF EXISTS shop_items_shape_check;

-- The old Profile Border rows remain, but now use the shared renderer and the
-- normalized alpha collections/prices approved for this reset.
UPDATE public.shop_items
SET css_type = 'renderer',
    css_value = CASE item_key
      WHEN 'border_celestial' THEN 'celestial'
      WHEN 'border_chroma' THEN 'chroma'
      WHEN 'border_crystal' THEN 'crystal'
      WHEN 'border_glitch' THEN 'glitch'
      WHEN 'border_gold' THEN 'gold'
      WHEN 'border_neon' THEN 'neon'
      WHEN 'border_prism' THEN 'prism'
      WHEN 'border_void' THEN 'void'
      WHEN 'border_signal' THEN 'signal'
    END,
    collection = CASE item_key
      WHEN 'border_celestial' THEN 'Prism'
      WHEN 'border_chroma' THEN 'Prism'
      WHEN 'border_crystal' THEN 'Prism'
      WHEN 'border_glitch' THEN 'Static Bloom'
      WHEN 'border_gold' THEN 'Archive'
      WHEN 'border_neon' THEN 'Signal'
      WHEN 'border_prism' THEN 'Prism'
      WHEN 'border_void' THEN 'Nocturne'
      WHEN 'border_signal' THEN 'Signal'
    END,
    cost = CASE item_key
      WHEN 'border_celestial' THEN 600000
      WHEN 'border_chroma' THEN 450000
      WHEN 'border_crystal' THEN 450000
      WHEN 'border_glitch' THEN 500000
      WHEN 'border_gold' THEN 350000
      WHEN 'border_neon' THEN 180000
      WHEN 'border_prism' THEN 300000
      WHEN 'border_void' THEN 550000
      WHEN 'border_signal' THEN 160000
    END,
    catalog_status = 'active'
WHERE slot = 'profile_border'
  AND item_key IN (
    'border_celestial', 'border_chroma', 'border_crystal', 'border_glitch',
    'border_gold', 'border_neon', 'border_prism', 'border_void', 'border_signal'
  );

ALTER TABLE public.shop_items ADD CONSTRAINT shop_items_css_type_check CHECK (
  css_type IN ('style', 'class', 'text', 'renderer')
);

ALTER TABLE public.shop_items ADD CONSTRAINT shop_items_shape_check CHECK (
  item_key ~ '^[a-z0-9_]{1,80}$'
  AND slot IN ('consumable', 'title', 'name_font', 'name_material', 'name_motion', 'profile_border')
  AND length(css_value) <= 2000
  AND (available_from IS NULL OR available_until IS NULL OR available_from <= available_until)
  AND (
    slot IN ('consumable', 'title')
    OR css_type = 'renderer'
  )
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
    OR (
      slot = 'profile_border'
      AND css_value IN ('celestial', 'chroma', 'crystal', 'glitch', 'gold', 'neon', 'prism', 'void', 'signal')
    )
  )
);

-- Older policies exposed historical rows directly. The final catalog exposes
-- only active rows from the supported slot set.
DROP POLICY IF EXISTS "Shop items are viewable by everyone." ON public.shop_items;
DROP POLICY IF EXISTS "shop_items are publicly readable" ON public.shop_items;
DROP POLICY IF EXISTS shop_items_legacy_compatible_read ON public.shop_items;
DROP POLICY IF EXISTS shop_items_final_catalog_read ON public.shop_items;
CREATE POLICY shop_items_final_catalog_read
  ON public.shop_items FOR SELECT
  USING (
    catalog_status = 'active'
    AND slot IN ('consumable', 'title', 'name_font', 'name_material', 'name_motion', 'profile_border')
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
    AND slot IN ('consumable', 'title', 'name_font', 'name_material', 'name_motion', 'profile_border')
  ORDER BY item_key;
$function$;

-- Final equip boundary: Name layers are independent and no longer conflict
-- with a legacy preset. The profile row lock keeps each update atomic.
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

  IF v_slot IS NULL OR v_slot NOT IN ('name_font', 'name_material', 'name_motion', 'profile_border', 'title') THEN
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
  IF p_slot IS NULL OR p_slot NOT IN ('name_font', 'name_material', 'name_motion', 'profile_border', 'title') THEN
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
VALUES ('shop_version', '2026-08-02T20:00:00Z')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

DO $verification$
DECLARE
  invalid_count bigint;
  name_count bigint;
  border_count bigint;
BEGIN
  SELECT count(*) INTO invalid_count
  FROM public.shop_items
  WHERE slot NOT IN ('consumable', 'title', 'name_font', 'name_material', 'name_motion', 'profile_border');
  IF invalid_count <> 0 THEN
    RAISE EXCEPTION 'Lean cosmetic reset left % obsolete catalog rows', invalid_count;
  END IF;

  SELECT count(*) INTO name_count
  FROM public.shop_items
  WHERE slot IN ('name_font', 'name_material', 'name_motion')
    AND catalog_status = 'active';
  IF name_count <> 64 THEN
    RAISE EXCEPTION 'Expected 64 active modern Name rows, found %', name_count;
  END IF;

  SELECT count(*) INTO border_count
  FROM public.shop_items
  WHERE slot = 'profile_border' AND catalog_status = 'active';
  IF border_count <> 9 THEN
    RAISE EXCEPTION 'Expected 9 active Profile Border rows, found %', border_count;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE equipped_cosmetics ?| ARRAY[
      'name_effect', 'frame', 'profile_bg', 'profile_atmosphere',
      'orb_shape', 'roll_effect', 'lb_theme'
    ]
  ) THEN
    RAISE EXCEPTION 'Obsolete equipped cosmetic keys remain';
  END IF;
END;
$verification$;

COMMIT;
