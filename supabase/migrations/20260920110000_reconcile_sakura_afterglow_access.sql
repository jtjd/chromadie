BEGIN;

-- The final seed contract gives non-progression profile expressions a free
-- baseline. The additive Sakura row was initially introduced with the old
-- earned price and must be reconciled without rewriting its stable identity.
UPDATE public.shop_items
SET cost = 0,
    access_tier = 'free',
    entitlement_key = NULL
WHERE item_key = 'profile_atmosphere_sakura_afterglow'
  AND slot = 'profile_atmosphere'
  AND catalog_status = 'active';

INSERT INTO public.meta (key, value)
VALUES ('shop_version', '2026-09-20T11:00:00Z')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

COMMIT;
