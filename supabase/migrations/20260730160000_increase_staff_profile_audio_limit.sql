-- Increase the staff-alpha hosted audio allowance without changing its
-- ownership, MIME-type, path, or server-authoritative access boundary.

BEGIN;

UPDATE storage.buckets
SET file_size_limit = 5242880
WHERE id = 'profile_audio';

COMMIT;
