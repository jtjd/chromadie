-- Metadata-only curation. Stable IDs, access, prices and ownership survive.
BEGIN;
UPDATE public.shop_items SET name = 'Loveglass', description = 'Rose glass hearts rise through pearly pin lights, catching reflections as they turn.' WHERE item_key = 'profile_atmosphere_dust_light';
UPDATE public.shop_items SET name = 'Sakura Afterglow', description = 'Blush petals tumble through changing winds beneath a flowering cherry branch.' WHERE item_key = 'profile_atmosphere_snowfall';
UPDATE public.shop_items SET name = 'Crimson Ink', description = 'A broken crimson eclipse breathes with calligraphic ink currents and rising embers.' WHERE item_key = 'profile_atmosphere_ink_bloom';
UPDATE public.shop_items SET name = 'Cyber Silk', description = 'Liquid chrome ribbons twist between lilac and cyan beneath old-web star glints.' WHERE item_key = 'profile_atmosphere_paper_shadow';
INSERT INTO public.meta (key, value) VALUES ('shop_version', '2026-09-19T12:00:00Z') ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
COMMIT;
