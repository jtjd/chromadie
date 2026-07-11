-- Replace the Cyber Tile presentation with the Holo Cube. Key and price are unchanged.

UPDATE public.shop_items
SET name = 'Holo Cube',
    description = 'An isometric cube with dimensional faces and drifting holographic light.'
WHERE item_key = 'orb_square';

UPDATE public.meta
SET value = '2026-07-11T13:30:00Z'
WHERE key = 'shop_version';
