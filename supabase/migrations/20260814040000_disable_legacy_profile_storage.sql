-- Profile media is R2-only. Keep historical bucket rows for migration/audit
-- purposes, but make the legacy Supabase Storage surface non-public and
-- unusable by browser roles. Do not delete historical objects here: media
-- bytes are user data and any cleanup must be an explicit, audited operation.

UPDATE storage.buckets
SET public = false
WHERE id IN ('avatars', 'backgrounds', 'profile_audio', 'profile_media');

DROP POLICY IF EXISTS "Public profile expression media read" ON storage.objects;
DROP POLICY IF EXISTS "Public rich profile media read" ON storage.objects;
DROP POLICY IF EXISTS "Public staff profile audio read" ON storage.objects;
DROP POLICY IF EXISTS "Owners can upload profile expression media" ON storage.objects;
DROP POLICY IF EXISTS "Owners can replace profile expression media" ON storage.objects;
DROP POLICY IF EXISTS "Owners can delete profile expression media" ON storage.objects;
DROP POLICY IF EXISTS "Owners can stage rich profile media" ON storage.objects;
DROP POLICY IF EXISTS "Owners can replace rich profile media" ON storage.objects;
DROP POLICY IF EXISTS "Owners can delete rich profile media" ON storage.objects;
DROP POLICY IF EXISTS "Staff can upload profile audio" ON storage.objects;
DROP POLICY IF EXISTS "Staff can replace profile audio" ON storage.objects;
DROP POLICY IF EXISTS "Staff can delete profile audio" ON storage.objects;
