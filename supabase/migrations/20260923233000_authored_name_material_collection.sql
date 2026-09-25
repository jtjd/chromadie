-- Add twelve free authored Name Materials while keeping the existing keys,
-- ownership, access tiers, and prices stable.
BEGIN;

-- Extend only the Name Material renderer allowlist. Preserve every other
-- finite slot and shape condition from the currently installed constraint.
DO $migration$
DECLARE definition text;
BEGIN
  SELECT pg_get_constraintdef(oid) INTO STRICT definition
    FROM pg_constraint WHERE conrelid = 'public.shop_items'::regclass
      AND conname = 'shop_items_shape_check';
  IF position('''halo-edge''' in definition) = 0 THEN
    RAISE EXCEPTION 'Expected existing halo-edge Name Material allowlist anchor';
  END IF;
  definition := replace(
    definition,
    '''halo-edge''',
    '''halo-edge'', ''mercury-polish'', ''gilded-leaf'', ''opal-lustre'', ''prism-dispersion'', ''aurora-weave'', ''ember-enamel'', ''ocean-caustic'', ''glacier-cut'', ''rose-satin'', ''stardust-ink'', ''porcelain-lacquer'', ''candy-shell'''
  );
  ALTER TABLE public.shop_items DROP CONSTRAINT shop_items_shape_check;
  EXECUTE 'ALTER TABLE public.shop_items ADD CONSTRAINT shop_items_shape_check ' || definition;
END $migration$;

-- Refresh presentation only; preserve ownership, prices, and access tiers.
UPDATE public.shop_items AS item
SET name = labels.name, description = labels.description
FROM (VALUES
  ('name_material_glass_emboss', 'Dewdrop', 'Clear aqua lettering with rounded highlights and tiny points of light.', 'glass-emboss'),
  ('name_material_carbon_cut', 'Violet Glow', 'Soft violet light blooms around a clean lavender face.', 'carbon-cut'),
  ('name_material_neon_tube', 'Neon Rose', 'A fine pink neon contour breathes around luminous rose lettering.', 'neon-tube'),
  ('name_material_velvet_ink', 'Rose Dust', 'Fine rose glitter catches little points of light across the letters.', 'velvet-ink'),
  ('name_material_engraved_stone', 'Sunlit', 'Warm lemon light and delicate white glints brighten the name.', 'engraved-stone'),
  ('name_material_blueprint_ink', 'Blue Bloom', 'An electric blue aura surrounds a bright cool-white face.', 'blueprint-ink')
) AS labels(item_key, name, description, css_value)
WHERE item.item_key = labels.item_key
  AND item.slot = 'name_material'
  AND item.css_value = labels.css_value;

