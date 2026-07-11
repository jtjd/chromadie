-- Rename and describe the upgraded launch roll effects. Keys and prices are unchanged.

UPDATE public.shop_items AS item
SET name = updates.name,
    description = updates.description
FROM (VALUES
  ('roll_smoke', 'Nebula Veil', 'Layered cyan-violet nebula clouds drift around your roll orb.'),
  ('roll_sparkles', 'Starlight Aura', 'A crisp orbit of varied stars twinkles around your roll orb.'),
  ('roll_pixelate', 'Nova Bloom', 'A brilliant stellar core erupts into a repeating shockwave.')
) AS updates(item_key, name, description)
WHERE item.item_key = updates.item_key;

UPDATE public.meta
SET value = '2026-07-11T14:00:00Z'
WHERE key = 'shop_version';
