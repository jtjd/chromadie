-- Add the coordinated profile look used in the homepage example.
-- This is additive and only updates catalog rows; it does not change
-- inventory, entitlements, equipped cosmetics, or scoring.
INSERT INTO public.shop_items (
  item_key, name, slot, cost, css_type, css_value, available_from, available_until,
  rarity, description, collection, stackable, access_tier, entitlement_key
) VALUES
  ('bg_signal_garden', 'Signal Garden', 'profile_bg', 260000, 'class', 'bg-signal-garden', NULL, NULL, 'Rare', 'A warm black field with restrained lime and amber signal lights.', 'Signal Garden', false, 'earned', NULL),
  ('border_signal', 'Signal Border', 'profile_border', 190000, 'class', 'border-signal-anim', NULL, NULL, 'Rare', 'A quiet lime-to-amber edge with a slow pulse.', 'Signal Garden', false, 'earned', NULL),
  ('frame_signal', 'Signal Frame', 'frame', 140000, 'class', 'frame-signal-anim', NULL, NULL, 'Rare', 'A thin frame with lime and amber edge light.', 'Signal Garden', false, 'earned', NULL),
  ('name_signal', 'Signal Name', 'name_effect', 220000, 'class', 'name-signal-anim', NULL, NULL, 'Rare', 'A lime and amber name treatment with a slow light pass.', 'Signal Garden', false, 'earned', NULL),
  ('orb_signal', 'Signal Core', 'orb_shape', 110000, 'class', 'orb-shape-signal', NULL, NULL, 'Rare', 'A faceted lime core with a warm amber highlight.', 'Signal Garden', false, 'earned', NULL),
  ('roll_signal', 'Signal Pulse', 'roll_effect', 240000, 'class', 'roll-signal-anim', NULL, NULL, 'Rare', 'A restrained lime and amber pulse around your roll orb.', 'Signal Garden', false, 'earned', NULL)
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
VALUES ('shop_version', '2026-08-01T12:00:00Z')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
