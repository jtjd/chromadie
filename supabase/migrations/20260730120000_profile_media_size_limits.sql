-- Phase 14: keep profile expression media within the free-plan storage budget.
-- The browser produces bounded WebP files, and Storage enforces the same limits
-- for clients that bypass the browser.

BEGIN;

UPDATE storage.buckets
SET file_size_limit = 262144
WHERE id = 'avatars';

UPDATE storage.buckets
SET file_size_limit = 1048576
WHERE id = 'backgrounds';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'avatars')
     OR NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'backgrounds') THEN
    RAISE EXCEPTION 'Profile media buckets must exist before size limits are applied.';
  END IF;
END;
$$;

COMMIT;
