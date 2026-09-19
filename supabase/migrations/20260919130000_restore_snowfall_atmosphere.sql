BEGIN;

UPDATE public.shop_items
SET name = 'Snowfall',
    description = 'Layered flakes drift through a blue winter field, from soft foreground crystals to distant pinpricks.'
WHERE item_key = 'profile_atmosphere_snowfall';

INSERT INTO public.meta (key, value) VALUES ('shop_version', '2026-09-19T13:00:00Z')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

COMMIT;
