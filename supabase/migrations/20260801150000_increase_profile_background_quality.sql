-- Give full-page profile backgrounds more room for detail while keeping the
-- browser processor and Storage bucket on the same bounded output budget.

BEGIN;

UPDATE storage.buckets
SET file_size_limit = 4194304
WHERE id = 'backgrounds';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM storage.buckets
    WHERE id = 'backgrounds'
      AND file_size_limit = 4194304
  ) THEN
    RAISE EXCEPTION 'The backgrounds bucket must exist with a 4 MiB file limit.';
  END IF;
END;
$$;

COMMIT;
