BEGIN;

-- Add only finite code-owned keys; retain every existing shape/access constraint.
DO $$
DECLARE
  constraint_name text;
  definition text;
  expanded text;
BEGIN
  FOREACH constraint_name IN ARRAY ARRAY['shop_items_shape_check', 'shop_items_atmosphere_renderer_check'] LOOP
    SELECT pg_get_constraintdef(oid) INTO definition
    FROM pg_constraint
    WHERE conrelid = 'public.shop_items'::regclass AND conname = constraint_name;
    IF definition IS NULL THEN
      RAISE EXCEPTION 'Expected constraint % was not found', constraint_name;
    END IF;
    expanded := replace(definition, '''sakura-afterglow''', '''sakura-afterglow'', ''aurora-veil'', ''abyssal-bloom'', ''astral-orbit'', ''lantern-festival'', ''firefly-grove'', ''opal-tide'', ''retro-horizon'', ''lunar-moths'', ''koi-reverie'', ''kinetic-studio''');
    IF expanded = definition THEN
      RAISE EXCEPTION 'Expected atmosphere allowlist anchor missing in %', constraint_name;
    END IF;
    EXECUTE format('ALTER TABLE public.shop_items DROP CONSTRAINT %I', constraint_name);
    EXECUTE format('ALTER TABLE public.shop_items ADD CONSTRAINT %I %s', constraint_name, expanded);
  END LOOP;
END $$;

INSERT INTO public.shop_items (
  item_key, name, slot, cost, css_type, css_value, available_from, available_until,
  rarity, description, collection, stackable, access_tier, entitlement_key, catalog_status
) VALUES
  ('profile_atmosphere_aurora_veil', 'Aurora Veil', 'profile_atmosphere', 0, 'renderer', 'aurora-veil', NULL, NULL, 'Epic', 'Emerald and violet curtains fold across a star-strewn polar sky.', 'Nocturne', false, 'free', NULL, 'active'),
  ('profile_atmosphere_abyssal_bloom', 'Abyssal Bloom', 'profile_atmosphere', 0, 'renderer', 'abyssal-bloom', NULL, NULL, 'Epic', 'Luminous jellyfish breathe and trail delicate filaments through deep blue water.', 'Prism', false, 'free', NULL, 'active'),
  ('profile_atmosphere_astral_orbit', 'Astral Orbit', 'profile_atmosphere', 0, 'renderer', 'astral-orbit', NULL, NULL, 'Epic', 'A ringed sapphire world turns beneath fine orbital arcs and distant stars.', 'Nocturne', false, 'free', NULL, 'active'),
  ('profile_atmosphere_lantern_festival', 'Lantern Festival', 'profile_atmosphere', 0, 'renderer', 'lantern-festival', NULL, NULL, 'Rare', 'Warm paper lanterns rise at different depths, carrying little wishes into the night.', 'Ember', false, 'free', NULL, 'active'),
  ('profile_atmosphere_firefly_grove', 'Firefly Grove', 'profile_atmosphere', 0, 'renderer', 'firefly-grove', NULL, NULL, 'Rare', 'Fern fronds sway around a grove of wandering golden fireflies.', 'Archive', false, 'free', NULL, 'active'),
  ('profile_atmosphere_opal_tide', 'Opal Tide', 'profile_atmosphere', 0, 'renderer', 'opal-tide', NULL, NULL, 'Epic', 'Iridescent contour waves fold into a fluid sculpture of coral, turquoise, and pearl.', 'Prism', false, 'free', NULL, 'active'),
  ('profile_atmosphere_retro_horizon', 'Retro Horizon', 'profile_atmosphere', 0, 'renderer', 'retro-horizon', NULL, NULL, 'Rare', 'A striped neon sunset hangs above a drifting perspective grid and violet mountains.', 'Signal', false, 'free', NULL, 'active'),
  ('profile_atmosphere_lunar_moths', 'Lunar Moths', 'profile_atmosphere', 0, 'renderer', 'lunar-moths', NULL, NULL, 'Epic', 'Engraved moon phases and silvery luna moths trace a nocturnal reverie.', 'Nocturne', false, 'free', NULL, 'active'),
  ('profile_atmosphere_koi_reverie', 'Koi Reverie', 'profile_atmosphere', 0, 'renderer', 'koi-reverie', NULL, NULL, 'Epic', 'Vermilion and pearl koi circle lily pads beneath widening water rings.', 'Archive', false, 'free', NULL, 'active'),
  ('profile_atmosphere_kinetic_studio', 'Kinetic Studio', 'profile_atmosphere', 0, 'renderer', 'kinetic-studio', NULL, NULL, 'Rare', 'Cobalt, tangerine, and citron mobiles balance in a playful geometric composition.', 'Signal', false, 'free', NULL, 'active')
ON CONFLICT (item_key) DO UPDATE SET
  name = EXCLUDED.name, cost = EXCLUDED.cost, css_value = EXCLUDED.css_value,
  description = EXCLUDED.description, collection = EXCLUDED.collection,
  rarity = EXCLUDED.rarity, access_tier = EXCLUDED.access_tier,
  entitlement_key = EXCLUDED.entitlement_key, catalog_status = EXCLUDED.catalog_status;

INSERT INTO public.meta (key, value) VALUES ('shop_version', '2026-09-25T23:00:00Z')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Rollback: retire only these ten rows; retain keys/renderers for equipped users.
COMMIT;
