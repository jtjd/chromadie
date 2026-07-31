-- Curated profile atmosphere effects. These remain structured catalog items;
-- the client maps their stable keys to code-owned, CSP-safe visual layers.
INSERT INTO public.shop_items (
  item_key, name, slot, cost, css_type, css_value, available_from, available_until,
  rarity, description, collection, stackable, access_tier, entitlement_key
) VALUES
  ('bg_rain', 'Rainfall', 'profile_bg', 1200000, 'class', 'profile-effect-rain', NULL, NULL, 'Epic', 'A quiet curtain of rain falls through your profile atmosphere.', 'Weather', false, 'earned', NULL),
  ('bg_snow', 'Soft Snow', 'profile_bg', 1800000, 'class', 'profile-effect-snow', NULL, NULL, 'Epic', 'Slow snow drifts across a cold, luminous atmosphere.', 'Weather', false, 'earned', NULL),
  ('bg_fireflies', 'Fireflies', 'profile_bg', 2400000, 'class', 'profile-effect-fireflies', NULL, NULL, 'Mythic', 'Warm points of light wander through the dark like fireflies.', 'Weather', false, 'earned', NULL),
  ('bg_scanlines', 'Signal Scanlines', 'profile_bg', 900000, 'class', 'profile-effect-scanlines', NULL, NULL, 'Rare', 'A restrained analog scanline texture gives the profile a signal glow.', 'Digital Landscape', false, 'earned', NULL)
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
VALUES ('shop_version', '2026-07-30T12:00:00Z')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
