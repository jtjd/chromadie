-- Restore the original Atelier expression keys as safe, structured Plus
-- cosmetics. The retired name_effect/profile_bg raw-CSS slots stay removed.
BEGIN;

INSERT INTO public.shop_items (
  item_key, name, slot, cost, css_type, css_value, available_from, available_until,
  rarity, description, collection, stackable, access_tier, entitlement_key, catalog_status
) VALUES
  (
    'name_prism_atelier',
    'Prism Atelier Name',
    'name_motion',
    0,
    'renderer',
    'haunt-rainbow',
    NULL,
    NULL,
    'Mythic',
    'The original Atelier name treatment: a restrained spectral pass across the identity.',
    'Atelier Expression',
    false,
    'premium',
    'chromadie_plus',
    'active'
  ),
  (
    'bg_prism_atmosphere',
    'Prism Atmosphere',
    'profile_atmosphere',
    0,
    'renderer',
    'silk-folds',
    NULL,
    NULL,
    'Mythic',
    'The original Atelier atmosphere: black silk folds with a quiet prismatic sheen behind the profile.',
    'Atelier Expression',
    false,
    'premium',
    'chromadie_plus',
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

INSERT INTO public.meta (key, value)
VALUES ('shop_version', '2026-08-09T00:00:00Z')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

DO $verification$
DECLARE
  active_count bigint;
  motion_count bigint;
  atmosphere_count bigint;
  atelier_count bigint;
BEGIN
  SELECT count(*) INTO active_count
  FROM public.shop_items
  WHERE catalog_status = 'active';
  IF active_count <> 99 THEN
    RAISE EXCEPTION 'Expected 99 active catalog rows, found %', active_count;
  END IF;

  SELECT count(*) INTO motion_count
  FROM public.shop_items
  WHERE slot = 'name_motion' AND catalog_status = 'active';
  IF motion_count <> 11 THEN
    RAISE EXCEPTION 'Expected 11 active Name Motion rows, found %', motion_count;
  END IF;

  SELECT count(*) INTO atmosphere_count
  FROM public.shop_items
  WHERE slot = 'profile_atmosphere' AND catalog_status = 'active';
  IF atmosphere_count <> 13 THEN
    RAISE EXCEPTION 'Expected 13 active Profile Atmosphere rows, found %', atmosphere_count;
  END IF;

  SELECT count(*) INTO atelier_count
  FROM public.shop_items
  WHERE item_key IN ('name_prism_atelier', 'bg_prism_atmosphere')
    AND slot IN ('name_motion', 'profile_atmosphere')
    AND access_tier = 'premium'
    AND entitlement_key = 'chromadie_plus'
    AND catalog_status = 'active';
  IF atelier_count <> 2 THEN
    RAISE EXCEPTION 'Expected both active Atelier expression rows, found %', atelier_count;
  END IF;
END;
$verification$;

COMMIT;
