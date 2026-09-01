-- The seed's final compatibility update is authoritative for the Compact
-- layout description. Keep the linked catalog aligned with that snapshot.
BEGIN;

UPDATE public.shop_items
SET description = 'A centered glass profile card that leaves the user background in charge.'
WHERE item_key = 'profile_layout_compact';

DO $verification$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.shop_items
    WHERE item_key = 'profile_layout_compact'
      AND description = 'A centered glass profile card that leaves the user background in charge.'
  ) THEN
    RAISE EXCEPTION 'Compact profile layout description was not reconciled';
  END IF;
END;
$verification$;

COMMIT;
