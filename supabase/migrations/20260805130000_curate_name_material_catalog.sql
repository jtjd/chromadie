-- Keep only the seven approved Name Materials in the public catalog.
-- Historical item keys stay legacy-only so existing equipped profiles and
-- inventory records remain addressable through the renderer alias map.
BEGIN;

UPDATE public.shop_items
SET catalog_status = 'legacy'
WHERE slot = 'name_material'
  AND css_value NOT IN (
    'glass-emboss', 'carbon-cut', 'neon-tube', 'velvet-ink',
    'engraved-stone', 'crt-phosphor', 'blueprint-ink'
  );

INSERT INTO public.shop_items (
  item_key, name, slot, cost, css_type, css_value, available_from, available_until,
  rarity, description, collection, stackable, access_tier, entitlement_key, catalog_status
) VALUES
  ('name_material_glass_emboss', 'Raised Glass', 'name_material', 350000, 'renderer', 'glass-emboss', NULL, NULL, 'Epic', 'A translucent embossed surface with a raised, refracted edge.', 'Prism', false, 'earned', NULL, 'active'),
  ('name_material_carbon_cut', 'Carbon Vein', 'name_material', 230000, 'renderer', 'carbon-cut', NULL, NULL, 'Rare', 'A dark carbon surface scored with restrained silver facets.', 'Nocturne', false, 'earned', NULL, 'active'),
  ('name_material_neon_tube', 'Afterglow', 'name_material', 380000, 'renderer', 'neon-tube', NULL, NULL, 'Epic', 'A bounded neon-tube face with a bright inner core and colored rim.', 'Signal', false, 'earned', NULL, 'active'),
  ('name_material_velvet_ink', 'Soft Black', 'name_material', 250000, 'renderer', 'velvet-ink', NULL, NULL, 'Rare', 'A plush velvet surface with a saturated pile and soft highlight.', 'Ember', false, 'earned', NULL, 'active'),
  ('name_material_engraved_stone', 'Quarry Mark', 'name_material', 260000, 'renderer', 'engraved-stone', NULL, NULL, 'Rare', 'A carved stone face with durable shadowed grooves and pale edges.', 'Nocturne', false, 'earned', NULL, 'active'),
  ('name_material_crt_phosphor', 'Cathode Bloom', 'name_material', 350000, 'renderer', 'crt-phosphor', NULL, NULL, 'Epic', 'A green phosphor face with a controlled screen glow and scan texture.', 'Static Bloom', false, 'earned', NULL, 'active'),
  ('name_material_blueprint_ink', 'Draftline', 'name_material', 240000, 'renderer', 'blueprint-ink', NULL, NULL, 'Rare', 'A technical blue ink face with pale drafting-line highlights.', 'Signal', false, 'earned', NULL, 'active')
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
VALUES ('shop_version', '2026-08-05T13:00:00Z')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

DO $verification$
DECLARE
  active_count bigint;
  material_count bigint;
  legacy_material_count bigint;
BEGIN
  SELECT count(*) INTO active_count FROM public.shop_items WHERE catalog_status = 'active';
  IF active_count <> 97 THEN RAISE EXCEPTION 'Expected 97 active catalog rows, found %', active_count; END IF;
  SELECT count(*) INTO material_count FROM public.shop_items WHERE slot = 'name_material' AND catalog_status = 'active';
  IF material_count <> 7 THEN RAISE EXCEPTION 'Expected 7 active Name Material rows, found %', material_count; END IF;
  SELECT count(*) INTO legacy_material_count FROM public.shop_items WHERE slot = 'name_material' AND catalog_status = 'legacy';
  IF legacy_material_count <> 15 THEN RAISE EXCEPTION 'Expected 15 legacy Name Material rows, found %', legacy_material_count; END IF;
END;
$verification$;

COMMIT;
