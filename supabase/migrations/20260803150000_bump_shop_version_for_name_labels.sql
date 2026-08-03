-- Invalidate cached shop catalogs after the label and description updates.
-- The client compares this value before accepting its 24-hour local cache.

INSERT INTO public.meta (key, value)
VALUES ('shop_version', '2026-08-03T15:00:00Z')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.meta
    WHERE key = 'shop_version'
      AND value = '2026-08-03T15:00:00Z'
  ) THEN
    RAISE EXCEPTION 'Shop cache version was not updated';
  END IF;
END
$$;
