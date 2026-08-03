-- Use the actual bundled family names for Font products. The renderer keys,
-- visuals, prices, and ownership records remain unchanged.

UPDATE public.shop_items AS item
SET name = families.name
FROM (VALUES
  ('name_font_editorial_serif', 'Cormorant Garamond'),
  ('name_font_condensed_sans', 'Archivo Narrow'),
  ('name_font_wide_geometric', 'Syne'),
  ('name_font_mono_compact', 'IBM Plex Mono'),
  ('name_font_rounded_mono', 'Sono'),
  ('name_font_soft_grotesk', 'Instrument Sans'),
  ('name_font_humanist_display', 'Libre Franklin'),
  ('name_font_modern_fraktur', 'Pirata One'),
  ('name_font_pixel_display', 'Pixelify Sans'),
  ('name_font_high_contrast_italic', 'DM Serif Display'),
  ('name_font_neo_slab', 'Roboto Slab'),
  ('name_font_reverse_contrast', 'Abril Fatface'),
  ('name_font_industrial_stencil', 'Black Ops One'),
  ('name_font_futurist_extended', 'Michroma'),
  ('name_font_terminal_bitmap', 'VT323'),
  ('name_font_rounded_display', 'Fredoka'),
  ('name_font_marker_tag', 'Permanent Marker'),
  ('name_font_newspaper_black', 'Archivo Black')
) AS families(item_key, name)
WHERE item.item_key = families.item_key;

DO $$
DECLARE
  font_count integer;
BEGIN
  SELECT count(*) INTO font_count
  FROM public.shop_items
  WHERE slot = 'name_font';

  IF font_count <> 18 THEN
    RAISE EXCEPTION 'Expected 18 Font catalog rows, found %', font_count;
  END IF;
END
$$;
