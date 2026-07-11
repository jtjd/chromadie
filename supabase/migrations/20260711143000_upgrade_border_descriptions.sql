-- Refresh descriptions for the upgraded border effects. Keys and prices are unchanged.

UPDATE public.shop_items AS item
SET description = updates.description
FROM (VALUES
  ('border_neon', 'Cyan and magenta electric currents trade places around your card.'),
  ('border_prism', 'Refracted cyan, pink, violet, and gold light travels around the edge.'),
  ('border_gold', 'A rich metallic edge cycles from antique gold to a brilliant glint.')
) AS updates(item_key, description)
WHERE item.item_key = updates.item_key;

UPDATE public.meta
SET value = '2026-07-11T14:30:00Z'
WHERE key = 'shop_version';
