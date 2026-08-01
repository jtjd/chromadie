-- Keep profile backgrounds and full-page atmosphere overlays independent.
-- Existing weather items are moved without changing their keys, ownership, or
-- entitlements so equipped profiles keep their current expression.

ALTER TABLE public.shop_items DROP CONSTRAINT IF EXISTS shop_items_shape_check;
ALTER TABLE public.shop_items ADD CONSTRAINT shop_items_shape_check CHECK (
  item_key ~ '^[a-z0-9_]{1,80}$'
  AND slot IN ('consumable', 'frame', 'lb_theme', 'name_effect', 'orb_shape', 'profile_bg', 'profile_atmosphere', 'profile_border', 'roll_effect', 'title')
  AND length(css_value) <= 2000
  AND (available_from IS NULL OR available_until IS NULL OR available_from <= available_until)
);

UPDATE public.shop_items
SET slot = 'profile_atmosphere',
    description = CASE item_key
      WHEN 'bg_rain' THEN 'Animated rain overlay across the full profile page.'
      WHEN 'bg_snow' THEN 'Animated snow overlay across the full profile page.'
      WHEN 'bg_fireflies' THEN 'Animated firefly lights across the full profile page.'
      WHEN 'bg_scanlines' THEN 'Animated scanlines across the full profile page.'
      ELSE description
    END
WHERE item_key IN ('bg_rain', 'bg_snow', 'bg_fireflies', 'bg_scanlines');

-- Migrate legacy equipped weather effects out of the background slot. If a
-- profile already has both keys, retain the explicit atmosphere and clear the
-- legacy background value.
UPDATE public.profiles
SET equipped_cosmetics = CASE
  WHEN equipped_cosmetics ? 'profile_atmosphere'
    THEN equipped_cosmetics - 'profile_bg'
  ELSE (equipped_cosmetics - 'profile_bg')
    || jsonb_build_object('profile_atmosphere', equipped_cosmetics->>'profile_bg')
END
WHERE equipped_cosmetics->>'profile_bg' IN ('bg_rain', 'bg_snow', 'bg_fireflies', 'bg_scanlines');

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
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  PERFORM 1 FROM public.profiles WHERE id = v_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Profile not found');
  END IF;

  SELECT slot, COALESCE(access_tier, 'earned'), entitlement_key
  INTO v_slot, v_access_tier, v_entitlement_key
  FROM public.shop_items
  WHERE item_key = p_item_key;
  IF v_slot IS NULL
     OR v_slot = 'consumable'
     OR v_slot NOT IN ('name_effect', 'frame', 'profile_bg', 'profile_atmosphere', 'roll_effect', 'lb_theme', 'title', 'orb_shape', 'profile_border') THEN
    RETURN json_build_object('success', false, 'error', 'Invalid item');
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

  IF p_slot IS NULL OR p_slot NOT IN ('name_effect', 'frame', 'profile_bg', 'profile_atmosphere', 'roll_effect', 'lb_theme', 'title', 'orb_shape', 'profile_border') THEN
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
