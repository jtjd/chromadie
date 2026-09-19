BEGIN;

-- Preserve the exact finite constraints already deployed, extending only their
-- atmosphere allowlists so this additive catalog row remains safe.
DO $$
DECLARE
  constraint_name text;
  definition text;
BEGIN
  FOREACH constraint_name IN ARRAY ARRAY['shop_items_shape_check', 'shop_items_atmosphere_renderer_check'] LOOP
    SELECT pg_get_constraintdef(oid) INTO definition
    FROM pg_constraint
    WHERE conrelid = 'public.shop_items'::regclass AND conname = constraint_name;
    IF definition IS NULL THEN
      RAISE EXCEPTION 'Expected constraint % was not found', constraint_name;
    END IF;
    definition := replace(definition, '''prism-dust''', '''prism-dust'', ''sakura-afterglow''');
    EXECUTE format('ALTER TABLE public.shop_items DROP CONSTRAINT %I', constraint_name);
    EXECUTE format('ALTER TABLE public.shop_items ADD CONSTRAINT %I %s', constraint_name, definition);
  END LOOP;
END $$;

INSERT INTO public.shop_items (
  item_key, name, slot, cost, css_type, css_value, available_from, available_until,
  rarity, description, collection, stackable, access_tier, entitlement_key, catalog_status
) VALUES (
  'profile_atmosphere_sakura_afterglow', 'Sakura Afterglow', 'profile_atmosphere', 300000,
  'renderer', 'sakura-afterglow', NULL, NULL, 'Rare',
  'Painted cherry blossoms and wind-driven petals sweep across a soft anime dusk.',
  'Prism', false, 'earned', NULL, 'active'
)
ON CONFLICT (item_key) DO UPDATE SET
  name = EXCLUDED.name, cost = EXCLUDED.cost, css_value = EXCLUDED.css_value,
  description = EXCLUDED.description, collection = EXCLUDED.collection,
  access_tier = EXCLUDED.access_tier, catalog_status = EXCLUDED.catalog_status;

INSERT INTO public.meta (key, value) VALUES ('shop_version', '2026-09-19T14:00:00Z')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

COMMIT;
