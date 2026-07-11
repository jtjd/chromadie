-- Rename and describe the redesigned orb cosmetics. Prices and keys are unchanged.

UPDATE public.shop_items AS item
SET name = updates.name,
    description = updates.description
FROM (VALUES
  ('orb_hexagon', 'Hexagon Orb', 'A beveled hex core with layered facets and a cool pulse.'),
  ('orb_diamond', 'Diamond Orb', 'A cut crystal orb with shifting facets and an icy flare.'),
  ('orb_triangle', 'Prism Shard', 'A floating prism shard split into light and shadow facets.'),
  ('orb_square', 'Cyber Tile', 'A clipped cyber tile with luminous circuitry and glitch echoes.'),
  ('orb_star', 'Radiant Star', 'An eight-point stellar core that blooms with prismatic light.')
) AS updates(item_key, name, description)
WHERE item.item_key = updates.item_key;

UPDATE public.meta
SET value = '2026-07-11T13:00:00Z'
WHERE key = 'shop_version';
