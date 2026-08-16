-- The Shop surface is retired. The catalog remains the server-owned
-- expression registry while acquisition is moved to future progression and
-- premium decisions. For this interim period every active profile expression
-- is available to every account through the existing equip_item boundary.
BEGIN;

UPDATE public.shop_items
SET access_tier = 'free',
    cost = 0,
    entitlement_key = NULL
WHERE catalog_status = 'active'
  AND slot IN (
    'name_font',
    'name_material',
    'name_motion',
    'profile_border',
    'cursor_trail',
    'avatar_effect',
    'profile_layout',
    'profile_atmosphere',
    'profile_motion'
  );

-- Keep the two current structural layouts and the profile motion item
-- available even when a linked environment missed one of the recent catalog
-- migrations. The renderer and equip RPC remain the authorities for validity.
INSERT INTO public.shop_items (
  item_key, name, slot, cost, css_type, css_value, available_from, available_until,
  rarity, description, collection, stackable, access_tier, entitlement_key, catalog_status
) VALUES
  (
    'profile_layout_compact', 'Compact', 'profile_layout', 0, 'renderer', 'compact', NULL, NULL,
    'Uncommon', 'A centered glass profile card that leaves the user background in charge.',
    'Layouts', false, 'free', NULL, 'active'
  ),
  (
    'profile_layout_full_bleed', 'Immersive', 'profile_layout', 0, 'renderer', 'full-bleed', NULL, NULL,
    'Uncommon', 'A full-viewport identity scene with a large avatar, bio, and icon links.',
    'Layouts', false, 'free', NULL, 'active'
  ),
  (
    'profile_motion_perspective_tilt', '3D Tilt', 'profile_motion', 0, 'renderer', 'perspective-tilt', NULL, NULL,
    'Uncommon', 'A restrained perspective shift follows the pointer across the profile surface.',
    'Layouts', false, 'free', NULL, 'active'
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

-- A retired or malformed border must never become a colored default. Valid
-- active border selections are intentionally preserved.
UPDATE public.profiles AS profile_row
SET equipped_cosmetics = profile_row.equipped_cosmetics - 'profile_border'
WHERE profile_row.equipped_cosmetics ? 'profile_border'
  AND NOT EXISTS (
    SELECT 1
    FROM public.shop_items AS item
    WHERE item.item_key = profile_row.equipped_cosmetics->>'profile_border'
      AND item.slot = 'profile_border'
      AND item.catalog_status = 'active'
      AND item.css_value IN ('celestial', 'chroma', 'crystal', 'glitch', 'gold', 'neon', 'prism', 'void', 'signal')
  );

INSERT INTO public.meta (key, value)
VALUES ('shop_version', '2026-08-15T15:00:00Z')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

COMMIT;