INSERT INTO public.shop_items (
  item_key, name, slot, cost, css_type, css_value, available_from, available_until,
  rarity, description, collection, stackable, access_tier, entitlement_key, catalog_status
) VALUES
  ('name_material_mercury_polish', 'Silver Sparkle', 'name_material', 0, 'renderer', 'mercury-polish', NULL, NULL, 'Epic', 'Small silver-white stars twinkle over a crisp pale face.', 'Prism', false, 'free', NULL, 'active'),
  ('name_material_gilded_leaf', 'Pixie Dust', 'name_material', 0, 'renderer', 'gilded-leaf', NULL, NULL, 'Epic', 'Fresh green glitter and tiny luminous motes shimmer gently.', 'Archive', false, 'free', NULL, 'active'),
  ('name_material_opal_lustre', 'Opaline', 'name_material', 0, 'renderer', 'opal-lustre', NULL, NULL, 'Epic', 'Milky pink and mint light drift through an iridescent pearl face.', 'Prism', false, 'free', NULL, 'active'),
  ('name_material_prism_dispersion', 'Colorflow', 'name_material', 0, 'renderer', 'prism-dispersion', NULL, NULL, 'Anomaly', 'A soft full-spectrum gradient slowly changes color across the name.', 'Prism', false, 'free', NULL, 'active'),
  ('name_material_aurora_weave', 'Aurora', 'name_material', 0, 'renderer', 'aurora-weave', NULL, NULL, 'Epic', 'Emerald and lavender light softly shift within the lettering.', 'Signal', false, 'free', NULL, 'active'),
  ('name_material_ember_enamel', 'Peach Fizz', 'name_material', 0, 'renderer', 'ember-enamel', NULL, NULL, 'Epic', 'Tiny translucent bubbles brighten a peach and blush face.', 'Ember', false, 'free', NULL, 'active'),
  ('name_material_ocean_caustic', 'Lagoon', 'name_material', 0, 'renderer', 'ocean-caustic', NULL, NULL, 'Epic', 'Rounded pools of clear light ripple through bright turquoise.', 'Prism', false, 'free', NULL, 'active'),
  ('name_material_glacier_cut', 'Frosted', 'name_material', 0, 'renderer', 'glacier-cut', NULL, NULL, 'Rare', 'Fine icy grain and restrained crystal glints catch cool light.', 'Signal', false, 'free', NULL, 'active'),
  ('name_material_rose_satin', 'Sugarcoat', 'name_material', 0, 'renderer', 'rose-satin', NULL, NULL, 'Rare', 'A rounded blush finish carries a soft glossy highlight.', 'Ember', false, 'free', NULL, 'active'),
  ('name_material_stardust_ink', 'Stardust', 'name_material', 0, 'renderer', 'stardust-ink', NULL, NULL, 'Epic', 'Delicate stars twinkle over softly shifting violet and blue.', 'Nocturne', false, 'free', NULL, 'active'),
  ('name_material_porcelain_lacquer', 'Moonstone', 'name_material', 0, 'renderer', 'porcelain-lacquer', NULL, NULL, 'Rare', 'A smooth lilac pearl face catches a broad, quiet highlight.', 'Archive', false, 'free', NULL, 'active'),
  ('name_material_candy_shell', 'Daydream', 'name_material', 0, 'renderer', 'candy-shell', NULL, NULL, 'Rare', 'Pink and blue light frame clean white lettering with a soft double glow.', 'Prism', false, 'free', NULL, 'active')
ON CONFLICT (item_key) DO NOTHING;

INSERT INTO public.meta (key, value)
VALUES ('shop_version', '2026-09-23T23:30:00Z')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

DO $verification$
DECLARE
  material_count bigint;
  new_material_count bigint;
BEGIN
  SELECT count(*) INTO material_count
    FROM public.shop_items WHERE slot = 'name_material' AND catalog_status = 'active';
  SELECT count(*) INTO new_material_count FROM public.shop_items
    WHERE slot = 'name_material'
      AND item_key IN (
        'name_material_mercury_polish', 'name_material_gilded_leaf', 'name_material_opal_lustre',
        'name_material_prism_dispersion', 'name_material_aurora_weave', 'name_material_ember_enamel',
        'name_material_ocean_caustic', 'name_material_glacier_cut', 'name_material_rose_satin',
        'name_material_stardust_ink', 'name_material_porcelain_lacquer', 'name_material_candy_shell'
      )
      AND catalog_status = 'active'
      AND access_tier = 'free'
      AND cost = 0
      AND entitlement_key IS NULL;
  IF material_count <> 20 THEN
    RAISE EXCEPTION 'Expected 20 active Name Material rows, found %', material_count;
  END IF;
  IF new_material_count <> 12 THEN
    RAISE EXCEPTION 'Expected twelve active, free, zero-cost Name Materials, found %', new_material_count;
  END IF;
  IF (SELECT name FROM public.shop_items WHERE item_key = 'name_material_velvet_ink') <> 'Rose Dust'
    OR (SELECT name FROM public.shop_items WHERE item_key = 'name_material_engraved_stone') <> 'Sunlit' THEN
    RAISE EXCEPTION 'Existing Name Material label updates were not applied';
  END IF;
END $verification$;

COMMIT;
