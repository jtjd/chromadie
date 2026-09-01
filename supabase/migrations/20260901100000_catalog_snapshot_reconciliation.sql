-- Reconcile active catalog presentation fields that predate the current
-- snapshot. Retired historical rows remain in the seed for compatibility but
-- are intentionally excluded from get_shop_catalog().
BEGIN;

UPDATE public.shop_items
SET name = 'Default',
    description = 'A focused glass profile with identity, daily color, and a finite link rail.'
WHERE item_key = 'profile_layout_compact';

UPDATE public.shop_items
SET name = 'Simplistic',
    description = 'A cardless identity scene with a large avatar and icon links.'
WHERE item_key = 'profile_layout_full_bleed';

UPDATE public.shop_items
SET name = 'Modern',
    description = 'A wide identity surface with a roll widget and separated media.'
WHERE item_key = 'profile_layout_framed';

DO $verification$
DECLARE
  v_matching_rows bigint;
BEGIN
  SELECT count(*) INTO v_matching_rows
  FROM public.shop_items
  WHERE (item_key, name, description) IN (
    ('profile_layout_compact', 'Default', 'A focused glass profile with identity, daily color, and a finite link rail.'),
    ('profile_layout_full_bleed', 'Simplistic', 'A cardless identity scene with a large avatar and icon links.'),
    ('profile_layout_framed', 'Modern', 'A wide identity surface with a roll widget and separated media.')
  );

  IF v_matching_rows <> 3 THEN
    RAISE EXCEPTION 'Expected three reconciled profile layout catalog rows, found %', v_matching_rows;
  END IF;
END;
$verification$;

INSERT INTO public.meta (key, value)
VALUES ('shop_version', '2026-09-01T10:00:00Z')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

COMMIT;
