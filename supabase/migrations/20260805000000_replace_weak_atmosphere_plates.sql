-- Replace the two weak authored atmosphere treatments while preserving their
-- stable renderer and ownership keys.
BEGIN;

INSERT INTO public.shop_items (
  item_key, name, slot, cost, css_type, css_value, available_from, available_until,
  rarity, description, collection, stackable, access_tier, entitlement_key, catalog_status
) VALUES
  ('profile_atmosphere_night_pollen', 'Starlight Tunnel', 'profile_atmosphere', 340000, 'renderer', 'night-pollen', NULL, NULL, 'Rare', 'A dense field of suspended lights folds through a deep nocturnal tunnel.', 'Nocturne', false, 'earned', NULL, 'active'),
  ('profile_atmosphere_paper_shadow', 'Chromatic Tangle', 'profile_atmosphere', 300000, 'renderer', 'paper-shadow', NULL, NULL, 'Rare', 'Bright colored trails knot and release across a black field like a living light study.', 'Prism', false, 'earned', NULL, 'active')
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

INSERT INTO public.meta (key, value) VALUES ('shop_version', '2026-08-05T00:00:00Z')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

DO $verification$
DECLARE active_count bigint; atmosphere_count bigint;
BEGIN
  SELECT count(*) INTO active_count FROM public.shop_items WHERE catalog_status = 'active';
  IF active_count <> 126 THEN RAISE EXCEPTION 'Expected 126 active catalog rows, found %', active_count; END IF;
  SELECT count(*) INTO atmosphere_count FROM public.shop_items WHERE slot = 'profile_atmosphere' AND catalog_status = 'active';
  IF atmosphere_count <> 12 THEN RAISE EXCEPTION 'Expected 12 active Profile Atmosphere rows, found %', atmosphere_count; END IF;
END;
$verification$;

COMMIT;
