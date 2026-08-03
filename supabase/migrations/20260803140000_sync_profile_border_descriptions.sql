-- Bring the retained profile-border copy back in line with the canonical
-- catalog. This is presentation-only; item keys, prices, ownership, and
-- equipped loadouts remain unchanged.

UPDATE public.shop_items AS item
SET description = descriptions.description
FROM (VALUES
  ('border_celestial', 'A precise celestial edge with a restrained star-like pulse.'),
  ('border_chroma', 'A spectrum edge that moves through the profile without overwhelming it.'),
  ('border_crystal', 'A cool faceted edge with a clean crystalline glint.'),
  ('border_glitch', 'A clipped signal edge with brief cyan and rose interruptions.'),
  ('border_gold', 'A warm archival metal edge with a measured glint.'),
  ('border_neon', 'A clean electric edge that breathes between cyan and mint.'),
  ('border_prism', 'Refracted light travels around the profile edge in a compact spectrum.'),
  ('border_void', 'A dark violet edge that absorbs light around the card.'),
  ('border_signal', 'A quiet lime edge with a bounded signal pulse.')
) AS descriptions(item_key, description)
WHERE item.item_key = descriptions.item_key;

DO $$
DECLARE
  border_count integer;
BEGIN
  SELECT count(*) INTO border_count
  FROM public.shop_items
  WHERE item_key IN (
    'border_celestial', 'border_chroma', 'border_crystal', 'border_glitch',
    'border_gold', 'border_neon', 'border_prism', 'border_void',
    'border_signal'
  );

  IF border_count <> 9 THEN
    RAISE EXCEPTION 'Expected 9 retained profile-border rows, found %', border_count;
  END IF;
END
$$;
