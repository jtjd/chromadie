-- Keep Founder grantable as a reserved title without exposing it in the shop.
UPDATE public.shop_items
SET available_from = NULL,
    available_until = DATE '2026-07-10'
WHERE item_key = 'title_founder';

INSERT INTO public.meta (key, value)
VALUES ('shop_version', '2026-07-11T18:00:00Z')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
