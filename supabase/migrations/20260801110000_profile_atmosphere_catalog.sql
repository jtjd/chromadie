-- Ensure the full-page atmosphere catalog exists in environments where the
-- earlier catalog migration was recorded without its data rows.
INSERT INTO public.shop_items (
  item_key, name, slot, cost, css_type, css_value, available_from, available_until,
  rarity, description, collection, stackable, access_tier, entitlement_key
) VALUES
  ('bg_rain', 'Rainfall', 'profile_atmosphere', 1200000, 'class', 'profile-effect-rain', NULL, NULL, 'Epic', 'Animated rain overlay across the full profile page.', 'Weather', false, 'earned', NULL),
  ('bg_snow', 'Soft Snow', 'profile_atmosphere', 1800000, 'class', 'profile-effect-snow', NULL, NULL, 'Epic', 'Animated snow overlay across the full profile page.', 'Weather', false, 'earned', NULL),
  ('bg_fireflies', 'Fireflies', 'profile_atmosphere', 2400000, 'class', 'profile-effect-fireflies', NULL, NULL, 'Mythic', 'Animated firefly lights across the full profile page.', 'Weather', false, 'earned', NULL),
  ('bg_scanlines', 'Signal Scanlines', 'profile_atmosphere', 900000, 'class', 'profile-effect-scanlines', NULL, NULL, 'Rare', 'Animated scanlines across the full profile page.', 'Digital Landscape', false, 'earned', NULL)
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
  entitlement_key = EXCLUDED.entitlement_key;

INSERT INTO public.meta (key, value)
VALUES ('shop_version', '2026-08-01T11:00:00Z')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
